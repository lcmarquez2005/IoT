
# Contexto de trabajo — Práctica 2.5: APIs para IoT en entorno Dev

## 1. Objetivo de este archivo

Este documento es el contexto inicial para que un agente de programación ayude a completar la práctica por etapas, trabajando sobre una API FastAPI que ya existe y funciona localmente. El agente no debe rehacer el proyecto desde cero sin antes inspeccionar el código actual.

El flujo de trabajo esperado es:
1. El agente inspecciona el repositorio y explica el estado actual.
2. Propone e implementa solamente una etapa a la vez.
3. Ejecuta pruebas y muestra resultados concretos.
4. Resume los archivos modificados, comandos ejecutados, pruebas realizadas y pendientes.
5. El usuario comparte ese reporte conmigo para validar la etapa antes de continuar.

No afirmar que algo está terminado si no se comprobó con código, comandos o pruebas reproducibles.

## 2. Contexto confirmado por el usuario

- La API básica ya está implementada y funciona en local.
- Actualmente la API no está conectada a una base de datos.
- La instancia de Amazon RDS está encendida y la base de datos y los procedimientos almacenados ya existen en AWS.
- El objetivo es terminar la práctica reutilizando la API existente, no empezar desde cero.
- El desarrollo y la ejecución de esta práctica deben permanecer en la computadora local del alumno.
- La API debe responder en `http://localhost:8000` y su documentación HTTP en `http://localhost:8000/docs`.
- No desplegar esta API públicamente durante esta práctica; el despliegue corresponde a la práctica 2.6.
- No incluir credenciales, tokens, contraseñas ni archivos `.env` en el repositorio ni en evidencias.

**Importante:** no se han inspeccionado todavía los archivos fuente de la API en este proceso. No asumir nombres de módulos, rutas, clases, modelos ni comportamiento exacto. El agente debe descubrirlo leyendo el repositorio.

## 3. Objetivo académico de la práctica

Construir individualmente una API local en Python usando FastAPI y programación orientada a objetos (POO), conectada a Amazon RDS MySQL, que integre los 21 procedimientos almacenados existentes del esquema `vehiculo_iot`.

La solución debe ofrecer:
- Endpoints HTTP GET y POST para vehículos, comandos, estado, historial, DEMO y movimientos de DEMO.
- WebSocket por vehículo para monitoreo y emisión de eventos en tiempo real.
- Ejecución temporizada de DEMO desde los movimientos almacenados en la base de datos.
- Documentación HTTP en Swagger UI.
- Tres pruebas funcionales en Thunder Client: POST, GET y WebSocket.
- Repositorio GitHub con instrucciones de ejecución y sin secretos.
- Documento de evidencias elaborado en Word y exportado a PDF.

No crear tablas nuevas ni cambiar los nombres de los procedimientos almacenados existentes, salvo que el usuario y el docente autoricen explícitamente algún cambio.

## 4. Esquema de datos descrito en la práctica

La base de datos `vehiculo_iot` contiene seis tablas:
- `vehiculos`
- `comandos`
- `estado_vehiculo`
- `historial_comandos`
- `demos`
- `demo_movimientos`

El agente debe inspeccionar los procedimientos y el esquema reales para confirmar parámetros, tipos de datos y resultados. No inventar columnas ni asumir el formato de los resultados de los SP.

## 5. Lista de los 21 Stored Procedures requeridos

### Vehículos (5)
1. `sp_crear_vehiculo`
2. `sp_obtener_vehiculos`
3. `sp_obtener_vehiculo`
4. `sp_actualizar_vehiculo`
5. `sp_eliminar_vehiculo`

### Comandos (4)
6. `sp_crear_comando`
7. `sp_obtener_comandos_vehiculo`
8. `sp_actualizar_comando`
9. `sp_eliminar_comando`

### Estado (2)
10. `sp_actualizar_estado`
11. `sp_obtener_estado`

### Historial (2)
12. `sp_registrar_historial`
13. `sp_obtener_historial`

