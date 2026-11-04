
EXAMEN PRÁCTICO INTEGRADOR

3.1 Examen Tema 3. Lógica de microcontroladores para IoT

Control físico de una excavadora IoT mediante AWS, FastAPI, WebSocket seguro, ESP8266/ESP32 y electrónica digital


Objetivo

Integrar el backend público desarrollado en AWS con un ESP8266 o ESP32, WiFiManager, un cliente WebSocket seguro (WSS), registros 74HC595 y optoacopladores PC817 para ejecutar físicamente los movimientos enviados desde Swagger UI. El alumno deberá demostrar correspondencia entre comando y acción, seguridad electrónica y funcionamiento autónomo. Este examen no proporciona código fuente; cada estudiante desarrollará e integrará su propia solución.


Resultado final

Un POST válido ejecutado desde Swagger UI deberá producir la acción física correcta en el vehículo, sin intervención manual. El docente comprobará presencialmente movimientos individuales, funciones auxiliares, secuencias DEMO, detención y recuperación de conexión. Los únicos entregables son la URL pública de Swagger terminada en /docs, la presentación física del vehículo y las conclusiones personales.


Contexto de la solución

En el Tema 2 cada alumno publicó en Amazon EC2 con Windows Server su backend Python/FastAPI y POO, asociado a la base vehiculo_iot en Amazon RDS MySQL. La solución incluye 21 APIs REST, procedimientos almacenados, Swagger UI mediante HTTPS y WebSocket seguro (WSS). En la práctica anterior, el ESP8266/ESP32 ya utilizaba WiFiManager y mostraba en Monitor Serie los eventos recibidos desde AWS. El examen continúa esa solución sin reconstruir ni migrar el backend.

Ahora el microcontrolador deberá accionar el control remoto mediante dos registros 74HC595 en cascada y optoacopladores PC817. Se respetarán las rutas, el contrato JSON, el estado, el historial y las reglas de DEMO existentes; los pasos de DEMO no se registrarán como movimientos individuales cuando así lo defina la API. Wemos D1 R1 es la placa de referencia, pero se admiten otras ESP8266/ESP32 compatibles. Cada alumno demostrará las funciones efectivamente disponibles en su modelo y autorizadas por el docente.


Resumen del escenario

Docente → Swagger UI público (HTTPS, ruta /docs) → POST individual o DEMO → FastAPI en EC2 ↔ Amazon RDS → evento WebSocket seguro (WSS) → ESP8266/ESP32 con WiFiManager → registros 74HC595 → optoacopladores PC817 → control remoto → acción física de la excavadora. El Monitor Serie solo proporciona diagnóstico.


1. Reconocer el vehículo y preparar su sistema electrónico


1

Identificar la placa y el vehículo

• 1.1 Identifica el ESP8266/ESP32 y el modelo exacto del vehículo RC.

• 1.2 Enumera las funciones físicas disponibles: desplazamiento, dirección, brazo y auxiliares.

• 1.3 Documenta los GPIO seguros y las condiciones particulares del control remoto.

2

Verificar Arduino IDE y el firmware previo

• 2.1 Selecciona correctamente placa, puerto y bibliotecas en Arduino IDE.

• 2.2 Conserva WiFiManager y el cliente WSS ya funcionales de la práctica anterior.

• 2.3 Prepara un solo firmware que atienda todos los comandos sin recargarlo durante el examen.

3

Preparar el montaje electrónico

• 3.1 Identifica dos 74HC595 conectados en cascada, PC817 y resistencias limitadoras.

• 3.2 Asocia cada botón del control remoto con su salida electrónica correspondiente.

• 3.3 Comprueba alimentación, compatibilidad de niveles y aislamiento; no alimentes motores directamente desde GPIO.


2. Conservar conectividad Wi-Fi y preparar el montaje


4

Conservar el aprovisionamiento Wi-Fi

• 4.1 Utiliza WiFiManager sin contraseñas fijas dentro del firmware.

