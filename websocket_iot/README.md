# Servidor IoT — Práctica 2.5: APIs para IoT en entorno Dev

API REST y servidor WebSocket en tiempo real construida con **FastAPI** y Programación Orientada a Objetos (**POO**), conectada a **Amazon RDS MySQL** para el control, monitoreo, auditoría y ejecución de secuencias DEMO de vehículos y dispositivos IoT.

---

## 1. Arquitectura y Estructura del Proyecto

El proyecto sigue una arquitectura en capas con separación clara de responsabilidades:

```text
websocket_iot/
├── .venv/                          # Entorno virtual Python (ignorado en Git)
├── app/
│   ├── __init__.py
│   ├── main.py                     # Definición de rutas HTTP FastAPI y endpoints WebSocket
│   ├── database/
│   │   ├── __init__.py
│   │   └── connection.py           # DatabaseManager: conexión a RDS, pooling y transacciones
│   ├── repositories/               # Capa de acceso a datos (21 Stored Procedures)
│   │   ├── __init__.py
│   │   ├── base_repository.py      # BaseRepository con helpers parametrizados
│   │   ├── vehiculo_repository.py  # 5 SPs de catálogo de vehículos
│   │   ├── comando_repository.py   # 4 SPs de diccionario de comandos
│   │   ├── estado_repository.py    # 2 SPs de estado de conexión y último comando
│   │   ├── historial_repository.py # 2 SPs de auditoría y regla de máx 10 registros
│   │   └── demo_repository.py      # 8 SPs de rutinas DEMO y secuencias de movimiento
│   ├── models/
│   │   ├── __init__.py
│   │   ├── estado.py               # Modelo Pydantic Estado legacy
│   │   └── schemas.py              # Esquemas Pydantic para request/response y Swagger
│   ├── services/
│   │   ├── __init__.py
│   │   ├── vehiculo_service.py     # Lógica de negocio y transacciones atómicas de movimiento
│   │   ├── demo_execution_service.py # Ejecutor temporizado asíncrono y cancelación de DEMO
│   │   └── status_service.py       # Servicio de estado rápido con persistencia RDS/fallback
│   ├── websocket/
│   │   ├── __init__.py
│   │   └── websocket_manager.py    # Gestor WebSocket multi-cliente y aislamiento por vehículo
│   └── data/
│       └── status.json             # Almacén de respaldo local
├── .env.example                    # Plantilla de variables de entorno (sin secretos)
├── .gitignore                      # Exclusión de .env, .venv/ y temporales
├── requirements.txt                # Dependencias del proyecto
└── README.md                       # Documentación completa del proyecto
```

---

## 2. Requisitos Previos

- **Python**: 3.10 o superior (verificado en Python 3.14).
- **Amazon RDS**: Instancia MySQL 8.x con el esquema `vehiculo_iot` y los 21 Stored Procedures creados.
- **Thunder Client** (o Postman / cURL) para pruebas HTTP y WebSocket.

---

## 3. Instalación y Configuración

### 3.1. Clonar o ingresar al proyecto
```bash
cd ~/Documents/IoT/websocket_iot
```

### 3.2. Crear y activar el entorno virtual
- **En Linux / macOS:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```
- **En Windows:**
  ```cmd
  .venv\Scripts\activate
  ```

### 3.3. Instalar dependencias
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3.4. Configurar variables de entorno
Copia la plantilla `.env.example` para crear tu archivo `.env` local:
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Amazon RDS (**nunca las compartas ni las subas a Git**):
```env
DB_HOST=tu-instancia-rds.xxxxxx.us-east-2.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=tu_password_seguro
DB_NAME=vehiculo_iot
```

Verifica la conexión ejecutando:
```bash
python -c "from app.database.connection import db_manager; print(db_manager.test_connection())"
```
*(Debe retornar: `{'status': 1, 'database_name': 'vehiculo_iot', 'db_version': ...}`)*.

---

## 4. Ejecución del Servidor

Inicia el servidor Uvicorn en entorno local:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **API Base:** `http://localhost:8000`
- **Documentación Interactiva (Swagger UI):** `http://localhost:8000/docs`
- **Canal WebSocket:** `ws://localhost:8000/ws/{id_vehiculo}` (o `ws://localhost:8000/ws` para vehículo 1)

---

## 5. Matriz de los 21 Stored Procedures Integrados

