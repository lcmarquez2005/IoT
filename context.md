   Contexto de la Solución IoT: Base de Datos y WebSocket API

  Este espacio de trabajo contiene los dos componentes centrales para el control, monitoreo y gestión de
  vehículos o dispositivos IoT:
  ──────
  ## 1. Proyecto Base de Datos (db)

  • Ubicación: db/
  • Motor: MySQL (utf8mb4).
  • Archivos principales:
      • vehiculo_iot.sql: Script DDL completo con creación de base de datos, tablas, relaciones por
      llaves foráneas (CASCADE/SET NULL/RESTRICT), procedimientos almacenados y datos de prueba
      iniciales.
      • database.md: Documentación del modelo relacional, descripción de entidades y casos de prueba.
      • modelodb.mwb: Diagrama entidad-relación (MySQL Workbench).


  ### Propósito y Modelo de Datos

  Gestiona el ecosistema de vehículos IoT, sus comandos asociados, secuencias pregrabadas
  (demos/rutinas), estado de conectividad y auditoría de ejecución. Se compone de 6 tablas:

  1. vehiculos: Registro y catálogo de dispositivos/vehículos (microcontrolador, nombre, modelo, estado
  activo).
  2. comandos: Diccionario de comandos disponibles por vehículo (código numérico, nombre, descripción).
  3. estado_vehiculo: Estado actual de conexión (conectado) y último comando ejecutado por cada vehículo.
  4. historial_comandos: Bitácora y trazabilidad de comandos recibidos y origen (MANUAL, etc.).
  5. demos: Catálogo de rutinas o secuencias automatizadas por vehículo.
  6. demo_movimientos: Pasos individuales que componen una demo (orden, comando a ejecutar, duración en
  milisegundos y tiempo de pausa).

  ### Procedimientos Almacenados

  • sp_crear_vehiculo
  • sp_obtener_vehiculos
  • sp_obtener_vehiculo
  • sp_actualizar_vehiculo
  • sp_eliminar_vehiculo
  • sp_crear_comando
  • sp_obtener_comandos_vehiculo
  • sp_actualizar_comando
  • sp_eliminar_comando
  • sp_actualizar_estado
  • sp_obtener_estado
  • sp_registrar_historial
  • sp_obtener_historial
  • sp_crear_demo
  • sp_obtener_demos
  • sp_actualizar_demo
  • sp_eliminar_demo
  • sp_agregar_movimiento_demo
  • sp_obtener_movimientos_demo
  • sp_actualizar_movimiento_demo
  • sp_eliminar_movimiento_demo
  ──────
  ## 2. Proyecto Servidor WebSocket & API (websocket_iot)

  • Ubicación: websocket_iot/
  • Stack tecnológico: Python 3.10+, FastAPI, Uvicorn, WebSockets, Pydantic.
  • Archivos clave:
      • main.py: Punto de entrada y definición de rutas HTTP y WebSocket.
      • estado.py: Modelo de validación de datos (Estado con campo numérico ESTADO entre 0 y 12).
      • status_service.py: Capa de servicio encargada de leer y persistir el estado local.
      • websocket_manager.py: Gestor de conexiones concurrentes y difusión masiva (broadcasting) en
      tiempo real.
      • status.json: Almacenamiento local del estado actual.


  ### Propósito y Arquitectura

  Servidor de comunicación bidireccional y en tiempo real para interactuar con el vehículo/cliente IoT y
  aplicaciones de control (web o móvil):

  • Persistencia actual: Utiliza almacenamiento rápido en archivo JSON (status.json).
  • Broadcasting: Cuando se emite un nuevo estado o comando mediante la API REST, el servidor actualiza
  la persistencia y difunde automáticamente el nuevo estado a todos los clientes WebSocket conectados.
  • Endpoints HTTP:
      • GET /status y GET /estado: Obtiene el estado actual del dispositivo ({"ESTADO": int}).
      • POST /status y POST /estado: Recibe un nuevo estado (0 a 12), lo persiste y lo emite vía
      WebSocket.
  • Canal WebSocket:
      • ws://<host>:8000/ws: Envía el estado actual inmediatamente tras conectarse y mantiene el socket
      abierto para recibir actualizaciones en vivo.

  ──────
  ## Relación entre ambos proyectos

  • db modela la persistencia estructural relacional completa (catálogo de vehículos, comandos válidos,
  rutinas programadas y auditoría histórica).
  • websocket_iot gestiona la capa de enlace y control en tiempo real entre los clientes y el hardware
  IoT.


