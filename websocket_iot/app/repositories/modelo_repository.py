import json
from app.repositories.base_repository import BaseRepository


class ModeloRepository(BaseRepository):
    """Repositorio para el catálogo comercial de modelos de vehículos IoT."""

    def listar_modelos(self, solo_activos: bool = False) -> list[dict]:
        with self.db.get_cursor() as cursor:
            sql = "SELECT * FROM modelos_vehiculo"
            if solo_activos:
                sql += " WHERE activo = TRUE"
            sql += " ORDER BY id_modelo"
            cursor.execute(sql)
            rows = cursor.fetchall()
            for r in rows:
                if isinstance(r.get("especificaciones"), str):
                    try:
                        r["especificaciones"] = json.loads(r["especificaciones"])
                    except Exception:
                        pass
            return rows

    def obtener_modelo(self, id_modelo: int) -> dict | None:
        with self.db.get_cursor() as cursor:
            cursor.execute("SELECT * FROM modelos_vehiculo WHERE id_modelo = %s", (id_modelo,))
            r = cursor.fetchone()
            if r and isinstance(r.get("especificaciones"), str):
                try:
                    r["especificaciones"] = json.loads(r["especificaciones"])
                except Exception:
                    pass
            return r

    def crear_modelo(
        self,
        nombre: str,
        categoria: str = "EXCAVADORA",
        descripcion: str | None = None,
        especificaciones: dict | None = None,
        foto_url: str | None = None,
    ) -> int:
        spec_json = json.dumps(especificaciones) if especificaciones else None
        with self.db.get_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO modelos_vehiculo (nombre, categoria, descripcion, especificaciones, foto_url, activo)
                VALUES (%s, %s, %s, %s, %s, TRUE)
                """,
                (nombre, categoria, descripcion, spec_json, foto_url),
            )
            return cursor.lastrowid

    def actualizar_modelo(
        self,
        id_modelo: int,
        nombre: str,
        categoria: str,
        descripcion: str | None,
        especificaciones: dict | None,
        foto_url: str | None,
        activo: bool,
    ) -> bool:
        spec_json = json.dumps(especificaciones) if especificaciones else None
        with self.db.get_cursor(commit=True) as cursor:
            cursor.execute(
                """
                UPDATE modelos_vehiculo
                   SET nombre = %s, categoria = %s, descripcion = %s,
                       especificaciones = %s, foto_url = %s, activo = %s
                 WHERE id_modelo = %s
                """,
                (nombre, categoria, descripcion, spec_json, foto_url, activo, id_modelo),
            )
            return cursor.rowcount > 0

    def eliminar_modelo(self, id_modelo: int) -> bool:
        with self.db.get_cursor(commit=True) as cursor:
            cursor.execute("UPDATE modelos_vehiculo SET activo = FALSE WHERE id_modelo = %s", (id_modelo,))
            return cursor.rowcount > 0