### DEMO (4)
14. `sp_crear_demo`
15. `sp_obtener_demos`
16. `sp_actualizar_demo`
17. `sp_eliminar_demo`

### Movimientos de DEMO (4)
18. `sp_agregar_movimiento_demo`
19. `sp_obtener_movimientos_demo`
20. `sp_actualizar_movimiento_demo`
21. `sp_eliminar_movimiento_demo`

Los nombres deben mantenerse exactamente. Confirmar contra RDS o los archivos SQL del proyecto que los 21 existen y documentar cualquier discrepancia antes de codificar.

## 6. Reglas de negocio obligatorias

### Movimiento individual
1. Recibir una petición POST con el vehículo y el comando solicitado.
2. Validar que el vehículo exista y esté activo.
3. Validar que el comando exista, esté activo y pertenezca al vehículo indicado.
4. Actualizar el estado y registrar el historial usando `sp_actualizar_estado` y `sp_registrar_historial` dentro de una misma transacción.
5. Confirmar la transacción en la base de datos antes de emitir el evento de éxito por WebSocket.
6. Si la operación falla, revertir la transacción y no emitir un evento de éxito.
7. No asumir que un vehículo está conectado solo porque se recibió una petición HTTP.

### Consultas GET e historial
- Los GET no deben modificar datos.
- Ofrecer consultas de todos los vehículos y de un vehículo por ID.
- Permitir consultar comandos, estado actual, DEMO y movimientos de una DEMO.
- El historial visible por API debe devolver como máximo los diez movimientos individuales más recientes, del más reciente al más antiguo.
- Si hay menos de diez, devolver los disponibles. No borrar el historial antiguo de la base de datos.
- Los movimientos de DEMO nunca deben agregarse a `historial_comandos`.

### WebSocket
- Tener un endpoint WebSocket asociado a un identificador de vehículo.
- Al conectar, consultar RDS y emitir el último estado disponible.
- Notificar los movimientos individuales confirmados.
- Admitir al menos dos clientes simultáneos para el mismo vehículo.
- Cada cliente solo debe recibir eventos del vehículo que monitorea.
- Manejar desconexiones sin afectar a otros clientes.
- Los mensajes JSON deben identificar como mínimo el tipo de evento, el vehículo y los datos del movimiento; incluir marca temporal cuando corresponda.

### Ejecución de DEMO
1. Recibir una solicitud para iniciar una DEMO existente, activa y perteneciente al vehículo indicado.
2. Obtener la secuencia real mediante `sp_obtener_movimientos_demo`; no codificar una secuencia fija.
3. Ejecutar los movimientos en el orden configurado y respetar `duracion_ms` y `pausa_ms`, confirmando los nombres reales de columnas.
4. Emitir eventos de inicio, cada movimiento y finalización por WebSocket.
5. Actualizar el estado con `sp_actualizar_estado` conforme avance la DEMO.
6. **No llamar a `sp_registrar_historial` durante la DEMO.**
7. No bloquear otras solicitudes ni conexiones durante las pausas; usar mecanismos asíncronos apropiados.
8. Impedir dos DEMO simultáneas para el mismo vehículo.
9. Implementar cancelación y comunicar cancelación/error por WebSocket. Dar prioridad a detener la secuencia.
10. No afirmar que un comando fue ejecutado físicamente por un microcontrolador: en esta práctica solo se simulan/publican eventos; la integración física es posterior.

## 7. Seguridad, conexión y calidad

- Configurar conexión mediante variables de entorno.
- Mantener credenciales fuera del código fuente y de Git.
- Incluir `.env.example` con nombres de variables y valores ficticios, nunca credenciales reales.
- Añadir `.env`, `.venv/`, cachés y archivos sensibles a `.gitignore`.
- Usar consultas parametrizadas al invocar procedimientos; no concatenar valores de usuario en SQL.
- Liberar cursores y conexiones correctamente.
- Usar transacciones para operaciones relacionadas.
- No exponer contraseñas, tokens, datos sensibles ni cadenas de conexión en respuestas o logs.
- Aplicar autenticación/autorización a operaciones de control y destructivas conforme al alcance de la práctica. Si no existe mecanismo de autenticación, señalarlo como pendiente y proponer una opción mínima antes de implementarla.
- Manejar errores con códigos HTTP apropiados (por ejemplo 200, 201, 202, 400, 401, 403, 404, 409, 422, 500 y 503 según corresponda).
- Separar endpoints, lógica de negocio, acceso a datos y gestión WebSocket mediante módulos/clases con responsabilidades claras. Respetar la arquitectura existente cuando sea razonable.
- No instalar dependencias innecesarias ni hacer una refactorización masiva sin justificación.

