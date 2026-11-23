from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.core.dependencies import get_current_user, require_roles
from app.models.schemas import AsignarUnidadRequest, UnidadFisicaCreate, UnidadFisicaResponse
from app.repositories.auditoria_repository import AuditoriaRepository
from app.repositories.unidad_repository import UnidadRepository

router = APIRouter(prefix="", tags=["Unidades Físicas e Inventario"])

unidad_repo = UnidadRepository()
auditoria_repo = AuditoriaRepository()


@router.get(
    "/unidades",
    response_model=list[UnidadFisicaResponse],
    summary="Inventario de unidades físicas (Solo Administrador)",
    dependencies=[Depends(require_roles("ADMINISTRADOR"))],
)
def listar_unidades():
    """Retorna todas las unidades físicas, su modelo comercial, estado y propietario."""
    return unidad_repo.listar_unidades()


@router.post(
    "/unidades",
    response_model=dict,
    status_code=201,
    summary="Dar de alta unidad física (Solo Administrador)",
    dependencies=[Depends(require_roles("ADMINISTRADOR"))],
)
def crear_unidad(
    request: UnidadFisicaCreate,
    req: Request,
    current_user: dict = Depends(get_current_user),
):
    """Registra una nueva unidad física de vehículo IoT en el inventario."""
    id_vehiculo = unidad_repo.crear_unidad(
        nombre=request.nombre,
        id_modelo=request.id_modelo,
        numero_serie=request.numero_serie,
        microcontrolador=request.microcontrolador,
        estado_comercial=request.estado_comercial,
        descripcion=request.descripcion,
    )

    client_ip = req.client.host if req.client else "unknown"
    auditoria_repo.registrar(
        id_usuario=current_user["id_usuario"],
        accion="ALTA_UNIDAD",
        entidad="vehiculos",
        id_entidad=id_vehiculo,
        detalle={"nombre": request.nombre, "numero_serie": request.numero_serie, "estado": request.estado_comercial},
        ip=client_ip,
    )

    return {"mensaje": "Unidad física dada de alta exitosamente", "id_vehiculo": id_vehiculo}


@router.post(
    "/unidades/{id_vehiculo}/asignar",
    response_model=dict,
    summary="Asignar o reasignar unidad a cliente (Solo Administrador)",
    dependencies=[Depends(require_roles("ADMINISTRADOR"))],
)
def asignar_unidad(
    id_vehiculo: int,
    request: AsignarUnidadRequest,
    req: Request,
    current_user: dict = Depends(get_current_user),
):
    """Asigna o desasigna una unidad física a un cliente comprador (cambia propietario y estado comercial)."""
    ok = unidad_repo.asignar_unidad(
        id_vehiculo=id_vehiculo,
        id_usuario_propietario=request.id_usuario_propietario,
        estado_comercial=request.estado_comercial,
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unidad con ID {id_vehiculo} no encontrada para asignar",
        )

    client_ip = req.client.host if req.client else "unknown"
    auditoria_repo.registrar(
        id_usuario=current_user["id_usuario"],
        accion="ASIGNAR_UNIDAD",
        entidad="vehiculos",
        id_entidad=id_vehiculo,
        detalle={"id_usuario_propietario": request.id_usuario_propietario, "estado": request.estado_comercial},
        ip=client_ip,
    )

    return {
        "mensaje": "Asignación de unidad realizada correctamente",
        "id_vehiculo": id_vehiculo,
        "id_usuario_propietario": request.id_usuario_propietario,
        "estado_comercial": request.estado_comercial,
    }


@router.get(
    "/mis-vehiculos",
    response_model=list[UnidadFisicaResponse],
    summary="Vehículos propios del cliente (Solo Usuario Comprador)",
    dependencies=[Depends(require_roles("USUARIO", "ADMINISTRADOR"))],
)
def listar_mis_vehiculos(current_user: dict = Depends(get_current_user)):
    """
    Retorna exclusivamente los vehículos que pertenecen al comprador autenticado.
    Evita vulnerabilidades IDOR/BOLA aislando las unidades por id_usuario_propietario.
    """
    if current_user["rol"] == "ADMINISTRADOR":
        return unidad_repo.listar_unidades()
    return unidad_repo.listar_unidades(id_usuario_propietario=current_user["id_usuario"])
