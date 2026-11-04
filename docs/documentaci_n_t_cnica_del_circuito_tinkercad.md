# Especificación Técnica y Diagrama de Conexiones del Circuito (Tinkercad)

Este documento describe la arquitectura, conexiones y lógica de funcionamiento de un circuito simulado en Tinkercad. El propósito de este archivo es servir como contexto técnico para la generación de código, depuración o rediseño asistido por IA.

---

## 1. Resumen del Sistema
El circuito es un **sistema de expansión de salidas digitales optoaisladas de 12 canales** controlado por un **Arduino Uno**. 
Utiliza dos registros de desplazamiento de 8 bits (**74HC595**) conectados en cascada para expandir 3 pines digitales del Arduino a 16 salidas posibles (de las cuales se utilizan 12). Cada una de estas 12 salidas controla un canal independiente que enciende un LED indicador y activa un optoacoplador (**4N35**), el cual conmuta una carga alimentada por una fuente de energía externa.

---

## 2. Lista de Componentes (BOM)
* **1x Arduino Uno R3:** Microcontrolador principal.
* **1x Fuente de alimentación externa (Power Supply):** Alimenta el lado aislado (secundario) de los optoacopladores.
* **2x Protoboards:** 1 protoboard pequeña (derecha, etapa de control/lógica) y 1 protoboard grande (izquierda, etapa de aislamiento y potencia).
* **2x Registros de desplazamiento 74HC595:** Expansores de salidas por protocolo síncrono serial.
* **12x Optoacopladores 4N35 (DIP-6):** Aislamiento galvánico entre la lógica del Arduino y la fuente externa.
* **12x LEDs Verdes:** Indicadores visuales de estado para cada uno de los 12 canales.
* **12x Resistencias de limitación (Lado lógico - Abajo):** Conectadas en serie a la entrada de los optoacopladores (bandas: amarillo, violeta, marrón = $470\ \Omega$).
* **14x Resistencias de limitación/pull-up (Arriba y protoboard derecha):** Bandas naranja, naranja, marrón ($330\ \Omega$).

---

## 3. Mapeo de Conexiones (Netlist Actual en la Imagen)

### 3.1. Alimentación General
1. **Dominio Lógico (Arduino 5V):**
   * `Arduino 5V` $\rightarrow$ Riel positivo ($+$) de la protoboard derecha (cable rojo).
   * `Arduino GND` $\rightarrow$ Riel negativo ($-$) de la protoboard derecha (cable negro).
   * El riel negativo ($-$) de la protoboard derecha está puenteado al riel negativo inferior ($-$) de la protoboard izquierda (cable negro), estableciendo una **tierra común ($GND$) para el lado lógico**.
2. **Dominio Aislado (Fuente Externa):**
   * `Fuente Externa (+)` $\rightarrow$ Riel positivo superior ($+$) de la protoboard izquierda (cable rojo).
   * `Fuente Externa (-)` $\rightarrow$ Riel negativo superior ($-$) de la protoboard izquierda (cable negro).