## 8. Estrategia por etapas y puertas de validación

El agente debe avanzar en este orden. No pasar a la siguiente etapa sin entregar el reporte de validación de la etapa actual.

### Etapa 0 — Auditoría del proyecto existente
- Inspeccionar archivos, estructura, dependencias, rutas HTTP, WebSocket, persistencia actual y tests.
- Identificar cómo se ejecuta y cómo se reproduce el comportamiento local actual.
- Identificar el uso de archivos locales como `status.json`, si existe.
- Comparar lo encontrado con los requisitos de la práctica.
- No cambiar código todavía, salvo que el usuario lo autorice.
**Salida:** inventario de archivos, mapa de endpoints, matriz de requisitos (cumple/parcial/no cumple/no verificado), riesgos y plan incremental.

**Puerta de validación 0:** el usuario revisa el diagnóstico y confirma que el agente entendió el proyecto.

### Etapa 1 — Configuración y conexión a RDS
- Revisar dependencias y configuración.
- Crear o adaptar la configuración por variables de entorno.
- Implementar una clase/componente de conexión compatible con la librería elegida y la arquitectura existente.
- Probar conexión y una consulta inocua a la base de datos.
- No exponer credenciales en la salida.
**Salida:** archivos modificados, dependencias, comando de prueba, resultado real y diagnóstico de errores.
**Puerta:** conexión verificada y configuración secreta excluida de Git.

### Etapa 2 — Capa de Stored Procedures
- Confirmar nombres, parámetros, cursores y resultados de los 21 SP usando SQL del proyecto o metadatos disponibles.
- Crear una capa de acceso a datos para invocarlos de forma segura.
- Gestionar correctamente resultados, commits, rollback y recursos.
- Probar cada SP internamente de forma controlada; no hace falta entregar 21 pruebas funcionales en Thunder Client.
**Salida:** matriz SP → método de repositorio → parámetros → endpoint/servicio que lo utiliza; pruebas técnicas y lista de incertidumbres.
**Puerta:** los 21 están integrados funcionalmente o se identifican con precisión los bloqueos reales.

### Etapa 3 — Endpoints GET
- Implementar consultas de vehículos, comandos, estado, historial, DEMO y movimientos de DEMO.
- Validar IDs, ausencia de datos y respuestas.
- Aplicar límite de diez registros al historial, ordenados del más reciente al más antiguo.
- Verificar que GET no modifica la base.
**Puerta:** endpoints probados y mapeados a los SP correspondientes.

### Etapa 4 — Movimiento individual POST
- Validar vehículo y comando y su relación.
- Ejecutar actualización de estado e inserción de historial atómicamente.
- Emitir evento WebSocket solo después de confirmar la transacción.
- Confirmar rollback y ausencia de evento de éxito en fallos.
**Puerta:** prueba reproducible que demuestre estado e historial persistidos.

### Etapa 5 — WebSocket multi-cliente
- Gestionar clientes conectados por ID de vehículo.
- Emitir estado inicial y eventos individuales.
- Comprobar aislamiento entre vehículos y manejo de desconexiones.
**Puerta:** dos clientes simultáneos reciben eventos del vehículo correcto.

### Etapa 6 — DEMO, temporización y cancelación
- Consultar movimientos almacenados en RDS.
- Respetar orden, `duracion_ms` y `pausa_ms`.
- Emitir inicio, movimientos, finalización, cancelación y error.
- Actualizar estado durante la DEMO.
- No insertar movimientos de DEMO en historial.
- Evitar ejecuciones simultáneas de DEMO para el mismo vehículo.
**Puerta:** prueba antes/después que demuestre que el historial no cambia por la DEMO.

