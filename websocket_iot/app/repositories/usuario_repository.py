from app.repositories.base_repository import BaseRepository


class UsuarioRepository(BaseRepository):
    """Repositorio para gestión de usuarios, clientes y autenticación."""

    def obtener_por_email(self, email: str) -> dict | None:
        with self.db.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT u.id_usuario, u.nombre, u.email, u.password_hash,
                       u.id_rol, r.nombre AS rol, u.telefono, u.empresa, u.activo
                FROM usuarios u
                JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.email = %s
                """,
                (email,),
            )
            return cursor.fetchone()

    def obtener_por_id(self, id_usuario: int) -> dict | None:
        with self.db.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT u.id_usuario, u.nombre, u.email,
                       u.id_rol, r.nombre AS rol, u.telefono, u.empresa, u.activo
                FROM usuarios u
                JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.id_usuario = %s
                """,
                (id_usuario,),
            )
            return cursor.fetchone()

    def listar_clientes(self) -> list[dict]:
        with self.db.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT u.id_usuario, u.nombre, u.email, u.telefono, u.empresa,
                       u.activo, u.fecha_registro,
                       COUNT(v.id_vehiculo) AS total_vehiculos
                FROM usuarios u
                LEFT JOIN vehiculos v ON v.id_usuario_propietario = u.id_usuario
                WHERE u.id_rol = 2
                GROUP BY u.id_usuario
                ORDER BY u.nombre
                """
            )
            return cursor.fetchall()

    def crear_cliente(
        self,
        nombre: str,
        email: str,
        password_hash: str,
        id_rol: int = 2,
        telefono: str | None = None,
        empresa: str | None = None,
    ) -> int:
        with self.db.get_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO usuarios (nombre, email, password_hash, id_rol, telefono, empresa, activo)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                """,
                (nombre, email, password_hash, id_rol, telefono, empresa),
            )
            return cursor.lastrowid
