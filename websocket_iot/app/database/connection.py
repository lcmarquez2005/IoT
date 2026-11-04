import os
from contextlib import contextmanager
from pathlib import Path
from dotenv import load_dotenv
import pymysql
from pymysql.cursors import DictCursor

# Carga de variables de entorno desde websocket_iot/.env
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)


class DatabaseManager:
    """Administrador de conexiones a la base de datos MySQL (Amazon RDS)."""

    def __init__(self):
        self.host = os.getenv("DB_HOST", "localhost")
        self.port = int(os.getenv("DB_PORT", 3306))
        self.user = os.getenv("DB_USER", "root")
        self.password = os.getenv("DB_PASSWORD", "")
        self.database = os.getenv("DB_NAME", "vehiculo_iot")

    def get_connection(self):
        """Crea y retorna una nueva conexión a MySQL con DictCursor."""
        return pymysql.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            database=self.database,
            cursorclass=DictCursor,
            autocommit=False,
            connect_timeout=10,
        )

    @contextmanager
    def get_cursor(self, commit: bool = False):
        """
        Context manager para obtener un cursor de base de datos.
        Maneja automáticamente el commit o rollback y cierra los recursos.
        """
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            try:
                yield cursor
                if commit:
                    conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                cursor.close()
        finally:
            conn.close()

    def test_connection(self) -> dict:
        """
        Ejecuta una consulta inocua para validar conectividad con la base de datos.
        Retorna metadatos básicos sin exponer credenciales.
        """
        with self.get_cursor() as cursor:
            cursor.execute("SELECT 1 AS status, DATABASE() AS database_name, VERSION() AS db_version")
            return cursor.fetchone()


# Instancia singleton para uso general
db_manager = DatabaseManager()
