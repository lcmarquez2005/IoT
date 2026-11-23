from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.core.dependencies import get_current_user, require_roles
from app.core.security import create_access_token, hash_password, verify_password
from app.models.schemas import LoginRequest, TokenResponse, UsuarioCreate, UsuarioResponse
from app.repositories.auditoria_repository import AuditoriaRepository
from app.repositories.usuario_repository import UsuarioRepository

router = APIRouter(prefix="", tags=["Autenticación y Clientes"])

usuario_repo = UsuarioRepository()
auditoria_repo = AuditoriaRepository()


@router.post("/auth/login", response_model=TokenResponse, summary="Iniciar sesión")
def login(request: LoginRequest, req: Request):
    """Autentica a un usuario por email y contraseña; retorna JWT y perfil con rol."""
    user = usuario_repo.obtener_por_email(request.email)
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas. Verifique correo o contraseña.",
        )

    if not user.get("activo"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra suspendida o inactiva.",
        )

    token = create_access_token(
        data={"sub": str(user["id_usuario"]), "email": user["email"], "rol": user["rol"]}
    )

    client_ip = req.client.host if req.client else "unknown"
    auditoria_repo.registrar(
        id_usuario=user["id_usuario"],
        accion="LOGIN",
        entidad="usuarios",
        id_entidad=user["id_usuario"],
        detalle={"email": user["email"], "rol": user["rol"]},
        ip=client_ip,
    )

    user_response = UsuarioResponse(
        id_usuario=user["id_usuario"],
        nombre=user["nombre"],
        email=user["email"],
        id_rol=user["id_rol"],
        rol=user["rol"],
        telefono=user.get("telefono"),
        empresa=user.get("empresa"),
        activo=user.get("activo", True),
    )

    return TokenResponse(access_token=token, token_type="bearer", user=user_response)


@router.get("/auth/me", response_model=UsuarioResponse, summary="Perfil del usuario actual")
def get_me(current_user: dict = Depends(get_current_user)):
    """Retorna los datos del usuario autenticado actual."""
    return UsuarioResponse(
        id_usuario=current_user["id_usuario"],
        nombre=current_user["nombre"],
        email=current_user["email"],
        id_rol=current_user["id_rol"],
        rol=current_user["rol"],
        telefono=current_user.get("telefono"),
        empresa=current_user.get("empresa"),
        activo=current_user.get("activo", True),
    )


@router.get(
    "/usuarios/clientes",
    response_model=list[dict],
    summary="Listar clientes (Solo Administrador)",
    dependencies=[Depends(require_roles("ADMINISTRADOR"))],
)
def listar_clientes():
    """Consulta la lista de clientes registrados junto con la cantidad de unidades asignadas."""
    return usuario_repo.listar_clientes()


@router.post(
    "/usuarios/clientes",
    response_model=dict,
    status_code=201,
    summary="Registrar nuevo cliente (Solo Administrador)",
    dependencies=[Depends(require_roles("ADMINISTRADOR"))],
)
def crear_cliente(
    request: UsuarioCreate,
    req: Request,
    current_user: dict = Depends(get_current_user),
):
    """Crea una nueva cuenta de cliente con rol USUARIO (comprador)."""
    existente = usuario_repo.obtener_por_email(request.email)
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un usuario registrado con el email {request.email}",
        )

    pwd_hash = hash_password(request.password)
    nuevo_id = usuario_repo.crear_cliente(
        nombre=request.nombre,
        email=request.email,
        password_hash=pwd_hash,
        id_rol=request.id_rol,
        telefono=request.telefono,
        empresa=request.empresa,
    )

    client_ip = req.client.host if req.client else "unknown"
    auditoria_repo.registrar(
        id_usuario=current_user["id_usuario"],
        accion="ALTA_CLIENTE",
        entidad="usuarios",
        id_entidad=nuevo_id,
        detalle={"nombre": request.nombre, "email": request.email, "empresa": request.empresa},
        ip=client_ip,
    )

    return {"mensaje": "Cliente registrado correctamente", "id_usuario": nuevo_id}