• 4.2 Mantén el portal de configuración, la persistencia de credenciales y los mecanismos de restablecimiento.

• 4.3 Comprueba que ninguna salida de movimiento se active durante el arranque.

5

Configurar la red desde un teléfono

• 5.1 Conserva el nombre y el funcionamiento del portal de configuración existente.

• 5.2 Si falta una conexión válida, configura desde un teléfono la red inalámbrica de 2.4 GHz.

• 5.3 Confirma que el dispositivo se conecte a Internet con las nuevas credenciales.

• 5.4 No exhibas contraseñas, tokens ni información sensible en las pantallas.

6

Comprobar datos de conexión

• 6.1 Presenta en Monitor Serie la identificación del dispositivo y los datos Wi-Fi relevantes.

• 6.2 Indica claramente cuándo WSS está conectado y cuándo llega un comando.

• 6.3 Diferencia recepción, inicio de activación, liberación y errores de comunicación.

7

Validar persistencia y reconexión

• 7.1 Reinicia el microcontrolador y comprueba que use la red guardada.

• 7.2 Interrumpe temporalmente la red y verifica que se reconecte sin reprogramación.

• 7.3 La pérdida de conexión deberá liberar las señales de actuación y mantener el vehículo seguro.

8

Verificar el restablecimiento de Wi-Fi

• 8.1 Comprueba el restablecimiento con R/r en el Monitor Serie del firmware previo.

• 8.2 Demuestra el restablecimiento por GPIO mantenido cinco segundos a GND.

• 8.3 Durante el reinicio o la configuración todas las salidas físicas deberán quedar inactivas.

9

Asegurar el montaje final

• 9.1 Monta firmemente el microcontrolador, los registros y los optoacopladores.

• 9.2 Comprueba las conexiones antes de habilitar el desplazamiento del vehículo.


3. Verificar la API pública y el contrato de comunicación


10

Identificar las APIs originales

• 10.1 Abre desde Internet la URL HTTPS de Swagger que termina exactamente en /docs.

• 10.2 Identifica los POST de movimientos individuales y los POST de DEMO.

• 10.3 Identifica los GET de estado e historial que ya existen.

• 10.4 Conserva las 21 APIs y sus nombres, parámetros y respuestas reales.

11

Reconocer el contrato WSS

• 11.1 Identifica la URL WSS real y el identificador del vehículo.

• 11.2 Revisa los formatos JSON para movimiento, último estado, DEMO y cancelación.

• 11.3 Distingue un evento nuevo de un último estado recibido al reconectarse.

12

Verificar servicios públicos

• 12.1 Comprueba Swagger, EC2 y WSS desde una red distinta a la instancia de AWS.

• 12.2 Ejecuta un POST válido y verifica que llegue al cliente WebSocket correcto.

• 12.3 No sustituyas WSS por polling GET ni por un servidor local.

13

Verificar la persistencia de AWS y RDS

• 13.1 Comprueba que FastAPI, la base vehiculo_iot y los servicios operen sin tener abierto el IDE del servidor.

• 13.2 Mantén el comportamiento existente de estado, historial y DEMO, protegiendo credenciales.


4. Integrar WebSocket, registros y control remoto


14

Mapear comandos a salidas físicas

• 14.1 Define una relación inequívoca entre comando, 74HC595, PC817 y botón remoto.

• 14.2 Verifica que solo se active el canal asociado a la acción solicitada.

• 14.3 Documenta cómo se desactivan las salidas al concluir cada pulsación.

15

Comprobar compatibilidad eléctrica

• 15.1 Valida voltajes y niveles lógicos compatibles entre ESP8266/ESP32 y 74HC595.

• 15.2 Limita corrientes de los PC817 y respeta las capacidades de corriente de los registros.

• 15.3 Mantén el aislamiento requerido por el control remoto y evita cortocircuitos.

16

Ejecutar movimientos individuales

• 16.1 Procesa únicamente eventos WSS correspondientes al vehículo propio.

