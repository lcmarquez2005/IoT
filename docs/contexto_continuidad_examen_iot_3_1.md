# Contexto de continuidad --- Examen práctico integrador IoT 3.1

**Fecha de preparación:** 3 de noviembre de 2026\
**Propósito:** entregar a otra IA el contexto técnico, el trabajo previo
conocido y un plan de continuación para terminar la práctica sin tener
que reconstruir la historia desde cero.

> **Instrucción para la IA que reciba este documento:** ayuda a
> continuar el proyecto por etapas. No des por hecho que algo funciona
> solo porque se haya mencionado como parte de una práctica anterior.
> Distingue entre lo que está documentado, lo que el usuario afirma
> haber realizado y lo que todavía debe verificarse físicamente. No
> inventes rutas, formatos JSON, nombres de eventos, endpoints ni
> conexiones. Pide los archivos o capturas concretos cuando sean
> necesarios.

------------------------------------------------------------------------

## 1. Objetivo actual

El usuario está realizando la actividad **"Examen Práctico Integrador
3.1 --- Lógica de microcontroladores para IoT"**, de la materia
**Implementación de Soluciones IoT**.

El objetivo final es controlar físicamente una excavadora RC desde
Swagger UI, usando la infraestructura que ya se desarrolló en temas
anteriores:

**Swagger HTTPS → FastAPI en AWS EC2 → Amazon RDS MySQL / lógica
existente → WebSocket seguro (WSS) → ESP8266/ESP32 con WiFiManager → dos
registros 74HC595 en cascada → optoacopladores → botones del control
remoto → movimiento físico de la excavadora.**

El resultado que se exige no es solamente recibir mensajes o responder
HTTP 200: cada POST válido enviado desde Swagger debe provocar la acción
física correspondiente en el vehículo, sin pulsar manualmente el control
remoto.

Los entregables señalados por el examen son: 1. URL pública HTTPS de
Swagger que termine en `/docs`. 2. Presentación física del vehículo y
del montaje funcionando. 3. Conclusiones personales sobre integración,
problemas, soluciones, seguridad y aprendizajes.

## 2. Lo que ya se hizo en actividades anteriores

La información siguiente proviene del contexto de conversaciones y
trabajos anteriores. Antes de modificar algo, pide los archivos actuales
y confirma el estado real.

### Tema 2 y prácticas relacionadas

-   Se trabajó en una solución IoT con base de datos MySQL y backend
    Python/FastAPI.
-   El proyecto contemplaba **21 APIs REST** y procedimientos
    almacenados en MySQL.
-   Se utilizó programación orientada a objetos (POO).
-   Se trabajó con Amazon RDS y una base de datos denominada
    `vehiculo_iot`.
-   Se desarrolló documentación y pruebas mediante Swagger UI.
-   Se integró comunicación mediante WebSocket.
-   En el examen/práctica posterior se publicó el backend en una
    instancia Amazon EC2 con Windows Server, conservando la base de
    datos en RDS.
-   El examen 3.1 indica expresamente que se deben conservar las 21
    APIs, sus rutas, nombres, parámetros, respuestas, estado, historial
    y reglas de DEMO existentes. **No reconstruir ni migrar el backend
    salvo que se compruebe que es necesario.**
-   La URL de Swagger debe ser pública, HTTPS y terminar en `/docs`.
-   La comunicación entre backend y microcontrolador debe ser WSS. El
    examen prohíbe sustituirla por polling periódico mediante GET o por
    un servidor local.

### Práctica anterior con el microcontrolador

-   En una práctica anterior el ESP8266/ESP32 ya utilizaba WiFiManager.
-   También existía un cliente WebSocket seguro (WSS) que recibía
    eventos procedentes de AWS.
-   Se había comprobado la recepción de eventos en el Monitor Serie.
-   El examen actual requiere conservar WiFiManager, persistencia de
    credenciales y cliente WSS; no empezar desde cero si el firmware
    anterior está disponible.
-   En el contexto anterior se mencionaron eventos de movimientos
    individuales y secuencias DEMO, así como el envío de un último
    estado al conectar/reconectar. Se debe inspeccionar el código y el
    contrato real antes de implementar el tratamiento de esos eventos.
