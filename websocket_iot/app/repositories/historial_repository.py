from app.repositories.base_repository import BaseRepository


class HistorialRepository(BaseRepository):
    """Repositorio para la bitácora de historial de comandos (2 procedimientos almacenados)."""

    def registrar_historial(
        self,
        id_vehiculo: int,
        id_comando: int | None,
        origen: str = "MANUAL",
        cursor=None,
    ) -> None:
        """Invoca sp_registrar_historial para auditar la ejecución de un comando."""
        self._execute_write(
            "sp_registrar_historial",
            (id_vehiculo, id_comando, origen),
            fetch_result=False,
            cursor=cursor,
        )

    def obtener_historial(
        self,
        id_vehiculo: int,
        limit: int = 10,
        cursor=None,
    ) -> list[dict]:
        """
        Invoca sp_obtener_historial y retorna la bitácora ordenada descendente.
        Aplica la regla de negocio de devolver como máximo los 'limit' registros más recientes.
        """
        registros = self._execute_read(
            "sp_obtener_historial",
            (id_vehiculo,),
            fetch_one=False,
            cursor=cursor,
        )
        if limit and isinstance(registros, list):
            return registros[:limit]
        return registros or []