| # | Procedimiento Almacenado | Mapeo en Repositorio | Método HTTP y Endpoint en API | Propósito |
|---|---|---|---|---|
| 1 | `sp_crear_vehiculo` | `VehiculoRepository.crear_vehiculo` | `POST /vehiculos` | Alta en catálogo de vehículos |
| 2 | `sp_obtener_vehiculos` | `VehiculoRepository.obtener_vehiculos` | `GET /vehiculos` | Catálogo completo de vehículos |
| 3 | `sp_obtener_vehiculo` | `VehiculoRepository.obtener_vehiculo` | `GET /vehiculos/{id_vehiculo}` | Consulta individual de vehículo |
| 4 | `sp_actualizar_vehiculo` | `VehiculoRepository.actualizar_vehiculo` | `PUT /vehiculos/{id_vehiculo}` | Modificación de datos del vehículo |
| 5 | `sp_eliminar_vehiculo` | `VehiculoRepository.eliminar_vehiculo` | `DELETE /vehiculos/{id_vehiculo}` | Baja física en cascada |
| 6 | `sp_crear_comando` | `ComandoRepository.crear_comando` | `POST /vehiculos/{id_vehiculo}/comandos` | Alta de comando por vehículo |
| 7 | `sp_obtener_comandos_vehiculo` | `ComandoRepository.obtener_comandos_vehiculo` | `GET /vehiculos/{id_vehiculo}/comandos` | Comandos válidos del vehículo |
| 8 | `sp_actualizar_comando` | `ComandoRepository.actualizar_comando` | `PUT /comandos/{id_comando}` | Modificación de comando |
| 9 | `sp_eliminar_comando` | `ComandoRepository.eliminar_comando` | `DELETE /comandos/{id_comando}` | Baja física de comando |
| 10 | `sp_actualizar_estado` | `EstadoRepository.actualizar_estado` | `POST /vehiculos/{id}/movimiento` | Transacción atómica de estado / DEMO |
| 11 | `sp_obtener_estado` | `EstadoRepository.obtener_estado` | `GET /vehiculos/{id_vehiculo}/estado` | Consulta de estado y handshake WS |
| 12 | `sp_registrar_historial` | `HistorialRepository.registrar_historial` | `POST /vehiculos/{id}/movimiento` | Auditoría atómica de comandos individuales |
| 13 | `sp_obtener_historial` | `HistorialRepository.obtener_historial` | `GET /vehiculos/{id_vehiculo}/historial` | Historial (máx. 10 más recientes) |
| 14 | `sp_crear_demo` | `DemoRepository.crear_demo` | `POST /vehiculos/{id_vehiculo}/demos` | Alta de rutina DEMO |
| 15 | `sp_obtener_demos` | `DemoRepository.obtener_demos` | `GET /vehiculos/{id_vehiculo}/demos` | Catálogo de DEMOs del vehículo |
| 16 | `sp_actualizar_demo` | `DemoRepository.actualizar_demo` | `PUT /demos/{id_demo}` | Modificación de rutina DEMO |
| 17 | `sp_eliminar_demo` | `DemoRepository.eliminar_demo` | `DELETE /demos/{id_demo}` | Baja física de DEMO |
| 18 | `sp_agregar_movimiento_demo` | `DemoRepository.agregar_movimiento_demo` | `POST /demos/{id_demo}/movimientos` | Añadir paso a secuencia DEMO |
| 19 | `sp_obtener_movimientos_demo`| `DemoRepository.obtener_movimientos_demo` | `GET /demos/{id_demo}/movimientos` | Pasos ordenados y ejecución DEMO |
| 20 | `sp_actualizar_movimiento_demo` | `DemoRepository.actualizar_movimiento_demo` | `PUT /demos/movimientos/{id_mov}` | Modificación de paso de DEMO |
| 21 | `sp_eliminar_movimiento_demo` | `DemoRepository.eliminar_movimiento_demo` | `DELETE /demos/movimientos/{id_mov}` | Retirar paso de secuencia DEMO |

---

## 6. Reglas de Negocio Implementadas

1. **Movimiento Individual:**
   - Valida que el vehículo exista y esté activo en RDS.
   - Valida que el comando exista, pertenezca al vehículo y esté activo.
   - Ejecuta `sp_actualizar_estado` y `sp_registrar_historial` de forma atómica dentro de una misma transacción.
   - Emite el evento `MOVIMIENTO_INDIVIDUAL` por WebSocket **únicamente después del commit exitoso**.
   - Si la transacción falla, realiza `rollback` inmediato y no emite evento.
   - Preserva la bandera `conectado` real del vehículo sin asumir conexión solo por recibir peticiones HTTP.

2. **Consultas GET e Historial:**
   - Los GET son estrictamente de solo lectura y no alteran la base de datos.
   - El endpoint `/vehiculos/{id}/historial` devuelve como máximo los 10 registros individuales más recientes, ordenados del más nuevo al más antiguo.
   - Las consultas a IDs inexistentes retornan `404 Not Found`.

3. **WebSocket Multi-Cliente y Aislamiento:**
   - Al conectar a `/ws/{id_vehiculo}`, consulta RDS y emite de inmediato el `ESTADO_INICIAL`.
   - Soporta al menos dos clientes simultáneos para el mismo vehículo.
   - Aislamiento total: un cliente monitoreando el vehículo 1 **nunca** recibe eventos dirigidos al vehículo 2.
   - Desconexiones controladas sin afectar a otros clientes activos.

