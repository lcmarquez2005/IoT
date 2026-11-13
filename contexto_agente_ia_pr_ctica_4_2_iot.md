# CONTEXTO DE DESARROLLO: PRÁCTICA 4.2 — APLICACIÓN DE MONITOREO PARA IoT

> **INSTRUCCIÓN PARA EL AGENTE DE IA:** Actúa como Arquitecto Frontend, Desarrollador Senior JavaScript ES6+, Especialista UX/UI Mobile First e Ingeniero de Integración IoT (AWS, Python/FastAPI, REST, WebSocket seguro WSS y Amazon RDS MySQL). Tienes acceso al workspace local (Frontend 4.1, Backend FastAPI y esquema RDS). **NO modifiques el backend ni la base de datos**, úsalos exclusivamente para inspeccionar contratos reales, endpoints, payloads y reglas de negocio antes de escribir código en el frontend.

---

## 1. OBJETIVO DE LA PRÁCTICA

Ampliar el proyecto web individual de la **Práctica 4.1 (CONTROL)** dentro del **mismo repositorio y publicación de GitHub Pages**, incorporando una segunda vista llamada **MONITOREO** en tiempo real, **sin reconstruir desde cero ni romper ninguna función existente** (joystick, botones direccionales, DETENER, DEMO, indicadores, favicon y créditos).

---

## 2. LÍMITES Y RESTRICCIONES ESTRICTAS (PROHIBICIONES)

1. **NO modificar el backend (FastAPI/AWS) ni el esquema/tablas/procedimientos de Amazon RDS MySQL.**
2. **NO crear un repositorio nuevo** ni migrar a Vercel/Netlify; debe desplegarse en el mismo GitHub Pages de la práctica 4.1 usando rutas relativas.
3. **NO implementar módulos de Administración** (sin CRUD administrativo, edición de DEMO, gestión de usuarios ni gráficas históricas).
4. **NO conectar hardware físico (ESP8266/ESP32)** ni simular confirmación de ejecución física de motores.
5. **NO usar polling periódico (`setInterval`)** como sustituto de WebSocket para refrescar el historial.
6. **NO inventar rutas, propiedades JSON, códigos de estado ni timestamps.** Todo debe extraerse de la inspección real del código del backend/Swagger.
7. **NO exponer secretos, credenciales RDS, claves AWS ni tokens privados** en el código fuente público.

---

## 3. REQUERIMIENTOS FUNCIONALES DE MONITOREO

### A. Navegación y Diseño Mobile First (HTML5 + CSS3 + Bootstrap 5)
* Mantener identidad visual, paleta de colores, `favicon` original y el pie de página: `Desarrollado por [Nombre Completo] · [Año]`.
* Agregar barra o pestañas de navegación limpia para alternar entre **CONTROL** y **MONITOREO** sin recargar la página y **sin duplicar conexiones WSS ni event listeners**.
* Diseño responsivo (móvil vertical/horizontal, tableta y escritorio), accesible por teclado, con foco visible, etiquetas semánticas y estados explícitos (`Cargando`, `Sin movimientos`, `Desconectado`, `Reconectando`, `Sin verificar`, `Error`).

### B. Panel Principal: Último Movimiento / Estado Reportado
* Mostrar de forma destacada: nombre del vehículo, último movimiento/estado real, fecha y hora verificables provenientes del backend (y código/estado solo si existe en el payload real).
* **Carga inicial:** Al abrir MONITOREO, consultar por `GET` (Fetch + `async/await`) el último estado real del `VEHICLE_ID`.
* **Tiempo real:** Escuchar eventos entrantes por **WSS** para actualizar la tarjeta inmediatamente (incluso si el comando se envió desde otra pestaña o cliente externo como Postman/Thunder Client).
* **Reglas de negocio:**
  * Diferenciar conceptual y visualmente entre *último evento reportado por el servidor* y *ejecución física del dispositivo*.
  * Evitar condiciones de carrera: una respuesta HTTP REST tardía **no debe sobrescribir** un evento WSS más reciente.
  * Los pasos internos de una rutina **DEMO** pueden actualizar este panel si el backend emite eventos WSS para ellos, pero **no** deben mezclarse con el historial individual.

