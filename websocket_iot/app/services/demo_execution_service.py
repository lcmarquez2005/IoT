import asyncio
from datetime import datetime, timezone
from fastapi import HTTPException
from app.repositories import (
    VehiculoRepository,
    ComandoRepository,
    EstadoRepository,
    DemoRepository,
)
from app.websocket.websocket_manager import WebSocketManager, websocket_manager


class DemoExecutionService:
    """
    Servicio de ejecución temporizada y asíncrona de rutinas DEMO.
    Cumple con todas las reglas de negocio:
    - Ejecución temporizada no bloqueante (respetando duracion_ms y pausa_ms).
    - Emisión WebSocket de inicio, cada movimiento, finalización, cancelación y error.
    - Actualización de estado en RDS mediante sp_actualizar_estado.
    - PROHIBICIÓN ESTRICTA: No invoca sp_registrar_historial en ningún momento.
    - Impide dos DEMO simultáneas para el mismo vehículo (409 Conflict).
    - Permite cancelación inmediata y segura.
    """

    def __init__(
        self,
        vehiculo_repo: VehiculoRepository | None = None,
        comando_repo: ComandoRepository | None = None,
        estado_repo: EstadoRepository | None = None,
        demo_repo: DemoRepository | None = None,
        ws_manager: WebSocketManager | None = None,
    ):
        self.vr = vehiculo_repo or VehiculoRepository()
        self.cr = comando_repo or ComandoRepository()
        self.er = estado_repo or EstadoRepository()
        self.dr = demo_repo or DemoRepository()
        self.ws = ws_manager or websocket_manager

        # Control de ejecuciones activas: id_vehiculo -> dict
        self._demos_activas: dict[int, dict] = {}

    def esta_en_ejecucion(self, id_vehiculo: int) -> bool:
        """Verifica si un vehículo ya tiene una rutina DEMO ejecutándose actualmente."""
        info = self._demos_activas.get(id_vehiculo)
        if not info:
            return False
        task = info.get("task")
        return task is not None and not task.done()

    def obtener_info_activa(self, id_vehiculo: int) -> dict | None:
        """Retorna información de la rutina en ejecución actual si existe."""
        if self.esta_en_ejecucion(id_vehiculo):
            info = self._demos_activas[id_vehiculo]
            return {
                "id_vehiculo": id_vehiculo,
                "id_demo": info["id_demo"],
                "demo": info["demo_nombre"],
                "paso_actual": info.get("paso_actual", 0),
                "total_movimientos": info.get("total_movimientos", 0),
            }
        return None

    async def iniciar_demo(
        self,
        id_vehiculo: int,
        id_demo: int,
        factor_tiempo: float = 1.0,
    ) -> dict:
        """
        Valida e inicia la ejecución en segundo plano de la rutina DEMO.
        No bloquea el hilo principal ni otras peticiones HTTP/WebSocket.
        """
        # Regla 8: Impedir dos DEMO simultáneas para el mismo vehículo
        if self.esta_en_ejecucion(id_vehiculo):
            demo_activa = self._demos_activas[id_vehiculo]["demo_nombre"]
            raise HTTPException(
                status_code=409,
                detail=f"Ya existe una rutina DEMO en ejecución para el vehículo {id_vehiculo} ('{demo_activa}')",
            )

        # Regla 1: Validar que el vehículo exista y esté activo
        vehiculo = self.vr.obtener_vehiculo(id_vehiculo)
        if not vehiculo:
            raise HTTPException(
                status_code=404,
                detail=f"Vehículo con ID {id_vehiculo} no encontrado",
            )
        if not vehiculo.get("activo"):
            raise HTTPException(
                status_code=400,
                detail=f"El vehículo con ID {id_vehiculo} está inactivo",
            )

        # Regla 1: Validar que la DEMO exista, pertenezca al vehículo y esté activa
        demos = self.dr.obtener_demos(id_vehiculo)
        demo_seleccionada = next((d for d in demos if d["id_demo"] == id_demo), None)
        if not demo_seleccionada:
            raise HTTPException(
                status_code=404,
                detail=f"Rutina DEMO con ID {id_demo} no encontrada o no pertenece al vehículo {id_vehiculo}",
            )
        if not demo_seleccionada.get("activo"):
            raise HTTPException(
                status_code=400,
                detail=f"La rutina DEMO '{demo_seleccionada['nombre']}' está inactiva",
            )

        # Regla 2: Obtener la secuencia real mediante sp_obtener_movimientos_demo
        movimientos = self.dr.obtener_movimientos_demo(id_demo)
        if not movimientos:
            raise HTTPException(
                status_code=400,
                detail=f"La rutina DEMO '{demo_seleccionada['nombre']}' no contiene movimientos configurados",
            )

        cancel_event = asyncio.Event()
        task = asyncio.create_task(
            self._ejecutar_secuencia(
                id_vehiculo=id_vehiculo,
                vehiculo=vehiculo,
                demo=demo_seleccionada,
                movimientos=movimientos,
                cancel_event=cancel_event,
                factor_tiempo=factor_tiempo,
            )
        )

        self._demos_activas[id_vehiculo] = {
            "id_demo": id_demo,
            "demo_nombre": demo_seleccionada["nombre"],
            "task": task,
            "cancel_event": cancel_event,
            "paso_actual": 0,
            "total_movimientos": len(movimientos),
        }

        return {
            "mensaje": f"Rutina DEMO '{demo_seleccionada['nombre']}' iniciada correctamente",
            "id_vehiculo": id_vehiculo,
            "id_demo": id_demo,
            "demo": demo_seleccionada["nombre"],
            "total_movimientos": len(movimientos),
        }

    async def cancelar_demo(self, id_vehiculo: int) -> dict:
        """
        Cancela de manera inmediata la rutina DEMO en curso para el vehículo.
        Detiene la secuencia, actualiza el estado a DETENER y emite evento de cancelación por WebSocket.
        """
        if not self.esta_en_ejecucion(id_vehiculo):
            raise HTTPException(
                status_code=400,
                detail=f"No hay ninguna rutina DEMO en ejecución para el vehículo {id_vehiculo}",
            )

        info = self._demos_activas[id_vehiculo]
        info["cancel_event"].set()
        task: asyncio.Task = info["task"]
        if not task.done():
            task.cancel()

        # Detener vehículo en RDS
        comandos = self.cr.obtener_comandos_vehiculo(id_vehiculo)
        cmd_detener = next((c for c in comandos if c["codigo"] == 9 or c["nombre"] == "DETENER"), None)
        id_cmd = cmd_detener["id_comando"] if cmd_detener else None

        estado_actual = self.er.obtener_estado(id_vehiculo)
        conectado = bool(estado_actual.get("conectado", False)) if estado_actual else False

        try:
            self.er.actualizar_estado(id_vehiculo, id_cmd, conectado)
        except Exception:
            pass

        # Emisión de evento WebSocket de cancelación
        evento_cancel = {
            "evento": "DEMO_CANCELADA",
            "id_vehiculo": id_vehiculo,
            "id_demo": info["id_demo"],
            "demo": info["demo_nombre"],
            "motivo": "Cancelación solicitada por el usuario",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self.ws.enviar_a_vehiculo(id_vehiculo, evento_cancel)

        if id_vehiculo in self._demos_activas:
            del self._demos_activas[id_vehiculo]

        return {
            "mensaje": f"Rutina DEMO para el vehículo {id_vehiculo} cancelada exitosamente",
            "id_vehiculo": id_vehiculo,
            "id_demo": info["id_demo"],
        }

    async def _ejecutar_secuencia(
        self,
        id_vehiculo: int,
        vehiculo: dict,
        demo: dict,
        movimientos: list[dict],
        cancel_event: asyncio.Event,
        factor_tiempo: float = 1.0,
    ):
        """Bucle asíncrono no bloqueante que recorre cada paso de la DEMO."""
        id_demo = demo["id_demo"]
        total = len(movimientos)

        estado_actual = self.er.obtener_estado(id_vehiculo)
        conectado = bool(estado_actual.get("conectado", False)) if estado_actual else False

        # 1. Evento de inicio por WebSocket
        evento_inicio = {
            "evento": "DEMO_INICIO",
            "id_vehiculo": id_vehiculo,
            "vehiculo": vehiculo["nombre"],
            "id_demo": id_demo,
            "demo": demo["nombre"],
            "total_movimientos": total,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self.ws.enviar_a_vehiculo(id_vehiculo, evento_inicio)

        try:
            for indice, mov in enumerate(movimientos, start=1):
                if cancel_event.is_set():
                    break

                if id_vehiculo in self._demos_activas:
                    self._demos_activas[id_vehiculo]["paso_actual"] = indice

                # Regla 5: Actualizar estado en RDS conforme avance la DEMO (SIN registrar historial)
                self.er.actualizar_estado(
                    id_vehiculo=id_vehiculo,
                    id_comando=mov["id_comando"],
                    conectado=conectado,
                )

                # Regla 4: Emitir evento de movimiento por WebSocket
                evento_mov = {
                    "evento": "DEMO_MOVIMIENTO",
                    "id_vehiculo": id_vehiculo,
                    "vehiculo": vehiculo["nombre"],
                    "id_demo": id_demo,
                    "orden": mov["orden"],
                    "paso_actual": indice,
                    "total_movimientos": total,
                    "id_comando": mov["id_comando"],
                    "comando": mov["comando"],
                    "codigo": mov["codigo"],
                    "duracion_ms": mov["duracion_ms"],
                    "pausa_ms": mov["pausa_ms"],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                await self.ws.enviar_a_vehiculo(id_vehiculo, evento_mov)

                # Regla 3 y 7: Temporización no bloqueante respetando duracion_ms
                duracion_seg = (mov["duracion_ms"] / 1000.0) * factor_tiempo
                await asyncio.sleep(duracion_seg)

                if cancel_event.is_set():
                    break

                # Pausa entre movimientos respetando pausa_ms
                if mov.get("pausa_ms", 0) > 0:
                    pausa_seg = (mov["pausa_ms"] / 1000.0) * factor_tiempo
                    await asyncio.sleep(pausa_seg)

            if not cancel_event.is_set():
                # Regla 4: Emitir evento de finalización exitosa por WebSocket
                evento_fin = {
                    "evento": "DEMO_FIN",
                    "id_vehiculo": id_vehiculo,
                    "vehiculo": vehiculo["nombre"],
                    "id_demo": id_demo,
                    "demo": demo["nombre"],
                    "movimientos_completados": total,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                await self.ws.enviar_a_vehiculo(id_vehiculo, evento_fin)

        except asyncio.CancelledError:
            # Cancelación de la tarea asíncrona
            pass
        except Exception as exc:
            # Comunicación de error por WebSocket
            evento_err = {
                "evento": "DEMO_ERROR",
                "id_vehiculo": id_vehiculo,
                "id_demo": id_demo,
                "error": str(exc),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            await self.ws.enviar_a_vehiculo(id_vehiculo, evento_err)
        finally:
            if id_vehiculo in self._demos_activas:
                del self._demos_activas[id_vehiculo]