• 16.2 Interpreta comando y duración conforme al formato JSON real recibido.

• 16.3 Activa la salida correcta y verifica que el movimiento se produzca físicamente.

17

Ejecutar secuencias DEMO

• 17.1 Procesa inicio, pasos, temporización y fin conforme al servidor existente.

• 17.2 Activa físicamente cada movimiento de la DEMO en el orden indicado.

• 17.3 Libera las salidas ante cancelación, cuando esté disponible.

• 17.4 Respeta que los pasos de DEMO no se agreguen al historial individual si así funciona la API.

18

Gestionar repeticiones y reconexión

• 18.1 Un nuevo POST debe poder repetir el mismo movimiento aunque su nombre sea idéntico al anterior.

• 18.2 Evita reejecutar mensajes duplicados o estados históricos como órdenes nuevas.

• 18.3 Tras una desconexión, deja las salidas inactivas y espera un nuevo comando válido.

19

Unificar el firmware final

• 19.1 Integra WiFiManager, WSS, procesamiento JSON y 74HC595 en un mismo programa.

• 19.2 Incluye detención y liberación de cada salida al finalizar su acción.

• 19.3 No cambies firmware ni conexiones entre las pruebas del docente.


5. Pruebas físicas presenciales con Swagger UI


20

Prueba 1. Arranque y WiFiManager

• 20.1 Enciende el vehículo en estado seguro y demuestra su conexión Wi-Fi.

• 20.2 Reinicia y muestra que conserva las credenciales existentes.

• 20.3 Presenta estado, IP y conexión en el Monitor Serie.

21

Prueba 2. WSS desde AWS

• 21.1 Establece la conexión segura con el FastAPI público.

• 21.2 Demuestra recepción de eventos para el identificador de vehículo correcto.

• 21.3 Verifica que Swagger permite ejecutar los comandos POST existentes.

22

Prueba 3. Avanzar y retroceder

• 22.1 El docente enviará ADELANTE y ATRÁS en orden variable desde Swagger.

• 22.2 El vehículo deberá realizar el desplazamiento físico indicado.

• 22.3 Desactiva la dirección anterior antes de cambiar a su movimiento incompatible.

23

Prueba 4. Giro y desplazamiento

• 23.1 Ejecuta GIRO_IZQUIERDA y GIRO_DERECHA si existen en el vehículo.

• 23.2 Ejecuta MOVER_IZQUIERDA y MOVER_DERECHA si soporta traslación lateral.

• 23.3 No se aceptará confundir giro con desplazamiento ni simular movimientos inexistentes.

24

Prueba 5. Brazo y accesorios

• 24.1 Comprueba físicamente SUBIR_BRAZO y BAJAR_BRAZO.

• 24.2 Comprueba luz, activación y desactivación del sonido según el modelo.

• 24.3 Demuestra encendido/apagado del control remoto solo si cuenta con una interfaz electrónica segura.

25

Prueba 6. DEMO y recuperación

• 25.1 Ejecuta desde Swagger una DEMO con pasos físicos temporizados.

• 25.2 Comprueba cancelación o detención, cuando el protocolo lo permita.

• 25.3 Interrumpe y recupera la comunicación de manera controlada, verificando salidas seguras.

Nota de validación: una respuesta HTTP exitosa en Swagger, un evento WSS o una línea en el Monitor Serie NO acreditan por sí solos un movimiento. El docente deberá observar la acción física correspondiente al comando enviado.


6. Reglas de negocio obligatorias y pruebas de seguridad


26

RN01–RN02. Nube y ejecución efectiva

• 26.1 Los comandos deberán originarse desde las APIs públicas y procesarse mediante el sistema real.

• 26.2 Solo se acredita un movimiento que ocurra físicamente; mensajes o simulaciones no lo sustituyen.

27

RN03–RN04. Comunicación y autonomía

• 27.1 La comunicación hacia el microcontrolador será WSS, sin consultas GET periódicas.

• 27.2 El mismo firmware atenderá instrucciones diferentes, consecutivas y repetidas.

