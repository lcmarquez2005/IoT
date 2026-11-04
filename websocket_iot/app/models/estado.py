from pydantic import BaseModel, Field, AliasChoices


class Estado(BaseModel):
    ESTADO: int = Field(
        ...,
        validation_alias=AliasChoices("ESTADO", "status"),
        ge=0,
        le=12,
        description="Número entero del 0 al 12",
    )
