# Conclusiones Técnicas y Personales — Examen Práctico Integrador IoT 3.1

**Proyecto:** Control físico de excavadora IoT mediante AWS, FastAPI, WebSocket Seguro (WSS), ESP32, Registros 74HC595, Optoacopladores PC817 y Dashboard Web React/Vercel.  
**Materia:** Implementación de Soluciones IoT  
**Autor:** Luis Márquez  

---

## 1. Integración de la Arquitectura Extremo a Extremo (Cloud to Hardware)

La realización de esta práctica integradora demostró la viabilidad, robustez y desafíos de conectar una arquitectura híbrida moderna que enlaza la nube con el mundo físico:
- **Capa Cloud & Backend:** La API REST desarrollada en Python con FastAPI y desplegada en **Amazon EC2 (Windows Server)** se conectó de manera eficiente con **Amazon RDS MySQL** para persistir el catálogo de vehículos, comandos, rutinas automatizadas (DEMO) y la bitácora de auditoría mediante 21 procedimientos almacenados.
- **Capa de Comunicación en Tiempo Real:** El protocolo **WebSocket Seguro (WSS)** resultó ser la pieza clave para la teleoperación de baja latencia. Sustituir el tradicional sondeo periódico (*polling*) por un canal bidireccional permanente con eventos JSON permitió que cada acción enviada desde Swagger UI o desde el dashboard web se reflejara de manera instantánea tanto en el microcontrolador como en la telemetría del cliente.
- **Capa de Visualización y Control (Frontend):** Se integró un dashboard interactivo en **React 19, TypeScript y Tailwind CSS** desplegado en **Vercel**, capaz de controlar el vehículo mediante interfaz gráfica y atajos de teclado físico, monitoreando el estado en vivo y sincronizando los movimientos ejecutados.
- **Capa Electrónica y Microcontrolador:** El **ESP32** actuó como puente embebido, utilizando solo 3 pines GPIO para controlar 16 salidas digitales a través de dos registros de desplazamiento **74HC595** en cascada, excitando 12 canales de optoacopladores **PC817** para emular las pulsaciones de los botones del control remoto original del vehículo.

---

## 2. Principales Retos Técnicos Encontrados y Soluciones Implementadas

A lo largo del desarrollo e integración surgieron complejidades técnicas en diversas capas de la solución:

1. **Proxy Serverless y CORS en Producción (Vercel):**
   - *Problema:* Al conectar el frontend en Vercel con la instancia EC2, las peticiones directas del navegador eran bloqueadas debido a políticas de CORS y a que el backend en AWS utiliza un certificado SSL auto-firmado, generando errores `404 Not Found` en subrutas anidadas (`/api/vehiculos/1/estado`, etc.).
   - *Solución:* Se desarrolló un proxy serverless en Node.js dentro de Vercel (`api/proxy.js`) con reglas de reescritura en `vercel.json` (`/api/:match*`). Este proxy intercepta las peticiones desde el mismo origen, inyecta cabeceras CORS universales y reenvía los métodos `GET` y `POST` a EC2 utilizando un agente HTTPS con `rejectUnauthorized: false`.

2. **Manejo del Certificado SSL Auto-firmado en WebSocket Seguro (WSS):**
   - *Problema:* Los navegadores web modernos no permiten que una aplicación alojada en HTTPS establezca una conexión WSS contra un servidor con certificado SSL auto-firmado sin antes haber aceptado explícitamente dicho certificado, cerrando la conexión con código de error anómalo (`1006`).
   - *Solución:* Se implementó un banner inteligente en la interfaz que guía al usuario para autorizar el certificado en una pestaña del navegador con un solo clic. Además, se configuró un mecanismo de *fallback* mediante sondeo periódico de estado que mantiene la operatividad de todos los controles incluso si el canal WSS se encuentra en proceso de reconexión.

3. **Concurrencia y Comportamiento No Bloqueante en el ESP32:**
   - *Problema:* El uso de funciones bloqueantes como `delay()` en el microcontrolador causaba congelamiento de la pila de red, pérdidas del pulso de keep-alive en WebSocket y desconexiones recurrentes.
   - *Solución:* El firmware se programó bajo una arquitectura 100% reactiva orientada a eventos con `millis()`. Cada activación de canal programa un temporizador independiente que libera automáticamente el pulso de actuación sin detener la recepción de nuevos mensajes ni afectar el bucle de WebSocket.

4. **Prevención de Movimientos Involuntarios en Reconexión:**
   - *Problema:* Al restablecer la conexión Wi-Fi o WebSocket, el backend emite un mensaje de estado inicial (`ESTADO_INICIAL`) con el último comando registrado en la base de datos. Si el firmware interpretara este mensaje como una orden nueva, el vehículo podría moverse inesperadamente al encender.
   - *Solución:* Se diseñó un filtro en el firmware que distingue entre el apretón de manos inicial y un evento de acción activa (`MOVIMIENTO_INDIVIDUAL` o `DEMO_MOVIMIENTO`), asegurando que al conectar o reconectar todas las salidas se mantengan en nivel lógico bajo y en estado de reposo.

---

## 3. Seguridad Electrónica y Operativa

La seguridad fue un eje transversal en el diseño del sistema:
- **Aislamiento Galvánico:** El uso de optoacopladores PC817 garantizó que la etapa digital sensible (3.3V del ESP32 y 5V de los 74HC595) esté completamente aislada de la alimentación y circuitería interna del control remoto de la excavadora, eliminando riesgos de retorno de corriente, ruido electromagnético o daños a la placa de desarrollo.
- **Exclusión Mutua de Comandos Opuestos:** En el firmware se implementó una matriz de validación que impide la activación simultánea de movimientos contradictorios (e.g., avanzar y retroceder a la vez), protegiendo la mecánica del vehículo y los motores contra sobrecargas.
- **Fail-Safe y Parada de Emergencia:** Ante cualquier pérdida de señal de red, desconexión del socket o comando de emergencia (código 9), el microcontrolador conmuta instantáneamente todas las salidas de los registros a cero en menos de un ciclo de reloj.
- **Protección de Credenciales (WiFiManager):** No se incluyeron contraseñas ni SSIDs en el código fuente del firmware ni en los repositorios públicos. El ESP32 levanta un portal cautivo seguro para el aprovisionamiento de red, garantizando portabilidad y cumplimiento de estándares de seguridad informática.

---

## 4. Aprendizajes Clave y Conclusión General

Este proyecto permitió consolidar de forma práctica conocimientos fundamentales de ingeniería de software y telecomunicaciones:
1. La importancia de diseñar interfaces bien definidas mediante contratos JSON y especificaciones OpenAPI/Swagger, facilitando que múltiples clientes (firmware ESP32, Thunder Client, frontend en React) interactúen con el mismo backend de manera transparente y desacoplada.
2. La relevancia de dominar el flujo de red en producción (proxies inversos, CORS, TLS/SSL, WebSockets y Serverless), entendiendo cómo interactúan las restricciones de seguridad del navegador con arquitecturas en la nube.
3. El valor de la electrónica digital aplicada a IoT, demostrando que mediante registros en cascada y optoaisladores es posible dotar de capacidades IoT a equipos y juguetes comerciales sin necesidad de alterar su circuitería propietaria.

En conclusión, la solución no solo cumple con la correspondencia unívoca entre la orden emitida desde la nube y el desplazamiento físico de la excavadora, sino que lo hace bajo una estructura tolerante a fallos, auditable en base de datos y segura tanto lógica como electrónicamente.
