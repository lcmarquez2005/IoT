from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, status
from app.models.schemas import LiberarPruebaRequest, SesionInvitadoResponse, SolicitarPruebaRequest
from app.repositories.auditoria_repository import AuditoriaRepository
from app.repositories.sesion_invitado_repository import SesionInvitadoRepository
from app.repositories.unidad_repository import UnidadRepository
from app.services.vehiculo_service import VehiculoService

router = APIRouter(prefix="/invitado", tags=["Prueba Comercial de Invitado"])

sesion_repo = SesionInvitadoRepository()
unidad_repo = UnidadRepository()
auditoria_repo = AuditoriaRepository()
vehiculo_service = VehiculoService()


@router.get("/unidad-exhibicion", response_model=dict, summary="Consultar unidad de exhibición pública")
def obtener_unidad_exhibicion():
    """Consulta la unidad destinada a exhibición pública y si tiene turno ocupado."""
    unidades = unidad_repo.listar_unidades()
    exhibicion = next((u for u in unidades if u.get("estado_comercial") == "EXHIBICION"), None)
    if not exhibicion:
        # Fallback a unidad 1 si no está explícitamente marcada
        exhibicion = unidad_repo.obtener_unidad(1)

    sesion_activa = sesion_repo.obtener_sesion_activa(exhibicion["id_vehiculo"]) if exhibicion else None

    return {
        "unidad": exhibicion,
        "disponible": sesion_activa is None,
        "sesion_activa": sesion_activa,
    }


@router.post(
    "/solicitar-prueba",
    response_model=SesionInvitadoResponse,
    status_code=201,
    summary="Solicitar turno temporal exclusivo de prueba",
)
def solicitar_prueba(request: SolicitarPruebaRequest, req: Request):
    """
    Reserva temporalmente de forma exclusiva el vehículo de exhibición para un invitado.
    Impide que múltiples usuarios controlen la misma unidad en simultáneo.
    """
    vehiculo = unidad_repo.obtener_unidad(request.id_vehiculo)
    if not vehiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehículo con ID {request.id_vehiculo} no encontrado",
        )

    if vehiculo.get("estado_comercial") != "EXHIBICION":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este vehículo no está habilitado para pruebas públicas de exhibición.",
        )

    client_ip = req.client.host if req.client else "unknown"
    sesion = sesion_repo.solicitar_sesion(
        id_vehiculo=request.id_vehiculo,
        nombre_invitado=request.nombre_invitado,
        duracion_minutos=request.duracion_minutos,
        ip=client_ip,
    )

    if not sesion:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El vehículo de exhibición se encuentra actualmente ocupado por otro prospecto. Espere a que termine el turno.",
        )

    auditoria_repo.registrar(
        id_usuario=None,
        accion="INICIO_PRUEBA_INVITADO",
        entidad="sesiones_invitado",
        id_entidad=sesion["id_sesion"],
        detalle={"nombre_invitado": request.nombre_invitado, "id_vehiculo": request.id_vehiculo, "duracion": request.duracion_minutos},
        ip=client_ip,
    )

    return SesionInvitadoResponse(
        id_sesion=sesion["id_sesion"],
        id_vehiculo=sesion["id_vehiculo"],
        vehiculo_nombre=sesion["vehiculo_nombre"],
        token_sesion=sesion["token_sesion"],
        nombre_invitado=sesion["nombre_invitado"],
        inicia_en=sesion["inicia_en"],
        expira_en=sesion["expira_en"],
        activa=sesion["activa"],
        segundos_restantes=sesion.get("segundos_restantes"),
    )


@router.post("/liberar-prueba", response_model=dict, summary="Liberar prueba y enviar DETENER de seguridad")
def liberar_prueba(request: LiberarPruebaRequest, req: Request):
    """
    Finaliza el turno de prueba de invitado y envía inmediatamente un comando de DETENER (código 9) por seguridad.
    """
    sesion = sesion_repo.validar_token_sesion(request.token_sesion)
    if not sesion:
        return {"mensaje": "La sesión ya no se encuentra activa", "liberado": True}

    # Ejecutar DETENER de seguridad en la unidad
    try:
        vehiculo_service.ejecutar_movimiento_individual(
            id_vehiculo=sesion["id_vehiculo"],
            codigo=9,  # DETENER
            origen="FIN_SESION_INVITADO",
        )
    except Exception:
        pass

    sesion_repo.liberar_sesion(request.token_sesion, motivo="LIBERADA_USUARIO")

    client_ip = req.client.host if req.client else "unknown"
    auditoria_repo.registrar(
        id_usuario=None,
        accion="FIN_PRUEBA_INVITADO",
        entidad="sesiones_invitado",
        id_entidad=sesion["id_sesion"],
        detalle={"id_vehiculo": sesion["id_vehiculo"], "token": request.token_sesion},
        ip=client_ip,
    )

    return {"mensaje": "Turno de prueba finalizado y vehículo detenido de forma segura", "liberado": True}


@router.get("/sesion/{token_sesion}", response_model=SesionInvitadoResponse, summary="Verificar estado de sesión")
def verificar_sesion(token_sesion: str):
    """Consulta los segundos restantes de un turno de prueba."""
    sesion = sesion_repo.validar_token_sesion(token_sesion)
    if not sesion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada o ya expiró",
        )
    return SesionInvitadoResponse(
        id_sesion=sesion["id_sesion"],
        id_vehiculo=sesion["id_vehiculo"],
        vehiculo_nombre=sesion["vehiculo_nombre"],
        token_sesion=sesion["token_sesion"],
        nombre_invitado=sesion["nombre_invitado"],
        inicia_en=sesion["inicia_en"],
        expira_en=sesion["expira_en"],
        activa=sesion["activa"],
        segundos_restantes=sesion.get("segundos_restantes"),
    )
