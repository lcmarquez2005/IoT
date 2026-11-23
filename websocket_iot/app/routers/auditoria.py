from fastapi import APIRouter, Depends, Query
from app.core.dependencies import require_roles
from app.models.schemas import AuditoriaResponse
from app.repositories.auditoria_repository import AuditoriaRepository

router = APIRouter(prefix="/auditoria", tags=["Bitácora de Auditoría"])

auditoria_repo = AuditoriaRepository()


@router.get(
    "",
    response_model=list[AuditoriaResponse],
    summary="Consultar bitácora del sistema (Solo Administrador)",
    dependencies=[Depends(require_roles("ADMINISTRADOR"))],
)
def listar_auditoria(limite: int = Query(default=50, ge=1, le=200)):
    """Consulta los eventos de auditoría y seguridad registrados en el sistema."""
    return auditoria_repo.listar(limite=limite)
