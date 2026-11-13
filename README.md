# Control y Monitoreo de Excavadora IoT — Práctica 4.1 y 4.2

Aplicación web responsiva (Mobile First) para la teleoperación, control y **monitoreo en tiempo real** de una excavadora o vehículo IoT, integrada con FastAPI en AWS EC2, WebSocket Seguro (WSS) y persistencia en Amazon RDS MySQL.

**Asignatura:** Implementación de Soluciones IoT  
**Docente:** M.C. Víctor Manuel Pinedo Fernández  
**Desarrollado por:** Luis Carlos Márquez Strociak · 2026  
**Repositorio GitHub:** `https://github.com/lcmarquez2005/IoT`  
**Publicación:** Rutas relativas portables para despliegue en GitHub Pages y Vercel  

---

## 1. Mapa de Arquitectura y Flujo Multivista

```
+-----------------------------------------------------------------------------------------+
|                    APLICACIÓN WEB DUAL (SPA: CONTROL + MONITOREO)                       |
|                                                                                         |
|   [ 🎮 VISTA CONTROL ]                               [ 📊 VISTA MONITOREO ]             |
|   • Joystick Táctil / Virtual                        • Tarjeta de Último Estado Real    |
|   • Botones Brazo, Pala y Comodines                  • Tabla Top 10 Movimientos (RDS)   |
|   • Paro de Emergencia (Prioritario)                 • Deduplicación y Recorte en Caliente|
|   • Automatización y Cancelación DEMO                • Reconciliación REST post-caída   |
|                                                                                         |
|   [ HEADER COMPARTIDO — 3 INDICADORES INDEPENDIENTES ]                                  |
|   1. WebSocket WSS (En línea / Conectando / Desconectado)                               |
|   2. Servidor AWS 21 APIs (Disponible / Comprobando / No disponible)                    |
|   3. Amazon RDS (Sin verificar — Rigor técnico: sin endpoint de diagnóstico directo)    |
+-----------------------------------------------------------------------------------------+
                                           |
             HTTP REST (Fetch con timeout) |   WSS Bidireccional (/ws/{id})
             (GET estado, GET historial)   |   (MOVIMIENTO_INDIVIDUAL, DEMO_*)
                                           v   ^
+-----------------------------------------------------------------------------------------+
|                                   BACKEND EN AWS EC2                                    |
|   Instancia: ec2-100-50-120-115.compute-1.amazonaws.com (Puerto 443 HTTPS/WSS)          |
|                                                                                         |
|   • FastAPI + Uvicorn + WSS                                                             |
|   • Endpoints REST (21 Stored Procedures mapeados)                                      |
|   • WebSocket Manager con difusión por vehículo (/ws/{id})                              |
|   • DemoExecutionService temporizado (sin persistencia en historial individual)         |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                                 AMAZON RDS (MYSQL 8.0)                                  |
|   Base de datos: vehiculo_iot                                                           |
|   • sp_obtener_estado (Estado actual de conexión y último comando)                      |
|   • sp_obtener_historial (Máximo 10 movimientos individuales persistidos)               |
|   • sp_actualizar_estado + sp_registrar_historial (Transacción atómica de movimientos)   |
+-----------------------------------------------------------------------------------------+
                                           |
                                           | WSS Seguro (Eventos)
                                           v
+-----------------------------------------------------------------------------------------+
|                                 MICROCONTROLADOR (FÍSICO)                               |
|   • ESP32 con WiFiManager                                                               |
|   • Dos registros 74HC595 en cascada (GPIO 23, 18, 5)                                   |
|   • 12 canales con optoacopladores PC817 conectados al control remoto                   |
|   • Excavadora RC                                                                       |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Contratos de la API y Eventos WebSocket

### A. Endpoints REST Consumidos
* **Información del Vehículo:** `GET /vehiculos/{id_vehiculo}`
* **Último Estado Reportado:** `GET /vehiculos/{id_vehiculo}/estado`
  ```json
  {
    "id_vehiculo": 1,
    "vehiculo": "Excavadora IoT",
    "id_comando": 1,
    "comando": "AVANZAR",
    "codigo": 1,
    "conectado": true,
    "fecha_actualizacion": "2026-11-12T18:30:00Z"
  }
  ```
* **Historial Persistido (Máximo 10):** `GET /vehiculos/{id_vehiculo}/historial`
  ```json
  [
    {
      "id_historial": 105,
      "id_vehiculo": 1,
      "comando": "AVANZAR",
      "codigo": 1,
      "fecha_hora": "2026-11-12T18:30:00Z",
      "origen": "CONTROL_WEB"
    }
  ]
  ```
* **Envío de Movimiento:** `POST /vehiculos/{id_vehiculo}/movimiento`
  * Body: `{"codigo": 1, "origen": "REACT_DASHBOARD"}`
* **Salud del Servidor AWS:** `GET /status` (Verifica disponibilidad HTTP 200 de los 21 servicios).

### B. Eventos WebSocket (`/ws/{id_vehiculo}`)
* `ESTADO_INICIAL`: Snapshot enviado al conectarse el socket.
* `MOVIMIENTO_INDIVIDUAL`: Notificación en tiempo real cuando se ejecuta un movimiento (local o desde clientes externos). Se inserta en la tabla de historial y recorta la fila 11.
* `DEMO_INICIO`, `DEMO_MOVIMIENTO`, `DEMO_FIN`, `DEMO_CANCELADA`: Rutinas DEMO. Actualizan el panel de último estado en curso, pero **están estrictamente filtradas para no contaminar la tabla de 10 movimientos individuales** de RDS.

---

## 3. Reglas de Negocio Implementadas en Monitoreo (Práctica 4.2)

1. **Aislamiento de DEMO:** Las rutinas DEMO ejecutan secuencias en segundo plano y actualizan el estado transitorio del vehículo, pero la lógica de negocio del backend **prohíbe invocar `sp_registrar_historial`** para pasos DEMO. Por tanto, el frontend ignora eventos DEMO en la tabla dinámica, manteniendo la coherencia exacta con Amazon RDS.
2. **Tabla Dinámica Top 10 con Recorte en Caliente:** Al recibir un `MOVIMIENTO_INDIVIDUAL` en vivo:
   * Se inserta en la posición `#1`.
   * Si la tabla tiene más de 10 filas, se remueve visualmente la fila 11.
   * Se re-enumeran del 1 al 10 en tiempo real sin recargar la página.
