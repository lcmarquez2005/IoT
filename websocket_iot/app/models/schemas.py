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
