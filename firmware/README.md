# Firmware ESP32 — Control de Excavadora IoT

Este firmware implementa la solución completa requerida para el **Examen Práctico Integrador 3.1 (Lógica de microcontroladores para IoT)**.

---

## 1. Características Implementadas

- **Conectividad Wi-Fi Dinámica con WiFiManager:**
  - Sin credenciales fijas en el código.
  - Portal cautivo automático si no hay red guardada (nombre de AP: `Excavadora_IoT_AP`).
  - Restablecimiento de credenciales por dos vías:
    1. Escribiendo `'r'` o `'R'` en el Monitor Serie.
    2. Manteniendo presionado a `GND` el botón de reset en `GPIO 4` durante 5 segundos.
- **Cliente WebSocket Seguro (WSS / WS):**
  - Conexión al backend FastAPI en AWS EC2 (`/ws/{id_vehiculo}`).
  - Desconexión y reconexión automática sin reiniciar el microcontrolador.
  - Apagado seguro inmediato de todas las salidas ante pérdida de conexión.
- **Filtrado y Procesamiento de Eventos (ArduinoJson):**
  - Validación estricta del `id_vehiculo` (descarta órdenes dirigidas a otros vehículos).
  - Manejo de `ESTADO_INICIAL`: muestra el estado actual sin ejecutar movimientos (cumpliendo RN07 y RN15).
  - Ejecución de `MOVIMIENTO_INDIVIDUAL`: pulsos temporizados no bloqueantes (500 ms configurables o hasta timeout de seguridad).
  - Ejecución de secuencias `DEMO_MOVIMIENTO`: respeta exactamente el campo `duracion_ms` enviado por el servidor.
  - Atención a `DEMO_CANCELADA` y eventos de parada: liberación inmediata de salidas.
- **Control de Actuadores (2× 74HC595 en cascada):**
  - Comunicación serie síncrona en `GPIO 23` (DATA), `GPIO 18` (CLOCK) y `GPIO 5` (LATCH).
  - Salidas seguras (`0x0000`) desde el primer instante de arranque.
  - Exclusión mutua de movimientos incompatibles (Avance vs Reversa, Giros opuestos).
  - 100% no bloqueante (cero llamadas a `delay()` durante la operación de red o control).

---

## 2. Bibliotecas Necesarias en Arduino IDE

Instalar desde el **Gestor de Bibliotecas** de Arduino IDE (`Ctrl + Shift + I`):

1. **WiFiManager** (por *tzapu*) — Versión 2.0.16 o superior.
2. **WebSockets** (por *Markus Sattler*) — Versión 2.4.0 o superior.
3. **ArduinoJson** (por *Benoît Blanchon*) — Versión 6.x o 7.x.

---

## 3. Mapeo de Canales y Bits (16 bits)

| Canal / Función | Código Servidor | Nombre Servidor | Pin 74HC595 | Bit (Palabra 16-bit) | Máscara |
|---|---|---|---|---|---|
| **Avanzar** | 1 | `AVANZAR` | Salida 9 (Chip 2 Q0) | Bit 8 | `1 << 8` |
| **Retroceder** | 2 | `RETROCEDER` | Salida 2 (Chip 1 Q1) | Bit 1 | `1 << 1` |
| **Girar Izquierda** | 3 | `GIRAR_IZQUIERDA` | Salida 11 (Chip 2 Q2) | Bit 10 | `1 << 10` |
| **Girar Derecha** | 4 | `GIRAR_DERECHA` | Salida 5 (Chip 1 Q4) | Bit 4 | `1 << 4` |
| **Subir Brazo** | 5 | `SUBIR_BRAZO` | Salida 12 (Chip 2 Q3) | Bit 11 | `1 << 11` |
| **Bajar Brazo** | 6 | `BAJAR_BRAZO` | Salida 6 (Chip 1 Q5) | Bit 5 | `1 << 5` |
| **Rotar Cabina Izq / Pala** | 7 | `ABRIR_PALA` / `ROTAR_IZQ` | Salida 8 (Chip 1 Q7) | Bit 7 | `1 << 7` |
| **Rotar Cabina Der / Pala** | 8 | `CERRAR_PALA` / `ROTAR_DER`| Salida 1 (Chip 1 Q0) | Bit 0 | `1 << 0` |
| **Detener / Stop** | 9 | `DETENER` | - | - | `0x0000` |
| **Encendido / Apagado Remoto** | 10 | `ENCENDER` / `APAGAR` | Salida 7 (Chip 1 Q6) | Bit 6 | `1 << 6` |
| **Música** | 11 | `TOGGLE_MUSIC` | Salida 10 (Chip 2 Q1) | Bit 9 | `1 << 9` |
| **Luz / Faro** | 12 | `TOGGLE_LIGHT` | Salida 3 (Chip 1 Q2) | Bit 2 | `1 << 2` |
| **Modo Demo RC** | - | `DEMO_REMOTO` | Salida 4 (Chip 1 Q3) | Bit 3 | `1 << 3` |

> **Nota sobre el Encendido / Apagado del Control Remoto:**  
> - **Encendido:** Requiere un pulso corto (100 ms).  
> - **Apagado:** Una vez encendido, para apagar el control el pulsador debe mantenerse presionado durante **3 segundos (3000 ms)** continuos. El firmware gestiona automáticamente este ciclo de forma 100% no bloqueante con `millis()`, reconociendo tanto la alternancia sucesiva del comando 10 / botón Power, como órdenes explícitas de `APAGAR` / `POWER_OFF`.

---

## 4. Configuración del Servidor

En [firmware/esp32_excavadora_iot/esp32_excavadora_iot.ino](file:///home/lcmarquez/Documents/IoT/firmware/esp32_excavadora_iot/esp32_excavadora_iot.ino):

1. Modifica las constantes del servidor:
   ```cpp
   const char* WS_HOST = "tu-servidor-ec2.compute.amazonaws.com"; // Dominio o IP pública de EC2
   const uint16_t WS_PORT = 443;                                  // 443 para WSS (HTTPS) u 8000 si es HTTP directo
   const bool USE_SSL = true;                                     // true para WSS seguro
   const int VEHICULO_ID = 1;                                     // ID de tu excavadora en la BD
   ```
2. Selecciona en Arduino IDE la placa **ESP32 Dev Module** y el puerto COM correspondiente.
3. Compila y sube el firmware.