-   No se dispone aquí del código fuente actual del firmware WSS ni de
    una copia verificable del contrato JSON. El usuario puede volver a
    compartirlos.

### Contexto de despliegue

-   La actividad 3.1 describe el backend en AWS EC2 con Windows Server y
    la base `vehiculo_iot` en Amazon RDS MySQL.
-   En otros proyectos AWS del usuario se ha utilizado la región
    `us-east-2`, pero no se debe asumir que esta sea necesariamente la
    región de la instancia de este examen sin comprobarlo.
-   El usuario ya ha trabajado con FastAPI, Uvicorn, AWS, RDS, Swagger y
    WebSocket.
-   No se debe pedir que rehaga el backend si los servicios actuales
    siguen operativos.

## 3. Estado del hardware actual comunicado por el usuario

El usuario afirma que **ya tiene el circuito armado físicamente**. El
diagrama/documentación de Tinkercad se compartió para explicar la
arquitectura, pero el usuario aclara que en el montaje real los 12 LEDs
deben interpretarse como **12 actuadores/canales que representan los
botones del control remoto del carrito/excavadora**. No tratar los LEDs
como el objetivo final; son indicadores/sustitutos de los actuadores en
la simulación o documentación.

### Arquitectura del circuito

-   Microcontrolador real: **ESP32** (no Arduino Uno).
-   Dos registros de desplazamiento **74HC595** conectados en cascada.
-   Se utilizan 12 de las 16 salidas disponibles.
-   Doce canales de optoacoplamiento para representar/accionar botones
    del control remoto.
-   El usuario describe optoacopladores como **4N35** en el documento
    del circuito.
-   En el firmware compartido anteriormente se menciona **PC817**.
    Existe una discrepancia que debe resolverse preguntando o
    inspeccionando el componente físico. No asumir que 4N35 y PC817 son
    el mismo componente ni que su pinout es idéntico.
-   En el diagrama de referencia aparecen resistencias limitadoras de
    470 Ω en el lado de entrada y resistencias de 330 Ω en la etapa
    externa. Son valores descritos en la documentación, no una
    validación de que sean adecuados para el circuito físico final.
-   Hay una etapa lógica y una etapa externa/aislada. La documentación
    describe alimentación lógica desde Arduino 5 V y una fuente externa
    para la etapa de salida. En el montaje con ESP32 debe verificarse la
    alimentación real y el aislamiento antes de energizar.

### Pines ESP32 declarados por el usuario

La versión de firmware compartida asigna: - DATA / DS del 74HC595:
**GPIO 23** - CLOCK / SH_CP: **GPIO 18** - LATCH / ST_CP: **GPIO 5**

Estos son los GPIO que el usuario dice utilizar en el ESP32. No se deben
sustituir por los pines 11, 12 y 13 del Arduino Uno mencionados en la
documentación de Tinkercad. Los pines de Arduino Uno pertenecen a la
referencia de simulación/documentación, no a la asignación del ESP32.

### Orden de transmisión de los dos registros

La lógica descrita para actualizar los registros es: - formar una
palabra de 16 bits; - enviar primero el byte alto (registro en cascada
más alejado / segundo chip, según la orientación del encadenamiento); -
enviar después el byte bajo (primer chip); - activar LATCH para
actualizar las salidas simultáneamente.

Debe verificarse el orden físico real de los chips y el cableado de QH'
a DS. No invertir el orden sin una prueba de canales.

### Mapeo de 12 funciones comunicado por el usuario

El firmware que compartió el usuario asocia las funciones a bits/salidas
de esta manera:

  ----------------------------------------------------------------------------
  Función                Tecla de prueba      Salida lógica  Bit de la palabra
                                   local                            de 16 bits
  ------------------- ------------------ ------------------ ------------------
  Avanzar                              W                  9                  8

  Retroceder                           S                  2                  1

  Girar izquierda                      A                 11                 10

  Girar derecha                        D                  5                  4

  Rotar cabina                         H                  8                  7
  izquierda                                                 

  Rotar cabina                         L                  1                  0
  derecha                                                   

  Subir brazo                          K                 12                 11

  Bajar brazo                          J                  6                  5

  Encendido/apagado                    1                  7                  6
  del control                                               

  Apagar luz /                         2                  3                  2
  "foquito"                                                 

  Apagar música                        3                 10                  9

  Modo DEMO                            4                  4                  3
  ----------------------------------------------------------------------------

