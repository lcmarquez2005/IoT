from typing import Annotated
from fastapi import Depends, HTTPException, Query, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.security import decode_access_token
from app.database.connection import db_manager

security_scheme = HTTPBearer(auto_error=False)


def get_user_from_db(user_id: int) -> dict | None:
    """Consulta usuario en base de datos junto con su rol."""
    with db_manager.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT u.id_usuario, u.nombre, u.email, u.telefono, u.empresa, u.activo,
                   u.id_rol, r.nombre AS rol
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = %s AND u.activo = TRUE
            """,
            (user_id,),
        )
        return cursor.fetchone()


async def get_current_user(
    auth: Annotated[HTTPAuthorizationCredentials | None, Security(security_scheme)] = None,
    token_query: Annotated[str | None, Query(alias="token")] = None,
) -> dict:
    """
    Obtiene el usuario autenticado actual desde el Bearer Header o Query Param (?token=).
    Lanza 401 Unauthorized si el token no es provisto o es inválido.
    """
    token = None
    if auth and auth.credentials:
        token = auth.credentials
    elif token_query:
        token = token_query

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticación requerida. Proporcione token Bearer o parámetro ?token=",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = int(payload["sub"])
    user = get_user_from_db(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_current_user(
    auth: Annotated[HTTPAuthorizationCredentials | None, Security(security_scheme)] = None,
    token_query: Annotated[str | None, Query(alias="token")] = None,
) -> dict | None:
    """Extrae el usuario actual si existe token válido, o None si es una petición pública/anónima."""
    token = None
    if auth and auth.credentials:
        token = auth.credentials
    elif token_query:
        token = token_query

    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    try:
        user_id = int(payload["sub"])
        return get_user_from_db(user_id)
    except Exception:
        return None


def require_roles(*allowed_roles: str):
    """Fábrica de dependencias para validar que el usuario tenga alguno de los roles permitidos."""
    async def role_checker(current_user: Annotated[dict, Depends(get_current_user)]) -> dict:
        user_role = current_user.get("rol")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Rol '{user_role}' no autorizado para este recurso. Requerido: {allowed_roles}",
            )
        return current_user

    return role_checker


def check_vehicle_ownership(id_vehiculo: int, user: dict | None, is_write: bool = False, guest_token: str | None = None) -> dict:
    """
    Verifica autorización a nivel de recurso (evita IDOR/BOLA).
    - ADMINISTRADOR: acceso total a cualquier unidad.
    - USUARIO: acceso solo si id_usuario_propietario == user.id_usuario.
    - INVITADO / Anónimo:
        * Lectura permitida si la unidad está en estado 'EXHIBICION'.
        * Escritura (movimiento/control) permitida SOLO con sesión de invitado activa y válida para este vehículo.
    """
    with db_manager.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT v.id_vehiculo, v.nombre, v.id_modelo, v.id_usuario_propietario,
                   v.estado_comercial, v.numero_serie, v.activo
            FROM vehiculos v
            WHERE v.id_vehiculo = %s
            """,
            (id_vehiculo,),
        )
        vehiculo = cursor.fetchone()

    if not vehiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehículo con ID {id_vehiculo} no encontrado",
        )

    # Administrador tiene acceso total
    if user and user.get("rol") == "ADMINISTRADOR":
        return vehiculo

    # Modo Exhibición / Showroom público: abierto a todos (invitados, clientes y usuarios)
    if vehiculo["estado_comercial"] == "EXHIBICION":
        if not is_write:
            return vehiculo  # Lectura pública permitida en unidad de exhibición
        
        # Verificar si hay una sesión exclusiva activa para otro invitado
        with db_manager.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT id_sesion, token_sesion, expira_en
                FROM sesiones_invitado
                WHERE id_vehiculo = %s AND activa = TRUE AND expira_en > NOW()
                LIMIT 1
                """,
                (id_vehiculo,),
            )
            sesion_ocupada = cursor.fetchone()

        if sesion_ocupada:
            if user and user.get("rol") == "ADMINISTRADOR":
                return vehiculo
            if guest_token and guest_token == sesion_ocupada["token_sesion"]:
                return vehiculo
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La unidad de exhibición se encuentra actualmente en un turno exclusivo de prueba por otro usuario.",
            )

        # Si no hay sesión ocupada, se permite el movimiento (invitado o cliente)
        return vehiculo

    # Unidades privadas o vendidas: validación estricta de propiedad (Anti-IDOR)
    if user and user.get("rol") == "USUARIO":
        if vehiculo["id_usuario_propietario"] != user["id_usuario"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: El vehículo ID {id_vehiculo} no está asignado a su cuenta de usuario.",
            )
        return vehiculo

    # Si no es de exhibición y el usuario no es propietario ni admin
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Acceso denegado para el vehículo ID {id_vehiculo}.",
    )