28

RN05–RN07. Correspondencia y validación

• 28.1 Cada comando deberá activar únicamente la salida y el mecanismo asignados.

• 28.2 Se ignorarán comandos inválidos y eventos dirigidos a otros vehículos.

• 28.3 Evita que un mismo mensaje retransmitido ejecute dos veces una actuación no prevista.

29

RN08–RN09. Exclusión de movimientos

• 29.1 Nunca se mantendrán activos simultáneamente avance y retroceso u otras acciones incompatibles.

• 29.2 Cada transición entre órdenes incompatibles deberá liberar la orden previa.

• 29.3 Las actuaciones simultáneas solo se permitirán cuando el vehículo las soporte de forma segura.

30

RN10–RN11. Liberación y parada segura

• 30.1 Cada pulsación electrónica tendrá un límite de tiempo o una condición de liberación.

• 30.2 Ante error, caída de Wi-Fi/WSS o cancelación, el sistema deberá pasar a estado seguro.

• 30.3 Debe existir posibilidad de detener inmediatamente el vehículo durante las pruebas.

31

RN12. Funciones auxiliares

• 31.1 Iluminación, brazo y sonido deben producir efectos físicos y observables.

• 31.2 El encendido y apagado remoto se exigirá solo si el control permite implementarlo de forma segura.

• 31.3 No se aceptan mensajes que simulen una función no disponible.

32

RN13–RN15. Integridad de la solución

• 32.1 Preserva las 21 APIs y el contrato real de eventos, con la lógica de RDS ya implementada.

• 32.2 No se permite recablear, reprogramar ni usar los botones manualmente entre movimientos.

El docente podrá elegir, repetir y alternar comandos sin avisar. Las pruebas se realizarán en una zona despejada y con un mecanismo de detención inmediata; las evidencias digitales no sustituyen la demostración física.


7. Entregables obligatorios y evaluación presencial


33

Entregable 1. URL de Swagger

• 33.1 Entrega la URL HTTPS funcional de tu Swagger y asegúrate de que termine en /docs.

• 33.2 El docente deberá poder abrirla y ejecutar los POST reales.

• 33.3 No se acepta una URL localhost, una captura o un enlace de repositorio como sustituto.

34

Entregable 2. Presentación física

• 34.1 Presenta el vehículo conectado a AWS y el montaje completamente instalado.

• 34.2 El docente ejecutará comandos en orden aleatorio, repetidos o alternados.

• 34.3 La acción física deberá observarse con claridad y seguridad.

• 34.4 La revisión es presencial: ni los videos ni el Monitor Serie la sustituyen.

35

Entregable 3. Conclusiones personales

• 35.1 Redacta conclusiones propias de la integración de EC2, FastAPI, WSS, ESP, 74HC595 y PC817.

• 35.2 Explica problemas encontrados, soluciones, seguridad y aprendizajes relevantes.

36

Criterios de calificación (100 puntos)

• 36.1 AWS, FastAPI, RDS y Swagger: 10; WiFiManager: 10; WSS: 15.

• 36.2 Montaje ESP/74HC595/PC817: 15; ejecución física: 30.

• 36.3 Seguridad, detención y recuperación: 15; explicación técnica y conclusiones: 5.

• 36.4 El catálogo físico se valida para cada modelo; las funciones inexistentes requieren autorización previa.

37

Evaluación presencial y cierre

• 37.1 El docente controlará Swagger y elegirá libremente la secuencia de movimientos.

• 37.2 El alumno demostrará las funciones físicas autorizadas, incluidas las auxiliares.

• 37.3 Podrán evaluarse pérdida de conexión, parada y reconexión en un entorno seguro.



ANEXO A. CATÁLOGO DE FUNCIONES FÍSICAS A EVALUAR

El docente verificará las funciones efectivamente disponibles en cada vehículo. El equipo deberá identificar antes del examen cualquier diferencia entre su catálogo real y esta referencia; no se permitirán sustituciones simuladas.

