# Control de Excavadora IoT — Práctica 4.1

Aplicación web responsiva (Mobile First) para la teleoperación y control en tiempo real de una excavadora o vehículo IoT, integrada con FastAPI en AWS EC2, WebSocket Seguro (WSS) y Amazon RDS MySQL.

**Asignatura:** Implementación de Soluciones IoT  
**Docente:** M.C. Víctor Manuel Pinedo Fernández  
**Desarrollado por:** Luis Carlos Márquez Strociak · 2026  
**Repositorio GitHub:** `https://github.com/lcmarquez2005/IoT`  
**GitHub Pages:** `https://lcmarquez2005.github.io/IoT/`  

---

## 1. Mapa de Arquitectura y Flujo de Datos

```
+-----------------------------------------------------------------------------------------+
|                                CLIENTE WEB (GITHUB PAGES)                               |
|                                                                                         |
|   +-----------------------+   +----------------------+   +--------------------------+   |
|   |  Joystick Táctil /    |   | Botones Catálogo     |   | Automatización DEMO      |   |
|   |  Mouse (PointerEvents)|   | (Brazo, Pala, Aux.)  |   | (Selección, Inicio, Paro)|   |
|   +-----------+-----------+   +----------+-----------+   +------------+-------------+   |
|               |                          |                            |                 |
|               +--------------------------+----------------------------+                 |
|                                          |                                              |
|                               v          v          v                                   |
|                        +------------------------------------+                           |
|                        |     Movement & Demo Controller     |                           |
|                        +-----------------+------------------+                           |
+------------------------------------------|----------------------------------------------+
                                           |
                    HTTP POST (Fetch API)  |   WSS Eventos (WebSocket Nativo)
                    (Movimientos / DEMO)   |   (Tiempo Real)
                                           v   ^
+-----------------------------------------------------------------------------------------+
|                                   BACKEND EN AWS EC2                                    |
|   Instancia: ec2-100-50-120-115.compute-1.amazonaws.com (Puerto 443 HTTPS/WSS)          |
|                                                                                         |
|   +---------------------------------------------------------------------------------+   |
|   |                            FastAPI + Uvicorn + WSS                              |   |
|   |   • Endpoints REST (21 Stored Procedures mapeados)                              |   |
|   |   • WebSocket Manager con difusión masiva por vehículo (/ws/{id})               |   |
|   |   • DemoExecutionService temporizado                                            |   |
|   +---------------------------------------+-----------------------------------------+   |
|                                           |                                             |
|                                           v                                             |
|                         +-----------------------------------+                           |
|                         |      Amazon RDS (MySQL 8.0)       |                           |
|                         |    Base de datos: vehiculo_iot    |                           |
|                         +-----------------------------------+                           |
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

## 2. Árbol de Carpetas y Estructura Modular

El proyecto cumple estrictamente con el estándar modular HTML5 semántico, CSS3, Bootstrap 5 y JavaScript ES6+ con módulos nativos (sin empaquetadores pesados ni dependencias de compilación):

```
.
├── index.html                  # Estructura semántica, accesibilidad y maquetación Mobile First
├── assets/
│   └── favicon.svg             # Favicon vectorial original representativo del proyecto IoT
├── css/
│   └── styles.css              # Estilos personalizados (Joystick, indicadores, botones ergonómicos)
├── js/
│   ├── config.js               # Parámetros de conexión, catálogo de comandos y persistencia
│   ├── api-client.js           # Cliente REST modular con Fetch API, timeouts y async/await
│   ├── websocket-client.js     # Cliente WebSocket nativo con heartbeat y reconexión limpia
│   ├── joystick.js             # Controlador del joystick circular con Pointer Events y deadzone
│   ├── movement-controller.js  # Lógica centralizada de comandos y prioridad máxima de DETENER
│   ├── demo-controller.js      # Consulta, selección, inicio y cancelación de rutinas DEMO
│   ├── status-indicators.js    # Los tres indicadores independientes (WSS, API AWS, RDS)
│   ├── ui-feedback.js          # Retroalimentación visual operativa y notificaciones
│   └── main.js                 # Punto de entrada ES6+ que orquesta la aplicación
├── docs/                       # Documentación técnica, conclusiones y evidencias
└── README.md                   # Documento maestro del proyecto
```

---

## 3. Catálogo Real de Comandos (Vehículo ID: 1)

Los comandos integrados en la interfaz corresponden de forma idéntica a los registrados en la base de datos `vehiculo_iot`:

| Código | Comando | Tipo de Control | Acción Física |
| :---: | :--- | :--- | :--- |
| **1** | `AVANZAR` | Joystick (Norte) | Tracción de orugas hacia adelante |
| **2** | `RETROCEDER` | Joystick (Sur) | Tracción de orugas hacia atrás |
| **3** | `GIRAR_IZQUIERDA` | Joystick (Oeste) | Giro del vehículo sobre su propio eje a la izquierda |
| **4** | `GIRAR_DERECHA` | Joystick (Este) | Giro del vehículo sobre su propio eje a la derecha |
| **5** | `SUBIR_BRAZO` | Botón ergonómico | Elevación del brazo articulado |
| **6** | `BAJAR_BRAZO` | Botón ergonómico | Descenso del brazo articulado |
| **7** | `ABRIR_PALA` | Botón ergonómico | Apertura de la cuchara excavadora |
| **8** | `CERRAR_PALA` | Botón ergonómico | Cierre de la cuchara excavadora |
| **9** | `DETENER` | Botón Paro / Centro Joystick | Detención inmediata de cualquier actuador |
| **10** | `ENCENDER` | Botón auxiliar | Encendido de sistema / vehículo |
| **11** | `TOGGLE_MUSIC` | Botón auxiliar | Alternar sonido / música integrada |
| **12** | `TOGGLE_LIGHT` | Botón auxiliar | Alternar luces led de la cabina |

---

## 4. Los Tres Indicadores Independientes de Conectividad (Req. 6.1)

La interfaz presenta en la parte superior tres estados independientes con verificaciones reales y diferenciadas:

1. **WebSocket WSS:**
   - **En línea:** Sesión WebSocket activa entre el navegador y el servidor AWS. *(No equivale a que el vehículo físico esté encendido o conectado)*.
   - **Conectando / Reconectando:** Intento de apertura de socket en curso.
   - **Desconectado:** Conexión cerrada o rechazada.
2. **Servidor AWS · API de 21 servicios:**
   - **Disponible:** Comprobación periódica HTTP a la operación `/status` respondiendo con código 200. *(No confirma que las 21 APIs se hayan ejecutado exitosamente)*.
   - **Comprobando:** Petición de diagnóstico en tránsito.
   - **No disponible:** Servidor inalcanzable o respuesta fuera de tiempo.
3. **Base de Datos · Amazon RDS:**
   - **Sin verificar:** Dado que el backend actual no ofrece un endpoint aislado de diagnóstico de dependencias de MySQL, la aplicación cumple con la norma académica estricta de reportar el estado como *Sin verificar* para no realizar afirmaciones sin evidencia directa.

---

## 5. Instrucciones de Ejecución Local

Para probar la aplicación en Visual Studio Code sin requerir compilación ni Node.js:

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/lcmarquez2005/IoT.git
   cd IoT
   ```
