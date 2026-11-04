from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from app.models.estado import Estado
from app.models.schemas import (
    VehiculoResponse,
    VehiculoCreate,
    VehiculoUpdate,
    ComandoResponse,
    ComandoCreate,
    ComandoUpdate,
    EstadoVehiculoResponse,
    HistorialResponse,
    DemoResponse,
    DemoCreate,
    DemoUpdate,
    MovimientoDemoResponse,
    MovimientoDemoCreate,
    MovimientoDemoUpdate,
    MovimientoRequest,
    MovimientoGeneralRequest,
    MovimientoIndividualResponse,
    MensajeResponse,
)
from app.services.status_service import StatusService
from app.services.vehiculo_service import VehiculoService
from app.services.demo_execution_service import DemoExecutionService
from app.websocket.websocket_manager import WebSocketManager

app = FastAPI(
    title="Servidor IoT",
    description="API HTTP y WebSocket para control y monitoreo de vehículos IoT conectada a Amazon RDS (21 Stored Procedures integrados).",
    version="1.0",
)

websocket_manager = WebSocketManager()
status_service = StatusService()
vehiculo_service = VehiculoService()
demo_service = DemoExecutionService(ws_manager=websocket_manager)


# =============================================================================
# 1. VEHÍCULOS (CRUD - 5 STORED PROCEDURES)
# =============================================================================

@app.get(
    "/vehiculos",
    response_model=list[VehiculoResponse],
    tags=["Vehículos"],
    summary="Listar todos los vehículos (sp_obtener_vehiculos)",
    description="Consulta y retorna todos los vehículos registrados usando sp_obtener_vehiculos.",
)
def listar_vehiculos():
    return vehiculo_service.listar_vehiculos()


@app.post(
    "/vehiculos",
    response_model=VehiculoResponse,
    status_code=201,
    tags=["Vehículos"],
    summary="Crear un nuevo vehículo (sp_crear_vehiculo)",
    description="Registra un nuevo vehículo en el catálogo usando sp_crear_vehiculo.",
)
def crear_vehiculo(request: VehiculoCreate):
    return vehiculo_service.crear_vehiculo(
        nombre=request.nombre,
        modelo=request.modelo,
        descripcion=request.descripcion,
        microcontrolador=request.microcontrolador,
    )


@app.get(
    "/vehiculos/{id_vehiculo}",
    response_model=VehiculoResponse,
    tags=["Vehículos"],
    summary="Consultar vehículo por ID (sp_obtener_vehiculo)",
    description="Consulta y retorna los datos de un vehículo específico usando sp_obtener_vehiculo.",
)
def obtener_vehiculo(id_vehiculo: int):
    return vehiculo_service.obtener_vehiculo(id_vehiculo)


@app.put(
    "/vehiculos/{id_vehiculo}",
    response_model=VehiculoResponse,
    tags=["Vehículos"],
    summary="Actualizar vehículo (sp_actualizar_vehiculo)",
    description="Actualiza los atributos de un vehículo usando sp_actualizar_vehiculo.",
)
def actualizar_vehiculo(id_vehiculo: int, request: VehiculoUpdate):
    return vehiculo_service.actualizar_vehiculo(
        id_vehiculo=id_vehiculo,
        nombre=request.nombre,
        modelo=request.modelo,
        descripcion=request.descripcion,
        microcontrolador=request.microcontrolador,
        activo=request.activo,
    )


@app.delete(
    "/vehiculos/{id_vehiculo}",
    response_model=MensajeResponse,
    tags=["Vehículos"],
    summary="Eliminar vehículo (sp_eliminar_vehiculo)",
    description="Elimina físicamente un vehículo y sus registros relacionados en cascada usando sp_eliminar_vehiculo.",
)
def eliminar_vehiculo(id_vehiculo: int):
    return vehiculo_service.eliminar_vehiculo(id_vehiculo)