### C. Tabla Dinámica: Los 10 Últimos Movimientos Individuales
* Columnas mínimas semánticas: `#` (numeración visual del 1 al 10), `Movimiento`, `Fecha`, `Hora` (opcionalmente ID/código real si existe).
* Mostrar **estrictamente los últimos 10 movimientos individuales PERSISTIDOS en RDS**, ordenados del más reciente al más antiguo.
* **Flujo de actualización:**
  1. Carga inicial vía `GET` REST al entrar a MONITOREO.
  2. Al recibir por WSS un movimiento individual válido para el `VEHICLE_ID`, disparar la resincronización con la persistencia confirmada por REST (o procesar el registro persistido si el contrato WSS lo entrega explícitamente) y actualizar solo el DOM necesario sin recargar.
  3. **Filtro de DEMO:** Asegurar que los movimientos internos de una DEMO **no** contaminen esta tabla si la lógica de negocio del backend no los persiste en el historial individual.
  4. Retirar visualmente la fila 11 al entrar un movimiento nuevo **nunca** debe invocar ningún borrado en RDS.
  5. Deduplicar por ID real/timestamp y descartar eventos de otros `VEHICLE_ID`.

### D. Los 3 Indicadores Independientes de Conectividad
Deben ser visibles y reales en ambas vistas (CONTROL y MONITOREO):
1. **WebSocket WSS (Sesión del navegador):** `En línea` / `Conectando-Reconectando` / `Desconectado`. *(Nota: Que WSS esté en línea solo indica conexión navegador ↔ AWS, nunca presencia física del carrito).*
2. **Servidor AWS · API de 21 servicios:** `Disponible` / `Comprobando` / `No disponible` (verificado mediante endpoint real de salud con timeout).
3. **Amazon RDS:** `Disponible` / `No disponible` / `Sin verificar` (solo pasa a `Disponible` si existe un endpoint real de diagnóstico de BD en FastAPI; si no existe, mostrar `Sin verificar`).

### E. Resiliencia y Reconexión
* Compartir **una única instancia de cliente WSS** entre CONTROL y MONITOREO.
* Implementar reconexión controlada con backoff progresivo ante caídas de red/socket.
* **Al reconectar WSS:** Ejecutar automáticamente una resincronización por REST (`GET` último estado + `GET` historial de 10 movimientos) para recuperar eventos perdidos durante la desconexión.

---

## 4. PLAN DE EJECUCIÓN POR ETAPAS (WORKFLOW OBLIGATORIO PARA EL AGENTE)

Ejecuta este proceso paso a paso, validando cada fase antes de avanzar a la siguiente:

* **ETAPA 1 — Auditoría de Workspace (Front, Back y DB):**
  * Inspecciona el proyecto frontend actual (4.1) para mapear su estructura de carpetas, módulos JS, configuración y estilos.
  * Inspecciona el código fuente del backend (FastAPI) y los esquemas/procedimientos de RDS (solo lectura) para extraer:
    * `API_BASE_URL` y `WS_URL`
    * `VEHICLE_ID` configurado
    * Rutas exactas `GET` para último estado, `GET` para historial (parámetros de límite, filtro por vehículo y orden), y endpoints de salud (`health` / `db-ready`).
    * Estructura exacta de los payloads JSON (REST y mensajes WSS para comandos individuales vs. eventos DEMO).
    * Mecanismo de autenticación/headers/CORS.
  * Documenta este hallazgo antes de tocar código.

* **ETAPA 2 — Arquitectura Modular:**
  * Propón la distribución de archivos manteniendo lo funcional de 4.1 y separando responsabilidades: navegación, vista control, vista monitoreo, cliente REST centralizado (con `AbortController`, timeouts y control de concurrencia), cliente WSS compartido, gestor de estado/deduplicación, formateador de fecha/hora (zona horaria real del backend) y gestor de indicadores.

* **ETAPA 3 — Interfaz Responsiva y Navegación:**
  * Integra la navegación `CONTROL` / `MONITOREO` y maqueta la vista de monitoreo Mobile First con Bootstrap 5 sin alterar la operatividad de joystick/botones/DEMO.

* **ETAPA 4 — Integración REST (Carga Inicial):**
  * Conecta los `GET` reales para poblar la tarjeta de último estado y la tabla de máximo 10 registros persistidos, manejando estados vacíos, errores HTTP y zonas horarias.

* **ETAPA 5 — Integración WSS en Tiempo Real y Reconciliación:**
  * Conecta el socket compartido para actualizar tarjeta y tabla en vivo, filtrar por vehículo, ignorar duplicados, evitar que DEMO ensucie la tabla y resincronizar vía REST tras reconexión.

* **ETAPA 6 — Documentación y Verificación Final:**
  * Actualiza el `README.md` con la arquitectura 4.2, contratos de API/WSS utilizados, instrucciones de ejecución y guía de verificación de casos de prueba (carga inicial, comando local, comando desde otra pestaña/cliente externo, más de 10 registros, reconexión WSS y ejecución de DEMO).
```

Puedes guardar este archivo en la raíz de tu workspace (por ejemplo como `CONTEXTO_AGENTE_4_2.md`) y pedirle a tu agente que lea primero ese archivo y ejecute la **Etapa 1** inspeccionando tu código actual de frontend y backend.