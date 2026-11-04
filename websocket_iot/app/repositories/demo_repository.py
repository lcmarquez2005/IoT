from app.repositories.base_repository import BaseRepository


class DemoRepository(BaseRepository):
    """Repositorio para rutinas DEMO y sus secuencias de movimiento (8 procedimientos almacenados)."""

    def crear_demo(
        self,
        id_vehiculo: int,
        nombre: str,
        descripcion: str | None = None,
        cursor=None,
    ) -> int:
        """Invoca sp_crear_demo y retorna el ID generado de la rutina demo."""
        resultado = self._execute_write(
            "sp_crear_demo",
            (id_vehiculo, nombre, descripcion),
            fetch_result=True,
            cursor=cursor,
        )
        return resultado["id_demo"] if resultado else 0

    def obtener_demos(self, id_vehiculo: int, cursor=None) -> list[dict]:
        """Invoca sp_obtener_demos para listar las rutinas registradas de un vehículo."""
        return self._execute_read(
            "sp_obtener_demos",
            (id_vehiculo,),
            fetch_one=False,
            cursor=cursor,
        )

    def actualizar_demo(
        self,
        id_demo: int,
        nombre: str,
        descripcion: str | None,
        activo: bool,
        cursor=None,
    ) -> None:
        """Invoca sp_actualizar_demo para modificar una rutina demo."""
        self._execute_write(
            "sp_actualizar_demo",
            (id_demo, nombre, descripcion, activo),
            fetch_result=False,
            cursor=cursor,
        )

    def eliminar_demo(self, id_demo: int, cursor=None) -> None:
        """Invoca sp_eliminar_demo para remover una rutina demo y sus movimientos en cascada."""
        self._execute_write(
            "sp_eliminar_demo",
            (id_demo,),
            fetch_result=False,
            cursor=cursor,
        )

    def agregar_movimiento_demo(
        self,
        id_demo: int,
        id_comando: int,
        orden: int,
        duracion_ms: int,
        pausa_ms: int = 0,
        cursor=None,
    ) -> None:
        """Invoca sp_agregar_movimiento_demo para agregar un paso a la secuencia."""
        self._execute_write(
            "sp_agregar_movimiento_demo",
            (id_demo, id_comando, orden, duracion_ms, pausa_ms),
            fetch_result=False,
            cursor=cursor,
        )

    def obtener_movimientos_demo(self, id_demo: int, cursor=None) -> list[dict]:
        """Invoca sp_obtener_movimientos_demo para obtener la secuencia ordenada de la demo."""
        return self._execute_read(
            "sp_obtener_movimientos_demo",
            (id_demo,),
            fetch_one=False,
            cursor=cursor,
        )

    def actualizar_movimiento_demo(
        self,
        id_demo_movimiento: int,
        id_comando: int,
        orden: int,
        duracion_ms: int,
        pausa_ms: int = 0,
        cursor=None,
    ) -> None:
        """Invoca sp_actualizar_movimiento_demo para modificar los parámetros de un paso en la secuencia."""
        self._execute_write(
            "sp_actualizar_movimiento_demo",
            (id_demo_movimiento, id_comando, orden, duracion_ms, pausa_ms),
            fetch_result=False,
            cursor=cursor,
        )

    def eliminar_movimiento_demo(self, id_demo_movimiento: int, cursor=None) -> None:
        """Invoca sp_eliminar_movimiento_demo para retirar un paso de la secuencia."""
        self._execute_write(
            "sp_eliminar_movimiento_demo",
            (id_demo_movimiento,),
            fetch_result=False,
            cursor=cursor,
        )
