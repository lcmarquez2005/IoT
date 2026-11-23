from app.repositories.base_repository import BaseRepository


class UnidadRepository(BaseRepository):
    """Repositorio para inventario y asignación de unidades físicas de vehículos."""

    def listar_unidades(self, id_usuario_propietario: int | None = None) -> list[dict]:
        with self.db.get_cursor() as cursor:
            sql = """
                SELECT v.id_vehiculo, v.nombre, v.id_modelo, m.nombre AS modelo_nombre,
                       m.categoria AS categoria_modelo,
                       v.id_usuario_propietario, u.nombre AS propietario_nombre, u.email AS propietario_email,
                       v.estado_comercial, v.numero_serie, v.microcontrolador, v.descripcion,
                       v.activo, v.fecha_registro,
                       COALESCE(ev.conectado, 0) AS conectado
                FROM vehiculos v
                LEFT JOIN modelos_vehiculo m ON v.id_modelo = m.id_modelo
                LEFT JOIN usuarios u ON v.id_usuario_propietario = u.id_usuario
                LEFT JOIN estado_vehiculo ev ON v.id_vehiculo = ev.id_vehiculo
            """
            params = []
            if id_usuario_propietario is not None:
                sql += " WHERE v.id_usuario_propietario = %s"
                params.append(id_usuario_propietario)
            sql += " ORDER BY v.id_vehiculo"
            cursor.execute(sql, tuple(params))
            return cursor.fetchall()

    def obtener_unidad(self, id_vehiculo: int) -> dict | None:
        with self.db.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT v.id_vehiculo, v.nombre, v.id_modelo, m.nombre AS modelo_nombre,
                       m.categoria AS categoria_modelo,
                       v.id_usuario_propietario, u.nombre AS propietario_nombre, u.email AS propietario_email,
                       v.estado_comercial, v.numero_serie, v.microcontrolador, v.descripcion,
                       v.activo, v.fecha_registro,
                       COALESCE(ev.conectado, 0) AS conectado
                FROM vehiculos v
                LEFT JOIN modelos_vehiculo m ON v.id_modelo = m.id_modelo
                LEFT JOIN usuarios u ON v.id_usuario_propietario = u.id_usuario
                LEFT JOIN estado_vehiculo ev ON v.id_vehiculo = ev.id_vehiculo
                WHERE v.id_vehiculo = %s
                """,
                (id_vehiculo,),
            )
            return cursor.fetchone()

    def crear_unidad(
        self,
        nombre: str,
        id_modelo: int | None = None,
        numero_serie: str | None = None,
        microcontrolador: str | None = "ESP32",
        estado_comercial: str = "DISPONIBLE",
        descripcion: str | None = None,
    ) -> int:
        with self.db.get_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO vehiculos (nombre, id_modelo, numero_serie, microcontrolador, estado_comercial, descripcion, activo)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                """,
                (nombre, id_modelo, numero_serie, microcontrolador, estado_comercial, descripcion),
            )
            id_vehiculo = cursor.lastrowid
            # Inicializar estado_vehiculo para el nuevo vehículo
            cursor.execute(
                """
                INSERT INTO estado_vehiculo (id_vehiculo, id_comando, conectado, fecha_actualizacion)
                VALUES (%s, NULL, 0, NOW())
                ON DUPLICATE KEY UPDATE conectado=0
                """,
                (id_vehiculo,),
            )
            return id_vehiculo

    def asignar_unidad(
        self,
        id_vehiculo: int,
        id_usuario_propietario: int | None,
        estado_comercial: str = "VENDIDO",
    ) -> bool:
        with self.db.get_cursor(commit=True) as cursor:
            cursor.execute(
                """
                UPDATE vehiculos
                   SET id_usuario_propietario = %s,
                       estado_comercial = %s
                 WHERE id_vehiculo = %s
                """,
                (id_usuario_propietario, estado_comercial, id_vehiculo),
            )
            return cursor.rowcount > 0