**Importante:** las teclas W/S/A/D/H/J/K/L y 1--4 son comandos de prueba
local del firmware anterior, no necesariamente los nombres ni valores
que envía AWS. El backend tiene su propio contrato y se debe mapear
explícitamente a estas funciones una vez inspeccionado el JSON real.

El usuario describió ocho funciones de movimiento/cabina/brazo y cuatro
auxiliares. El catálogo físico exacto del modelo de excavadora debe
comprobarse. No afirmar que existen movimientos laterales si el modelo
no los soporta.

## 4. Consideraciones eléctricas y de seguridad pendientes

Estas observaciones deben tratarse como verificaciones obligatorias, no
como confirmación de fallos actuales:

1.  **Niveles lógicos ESP32--74HC595:** el ESP32 trabaja con GPIO de
    3.3 V. Si los 74HC595 están alimentados a 5 V, debe comprobarse que
    el nivel HIGH de 3.3 V cumpla el umbral VIH del componente usado. Si
    no está garantizado, evaluar un conversor de nivel lógico apropiado
    o una alimentación compatible, después de revisar el circuito
    completo.
2.  **Nunca aplicar 5 V a un GPIO del ESP32.**
3.  Confirmar alimentación y orientación de cada 74HC595: VCC pin 16,
    GND pin 8, MR activo en bajo (pin 10 normalmente en HIGH) y OE
    activo en bajo (pin 13 normalmente en LOW), según la hoja de datos
    del componente concreto.
4.  Confirmar el modelo exacto de optoacoplador: el documento menciona
    4N35 y el firmware menciona PC817. Verificar pinout y
    características del componente instalado.
5.  Confirmar resistencias, corriente del LED interno del optoacoplador
    y corriente que soporta cada salida del 74HC595.
6.  Confirmar que el lado de salida del optoacoplador simule
    correctamente el contacto del botón remoto y no aplique tensión
    externa indebida al circuito del control.
7.  La pérdida de Wi-Fi o WSS debe apagar/liberar todas las salidas.
8.  Las salidas deben permanecer inactivas durante arranque, reinicio,
    aprovisionamiento WiFiManager y reconexión.
9.  Nunca mantener simultáneamente movimientos incompatibles,
    especialmente adelante y atrás o giros opuestos, salvo que el
    comportamiento del vehículo y su electrónica lo permitan de forma
    segura.
10. Cada pulsación debe tener duración controlada y liberación
    garantizada. Un movimiento continuo debe tener un mecanismo de
    timeout/paro seguro, no quedar activo indefinidamente si se pierde
    comunicación.
11. La parada debe estar disponible y ser inmediata. Probar primero sin
    ruedas/orugas en contacto con el suelo o con el vehículo asegurado,
    en una zona despejada.
12. No alimentar motores desde GPIO ni desde las salidas del 74HC595.
    Los optoacopladores deben accionar la interfaz de botones del
    control remoto, no cargas de motor directamente.

## 5. Requisitos explícitos del examen 3.1

### Conectividad y aprovisionamiento

-   Conservar WiFiManager.
-   No incluir contraseñas Wi-Fi fijas en el firmware.
-   Conservar portal de configuración, persistencia de credenciales y
    mecanismos de restablecimiento.
-   Configurar desde un teléfono una red Wi-Fi de 2.4 GHz si es
    necesario.
-   Mostrar en Monitor Serie identificación del dispositivo, datos de
    conexión relevantes, estado WSS, recepción de comandos, inicio de
    actuación, liberación y errores.
-   No imprimir contraseñas, tokens ni información sensible.
-   Comprobar reconexión automática después de reiniciar o perder
    temporalmente la red.
