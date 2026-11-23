import json
from app.repositories.base_repository import BaseRepository


class AuditoriaRepository(BaseRepository):
    """Repositorio para la bitácora de seguridad y auditoría administrativa."""

    def registrar(
        self,
        id_usuario: int | None,
        accion: str,
        entidad: str,
        id_entidad: int | None = None,
        detalle: dict | list | str | None = None,
        ip: str | None = None,
    ) -> int:
        detalle_str = json.dumps(detalle) if isinstance(detalle, (dict, list)) else detalle
        with self.db.get_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO auditoria_sistema (id_usuario, accion, entidad, id_entidad, detalle, ip)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (id_usuario, accion, entidad, id_entidad, detalle_str, ip),
            )
            return cursor.lastrowid

    def listar(self, limite: int = 50) -> list[dict]:
        with self.db.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT a.id_auditoria, a.id_usuario, u.nombre AS usuario_nombre,
                       a.accion, a.entidad, a.id_entidad, a.detalle, a.ip, a.fecha_hora
                FROM auditoria_sistema a
                LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
                ORDER BY a.id_auditoria DESC
                LIMIT %s
                """,
                (limite,),
            )
            rows = cursor.fetchall()
            for r in rows:
                if isinstance(r.get("detalle"), str):
                    try:
                        r["detalle"] = json.loads(r["detalle"])
                    except Exception:
                        pass
            return rows