01. ADELANTE — desplazamiento físico hacia adelante.

02. ATRÁS — desplazamiento físico hacia atrás.

03. GIRAR IZQUIERDA — giro a la izquierda.

04. GIRAR DERECHA — giro a la derecha.

05. MOVER IZQUIERDA — desplazamiento lateral, cuando exista.

06. MOVER DERECHA — desplazamiento lateral, cuando exista.

07. SUBIR BRAZO — elevación del brazo o palanca.

08. BAJAR BRAZO — descenso del brazo o palanca.

09. LUZ / LED — encendido o apagado real de iluminación.

10. ACTIVAR SONIDO — encendido del sonido.

11. DESACTIVAR SONIDO — apagado del sonido.

12. CONTROL REMOTO — encendido o apagado cuando el equipo disponga de interfaz electrónica segura.

ANEXO B. REGLAS DE NEGOCIO OBLIGATORIAS

RN01. Fuente pública: cada acción deberá originarse en un POST real de Swagger HTTPS sobre AWS EC2.

RN02. Ejecución física: los mensajes recibidos no sustituyen el desplazamiento o la función real del vehículo.

RN03. Comunicación: FastAPI notificará al ESP8266/ESP32 mediante WebSocket seguro (WSS), sin polling GET.

RN04. Autonomía: el mismo firmware atenderá comandos sucesivos y repetidos sin reiniciar ni recablear.

RN05. Correspondencia: cada comando válido activará exclusivamente las salidas de su función asignada.

RN06. Validación: se descartarán códigos desconocidos y eventos para un identificador de vehículo diferente.

RN07. Integridad de eventos: un estado histórico o una retransmisión no causará una ejecución accidental; una solicitud nueva con el mismo movimiento sí podrá ejecutarse.

RN08. Exclusión: acciones incompatibles, como ADELANTE y ATRÁS, nunca podrán mantenerse activas a la vez.

RN09. Transición: se liberará una orden incompatible antes de activar la siguiente; solo se permitirá simultaneidad segura.

RN10. Duración: cada pulsación del PC817 tendrá liberación o límite de tiempo apropiado al control remoto.

RN11. Seguridad: ante error, desconexión, cancelación o paro, se liberarán las salidas y se detendrán las acciones peligrosas.

RN12. Auxiliares: las funciones de brazo, luz, sonido y energía deben producir efectos físicos comprobables y estar soportadas por el modelo.

RN13. Backend: se conservarán las 21 APIs, sus formatos reales y la lógica de estado, historial y DEMO en RDS.

RN14. Sin intervención: queda prohibido pulsar manualmente el control, cambiar conexiones o cargar programas distintos entre pruebas.

RN15. Recuperación: tras reconectar Wi-Fi o WSS no se actuará sobre órdenes obsoletas; el sistema esperará una solicitud nueva válida.

ANEXO C. RÚBRICA DE EVALUACIÓN PRESENCIAL

Infraestructura pública EC2, FastAPI, RDS y Swagger .................................. 10 puntos

WiFiManager, configuración y persistencia ............................................ 10 puntos

Comunicación WebSocket segura y tratamiento de eventos ......................... 15 puntos

Integración electrónica ESP, 74HC595 y PC817 ......................................... 15 puntos

Ejecución física de las funciones autorizadas ........................................ 30 puntos

Seguridad, parada, liberación y recuperación .......................................... 15 puntos

Explicación técnica y conclusiones personales ........................................ 5 puntos

TOTAL ....................................................................................... 100 puntos

La ejecución física se califica con base en el catálogo autorizado de cada modelo. Si una función no existe, debe identificarse previamente al docente; no se acreditará una simulación como equivalente. Si una prueba presenta riesgo eléctrico o mecánico, el docente podrá suspenderla hasta que el montaje sea seguro.


Implementación de soluciones IoT  |  3.1 Examen Tema 3  |  M.C. Víctor Manuel Pinedo Fernández  |  Página  de