2. Abrir el proyecto en **Visual Studio Code**.
3. Iniciar un servidor web local estático (debido al uso de módulos nativos ES6 `import/export`, los navegadores requieren servir mediante protocolo HTTP/HTTPS):
   - Con la extensión **Live Server** de VS Code: Clic derecho en `index.html` → *Open with Live Server*.
   - O con Python en la terminal:
     ```bash
     python3 -m http.server 8080
     ```
4. Abrir en el navegador: `http://localhost:8080`.

---

## 6. Guía de Publicación en GitHub Pages

1. Ir al repositorio en GitHub: `https://github.com/lcmarquez2005/IoT`.
2. Ingresar a **Settings** → **Pages**.
3. En **Build and deployment**:
   - **Source:** *Deploy from a branch*.
   - **Branch:** `main` / `root (/)`.
4. Guardar cambios. GitHub Pages activará la URL pública HTTPS en:  
   `https://lcmarquez2005.github.io/IoT/`
5. Todas las rutas de estilos, scripts e imágenes son relativas (`./`), por lo que funcionan perfectamente bajo la subruta del repositorio.

---

## 7. Casos de Prueba Paso a Paso (Evidencias)

### Prueba A: Movimiento Individual
1. En la pantalla táctil del móvil o con mouse, arrastrar el joystick hacia arriba (Norte).
2. Observar en el panel de retroalimentación:
   - *Última acción:* `AVANZAR (Código 1)`.
   - *Respuesta HTTP:* `HTTP 200 — Movimiento individual ejecutado y registrado correctamente`.
3. En un cliente WebSocket externo (Thunder Client / Postman):
   - Verificar la recepción del JSON: `{"evento":"MOVIMIENTO_INDIVIDUAL","codigo":1,"comando":"AVANZAR",...}`.

### Prueba B: Cambio de Dirección y DETENER
1. Arrastrar el joystick a la izquierda (`GIRAR_IZQUIERDA`, código 3) y soltarlo inmediatamente.
2. Al soltar, el joystick regresa automáticamente a la zona neutral central y emite `DETENER` (código 9).
3. Verificar que solo se enviaron 2 peticiones POST (una al iniciar giro y otra al soltar), sin emitir ráfagas continuas por cada píxel.

### Prueba C: Automatización DEMO
1. Seleccionar la rutina en el menú desplegable: `Demo principal`.
2. Pulsar **Iniciar DEMO**:
   - Los controles manuales se bloquean para evitar comandos conflictivos concurrentes.
   - La barra de progreso avanza en tiempo real conforme llegan los eventos `DEMO_MOVIMIENTO`.
3. Pulsar **Cancelar**: Se emite la petición a `/demos/cancelar` y el sistema regresa a reposo seguro.

### Prueba D: Verificación Independiente en Cliente Externo WSS
1. Abrir Thunder Client en VS Code o Postman.
2. Conectar a: `wss://ec2-100-50-120-115.compute-1.amazonaws.com/ws/1`.
3. Enviar cualquier comando desde la interfaz web y contrastar que el cliente externo reciba exactamente el mismo payload JSON con timestamp idéntico.

---

## 8. Checklist de Seguridad, Accesibilidad y Calidad

- [x] **Sin secretos públicos:** No se incluyen claves de AWS, credenciales de RDS ni tokens en el código fuente.
- [x] **Prioridad Operativa de DETENER:** El botón de paro total anula solicitudes en curso y detiene inmediatamente el vehículo.
- [x] **Aislamiento de Responsabilidades:** Separación estricta entre presentación, cliente HTTP, gestión WebSocket y controladores de dominio.
- [x] **Accesibilidad Táctil:** Botones con dimensiones mínimas de 44 × 44 px, contraste accesible (WCAG AA) y navegación opcional por teclado (WASD, Espacio).
- [x] **Compatibilidad Mobile First:** Diseñado y probado para smartphone en orientación vertical y horizontal, adaptándose a tablet y escritorio.
- [x] **Créditos Obligatorios:** Visible en el pie de página: *«Desarrollado por Luis Carlos Márquez Strociak · 2026»*.
- [x] **Favicon Original:** Incorporado en formato SVG y vinculado en el `<head>`.