# =============================================================================
# 2. COMANDOS (CRUD - 4 STORED PROCEDURES)
# =============================================================================

@app.get(
    "/vehiculos/{id_vehiculo}/comandos",
    response_model=list[ComandoResponse],
    tags=["Comandos"],
    summary="Listar comandos de un vehículo (sp_obtener_comandos_vehiculo)",
    description="Consulta los comandos válidos de un vehículo usando sp_obtener_comandos_vehiculo.",
)
def obtener_comandos(id_vehiculo: int):
    return vehiculo_service.obtener_comandos(id_vehiculo)


@app.post(
    "/vehiculos/{id_vehiculo}/comandos",
    status_code=201,
    tags=["Comandos"],
    summary="Crear comando para un vehículo (sp_crear_comando)",
    description="Registra un nuevo comando asociado al vehículo indicado usando sp_crear_comando.",
)
def crear_comando(id_vehiculo: int, request: ComandoCreate):
    return vehiculo_service.crear_comando(
        id_vehiculo=id_vehiculo,
        nombre=request.nombre,
        codigo=request.codigo,
        descripcion=request.descripcion,
    )


@app.put(
    "/comandos/{id_comando}",
    tags=["Comandos"],
    summary="Actualizar comando (sp_actualizar_comando)",
    description="Actualiza atributos y estado activo de un comando usando sp_actualizar_comando.",
)
def actualizar_comando(id_comando: int, request: ComandoUpdate):
    return vehiculo_service.actualizar_comando(
        id_comando=id_comando,
        nombre=request.nombre,
        codigo=request.codigo,
        descripcion=request.descripcion,
        activo=request.activo,
    )


@app.delete(
    "/comandos/{id_comando}",
    response_model=MensajeResponse,
    tags=["Comandos"],
    summary="Eliminar comando (sp_eliminar_comando)",
    description="Elimina físicamente un comando usando sp_eliminar_comando.",
)
def eliminar_comando(id_comando: int):
    return vehiculo_service.eliminar_comando(id_comando)


# =============================================================================
# 3. ESTADO (2 STORED PROCEDURES)
# =============================================================================

@app.get(
    "/vehiculos/{id_vehiculo}/estado",
    response_model=EstadoVehiculoResponse,
    tags=["Estado"],
    summary="Consultar estado actual de un vehículo (sp_obtener_estado)",
    description="Consulta el estado de conexión y último comando ejecutado usando sp_obtener_estado.",
)
def obtener_estado_vehiculo(id_vehiculo: int):
    return vehiculo_service.obtener_estado(id_vehiculo)


# =============================================================================
# 4. HISTORIAL (2 STORED PROCEDURES)
# =============================================================================

@app.get(
    "/vehiculos/{id_vehiculo}/historial",
    response_model=list[HistorialResponse],
    tags=["Historial"],
    summary="Consultar historial de movimientos (sp_obtener_historial)",
    description="Retorna como máximo los 10 movimientos individuales más recientes (ordenados descendente) usando sp_obtener_historial.",
)
def obtener_historial_vehiculo(id_vehiculo: int):
    return vehiculo_service.obtener_historial(id_vehiculo, limit=10)


# =============================================================================
# 5. MOVIMIENTOS INDIVIDUALES (TRANSACCIÓN ATÓMICA: sp_actualizar_estado + sp_registrar_historial)
# =============================================================================

