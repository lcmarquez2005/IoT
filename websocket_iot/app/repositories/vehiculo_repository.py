from app.repositories.base_repository import BaseRepository


class VehiculoRepository(BaseRepository):
    """Repositorio para operaciones sobre vehículos (5 procedimientos almacenados)."""

    def crear_vehiculo(
        self,
        nombre: str,
        modelo: str | None = None,
        descripcion: str | None = None,
        microcontrolador: str | None = None,
        cursor=None,
    ) -> int:
        """Invoca sp_crear_vehiculo y retorna el ID del vehículo creado."""
        resultado = self._execute_write(
            "sp_crear_vehiculo",
            (nombre, modelo, descripcion, microcontrolador),
            fetch_result=True,
            cursor=cursor,
        )
        return resultado["id_vehiculo"] if resultado else 0

    def obtener_vehiculos(self, cursor=None) -> list[dict]:
        """Invoca sp_obtener_vehiculos y retorna la lista de vehículos."""
        return self._execute_read("sp_obtener_vehiculos", (), fetch_one=False, cursor=cursor)

    def obtener_vehiculo(self, id_vehiculo: int, cursor=None) -> dict | None:
        """Invoca sp_obtener_vehiculo y retorna el vehículo o None si no existe."""
        return self._execute_read("sp_obtener_vehiculo", (id_vehiculo,), fetch_one=True, cursor=cursor)

    def actualizar_vehiculo(
        self,
        id_vehiculo: int,
        nombre: str,
        modelo: str | None,
        descripcion: str | None,
        microcontrolador: str | None,
        activo: bool,
        cursor=None,
    ) -> None:
        """Invoca sp_actualizar_vehiculo para actualizar los datos de un vehículo."""
        self._execute_write(
            "sp_actualizar_vehiculo",
            (id_vehiculo, nombre, modelo, descripcion, microcontrolador, activo),
            fetch_result=False,
            cursor=cursor,
        )

    def eliminar_vehiculo(self, id_vehiculo: int, cursor=None) -> None:
        """Invoca sp_eliminar_vehiculo para dar de baja física al vehículo y en cascada a sus dependencias."""
        self._execute_write("sp_eliminar_vehiculo", (id_vehiculo,), fetch_result=False, cursor=cursor)