-   Comprobar restablecimiento mediante `R/r` por Monitor Serie y
    mediante GPIO mantenido cinco segundos a GND, como indica el examen.
    Confirmar cuál GPIO se reserva para esta función y evitar
    conflictos.

### API y WSS

-   Abrir la URL HTTPS pública de Swagger terminada en `/docs`.
-   Identificar POST de movimientos individuales y POST de DEMO.
-   Identificar GET de estado e historial ya existentes.
-   Conservar las 21 APIs y sus formatos reales.
-   Identificar URL WSS real e identificador del vehículo.
-   Revisar formatos JSON reales de movimiento, último estado, DEMO y
    cancelación.
-   Distinguir eventos nuevos de estados históricos recibidos al
    reconectar.
-   Verificar desde una red distinta a EC2 que Swagger, EC2 y WSS sean
    accesibles.
-   No sustituir WSS por polling GET ni por servidor local.
-   Mantener persistencia y lógica actual de RDS para estado, historial
    y DEMO.

### Integración y control

-   Procesar solo eventos destinados al identificador del vehículo
    propio.
-   Validar tipo, comando y duración del evento usando el contrato JSON
    real.
-   Mapear inequívocamente cada comando AWS a un canal físico.
-   Activar solamente la salida asignada.
-   Liberar la salida al terminar la pulsación.
-   Evitar reejecutar eventos duplicados o estados históricos como si
    fueran órdenes nuevas.
-   Permitir que dos solicitudes nuevas consecutivas ejecuten el mismo
    movimiento aunque el nombre del comando sea idéntico.
-   Ejecutar secuencias DEMO en el orden y tiempos definidos por el
    servidor existente.
-   Respetar la lógica del backend respecto a si los pasos DEMO se
    registran o no como movimientos individuales.
-   Liberar salidas ante cancelación, cuando el protocolo lo soporte.
-   Mantener un único firmware para todas las funciones; no recargarlo
    ni recablear entre pruebas.

### Pruebas físicas previstas por el docente

1.  Arranque seguro, WiFiManager, reinicio y persistencia de
    credenciales.
2.  Conexión WSS y recepción de eventos del vehículo correcto.
3.  Avanzar y retroceder en orden variable.
4.  Giros izquierda/derecha y movimientos laterales solo si existen
    físicamente.
5.  Subir/bajar brazo.
6.  Luz, sonido y encendido/apagado si el modelo tiene interfaz segura.
7.  DEMO, cancelación/detención y recuperación de comunicación.

### Reglas de negocio del examen

-   Las órdenes se originan en POST públicos de Swagger sobre AWS EC2.
-   Solo cuenta una ejecución física real.
-   La comunicación al ESP será WSS.
-   Un único firmware debe soportar órdenes diferentes y repetidas.
-   Correspondencia uno a uno entre comando y salida.
-   Ignorar comandos desconocidos y órdenes para otro vehículo.
-   Evitar ejecuciones dobles por retransmisión.
-   Excluir movimientos incompatibles.
-   Liberar cada pulsación y limitar su duración.
-   Ante error, desconexión, cancelación o paro, pasar a estado seguro.
-   Preservar las 21 APIs, estado, historial, DEMO y RDS.
-   No pulsar manualmente el control ni cambiar conexiones entre
    pruebas.
-   Tras reconectar, no ejecutar órdenes antiguas; esperar una nueva
    solicitud válida.

### Rúbrica

  Criterio                                         Puntos
  --------------------------------------------- ---------
  EC2, FastAPI, RDS y Swagger                          10
  WiFiManager                                          10
  WSS y tratamiento de eventos                         15
  Integración ESP / 74HC595 / optoacopladores          15
  Ejecución física                                     30
  Seguridad, parada y recuperación                     15
  Explicación técnica y conclusiones                    5
  **Total**                                       **100**

------------------------------------------------------------------------

## 6. Plan recomendado para continuar

Trabajar en este orden. No avanzar a la siguiente etapa hasta que la
anterior tenga una prueba verificable.

### Etapa 1 --- Reunir y revisar los artefactos existentes

