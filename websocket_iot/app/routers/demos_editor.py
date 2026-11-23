from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.core.dependencies import check_vehicle_ownership, get_current_user, require_roles
from app.database.connection import db_manager
from app.models.schemas import DemoDetalleResponse, DemoEditorRequest, MovimientoDemoResponse
from app.repositories.auditoria_repository import AuditoriaRepository
from app.repositories.demo_repository import DemoRepository

router = APIRouter(prefix="/demos/editor", tags=["Editor de Demos"])

demo_repo = DemoRepository()
auditoria_repo = AuditoriaRepository()


@router.get(
    "/vehiculo/{id_vehiculo}",
    response_model=list[DemoDetalleResponse],
    summary="Listar rutinas demo con movimientos para un vehículo",
)
def listar_demos_vehiculo(
    id_vehiculo: int,
    current_user: dict = Depends(get_current_user),
):
    """Retorna las rutinas de fábrica y privadas correspondientes a un vehículo con sus pasos ordenados."""
    check_vehicle_ownership(id_vehiculo, current_user, is_write=False)

    with db_manager.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT d.id_demo, d.id_vehiculo, d.id_usuario, d.tipo_demo, d.nombre, d.descripcion, d.activo
            FROM demos d
            WHERE d.id_vehiculo = %s
            ORDER BY d.id_demo
            """,
            (id_vehiculo,),
        )
        demos = cursor.fetchall()

    resultado = []
    for d in demos:
        movs = demo_repo.obtener_movimientos_demo(d["id_demo"])
        resultado.append(
            DemoDetalleResponse(
                id_demo=d["id_demo"],
                id_vehiculo=d["id_vehiculo"],
                id_usuario=d.get("id_usuario"),
                tipo_demo=d.get("tipo_demo", "FABRICA"),
                nombre=d["nombre"],
                descripcion=d.get("descripcion"),
                activo=bool(d.get("activo", True)),
                movimientos=[
                    MovimientoDemoResponse(
                        id_demo_movimiento=m["id_demo_movimiento"],
                        orden=m["orden"],
                        id_comando=m["id_comando"],
                        comando=m.get("comando"),
                        codigo=m.get("codigo"),
                        duracion_ms=m["duracion_ms"],
                        pausa_ms=m.get("pausa_ms", 0),
                    )
                    for m in movs
                ],
            )
        )
    return resultado


@router.post(
    "",
    response_model=dict,
    status_code=201,
    summary="Guardar nueva rutina demo personalizada con pasos ordenados",
)
def crear_demo_personalizada(
    request: DemoEditorRequest,
    req: Request,
    current_user: dict = Depends(get_current_user),
):
    """Crea una rutina demo personalizada con su secuencia de pasos en una única operación transaccional."""
    check_vehicle_ownership(request.id_vehiculo, current_user, is_write=True)

    tipo_demo = "FABRICA" if current_user["rol"] == "ADMINISTRADOR" else "PRIVADA"
    id_usuario = current_user["id_usuario"] if current_user["rol"] != "ADMINISTRADOR" else None

    with db_manager.get_cursor(commit=True) as cursor:
        cursor.execute(
            """
            INSERT INTO demos (id_vehiculo, id_usuario, tipo_demo, nombre, descripcion, activo)
            VALUES (%s, %s, %s, %s, %s, TRUE)
            """,
            (request.id_vehiculo, id_usuario, tipo_demo, request.nombre, request.descripcion),
        )
        id_demo = cursor.lastrowid

        for idx, paso in enumerate(request.pasos, start=1):
            cursor.execute(
                """
                INSERT INTO demo_movimientos (id_demo, id_comando, orden, duracion_ms, pausa_ms)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (id_demo, paso.id_comando, idx, paso.duracion_ms, paso.pausa_ms),
            )

    client_ip = req.client.host if req.client else "unknown"
    auditoria_repo.registrar(
        id_usuario=current_user["id_usuario"],
        accion="CREAR_DEMO_EDITOR",
        entidad="demos",
        id_entidad=id_demo,
        detalle={"nombre": request.nombre, "tipo_demo": tipo_demo, "total_pasos": len(request.pasos)},
        ip=client_ip,
    )

    return {"mensaje": "Rutina demo personalizada creada correctamente", "id_demo": id_demo}


@router.delete(
    "/{id_demo}",
    response_model=dict,
    summary="Eliminar rutina demo personalizada",
)
def eliminar_demo(
    id_demo: int,
    req: Request,
    current_user: dict = Depends(get_current_user),
):
    """Permite al propietario de la demo o al Administrador eliminar una rutina personalizada."""
    with db_manager.get_cursor() as cursor:
        cursor.execute("SELECT id_demo, id_vehiculo, id_usuario, tipo_demo FROM demos WHERE id_demo = %s", (id_demo,))
        demo = cursor.fetchone()

    if not demo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rutina demo no encontrada")

    if current_user["rol"] != "ADMINISTRADOR" and demo.get("id_usuario") != current_user["id_usuario"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene autorización para eliminar una rutina creada por otro usuario.",
        )

    demo_repo.eliminar_demo(id_demo)

    client_ip = req.client.host if req.client else "unknown"
    auditoria_repo.registrar(
        id_usuario=current_user["id_usuario"],
        accion="ELIMINAR_DEMO_EDITOR",
        entidad="demos",
        id_entidad=id_demo,
        detalle={"id_demo": id_demo},
        ip=client_ip,
    )

    return {"mensaje": "Rutina demo eliminada correctamente", "id_demo": id_demo}