4. **Ejecución Temporizada de DEMO:**
   - Consulta la secuencia real desde RDS con `sp_obtener_movimientos_demo`.
   - Ejecuta los movimientos de forma asíncrona no bloqueante respetando los milisegundos de `duracion_ms` y `pausa_ms`.
   - Emite por WebSocket `DEMO_INICIO`, cada paso ordenado de `DEMO_MOVIMIENTO` y `DEMO_FIN`.
   - Actualiza el estado con `sp_actualizar_estado`.
   - **PROHIBICIÓN ESTRICTA CUMPLIDA:** `sp_registrar_historial` **nunca** se ejecuta durante una DEMO; el historial se mantiene intacto.
   - Impide dos DEMOs simultáneas para el mismo vehículo (responde `409 Conflict`).
   - Permite cancelación inmediata vía `POST /vehiculos/{id}/demos/cancelar`, deteniendo el vehículo y emitiendo `DEMO_CANCELADA`.

---

## 7. Estructura de Mensajes WebSocket

Todos los mensajes JSON transmitidos identifican el tipo de evento, vehículo, datos asociados y marca temporal:

### Estado Inicial (al conectar):
```json
{
  "evento": "ESTADO_INICIAL",
  "id_vehiculo": 1,
  "vehiculo": "Excavadora IoT",
  "id_comando": 9,
  "comando": "DETENER",
  "codigo": 9,
  "conectado": true,
  "fecha_actualizacion": "2026-10-07 02:42:56",
  "timestamp": "2026-10-15T19:22:00.000Z"
}
```

### Movimiento Individual Confirmado:
```json
{
  "evento": "MOVIMIENTO_INDIVIDUAL",
  "id_vehiculo": 1,
  "vehiculo": "Excavadora IoT",
  "id_comando": 1,
  "comando": "AVANZAR",
  "codigo": 1,
  "origen": "MANUAL",
  "conectado": true,
  "timestamp": "2026-10-15T19:22:10.000Z"
}
```

### Inicio de DEMO:
```json
{
  "evento": "DEMO_INICIO",
  "id_vehiculo": 1,
  "vehiculo": "Excavadora IoT",
  "id_demo": 1,
  "demo": "Demo principal",
  "total_movimientos": 8,
  "timestamp": "2026-10-15T19:22:15.000Z"
}
```

### Movimiento de DEMO en curso:
```json
{
  "evento": "DEMO_MOVIMIENTO",
  "id_vehiculo": 1,
  "vehiculo": "Excavadora IoT",
  "id_demo": 1,
  "orden": 1,
  "paso_actual": 1,
  "total_movimientos": 8,
  "id_comando": 1,
  "comando": "AVANZAR",
  "codigo": 1,
  "duracion_ms": 2000,
  "pausa_ms": 400,
  "timestamp": "2026-10-15T19:22:16.000Z"
}
```

### Finalización de DEMO:
```json
{
  "evento": "DEMO_FIN",
  "id_vehiculo": 1,
  "vehiculo": "Excavadora IoT",
  "id_demo": 1,
  "demo": "Demo principal",
  "movimientos_completados": 8,
  "timestamp": "2026-10-15T19:22:25.000Z"
}
```

### Cancelación de DEMO:
```json
{
  "evento": "DEMO_CANCELADA",
  "id_vehiculo": 1,
  "id_demo": 1,
  "demo": "Demo principal",
  "motivo": "Cancelación solicitada por el usuario",
  "timestamp": "2026-10-15T19:22:18.000Z"
}
```

---

## 8. Guía para las 3 Pruebas de Entrega (Thunder Client)

La práctica solicita documentar tres escenarios funcionales:

### Prueba 1: POST de Movimiento Individual
1. En Thunder Client, crea una petición `POST http://localhost:8000/vehiculos/1/movimiento`.
2. Header: `Content-Type: application/json`.
3. Body:
   ```json
   {
     "codigo": 1,
     "origen": "THUNDER_CLIENT"
   }
   ```
4. **Resultado esperado:** Código `200 OK`, cuerpo confirmando `AVANZAR`.
5. Ejecuta `GET http://localhost:8000/vehiculos/1/estado` para verificar que el estado es `AVANZAR` (`codigo: 1`).

### Prueba 2: GET Historial (Límite 10 y orden descendente)
1. Petición `GET http://localhost:8000/vehiculos/1/historial`.
2. **Resultado esperado:** Código `200 OK`, lista JSON con un máximo de 10 elementos ordenados del más nuevo al más antiguo. El primer elemento muestra el movimiento enviado en la Prueba 1 con `origen: "THUNDER_CLIENT"`.

### Prueba 3: WebSocket + POST Inicio de DEMO (Historial Invariable)
1. Abre una pestaña WebSocket en Thunder Client y conéctate a:
   `ws://localhost:8000/ws/1`
   *(Observa el mensaje `ESTADO_INICIAL`)*.
2. Consulta y anota el número de registros en `GET http://localhost:8000/vehiculos/1/historial`.
3. Envía una petición `POST http://localhost:8000/vehiculos/1/demos/1/iniciar`.
4. En la pestaña WebSocket observarás:
   - Evento `DEMO_INICIO` (8 movimientos).
   - Los 8 eventos `DEMO_MOVIMIENTO` en estricto orden cronológico respetando sus duraciones y pausas.
   - Evento `DEMO_FIN`.
5. Vuelve a ejecutar `GET http://localhost:8000/vehiculos/1/historial`:
   - **Comprobación:** La lista es exactamente la misma; **ningún movimiento de la DEMO fue agregado al historial**.