Pedir al usuario: - Firmware ESP32 anterior que ya se conectaba a
WiFiManager y WSS. - Código/backend actual de FastAPI o, al menos, los
endpoints relevantes. - Ejemplos reales de mensajes JSON recibidos por
WSS. - URL pública de Swagger `/docs` (no pedir credenciales ni
secretos). - Identificador real del vehículo, si no es sensible. -
Fotografía nítida del montaje físico y de las etiquetas de los
componentes. - Confirmación del modelo de optoacoplador instalado (4N35
o PC817). - Confirmación de alimentación de los 74HC595 y fuente
externa. - Modelo exacto de ESP32 y de excavadora/control remoto.

No pedir al usuario que vuelva a escribir información que ya está en
este documento. Pedir solo los archivos o datos que faltan.

### Etapa 2 --- Auditar el contrato del backend

Antes de programar el parser: - Inspeccionar los endpoints POST de
movimientos y DEMO. - Identificar el esquema real de cada payload. -
Inspeccionar el código que publica eventos WSS. - Capturar ejemplos
reales de evento nuevo, estado inicial/histórico, DEMO, cancelación y
error. - Confirmar identificador de vehículo, campos de tipo, comando,
duración, ID de evento o secuencia, y cualquier marca temporal
disponible. - Elaborar una tabla de correspondencia
`payload AWS → función lógica → bit/canal físico`. - No inventar campos
ni asumir que el backend usa nombres como `command`, `action`,
`vehicle_id` o `duration_ms` hasta comprobarlo.

### Etapa 3 --- Probar el circuito local sin AWS

Con el vehículo desconectado o asegurado: - Probar individualmente cada
uno de los 12 canales. - Confirmar que el bit correcto activa el canal
correcto. - Verificar el orden de los bytes de los dos registros. -
Verificar que todos los canales se apagan al ordenar cero. - Comprobar
estado seguro al arrancar y reiniciar. - Medir/validar niveles
eléctricos antes de conectar el control remoto. - Confirmar que cada
optoacoplador simula el contacto del botón esperado. - Documentar
cualquier canal que no corresponda con la tabla de mapeo.

### Etapa 4 --- Adaptar el firmware WSS

Reutilizar el firmware anterior y añadir módulos/lógica bien
separados: - Inicialización segura de salidas. - WiFiManager y
reconexión. - Cliente WSS y validación de servidor. - Parser JSON con el
formato real. - Filtro por identificador de vehículo. - Detección de
evento nuevo frente a estado inicial/histórico/duplicado. - Controlador
de comandos. - Control de 74HC595. - Temporizadores no bloqueantes para
pulsaciones y límites de duración. - Máquina de estados para movimientos
incompatibles. - Parada de emergencia y liberación al perder
conectividad. - Manejo de DEMO y cancelación según protocolo real. -
Diagnóstico por Monitor Serie sin exponer secretos.

Evitar `delay()` prolongados en la lógica de operación, porque pueden
impedir atender WSS, reconexión, temporizadores y parada.

### Etapa 5 --- Integración progresiva con AWS

Orden sugerido: 1. ESP conecta a Wi-Fi. 2. ESP conecta a WSS. 3. El ESP
recibe un evento y lo muestra, sin accionar salidas. 4. Validar
identificador y estructura. 5. Probar una función auxiliar de bajo
riesgo. 6. Probar una función de movimiento con vehículo asegurado. 7.
Probar parada. 8. Probar movimientos incompatibles y alternancia rápida.
9. Probar solicitudes repetidas legítimas. 10. Probar DEMO. 11.
Desconectar Wi-Fi/WSS y comprobar liberación. 12. Reconectar y comprobar
que no se ejecuten órdenes antiguas.

### Etapa 6 --- Preparar evaluación y conclusiones

Crear una matriz de pruebas con: - Prueba. - Comando enviado desde
Swagger. - Evento WSS recibido. - Canal/bit activado. - Acción física
observada. - Resultado esperado/real. - Evidencia o comentario.