### 3.2. Interfaz Arduino $\leftrightarrow$ Registros 74HC595 (Protoboard Derecha)
Los dos chips 74HC595 están montados sobre el canal central con la muesca mirando hacia la izquierda:
* **Fila superior de pines (izquierda a derecha):** Pin 16 ($V_{CC}$) al Pin 9 ($Q_{H}'$).
* **Fila inferior de pines (izquierda a derecha):** Pin 1 ($Q_B$) al Pin 8 ($GND$).

**Conexiones desde el Arduino (Cables verdes):**
* `Arduino Pin 11` $\rightarrow$ **Pin 14 ($DS$ / Serial Data Input)** del primer 74HC595 (izquierdo).
* `Arduino Pin 12` $\rightarrow$ **Pin 12 ($ST\_CP$ / Latch Clock)** del primer 74HC595, y puenteado en paralelo al Pin 12 del segundo 74HC595.
* `Arduino Pin 13` $\rightarrow$ **Pin 11 ($SH\_CP$ / Shift Clock)** del primer 74HC595, y puenteado en paralelo al Pin 11 del segundo 74HC595.

**Conexión en Cascada:**
* El **Pin 9 ($Q_{H}'$ / Salida Serial)** del primer 74HC595 (arriba a la derecha del chip 1) está conectado mediante un cable azul al **Pin 14 ($DS$)** del segundo 74HC595.

### 3.3. Salidas de los 74HC595 $\rightarrow$ Etapa de Optoacopladores (Cables Azules)
* Hay **12 cables azules** que salen de los pines de salida ($Q_A - Q_H$) de ambos 74HC595 y viajan hacia la protoboard grande de la izquierda.
* **En cada uno de los 12 canales (Protoboard Izquierda):**
  1. El cable azul llega a una resistencia de $470\ \Omega$ en la parte inferior.
  2. La resistencia se conecta al **Pin 1 (Ánodo)** del optoacoplador 4N35 correspondiente (el 4N35 tiene la muesca a la izquierda: pines 1, 2, 3 abajo de izquierda a derecha; pines 6, 5, 4 arriba de izquierda a derecha).
  3. En la misma columna se encuentra conectado un **LED verde** para indicar visualmente el encendido del canal.
  4. El **Pin 2 (Cátodo)** del 4N35 está conectado al riel de tierra lógica ($GND$) inferior mediante un puente negro pequeño.
  5. En la parte superior (lado del fototransistor del 4N35, pines 4, 5 y 6), cada optoacoplador tiene una resistencia de $330\ \Omega$ conectada al riel positivo de la fuente externa y puentes negros al riel negativo de la fuente externa.

---

## 4. ⚠️ OBSERVACIONES CRÍTICAS DE HARDWARE (Errores en el circuito actual)

> **Nota para la IA / Programador:** Si el código parece correcto pero la simulación en Tinkercad no funciona o da errores, se debe a los siguientes problemas físicos visibles en el diseño actual de la protoboard:

1. **Pines de alimentación de los 74HC595 invertidos o mal ubicados:**
   * En el 74HC595 (con muesca a la izquierda), el **Pin 16 ($V_{CC}$)** está arriba a la izquierda y el **Pin 8 ($GND$)** está abajo a la derecha.
   * En la imagen, en la parte superior izquierda de los chips hay un puente negro a $GND$ y una resistencia a $V_{CC}$, y en la parte inferior derecha hay cables rojos conectados al riel positivo ($+$). **Esto polariza el chip al revés** (metiendo $5\text{ V}$ por el pin de tierra $GND$ del integrado).
2. **Pines de control $\overline{OE}$ (Pin 13) y $\overline{MR}$ (Pin 10):**
   * Para que el 74HC595 funcione, el **Pin 10 ($\overline{MR}$ - Master Reset)** debe estar conectado a **$5\text{ V}$ (HIGH)** y el **Pin 13 ($\overline{OE}$ - Output Enable)** debe estar conectado a **$GND$ (LOW)**. Actualmente hay resistencias y puentes cruzados en la fila superior que no cumplen esta regla correctamente.
3. **Salidas mal mapeadas en la fila superior del 74HC595:**
   * Sólo el **Pin 15 ($Q_A$)** (arriba, segundo pin desde la izquierda) es una salida paralela en la fila superior. Los pines de abajo (1 al 7) son las salidas $Q_B$ a $Q_H$. En la imagen se están sacando cables azules hacia los optoacopladores desde pines superiores derechos del segundo chip que no son salidas válidas.
4. **Orientación y conexión del lado secundario de los 4N35:**
   * En el 4N35 (muesca a la izquierda), la fila superior tiene de izquierda a derecha: **Pin 6 (Base)**, **Pin 5 (Colector)** y **Pin 4 (Emisor)**.
   * Actualmente las resistencias superiores están conectadas al **Pin 6 (Base)** en lugar del **Pin 5 (Colector)**, y algunos puentes negros van al riel positivo y otros al negativo de forma inconsistente entre los 12 módulos.

---

## 5. Lógica de Programación Requerida (Para la IA)

Para controlar este circuito desde el Arduino Uno, el código debe implementar lo siguiente:

* **Pines de control:**
  * `DATA_PIN = 11` (DS)
  * `LATCH_PIN = 12` (ST_CP)
  * `CLOCK_PIN = 13` (SH_CP)
* **Método de envío de datos:**
  * Como hay 2 registros en cascada, se deben enviar **16 bits (2 bytes)** cada vez que se actualicen las salidas.
  * Poner `LATCH_PIN` en `LOW`.
  * Usar dos llamadas seguidas a `shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, byteDatos)`: primero se envía el byte correspondiente al **segundo 74HC595** (canales 9 al 12) y luego el byte del **primer 74HC595** (canales 1 al 8).
  * Poner `LATCH_PIN` en `HIGH` para actualizar los 12 optoacopladores simultáneamente.