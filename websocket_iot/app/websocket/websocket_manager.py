from fastapi import WebSocket


class WebSocketManager:
    """Gestor de conexiones WebSocket multi-cliente y segmentado por identificador de vehículo."""

    def __init__(self):
        # Mapeo de id_vehiculo -> lista de WebSockets conectados
        self.canales: dict[int, list[WebSocket]] = {}
        # Conexiones legacy globales (/ws)
        self.clientes_globales: list[WebSocket] = []

    async def conectar(self, websocket: WebSocket, id_vehiculo: int | None = None):
        """Acepta la conexión WebSocket y la registra en el canal del vehículo correspondiente."""
        await websocket.accept()
        if id_vehiculo is not None:
            if id_vehiculo not in self.canales:
                self.canales[id_vehiculo] = []
            self.canales[id_vehiculo].append(websocket)
        else:
            self.clientes_globales.append(websocket)

    def desconectar(self, websocket: WebSocket, id_vehiculo: int | None = None):
        """Remueve la conexión WebSocket de su canal sin afectar a los demás clientes."""
        if id_vehiculo is not None and id_vehiculo in self.canales:
            if websocket in self.canales[id_vehiculo]:
                self.canales[id_vehiculo].remove(websocket)
            if not self.canales[id_vehiculo]:
                del self.canales[id_vehiculo]
        elif websocket in self.clientes_globales:
            self.clientes_globales.remove(websocket)

    async def enviar_a_vehiculo(self, id_vehiculo: int, mensaje: dict):
        """
        Envía un mensaje únicamente a los clientes suscritos al vehículo especificado
        y a los clientes del canal global. Maneja desconexiones sin interrumpir la emisión.
        """
        destinatarios = list(self.canales.get(id_vehiculo, [])) + list(self.clientes_globales)
        desconectados = []

        for ws in destinatarios:
            try:
                await ws.send_json(mensaje)
            except Exception:
                desconectados.append(ws)

        for ws in desconectados:
            self.desconectar(ws, id_vehiculo)
            if ws in self.clientes_globales:
                self.desconectar(ws, None)

    async def enviar_a_todos(self, mensaje: dict):
        """Difusión masiva a todos los canales de vehículos y clientes globales."""
        todos = list(self.clientes_globales)
        for lista in self.canales.values():
            todos.extend(lista)

        desconectados = []
        for ws in set(todos):
            try:
                await ws.send_json(mensaje)
            except Exception:
                desconectados.append(ws)

        for ws in desconectados:
            for vid in list(self.canales.keys()):
                self.desconectar(ws, vid)
            self.desconectar(ws, None)

    def total_clientes(self, id_vehiculo: int | None = None) -> int:
        """Retorna el número de clientes conectados a un vehículo o en total."""
        if id_vehiculo is not None:
            return len(self.canales.get(id_vehiculo, []))
        total = len(self.clientes_globales)
        for lista in self.canales.values():
            total += len(lista)
        return total


websocket_manager = WebSocketManager()
