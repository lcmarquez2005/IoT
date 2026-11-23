import secrets
from app.repositories.base_repository import BaseRepository


class SesionInvitadoRepository(BaseRepository):
    """Repositorio para turnos temporales exclusivos de invitados en unidades de exhibición."""

    def obtener_sesion_activa(self, id_vehiculo: int) -> dict | None:
        with self.db.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT s.id_sesion, s.id_vehiculo, v.nombre AS vehiculo_nombre,
                       s.token_sesion, s.nombre_invitado, s.inicia_en, s.expira_en, s.activa,
                       TIMESTAMPDIFF(SECOND, NOW(), s.expira_en) AS segundos_restantes
                FROM sesiones_invitado s
                JOIN vehiculos v ON s.id_vehiculo = v.id_vehiculo
                WHERE s.id_vehiculo = %s AND s.activa = TRUE AND s.expira_en > NOW()
                LIMIT 1
                """,
                (id_vehiculo,),
            )
            return cursor.fetchone()

    def solicitar_sesion(
        self,
        id_vehiculo: int,
        nombre_invitado: str,
        duracion_minutos: int = 3,
        ip: str | None = None,
    ) -> dict | None:
        # 1. Verificar si ya hay una sesión activa para este vehículo
        activa = self.obtener_sesion_activa(id_vehiculo)
        if activa:
            return None  # Vehículo ocupado

        # 2. Desactivar cualquier sesión previa expirada
        with self.db.get_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE sesiones_invitado SET activa = FALSE, motivo_terminacion = 'EXPIRADA' WHERE id_vehiculo = %s AND activa = TRUE",
                (id_vehiculo,),
            )

            token = secrets.token_hex(24)
            cursor.execute(
                """
                INSERT INTO sesiones_invitado (
                    id_vehiculo, token_sesion, nombre_invitado, ip_origen,
                    inicia_en, expira_en, activa
                ) VALUES (
                    %s, %s, %s, %s,
                    NOW(), DATE_ADD(NOW(), INTERVAL %s MINUTE), TRUE
                )
                """,
                (id_vehiculo, token, nombre_invitado, ip, duracion_minutos),
            )
            id_sesion = cursor.lastrowid

        return self.validar_token_sesion(token)

    def validar_token_sesion(self, token_sesion: str) -> dict | None:
        with self.db.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT s.id_sesion, s.id_vehiculo, v.nombre AS vehiculo_nombre,
                       s.token_sesion, s.nombre_invitado, s.inicia_en, s.expira_en, s.activa,
                       TIMESTAMPDIFF(SECOND, NOW(), s.expira_en) AS segundos_restantes
                FROM sesiones_invitado s
                JOIN vehiculos v ON s.id_vehiculo = v.id_vehiculo
                WHERE s.token_sesion = %s AND s.activa = TRUE AND s.expira_en > NOW()
                """,
                (token_sesion,),
            )
            return cursor.fetchone()

    def liberar_sesion(self, token_sesion: str, motivo: str = "FINALIZADA_USUARIO") -> bool:
        with self.db.get_cursor(commit=True) as cursor:
            cursor.execute(
                """
                UPDATE sesiones_invitado
                   SET activa = FALSE, motivo_terminacion = %s
                 WHERE token_sesion = %s AND activa = TRUE
                """,
                (motivo, token_sesion),
            )
            return cursor.rowcount > 0
