import json
from pathlib import Path
from app.repositories.estado_repository import EstadoRepository


class StatusService:
    def __init__(self, estado_repo: EstadoRepository | None = None):
        self.archivo = Path(__file__).resolve().parent.parent / "data" / "status.json"
        self.estado_repo = estado_repo or EstadoRepository()

    def obtener_estado(self, id_vehiculo: int = 1):
        """
        Obtiene el estado actual. Prioriza la consulta a la base de datos RDS
        y mantiene compatibilidad con status.json.
        """
        try:
            estado_db = self.estado_repo.obtener_estado(id_vehiculo)
            if estado_db and estado_db.get("codigo") is not None:
                return {"ESTADO": estado_db["codigo"]}
        except Exception:
            pass

        if self.archivo.exists():
            with open(self.archivo, "r", encoding="utf-8") as archivo:
                data = json.load(archivo)
            if "ESTADO" in data:
                return data
            return {"ESTADO": data.get("status", 0)}
        return {"ESTADO": 0}

    def guardar_estado(self, estado: int):
        if isinstance(estado, bool) or not isinstance(estado, int) or not (0 <= estado <= 12):
            raise ValueError("El estado debe ser un número entero entre 0 y 12")

        nuevo_estado = {"ESTADO": estado}
        with open(self.archivo, "w", encoding="utf-8") as archivo:
            json.dump(nuevo_estado, archivo, indent=4)
        return nuevo_estado
