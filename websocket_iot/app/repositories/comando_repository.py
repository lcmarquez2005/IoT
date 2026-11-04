from app.repositories.base_repository import BaseRepository


class ComandoRepository(BaseRepository):
    """Repositorio para operaciones sobre comandos (4 procedimientos almacenados)."""

    def crear_comando(
        self,
        id_vehiculo: int,
        nombre: str,
        codigo: int,
        descripcion: str | None = None,
        cursor=None,
    ) -> int:
        """Invoca sp_crear_comando y retorna el ID del comando generado."""
        resultado = self._execute_write(
            "sp_crear_comando",
            (id_vehiculo, nombre, codigo, descripcion),
            fetch_result=True,
            cursor=cursor,
        )
        return resultado["id_comando"] if resultado else 0

    def obtener_comandos_vehiculo(self, id_vehiculo: int, cursor=None) -> list[dict]:
        """Invoca sp_obtener_comandos_vehiculo y retorna los comandos registrados para el vehículo."""
        return self._execute_read(
            "sp_obtener_comandos_vehiculo",
            (id_vehiculo,),
            fetch_one=False,
            cursor=cursor,
        )

    def actualizar_comando(
        self,
        id_comando: int,
        nombre: str,
        codigo: int,
        descripcion: str | None,
        activo: bool,
        cursor=None,
    ) -> None:
        """Invoca sp_actualizar_comando para actualizar atributos de un comando."""
        self._execute_write(
            "sp_actualizar_comando",
            (id_comando, nombre, codigo, descripcion, activo),
            fetch_result=False,
            cursor=cursor,
        )

    def eliminar_comando(self, id_comando: int, cursor=None) -> None:
        """Invoca sp_eliminar_comando para remover un comando."""
        self._execute_write(
            "sp_eliminar_comando",
            (id_comando,),
            fetch_result=False,
            cursor=cursor,
        )
