from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.core.dependencies import get_current_user, require_roles
from app.models.schemas import ModeloVehiculoCreate, ModeloVehiculoResponse, ModeloVehiculoUpdate
from app.repositories.auditoria_repository import AuditoriaRepository
from app.repositories.modelo_repository import ModeloRepository

router = APIRouter(prefix="/modelos", tags=["Catálogo de Modelos"])

modelo_repo = ModeloRepository()
auditoria_repo = AuditoriaRepository()


@router.get("", response_model=list[ModeloVehiculoResponse], summary="Catálogo comercial de modelos")
def listar_modelos():
    """Consulta pública de modelos comerciales de vehículos IoT."""
    return modelo_repo.listar_modelos(solo_activos=False)


@router.get("/{id_modelo}", response_model=ModeloVehiculoResponse, summary="Detalle de modelo comercial")
def obtener_modelo(id_modelo: int):
    """Consulta el detalle y especificaciones técnicas de un modelo específico."""
    m = modelo_repo.obtener_modelo(id_modelo)
    if not m:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modelo con ID {id_modelo} no encontrado",
        )
    return m


@router.post(
    "",
    response_model=dict,
    status_code=201,
    summary="Crear nuevo modelo (Solo Administrador)",
    dependencies=[Depends(require_roles("ADMINISTRADOR"))],
)
def crear_modelo(
    request: ModeloVehiculoCreate,
    req: Request,
    current_user: dict = Depends(get_current_user),
):
    """Da de alta un nuevo modelo en el catálogo comercial."""
    id_modelo = modelo_repo.crear_modelo(
        nombre=request.nombre,
        categoria=request.categoria,
        descripcion=request.descripcion,
        especificaciones=request.especificaciones,
        foto_url=request.foto_url,
    )

    client_ip = req.client.host if req.client else "unknown"
    auditoria_repo.registrar(
        id_usuario=current_user["id_usuario"],
        accion="ALTA_MODELO",
        entidad="modelos_vehiculo",
        id_entidad=id_modelo,
        detalle={"nombre": request.nombre, "categoria": request.categoria},
        ip=client_ip,
    )

    return {"mensaje": "Modelo comercial creado con éxito", "id_modelo": id_modelo}


@router.put(
    "/{id_modelo}",
    response_model=dict,
    summary="Actualizar modelo comercial (Solo Administrador)",
    dependencies=[Depends(require_roles("ADMINISTRADOR"))],
)
def actualizar_modelo(
    id_modelo: int,
    request: ModeloVehiculoUpdate,
    req: Request,
    current_user: dict = Depends(get_current_user),
):
    """Actualiza especificaciones, foto o descripción de un modelo comercial."""
    ok = modelo_repo.actualizar_modelo(
        id_modelo=id_modelo,
        nombre=request.nombre,
        categoria=request.categoria,
        descripcion=request.descripcion,
        especificaciones=request.especificaciones,
        foto_url=request.foto_url,
        activo=request.activo,
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modelo con ID {id_modelo} no encontrado para actualizar",
        )

    client_ip = req.client.host if req.client else "unknown"
    auditoria_repo.registrar(
        id_usuario=current_user["id_usuario"],
        accion="ACTUALIZAR_MODELO",
        entidad="modelos_vehiculo",
        id_entidad=id_modelo,
        detalle={"nombre": request.nombre, "activo": request.activo},
        ip=client_ip,
    )

    return {"mensaje": "Modelo comercial actualizado correctamente", "id_modelo": id_modelo}
