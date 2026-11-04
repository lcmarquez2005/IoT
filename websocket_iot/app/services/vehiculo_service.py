from fastapi import HTTPException
from app.repositories import (
    VehiculoRepository,
    ComandoRepository,
    EstadoRepository,
    HistorialRepository,
    DemoRepository,
)


class VehiculoService:
    """Capa de servicio y lógica de negocio para operaciones sobre vehículos e IoT."""

    def __init__(
        self,
        vehiculo_repo: VehiculoRepository | None = None,
        comando_repo: ComandoRepository | None = None,
        estado_repo: EstadoRepository | None = None,
        historial_repo: HistorialRepository | None = None,
        demo_repo: DemoRepository | None = None,
    ):
        self.vr = vehiculo_repo or VehiculoRepository()
        self.cr = comando_repo or ComandoRepository()
        self.er = estado_repo or EstadoRepository()
        self.hr = historial_repo or HistorialRepository()
        self.dr = demo_repo or DemoRepository()

    def listar_vehiculos(self) -> list[dict]:
        """Obtiene el catálogo de todos los vehículos registrados."""
        return self.vr.obtener_vehiculos()

    def obtener_vehiculo(self, id_vehiculo: int) -> dict:
        """Obtiene un vehículo específico por su identificador. Retorna 404 si no existe."""
        vehiculo = self.vr.obtener_vehiculo(id_vehiculo)
        if not vehiculo:
            raise HTTPException(
                status_code=404,
                detail=f"Vehículo con ID {id_vehiculo} no encontrado",
            )
        return vehiculo

    def obtener_comandos(self, id_vehiculo: int) -> list[dict]:
        """Obtiene la lista de comandos disponibles para el vehículo especificado."""
        self.obtener_vehiculo(id_vehiculo)
        return self.cr.obtener_comandos_vehiculo(id_vehiculo)

    def obtener_estado(self, id_vehiculo: int) -> dict:
        """Obtiene el estado actual de conectividad y último comando del vehículo."""
        self.obtener_vehiculo(id_vehiculo)
        estado = self.er.obtener_estado(id_vehiculo)
        if not estado:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontró estado registrado para el vehículo {id_vehiculo}",
            )
        return estado

    def obtener_historial(self, id_vehiculo: int, limit: int = 10) -> list[dict]:
        """
        Obtiene los movimientos del historial respetando el límite máximo
        de los 10 más recientes, del más nuevo al más antiguo.
        """
        self.obtener_vehiculo(id_vehiculo)
        return self.hr.obtener_historial(id_vehiculo, limit=limit)

    def obtener_demos(self, id_vehiculo: int) -> list[dict]:
        """Obtiene el catálogo de secuencias DEMO configuradas para un vehículo."""
        self.obtener_vehiculo(id_vehiculo)
        return self.dr.obtener_demos(id_vehiculo)

    def obtener_movimientos_demo(self, id_demo: int) -> list[dict]:
        """Obtiene los pasos de movimiento ordenados que componen una DEMO."""
        # Verificar existencia de la demo
        with self.dr.db.get_cursor() as cursor:
            cursor.execute("SELECT id_demo FROM demos WHERE id_demo = %s", (id_demo,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail=f"Rutina DEMO con ID {id_demo} no encontrada",
                )
        return self.dr.obtener_movimientos_demo(id_demo)

    def ejecutar_movimiento_individual(
        self,
        id_vehiculo: int,
        id_comando: int | None = None,
        codigo: int | None = None,
        origen: str = "MANUAL",
        simulate_failure: bool = False,
    ) -> dict:
        """
        Ejecuta un movimiento individual cumpliendo estrictamente con las reglas de negocio:
        1. Valida que el vehículo exista y esté activo.
        2. Valida que el comando exista, esté activo y pertenezca al vehículo.
        3. No asume conexión HTTP como conectado: conserva el estado real del vehículo.
        4. Ejecuta sp_actualizar_estado y sp_registrar_historial atómicamente dentro de la misma transacción.
        5. Aplica commit solo si ambas operaciones fueron exitosas.
        6. Si algo falla, revierte la transacción con rollback y no emite evento.
        """
        if id_comando is None and codigo is None:
            raise HTTPException(
                status_code=400,
                detail="Debe proporcionar 'id_comando' o 'codigo' del comando a ejecutar",
            )

        # Regla 2: Validar que el vehículo exista y esté activo
        vehiculo = self.obtener_vehiculo(id_vehiculo)
        if not vehiculo.get("activo"):
            raise HTTPException(
                status_code=400,
                detail=f"El vehículo con ID {id_vehiculo} está inactivo y no acepta comandos",
            )

        # Regla 3: Validar que el comando exista, esté activo y pertenezca al vehículo
        comandos = self.cr.obtener_comandos_vehiculo(id_vehiculo)
        comando_seleccionado = None
        for c in comandos:
            if id_comando is not None and c["id_comando"] == id_comando:
                comando_seleccionado = c
                break
            elif codigo is not None and c["codigo"] == codigo:
                comando_seleccionado = c
                break

        if not comando_seleccionado:
            criterio = f"id_comando={id_comando}" if id_comando is not None else f"codigo={codigo}"
            raise HTTPException(
                status_code=404,
                detail=f"Comando con {criterio} no encontrado o no pertenece al vehículo {id_vehiculo}",
            )

        if not comando_seleccionado.get("activo"):
            raise HTTPException(
                status_code=400,
                detail=f"El comando '{comando_seleccionado['nombre']}' está inactivo",
            )

        # Regla 7: No asumir que un vehículo está conectado solo porque se recibió una petición HTTP.
        # Conservar el estado de conexión actual registrado en la base de datos.
        estado_actual = self.er.obtener_estado(id_vehiculo)
        conectado = bool(estado_actual.get("conectado", False)) if estado_actual else False

        # Regla 4: Transacción atómica en RDS
        conn = self.vr.db.get_connection()
        try:
            with conn.cursor() as cursor:
                # 1. Actualizar estado
                cursor.callproc(
                    "sp_actualizar_estado",
                    (id_vehiculo, comando_seleccionado["id_comando"], conectado),
                )
                # 2. Registrar en historial
                cursor.callproc(
                    "sp_registrar_historial",
                    (id_vehiculo, comando_seleccionado["id_comando"], origen),
                )
                if simulate_failure:
                    raise RuntimeError("Fallo forzado para probar rollback atómico")

            # Regla 5: Confirmar la transacción
            conn.commit()
        except Exception as exc:
            # Regla 6: Revertir si ocurre un fallo
            conn.rollback()
            raise exc
        finally:
            conn.close()

        # Obtener estado recién confirmado
        estado_post = self.er.obtener_estado(id_vehiculo)

        return {
            "mensaje": "Movimiento individual ejecutado y registrado correctamente",
            "id_vehiculo": id_vehiculo,
            "vehiculo": vehiculo["nombre"],
            "id_comando": comando_seleccionado["id_comando"],
            "comando": comando_seleccionado["nombre"],
            "codigo": comando_seleccionado["codigo"],
            "origen": origen,
            "conectado": conectado,
            "fecha_actualizacion": estado_post["fecha_actualizacion"] if estado_post else None,
        }

    # =========================================================================
    # OPERACIONES ADMINISTRATIVAS CRUD (12 STORED PROCEDURES RESTANTES)
    # =========================================================================

    def crear_vehiculo(
        self,
        nombre: str,
        modelo: str | None = None,
        descripcion: str | None = None,
        microcontrolador: str | None = None,
    ) -> dict:
        """Invoca sp_crear_vehiculo."""
        nuevo_id = self.vr.crear_vehiculo(nombre, modelo, descripcion, microcontrolador)
        return self.obtener_vehiculo(nuevo_id)

    def actualizar_vehiculo(
        self,
        id_vehiculo: int,
        nombre: str,
        modelo: str | None,
        descripcion: str | None,
        microcontrolador: str | None,
        activo: bool,
    ) -> dict:
        """Invoca sp_actualizar_vehiculo."""
        self.obtener_vehiculo(id_vehiculo)
        self.vr.actualizar_vehiculo(
            id_vehiculo, nombre, modelo, descripcion, microcontrolador, activo
        )
        return self.obtener_vehiculo(id_vehiculo)

    def eliminar_vehiculo(self, id_vehiculo: int) -> dict:
        """Invoca sp_eliminar_vehiculo."""
        self.obtener_vehiculo(id_vehiculo)
        self.vr.eliminar_vehiculo(id_vehiculo)
        return {"mensaje": f"Vehículo {id_vehiculo} eliminado exitosamente", "id": id_vehiculo}

    def crear_comando(
        self,
        id_vehiculo: int,
        nombre: str,
        codigo: int,
        descripcion: str | None = None,
    ) -> dict:
        """Invoca sp_crear_comando."""
        self.obtener_vehiculo(id_vehiculo)
        nuevo_id = self.cr.crear_comando(id_vehiculo, nombre, codigo, descripcion)
        return {
            "mensaje": f"Comando '{nombre}' creado exitosamente",
            "id_comando": nuevo_id,
            "id_vehiculo": id_vehiculo,
            "nombre": nombre,
            "codigo": codigo,
            "descripcion": descripcion,
        }

    def actualizar_comando(
        self,
        id_comando: int,
        nombre: str,
        codigo: int,
        descripcion: str | None,
        activo: bool,
    ) -> dict:
        """Invoca sp_actualizar_comando."""
        self.cr.actualizar_comando(id_comando, nombre, codigo, descripcion, activo)
        return {
            "mensaje": f"Comando {id_comando} actualizado exitosamente",
            "id_comando": id_comando,
            "nombre": nombre,
            "codigo": codigo,
            "descripcion": descripcion,
            "activo": activo,
        }

    def eliminar_comando(self, id_comando: int) -> dict:
        """Invoca sp_eliminar_comando."""
        self.cr.eliminar_comando(id_comando)
        return {"mensaje": f"Comando {id_comando} eliminado exitosamente", "id": id_comando}

    def crear_demo(
        self,
        id_vehiculo: int,
        nombre: str,
        descripcion: str | None = None,
    ) -> dict:
        """Invoca sp_crear_demo."""
        self.obtener_vehiculo(id_vehiculo)
        nuevo_id = self.dr.crear_demo(id_vehiculo, nombre, descripcion)
        return {
            "mensaje": f"Rutina DEMO '{nombre}' creada exitosamente",
            "id_demo": nuevo_id,
            "id_vehiculo": id_vehiculo,
            "nombre": nombre,
            "descripcion": descripcion,
        }

    def actualizar_demo(
        self,
        id_demo: int,
        nombre: str,
        descripcion: str | None,
        activo: bool,
    ) -> dict:
        """Invoca sp_actualizar_demo."""
        self.dr.actualizar_demo(id_demo, nombre, descripcion, activo)
        return {
            "mensaje": f"Rutina DEMO {id_demo} actualizada exitosamente",
            "id_demo": id_demo,
            "nombre": nombre,
            "descripcion": descripcion,
            "activo": activo,
        }

    def eliminar_demo(self, id_demo: int) -> dict:
        """Invoca sp_eliminar_demo."""
        self.dr.eliminar_demo(id_demo)
        return {"mensaje": f"Rutina DEMO {id_demo} eliminada exitosamente", "id": id_demo}

    def agregar_movimiento_demo(
        self,
        id_demo: int,
        id_comando: int,
        orden: int,
        duracion_ms: int,
        pausa_ms: int = 0,
    ) -> dict:
        """Invoca sp_agregar_movimiento_demo."""
        self.dr.agregar_movimiento_demo(id_demo, id_comando, orden, duracion_ms, pausa_ms)
        return {
            "mensaje": f"Movimiento agregado a la DEMO {id_demo}",
            "id_demo": id_demo,
            "id_comando": id_comando,
            "orden": orden,
            "duracion_ms": duracion_ms,
            "pausa_ms": pausa_ms,
        }

    def actualizar_movimiento_demo(
        self,
        id_demo_movimiento: int,
        id_comando: int,
        orden: int,
        duracion_ms: int,
        pausa_ms: int = 0,
    ) -> dict:
        """Invoca sp_actualizar_movimiento_demo."""
        self.dr.actualizar_movimiento_demo(
            id_demo_movimiento, id_comando, orden, duracion_ms, pausa_ms
        )
        return {
            "mensaje": f"Movimiento {id_demo_movimiento} actualizado exitosamente",
            "id_demo_movimiento": id_demo_movimiento,
            "id_comando": id_comando,
            "orden": orden,
            "duracion_ms": duracion_ms,
            "pausa_ms": pausa_ms,
        }

    def eliminar_movimiento_demo(self, id_demo_movimiento: int) -> dict:
        """Invoca sp_eliminar_movimiento_demo."""
        self.dr.eliminar_movimiento_demo(id_demo_movimiento)
        return {
            "mensaje": f"Movimiento {id_demo_movimiento} eliminado exitosamente",
            "id": id_demo_movimiento,
        }