Redactar las conclusiones personales únicamente después de conocer los
problemas y resultados reales del usuario. No inventar fallos resueltos
ni afirmar que una función quedó operativa sin probarla.

------------------------------------------------------------------------

## 7. Decisiones técnicas importantes para la IA que continúe

-   **No reconstruir AWS ni las 21 APIs por defecto.** El examen pide
    conservar lo anterior.
-   **No confundir el circuito de referencia Arduino Uno con el hardware
    actual.** El usuario utiliza ESP32 y ha indicado GPIO 23, 18 y 5
    para DATA, CLOCK y LATCH.
-   **No confundir el modelo de optoacoplador.** El material disponible
    contiene una discrepancia 4N35/PC817; resolverla antes de validar el
    pinout.
-   **No asumir que el JSON de WSS coincide con las teclas de prueba
    local.** Las letras W/S/A/D/H/J/K/L y números 1--4 son un mapeo
    local; AWS podría enviar otros nombres o códigos.
-   **No dar por hecho que 50 ms es una duración suficiente o segura.**
    Probar cada botón real y usar tiempos configurables adecuados.
-   **No dejar movimientos activos indefinidamente.** Diseñar límites,
    liberación y comportamiento seguro ante desconexión.
-   **No usar el Monitor Serie como sustituto de la demostración
    física.**
-   **No inventar movimientos que el vehículo no soporte.**
-   **No publicar credenciales, tokens, contraseñas Wi-Fi ni secretos
    AWS en el firmware, logs o documentación.**
-   El usuario prefiere una guía práctica, incremental y explicada, con
    código cuando ya se conozcan los contratos y conexiones reales.
    Ayudarle a entender las decisiones técnicas, no limitarse a entregar
    una solución opaca.

## 8. Estado actual resumido

  -----------------------------------------------------------------------
  Elemento                            Estado conocido
  ----------------------------------- -----------------------------------
  Examen 3.1 y requisitos             Documento compartido y revisado

  Backend FastAPI / AWS / RDS         Desarrollado en actividades
                                      previas; estado actual por
                                      verificar

  21 APIs y lógica de DEMO            Parte del backend previo; conservar
                                      y verificar

  Swagger HTTPS                       Existía en el trabajo anterior;
                                      comprobar disponibilidad actual

  WSS desde AWS                       Existía recepción de eventos en
                                      firmware anterior; comprobar estado
                                      actual

  WiFiManager                         Utilizado en práctica anterior;
                                      firmware fuente pendiente de
                                      recuperar

  ESP32                               Usuario confirma que utiliza ESP32

  Circuito de dos 74HC595             Usuario confirma que ya lo tiene
                                      armado físicamente

  Doce canales                        Mapeo de funciones/bits documentado
                                      en este contexto

  Optoacopladores                     Documento menciona 4N35; firmware
                                      menciona PC817; confirmar
                                      físicamente

  Conexión al control remoto real     Debe validarse y probarse

  Firmware integrado final            Pendiente

  Pruebas físicas desde Swagger       Pendientes

  Conclusiones finales                Pendientes de resultados reales
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 9. Primer mensaje sugerido para continuar en otra IA

"Vamos a continuar mi Examen Práctico Integrador IoT 3.1 usando el
contexto de este documento. Ya tengo físicamente armado el circuito de
12 canales con dos 74HC595 en cascada y optoacopladores, y utilizo un
ESP32 con DATA GPIO 23, CLOCK GPIO 18 y LATCH GPIO 5. En prácticas
anteriores desarrollé FastAPI, 21 APIs, AWS EC2, RDS MySQL, Swagger
HTTPS y WSS; también tenía WiFiManager y un firmware ESP que recibía
eventos por WSS. Quiero reutilizar todo lo que ya funciona, no
rehacerlo. Primero ayúdame a revisar los archivos del firmware anterior
y el contrato JSON real de WSS; después integraremos el control de los
12 canales, DEMO, parada segura y reconexión. No inventes formatos ni
conexiones: pregúntame por los archivos o fotos que falten y avancemos
probando cada etapa."

------------------------------------------------------------------------

**Fin del documento de contexto.**