3. **Prevención de Condiciones de Carrera:** Si una petición REST llega con retraso tras haberse recibido un evento WSS más reciente, se evalúan las marcas de tiempo (`timestamp`) para asegurar que el dato viejo no sobreescriba el dato fresco.
4. **Resiliencia y Reconexión:** Cuando el WebSocket se reconecta tras una interrupción de red, se dispara de inmediato una consulta REST (`GET /estado` + `GET /historial`) para rellenar posibles eventos perdidos durante la desconexión.
5. **Indicadores Independientes:**
   * **WebSocket WSS:** `En línea` (sesión activa con AWS) / `Conectando...` / `Desconectado`.
   * **Servidor AWS:** `Disponible` (salud HTTP de 21 APIs) / `Comprobando...` / `No disponible`.
   * **Amazon RDS:** `Sin verificar` (el backend no provee un endpoint de diagnóstico de DB directo, por lo que reportarlo como disponible sin prueba sería técnicamente engañoso).

---

## 4. Ejecución del Proyecto en Local

```bash
# 1. Ingresar a la carpeta de la aplicación
cd frontend

# 2. Instalar dependencias con pnpm (regla estricta: nunca usar npm)
pnpm install

# 3. Iniciar entorno de desarrollo
pnpm dev

# 4. Compilar para producción con rutas relativas
pnpm build
```

---

## 5. Guía de Verificación y Casos de Prueba (Evidencias)

### Caso 1: Carga Inicial de Monitoreo
1. Abrir la aplicación y hacer clic en la pestaña **[📊 Monitoreo]**.
2. Verificar que se ejecuten las consultas REST iniciales a `/vehiculos/1/estado` y `/vehiculos/1/historial`.
3. Comprobar que la tarjeta de último movimiento muestre la fecha/hora formateada y que la tabla liste exactamente hasta 10 filas numeradas del 1 al 10.

### Caso 2: Emisión Local de Movimiento
1. En la pestaña **[🎮 Control]**, mover el joystick o presionar un botón de brazo/pala (ej. `SUBIR_BRAZO`, código 5).
2. Cambiar a la pestaña **[📊 Monitoreo]** (o tenerla visible en pantalla dividida):
   * La tarjeta pasa a `SUBIR_BRAZO`.
   * La fila #1 de la tabla refleja el movimiento con el badge *"En vivo"*.
   * La numeración se mantiene estricta del 1 al 10.

### Caso 3: Emisión Externa (Thunder Client / Postman)
1. Abrir Thunder Client o Postman.
2. Enviar un `POST` a `https://ec2-100-50-120-115.compute-1.amazonaws.com/vehiculos/1/movimiento` con cuerpo `{"codigo": 1, "origen": "THUNDER_CLIENT"}`.
3. Observar la vista de monitoreo en el navegador: la tabla y la tarjeta se actualizan automáticamente vía WebSocket sin necesidad de refrescar la página.

### Caso 4: Filtro de DEMO
1. Desde la vista de Control, seleccionar una rutina DEMO y pulsar **Iniciar DEMO**.
2. Cambiar a la vista de Monitoreo:
   * La tarjeta muestra el paso DEMO en ejecución.
   * La tabla de los 10 movimientos individuales **permanece inalterada**, confirmando que los pasos DEMO no ensucian el historial de movimientos individuales.

### Caso 5: Reconexión WSS
1. Desconectar temporalmente la red WiFi o bloquear temporalmente el puerto WebSocket.
2. El indicador WSS pasará a `Desconectado` / `Conectando...`.
3. Al restablecer la red, el cliente se reconecta automáticamente y resincroniza el historial REST con Amazon RDS.
