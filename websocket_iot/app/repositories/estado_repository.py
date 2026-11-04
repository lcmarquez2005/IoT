from app.repositories.base_repository import BaseRepository


class EstadoRepository(BaseRepository):
    """Repositorio para operaciones sobre el estado de conexión y comandos del vehículo (2 procedimientos)."""

    def actualizar_estado(
        self,
        id_vehiculo: int,
        id_comando: int | None,
        conectado: bool,
        cursor=None,
    ) -> None:
        """Invoca sp_actualizar_estado para registrar o actualizar el estado del vehículo."""
        self._execute_write(
            "sp_actualizar_estado",
            (id_vehiculo, id_comando, conectado),
            fetch_result=False,
            cursor=cursor,
        )

    def obtener_estado(self, id_vehiculo: int, cursor=None) -> dict | None:
        """Invoca sp_obtener_estado y retorna el estado actual del vehículo o None."""
        return self._execute_read(
            "sp_obtener_estado",
            (id_vehiculo,),
            fetch_one=True,
            cursor=cursor,
        )