### Etapa 7 — Documentación, seguridad y repositorio
- Revisar Swagger para todas las operaciones HTTP y documentar los SP relacionados.
- Documentar WebSocket, estructura de mensajes, ejemplos de configuración y comandos de ejecución en README.
- Revisar `.gitignore` y buscar accidentalmente secretos antes de publicar.
- Mantener la aplicación en localhost.
**Puerta:** una persona puede instalar dependencias, configurar su `.env` y ejecutar la API siguiendo el README.

### Etapa 8 — Tres pruebas de entrega y evidencias
La práctica exige solo tres pruebas funcionales en Thunder Client:
1. **POST individual:** respuesta exitosa, estado actualizado e historial insertado.
2. **GET historial:** máximo diez movimientos individuales, del más reciente al más antiguo.
3. **WebSocket + POST de inicio de DEMO:** eventos de inicio, N movimientos ordenados y finalización; comparar historial antes/después para demostrar que la DEMO no añade registros.

Preparar lista de capturas para Word/PDF: entorno local, Swagger/GitHub, POST, GET, WebSocket y prueba del historial sin inserciones de DEMO. No fabricar capturas ni afirmar resultados que no se hayan observado.

**Puerta final:** repositorio revisado, tres escenarios reproducidos, README actualizado y lista de entregables completa.

## 9. Restricciones de colaboración con el agente

- No entregar una reescritura completa de una sola vez.
- No cambiar nombres de SP, tablas ni reglas de negocio.
- No crear tablas nuevas.
- No desplegar la API públicamente.
- No reemplazar componentes existentes sin explicar por qué.
- Antes de añadir una dependencia, justificar su necesidad y considerar lo que ya usa el proyecto.
- Si el esquema real, los parámetros de SP o el comportamiento actual no están claros, inspeccionar el código/SQL y pedir la información faltante; no adivinar.
- Separar claramente hechos comprobados, supuestos y pendientes.
- En cada etapa, ejecutar pruebas y compartir comandos y resultados reales.
- Si una prueba falla, detener el avance de la etapa, diagnosticar la causa y corregir antes de continuar.
- El código final debe ser comprensible para un estudiante y fácil de explicar al docente.

## 10. Formato obligatorio del reporte al terminar cada etapa

El agente debe devolver este bloque al usuario al finalizar cada etapa:

### Reporte de etapa
- **Etapa:**
- **Objetivo:**
- **Archivos revisados:**
- **Archivos creados/modificados:**
- **Decisiones técnicas y motivos:**
- **Requisitos cumplidos:**
- **Pruebas ejecutadas:** incluir comandos exactos y resultados reales.
- **Pruebas pendientes o fallidas:**
- **Riesgos/limitaciones:**
- **Cómo verificar manualmente:**
- **¿Se puede avanzar?:** Sí / No, con motivo.
- **Información que debe compartir el usuario para validar:** logs o salidas relevantes, sin secretos.

El usuario compartirá ese reporte conmigo. Yo revisaré el cumplimiento contra este contexto y la práctica de Notion, señalaré errores o brechas y recomendaré avanzar o corregir antes de la siguiente etapa.

## 11. Prompt inicial para el agente de programación

> Lee completamente `context.md` antes de modificar el proyecto. Estamos completando la práctica 2.5 sobre una API FastAPI que ya existe y funciona en local; RDS y los procedimientos almacenados ya están creados. Empieza exclusivamente por la **Etapa 0: Auditoría del proyecto existente**. Inspecciona el repositorio y compara el código real con los requisitos. No modifiques archivos todavía. Entrega el inventario, mapa de endpoints, matriz de requisitos y plan incremental, usando el formato de reporte de etapa. No inventes resultados y no muestres secretos. Espera la validación del usuario antes de implementar la Etapa 1.
"""