@app.post(
    "/vehiculos/{id_vehiculo}/movimiento",
    response_model=MovimientoIndividualResponse,
    tags=["Movimientos"],
    summary="Ejecutar movimiento individual para un vehículo",
    description="Valida vehículo y comando, ejecuta atómicamente sp_actualizar_estado y sp_registrar_historial en RDS, y emite evento por WebSocket tras el commit exitoso.",
)
async def ejecutar_movimiento(id_vehiculo: int, request: MovimientoRequest):
    resultado = vehiculo_service.ejecutar_movimiento_individual(
        id_vehiculo=id_vehiculo,
        id_comando=request.id_comando,
        codigo=request.codigo,
        origen=request.origen,
    )
    evento_ws = {
        "evento": "MOVIMIENTO_INDIVIDUAL",
        "id_vehiculo": resultado["id_vehiculo"],
        "vehiculo": resultado["vehiculo"],
        "id_comando": resultado["id_comando"],
        "comando": resultado["comando"],
        "codigo": resultado["codigo"],
        "origen": resultado["origen"],
        "conectado": resultado["conectado"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await websocket_manager.enviar_a_vehiculo(id_vehiculo, evento_ws)
    return resultado


@app.post(
    "/movimiento",
    response_model=MovimientoIndividualResponse,
    tags=["Movimientos"],
    summary="Ejecutar movimiento individual general",
    description="Endpoint alternativo que recibe id_vehiculo en el cuerpo de la petición.",
)
async def ejecutar_movimiento_general(request: MovimientoGeneralRequest):
    return await ejecutar_movimiento(
        id_vehiculo=request.id_vehiculo,
        request=MovimientoRequest(
            id_comando=request.id_comando,
            codigo=request.codigo,
            origen=request.origen,
        ),
    )


# =============================================================================
# 6. DEMOS Y MOVIMIENTOS DE DEMO (CRUD - 8 STORED PROCEDURES)
# =============================================================================

@app.get(
    "/vehiculos/{id_vehiculo}/demos",
    response_model=list[DemoResponse],
    tags=["DEMO"],
    summary="Listar rutinas DEMO de un vehículo (sp_obtener_demos)",
    description="Consulta y retorna las rutinas DEMO de un vehículo usando sp_obtener_demos.",
)
def obtener_demos(id_vehiculo: int):
    return vehiculo_service.obtener_demos(id_vehiculo)


@app.post(
    "/vehiculos/{id_vehiculo}/demos",
    status_code=201,
    tags=["DEMO"],
    summary="Crear rutina DEMO para un vehículo (sp_crear_demo)",
    description="Registra una nueva rutina DEMO usando sp_crear_demo.",
)
def crear_demo(id_vehiculo: int, request: DemoCreate):
    return vehiculo_service.crear_demo(
        id_vehiculo=id_vehiculo,
        nombre=request.nombre,
        descripcion=request.descripcion,
    )


@app.put(
    "/demos/{id_demo}",
    tags=["DEMO"],
    summary="Actualizar rutina DEMO (sp_actualizar_demo)",
    description="Actualiza atributos y estado activo de una DEMO usando sp_actualizar_demo.",
)
def actualizar_demo(id_demo: int, request: DemoUpdate):
    return vehiculo_service.actualizar_demo(
        id_demo=id_demo,
        nombre=request.nombre,
        descripcion=request.descripcion,
        activo=request.activo,
    )


@app.delete(
    "/demos/{id_demo}",
    response_model=MensajeResponse,
    tags=["DEMO"],
    summary="Eliminar rutina DEMO (sp_eliminar_demo)",
    description="Elimina una rutina DEMO y sus movimientos en cascada usando sp_eliminar_demo.",
)
def eliminar_demo(id_demo: int):
    return vehiculo_service.eliminar_demo(id_demo)


@app.get(
    "/demos/{id_demo}/movimientos",
    response_model=list[MovimientoDemoResponse],
    tags=["DEMO"],
    summary="Listar movimientos de una DEMO (sp_obtener_movimientos_demo)",
    description="Consulta la secuencia de movimientos ordenados de una DEMO usando sp_obtener_movimientos_demo.",
)
def obtener_movimientos_demo(id_demo: int):
    return vehiculo_service.obtener_movimientos_demo(id_demo)


@app.post(
    "/demos/{id_demo}/movimientos",
    status_code=201,
    tags=["DEMO"],
    summary="Agregar movimiento a una DEMO (sp_agregar_movimiento_demo)",
    description="Añade un paso a la secuencia DEMO usando sp_agregar_movimiento_demo.",
)
def agregar_movimiento_demo(id_demo: int, request: MovimientoDemoCreate):
    return vehiculo_service.agregar_movimiento_demo(
        id_demo=id_demo,
        id_comando=request.id_comando,
        orden=request.orden,
        duracion_ms=request.duracion_ms,
        pausa_ms=request.pausa_ms,
    )


@app.put(
    "/demos/movimientos/{id_demo_movimiento}",
    tags=["DEMO"],
    summary="Actualizar movimiento de una DEMO (sp_actualizar_movimiento_demo)",
    description="Actualiza los parámetros de un paso de movimiento usando sp_actualizar_movimiento_demo.",
)
def actualizar_movimiento_demo(id_demo_movimiento: int, request: MovimientoDemoUpdate):
    return vehiculo_service.actualizar_movimiento_demo(
        id_demo_movimiento=id_demo_movimiento,
        id_comando=request.id_comando,
        orden=request.orden,
        duracion_ms=request.duracion_ms,
        pausa_ms=request.pausa_ms,
    )


@app.delete(
    "/demos/movimientos/{id_demo_movimiento}",
    response_model=MensajeResponse,
    tags=["DEMO"],
    summary="Eliminar movimiento de una DEMO (sp_eliminar_movimiento_demo)",
    description="Elimina un paso de la secuencia DEMO usando sp_eliminar_movimiento_demo.",
)
def eliminar_movimiento_demo(id_demo_movimiento: int):
    return vehiculo_service.eliminar_movimiento_demo(id_demo_movimiento)


# =============================================================================
# 7. EJECUCIÓN TEMPORIZADA Y CANCELACIÓN DE DEMO
# =============================================================================

@app.post(
    "/vehiculos/{id_vehiculo}/demos/{id_demo}/iniciar",
    tags=["DEMO"],
    summary="Iniciar ejecución temporizada de rutina DEMO",
    description="Inicia la secuencia automática de movimientos respetando duracion_ms y pausa_ms de RDS. Emite inicio, movimientos y fin por WebSocket, actualizando estado sin registrar historial. Retorna 409 si ya hay una demo activa.",
)
async def iniciar_demo(id_vehiculo: int, id_demo: int, factor_tiempo: float = 1.0):
    return await demo_service.iniciar_demo(
        id_vehiculo=id_vehiculo,
        id_demo=id_demo,
        factor_tiempo=factor_tiempo,
    )


@app.post(
    "/demos/{id_demo}/iniciar",
    tags=["DEMO"],
    summary="Iniciar rutina DEMO por ID",
    description="Inicia la rutina DEMO deduciendo el vehículo asociado a la misma.",
)
async def iniciar_demo_directa(id_demo: int, factor_tiempo: float = 1.0):
    with demo_service.dr.db.get_cursor() as cursor:
        cursor.execute("SELECT id_vehiculo FROM demos WHERE id_demo = %s", (id_demo,))
        fila = cursor.fetchone()
        if not fila:
            raise HTTPException(status_code=404, detail=f"Rutina DEMO con ID {id_demo} no encontrada")
        id_vehiculo = fila["id_vehiculo"]

    return await demo_service.iniciar_demo(
        id_vehiculo=id_vehiculo,
        id_demo=id_demo,
        factor_tiempo=factor_tiempo,
    )


@app.post(
    "/vehiculos/{id_vehiculo}/demos/cancelar",
    tags=["DEMO"],
    summary="Cancelar ejecución de rutina DEMO activa",
    description="Detiene inmediatamente la secuencia DEMO en curso, actualiza el estado a DETENER y notifica la cancelación vía WebSocket.",
)
async def cancelar_demo(id_vehiculo: int):
    return await demo_service.cancelar_demo(id_vehiculo)


@app.post(
    "/demos/cancelar",
    tags=["DEMO"],
    summary="Cancelar rutina DEMO activa (vehículo 1)",
)
async def cancelar_demo_legacy():
    return await demo_service.cancelar_demo(id_vehiculo=1)


@app.get(
    "/vehiculos/{id_vehiculo}/demos/estado-ejecucion",
    tags=["DEMO"],
    summary="Consultar si hay una rutina DEMO ejecutándose",
)
def estado_ejecucion_demo(id_vehiculo: int):
    activa = demo_service.esta_en_ejecucion(id_vehiculo)
    info = demo_service.obtener_info_activa(id_vehiculo)
    return {
        "en_ejecucion": activa,
        "detalle": info,
    }


# =============================================================================
# 8. WEBSOCKET
# =============================================================================

@app.websocket("/ws/{id_vehiculo}")
async def websocket_vehiculo_endpoint(websocket: WebSocket, id_vehiculo: int):
    try:
        vehiculo = vehiculo_service.obtener_vehiculo(id_vehiculo)
    except Exception:
        await websocket.accept()
        await websocket.close(code=4004, reason=f"Vehículo {id_vehiculo} no encontrado")
        return

    await websocket_manager.conectar(websocket, id_vehiculo=id_vehiculo)

    try:
        estado_db = vehiculo_service.obtener_estado(id_vehiculo)
        mensaje_inicial = {
            "evento": "ESTADO_INICIAL",
            "id_vehiculo": id_vehiculo,
            "vehiculo": vehiculo["nombre"],
            "id_comando": estado_db.get("id_comando"),
            "comando": estado_db.get("comando"),
            "codigo": estado_db.get("codigo"),
            "conectado": bool(estado_db.get("conectado", False)),
            "fecha_actualizacion": str(estado_db.get("fecha_actualizacion")),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await websocket.send_json(mensaje_inicial)
    except Exception:
        await websocket.send_json({
            "evento": "ESTADO_INICIAL",
            "id_vehiculo": id_vehiculo,
            "vehiculo": vehiculo["nombre"],
            "estado": "SIN_ESTADO",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.desconectar(websocket, id_vehiculo=id_vehiculo)


@app.websocket("/ws")
async def websocket_legacy_endpoint(websocket: WebSocket):
    await websocket_vehiculo_endpoint(websocket, id_vehiculo=1)


# =============================================================================
# 9. MONITOREO / COMPATIBILIDAD
# =============================================================================

@app.get(
    "/status",
    tags=["Monitoreo"],
    summary="Estado rápido (compatibilidad)",
)
@app.get(
    "/estado",
    tags=["Monitoreo"],
    summary="Estado rápido (compatibilidad)",
)
def obtener_estado_legacy():
    return status_service.obtener_estado()


@app.post("/status", tags=["Monitoreo"])
@app.post("/estado", tags=["Monitoreo"])
async def cambiar_estado(estado: Estado):
    try:
        resultado = vehiculo_service.ejecutar_movimiento_individual(
            id_vehiculo=1,
            codigo=estado.ESTADO,
            origen="STATUS_LEGACY",
        )
        status_service.guardar_estado(estado.ESTADO)
        evento_ws = {
            "evento": "MOVIMIENTO_INDIVIDUAL",
            "id_vehiculo": 1,
            "vehiculo": resultado["vehiculo"],
            "id_comando": resultado["id_comando"],
            "comando": resultado["comando"],
            "codigo": resultado["codigo"],
            "origen": resultado["origen"],
            "conectado": resultado["conectado"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await websocket_manager.enviar_a_vehiculo(1, evento_ws)
        return {"ESTADO": estado.ESTADO}
    except Exception:
        nuevo_estado = status_service.guardar_estado(estado.ESTADO)
        await websocket_manager.enviar_a_todos(nuevo_estado)
        return nuevo_estado


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000)
