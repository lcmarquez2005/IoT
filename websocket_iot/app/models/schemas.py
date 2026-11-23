from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class VehiculoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_vehiculo: int
    nombre: str
    modelo: str | None = None
    descripcion: str | None = None
    microcontrolador: str | None = None
    fecha_registro: datetime | str | None = None
    activo: bool | int = True


class ComandoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_comando: int
    id_vehiculo: int
    nombre: str
    codigo: int
    descripcion: str | None = None
    activo: bool | int = True


class EstadoVehiculoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_vehiculo: int
    vehiculo: str
    id_comando: int | None = None
    comando: str | None = None
    codigo: int | None = None
    conectado: bool | int = False
    fecha_actualizacion: datetime | str | None = None


class HistorialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_historial: int
    id_vehiculo: int
    comando: str | None = None
    codigo: int | None = None
    fecha_hora: datetime | str | None = None
    origen: str = "MANUAL"


class DemoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_demo: int
    id_vehiculo: int
    nombre: str
    descripcion: str | None = None
    activo: bool | int = True


class MovimientoDemoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_demo_movimiento: int
    orden: int
    id_comando: int
    comando: str | None = None
    codigo: int | None = None
    duracion_ms: int
    pausa_ms: int = 0


# =============================================================================
# ESQUEMAS PARA MOVIMIENTO INDIVIDUAL (ETAPA 4)
# =============================================================================

class MovimientoRequest(BaseModel):
    id_comando: int | None = Field(default=None, description="ID del comando en base de datos")
    codigo: int | None = Field(default=None, description="Código numérico del comando (ej. 1, 2, 9)")
    origen: str = Field(default="MANUAL", description="Origen de la petición (ej. MANUAL, WEB, THUNDER_CLIENT)")


class MovimientoGeneralRequest(BaseModel):
    id_vehiculo: int = Field(..., description="ID del vehículo")
    id_comando: int | None = Field(default=None, description="ID del comando en base de datos")
    codigo: int | None = Field(default=None, description="Código numérico del comando")
    origen: str = Field(default="MANUAL", description="Origen de la petición")


class MovimientoIndividualResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mensaje: str = "Movimiento individual ejecutado y registrado correctamente"
    id_vehiculo: int
    vehiculo: str
    id_comando: int
    comando: str
    codigo: int
    origen: str
    conectado: bool
    fecha_actualizacion: datetime | str | None = None


# =============================================================================
# ESQUEMAS CRUD ADMINISTRATIVOS (PROCEDIMIENTOS ALMACENADOS RESTANTES)
# =============================================================================

class VehiculoCreate(BaseModel):
    nombre: str = Field(..., description="Nombre del vehículo")
    modelo: str | None = Field(default=None, description="Modelo del vehículo")
    descripcion: str | None = Field(default=None, description="Descripción funcional")
    microcontrolador: str | None = Field(default=None, description="Ej. ESP8266, ESP32")


class VehiculoUpdate(BaseModel):
    nombre: str = Field(..., description="Nombre del vehículo")
    modelo: str | None = Field(default=None, description="Modelo del vehículo")
    descripcion: str | None = Field(default=None, description="Descripción funcional")
    microcontrolador: str | None = Field(default=None, description="Microcontrolador")
    activo: bool = Field(default=True, description="Estado de activación")


class ComandoCreate(BaseModel):
    nombre: str = Field(..., description="Nombre del comando (ej. AVANZAR)")
    codigo: int = Field(..., description="Código numérico (ej. 1)")
    descripcion: str | None = Field(default=None, description="Descripción del comando")


class ComandoUpdate(BaseModel):
    nombre: str = Field(..., description="Nombre del comando")
    codigo: int = Field(..., description="Código numérico")
    descripcion: str | None = Field(default=None, description="Descripción del comando")
    activo: bool = Field(default=True, description="Estado de activación")


class DemoCreate(BaseModel):
    nombre: str = Field(..., description="Nombre de la rutina DEMO")
    descripcion: str | None = Field(default=None, description="Descripción de la rutina")


class DemoUpdate(BaseModel):
    nombre: str = Field(..., description="Nombre de la rutina DEMO")
    descripcion: str | None = Field(default=None, description="Descripción de la rutina")
    activo: bool = Field(default=True, description="Estado de activación")


class MovimientoDemoCreate(BaseModel):
    id_comando: int = Field(..., description="ID del comando a ejecutar")
    orden: int = Field(..., description="Posición u orden en la secuencia")
    duracion_ms: int = Field(..., description="Duración en milisegundos")
    pausa_ms: int = Field(default=0, description="Pausa posterior en milisegundos")


