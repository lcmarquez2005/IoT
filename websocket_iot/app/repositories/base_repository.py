from app.database.connection import DatabaseManager, db_manager


class BaseRepository:
    """Clase base orientada a objetos para los repositorios de acceso a datos."""

    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    def _execute_read(self, proc_name: str, args: tuple = (), fetch_one: bool = False, cursor=None):
        """Ejecuta un procedimiento almacenado de lectura de forma segura."""
        if cursor is not None:
            cursor.callproc(proc_name, args)
            return cursor.fetchone() if fetch_one else cursor.fetchall()
        with self.db.get_cursor(commit=False) as c:
            c.callproc(proc_name, args)
            return c.fetchone() if fetch_one else c.fetchall()

    def _execute_write(self, proc_name: str, args: tuple = (), fetch_result: bool = False, cursor=None):
        """Ejecuta un procedimiento almacenado de escritura/mutación con commit o soporte de transacción."""
        if cursor is not None:
            cursor.callproc(proc_name, args)
            if fetch_result:
                return cursor.fetchone()
            return None
        with self.db.get_cursor(commit=True) as c:
            c.callproc(proc_name, args)
            if fetch_result:
                return c.fetchone()
            return None