class MovimientoDemoUpdate(BaseModel):
    id_comando: int = Field(..., description="ID del comando a ejecutar")
    orden: int = Field(..., description="Posición u orden en la secuencia")
    duracion_ms: int = Field(..., description="Duración en milisegundos")
    pausa_ms: int = Field(default=0, description="Pausa posterior en milisegundos")


class MensajeResponse(BaseModel):
    mensaje: str
    id: int | None = None


# =============================================================================
# ESQUEMAS PRÁCTICA 4.3: PLATAFORMA COMERCIAL MULTIUSUARIO IoT
# =============================================================================

class LoginRequest(BaseModel):
    email: str = Field(..., description="Correo del usuario")
    password: str = Field(..., description="Contraseña en texto plano")


class UsuarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nombre: str
    email: str
    id_rol: int
    rol: str
    telefono: str | None = None
    empresa: str | None = None
    activo: bool | int = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UsuarioResponse


class UsuarioCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., max_length=100)
    password: str = Field(..., min_length=6)
    id_rol: int = Field(default=2, description="2 para USUARIO (comprador)")
    telefono: str | None = None
    empresa: str | None = None


class ModeloVehiculoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_modelo: int
    nombre: str
    categoria: str = "EXCAVADORA"
    descripcion: str | None = None
    especificaciones: dict | list | str | None = None
    foto_url: str | None = None
    activo: bool | int = True
    fecha_registro: datetime | str | None = None


class ModeloVehiculoCreate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=80)
    categoria: str = Field(default="EXCAVADORA")
    descripcion: str | None = None
    especificaciones: dict | None = None
    foto_url: str | None = None


class ModeloVehiculoUpdate(BaseModel):
    nombre: str
    categoria: str = "EXCAVADORA"
    descripcion: str | None = None
    especificaciones: dict | None = None
    foto_url: str | None = None
    activo: bool = True


class UnidadFisicaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_vehiculo: int
    nombre: str
    id_modelo: int | None = None
    modelo_nombre: str | None = None
    categoria_modelo: str | None = None
    id_usuario_propietario: int | None = None
    propietario_nombre: str | None = None
    propietario_email: str | None = None
    estado_comercial: str = "EXHIBICION"
    numero_serie: str | None = None
    microcontrolador: str | None = "ESP32"
    descripcion: str | None = None
    activo: bool | int = True
    conectado: bool | int = False
    fecha_registro: datetime | str | None = None


class UnidadFisicaCreate(BaseModel):
    nombre: str
    id_modelo: int | None = None
    numero_serie: str | None = None
    microcontrolador: str | None = "ESP32"
    estado_comercial: str = "DISPONIBLE"
    descripcion: str | None = None


class AsignarUnidadRequest(BaseModel):
    id_usuario_propietario: int | None = Field(default=None, description="ID del cliente o NULL para desasignar")
    estado_comercial: str = Field(default="VENDIDO", description="DISPONIBLE, VENDIDO, EXHIBICION, MANTENIMIENTO")


class SolicitarPruebaRequest(BaseModel):
    id_vehiculo: int = Field(..., description="ID del vehículo de exhibición")
    nombre_invitado: str = Field(..., min_length=2, max_length=100)
    duracion_minutos: int = Field(default=3, ge=1, le=10)


class SesionInvitadoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_sesion: int
    id_vehiculo: int
    vehiculo_nombre: str | None = None
    token_sesion: str
    nombre_invitado: str
    inicia_en: datetime | str
    expira_en: datetime | str
    activa: bool | int
    segundos_restantes: int | None = None


class LiberarPruebaRequest(BaseModel):
    token_sesion: str


class AuditoriaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_auditoria: int
    id_usuario: int | None = None
    usuario_nombre: str | None = None
    accion: str
    entidad: str
    id_entidad: int | None = None
    detalle: dict | list | str | None = None
    ip: str | None = None
    fecha_hora: datetime | str | None = None


class DemoPasoEditor(BaseModel):
    id_comando: int
    duracion_ms: int = Field(..., ge=100, le=15000)
    pausa_ms: int = Field(default=0, ge=0, le=5000)


class DemoEditorRequest(BaseModel):
    id_vehiculo: int
    nombre: str = Field(..., min_length=2, max_length=80)
    descripcion: str | None = None
    tipo_demo: str = Field(default="PRIVADA", description="FABRICA o PRIVADA")
    pasos: list[DemoPasoEditor] = Field(default_factory=list)


class DemoDetalleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_demo: int
    id_vehiculo: int
    id_usuario: int | None = None
    tipo_demo: str = "FABRICA"
    nombre: str
    descripcion: str | None = None
    activo: bool | int = True
    movimientos: list[MovimientoDemoResponse] = Field(default_factory=list)
