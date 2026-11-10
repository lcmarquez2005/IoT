/**
 * ============================================================================
 * EXAMEN PRÁCTICO INTEGRADOR 3.1 - LÓGICA DE MICROCONTROLADORES PARA IOT
 * Control físico de Excavadora IoT mediante AWS, FastAPI, WSS y ESP32
 * ============================================================================
 * Placa: ESP32 Dev Module
 * Expansión: 2x 74HC595 en cascada (16 salidas digitales)
 * Aislamiento: Optoacopladores (PC817 / 4N35) hacia botones de control remoto
 * Comunicación: WiFiManager + WebSocket Seguro (WSS / WS)
 * ============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// ============================================================================
// CONFIGURACIÓN DE PINES DE HARDWARE (ESP32)
// ============================================================================
const byte PIN_DATA        = 23; // DS (Serial Data) -> Pin 14 del primer 74HC595
const byte PIN_CLOCK       = 18; // SH_CP (Shift Clock) -> Pin 11 de ambos 74HC595
const byte PIN_LATCH       = 5;  // ST_CP (Latch Clock) -> Pin 12 de ambos 74HC595
const byte PIN_RESET_WIFI  = 4;  // Botón físico de reset Wi-Fi (Pulsar 5s a GND)

// ============================================================================
// CONFIGURACIÓN DEL SERVIDOR AWS / FASTAPI
// ============================================================================
// IMPORTANTE: Modifica WS_HOST con el dominio o IP pública de tu instancia EC2.
// Si tu servidor tiene certificado SSL/TLS (HTTPS en el puerto 443), usa USE_SSL = true.
// Si pruebas con puerto HTTP/WS directo (ej. 8000), pon USE_SSL = false y WS_PORT = 8000.
const char* WS_HOST      = "ec2-100-50-120-115.compute-1.amazonaws.com"; 
const uint16_t WS_PORT   = 443;
const bool USE_SSL       = true;
const int VEHICULO_ID    = 1; // Identificador asignado a esta excavadora en RDS

// ============================================================================
// MAPEO DE BITS EN LA PALABRA DE 16 BITS (2x 74HC595 EN CASCADA)
// Byte Alto: Chip 2 (Canales 9-16) | Byte Bajo: Chip 1 (Canales 1-8)
// ============================================================================
const uint16_t MASK_AVANZAR            = (1 << 8);  // Salida 9  / Chip 2 Q0
const uint16_t MASK_RETROCEDER         = (1 << 1);  // Salida 2  / Chip 1 Q1
const uint16_t MASK_GIRAR_IZQ          = (1 << 10); // Salida 11 / Chip 2 Q2
const uint16_t MASK_GIRAR_DER          = (1 << 4);  // Salida 5  / Chip 1 Q4
const uint16_t MASK_ROTAR_CABINA_IZQ   = (1 << 7);  // Salida 8  / Chip 1 Q7 (o ABRIR_PALA)
const uint16_t MASK_ROTAR_CABINA_DER   = (1 << 0);  // Salida 1  / Chip 1 Q0 (o CERRAR_PALA)
const uint16_t MASK_SUBIR_BRAZO        = (1 << 11); // Salida 12 / Chip 2 Q3
const uint16_t MASK_BAJAR_BRAZO        = (1 << 5);  // Salida 6  / Chip 1 Q5
const uint16_t MASK_POWER_CONTROL      = (1 << 6);  // Salida 7  / Chip 1 Q6 (Encendido/Apagado)
const uint16_t MASK_LUZ_LED            = (1 << 2);  // Salida 3  / Chip 1 Q2 (Toggle luz)
const uint16_t MASK_SONIDO_MUSICA      = (1 << 9);  // Salida 10 / Chip 2 Q1 (Toggle sonido)
const uint16_t MASK_DEMO_REMOTO        = (1 << 3);  // Salida 4  / Chip 1 Q3 (Modo demo del control)

// ============================================================================
// VARIABLES DE ESTADO Y CONTROL TEMPORIZADO (NO BLOQUEANTE)
// ============================================================================
WebSocketsClient webSocket;
WiFiManager wifiManager;

uint16_t estadoSalidasActual = 0x0000;
unsigned long tiempoInicioAccion = 0;
unsigned long duracionAccionMs   = 0;
bool accionEnCurso              = false;

// Duraciones por defecto
const unsigned long DURACION_PULSO_AUXILIAR_MS = 60;  // Para botones de pulso (luz, música, power)
const unsigned long DURACION_MOVIMIENTO_DEFAULT = 600; // Si el POST individual no manda duracion

// Control del botón físico de reset de Wi-Fi (5 segundos a GND)
unsigned long tiempoPulsadoResetWifi = 0;
bool esperandoSoltarResetWifi = false;

// ============================================================================
// DECLARACIÓN DE FUNCIONES
// ============================================================================
void actualizarSalidas(uint16_t valor);
void apagarTodo();
void ejecutarCanal(uint16_t mascara, unsigned long duracionMs, const char* nombre);
void procesarEventoWebSocket(const char* payload);
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
void verificarBotonResetWifi();
void verificarComandosSerial();
void mostrarBannerInicio();

// ============================================================================
// IMPLEMENTACIÓN DE CONTROL DE REGISTROS 74HC595
// ============================================================================
void actualizarSalidas(uint16_t valor) {
  byte byteAlto = (valor >> 8) & 0xFF; // Bits 8 al 15 -> Segundo integrado (Chip 2)
  byte byteBajo = valor & 0xFF;        // Bits 0 al 7  -> Primer integrado (Chip 1)

  digitalWrite(PIN_LATCH, LOW);
  shiftOut(PIN_DATA, PIN_CLOCK, MSBFIRST, byteAlto);
  shiftOut(PIN_DATA, PIN_CLOCK, MSBFIRST, byteBajo);
  digitalWrite(PIN_LATCH, HIGH);

  estadoSalidasActual = valor;
}

void apagarTodo() {
  actualizarSalidas(0x0000);
  accionEnCurso = false;
  duracionAccionMs = 0;
}

// ============================================================================
// EJECUCIÓN CON EXCLUSIÓN MUTUA Y TEMPORIZACIÓN NO BLOQUEANTE
// ============================================================================
void ejecutarCanal(uint16_t mascara, unsigned long duracionMs, const char* nombre) {
  // Regla de Exclusión Mutua (RN08 / RN09):
  // Si se pide avanzar, desactivar retroceso y viceversa.
  if (mascara & MASK_AVANZAR) {
    estadoSalidasActual &= ~MASK_RETROCEDER;
  } else if (mascara & MASK_RETROCEDER) {
    estadoSalidasActual &= ~MASK_AVANZAR;
  }

  // Si se pide girar a un lado, desactivar el lado opuesto.
  if (mascara & MASK_GIRAR_IZQ) {
    estadoSalidasActual &= ~MASK_GIRAR_DER;
  } else if (mascara & MASK_GIRAR_DER) {
    estadoSalidasActual &= ~MASK_GIRAR_IZQ;
  }

  // Si se pide subir brazo, desactivar bajar y viceversa.
  if (mascara & MASK_SUBIR_BRAZO) {
    estadoSalidasActual &= ~MASK_BAJAR_BRAZO;
  } else if (mascara & MASK_BAJAR_BRAZO) {
    estadoSalidasActual &= ~MASK_SUBIR_BRAZO;
  }

  // Activar la máscara solicitada
  actualizarSalidas(mascara);
  tiempoInicioAccion = millis();
  duracionAccionMs = duracionMs;
  accionEnCurso = true;

  Serial.printf("[ACTUADOR] -> %s | Salidas: 0x%04X | Duracion: %lu ms\n", nombre, mascara, duracionMs);
}

// ============================================================================
// MAPEO Y DESPACHO DE COMANDOS DEL SERVIDOR
// ============================================================================
void despacharComando(int codigo, const char* comando, unsigned long duracion) {
  // Manejo de parada segura (Código 9 o "DETENER")
  if (codigo == 9 || (comando != nullptr && strcasecmp(comando, "DETENER") == 0)) {
    apagarTodo();
    Serial.println("[SEGURIDAD] Comando DETENER ejecutado. Salidas liberadas.");
    return;
  }

  unsigned long tDur = (duracion > 0) ? duracion : DURACION_MOVIMIENTO_DEFAULT;

  // 1. AVANZAR
  if (codigo == 1 || (comando != nullptr && strcasecmp(comando, "AVANZAR") == 0)) {
    ejecutarCanal(MASK_AVANZAR, tDur, "AVANZAR (Salida 9)");
    return;
  }

  // 2. RETROCEDER
  if (codigo == 2 || (comando != nullptr && strcasecmp(comando, "RETROCEDER") == 0)) {
    ejecutarCanal(MASK_RETROCEDER, tDur, "RETROCEDER (Salida 2)");
    return;
  }

  // 3. GIRAR IZQUIERDA
  if (codigo == 3 || (comando != nullptr && strcasecmp(comando, "GIRAR_IZQUIERDA") == 0)) {
    ejecutarCanal(MASK_GIRAR_IZQ, tDur, "GIRAR IZQUIERDA (Salida 11)");
    return;
  }

  // 4. GIRAR DERECHA
  if (codigo == 4 || (comando != nullptr && strcasecmp(comando, "GIRAR_DERECHA") == 0)) {
    ejecutarCanal(MASK_GIRAR_DER, tDur, "GIRAR DERECHA (Salida 5)");
    return;
  }

  // 5. SUBIR BRAZO
  if (codigo == 5 || (comando != nullptr && strcasecmp(comando, "SUBIR_BRAZO") == 0)) {
    ejecutarCanal(MASK_SUBIR_BRAZO, tDur, "SUBIR BRAZO (Salida 12)");
    return;
  }

  // 6. BAJAR BRAZO
  if (codigo == 6 || (comando != nullptr && strcasecmp(comando, "BAJAR_BRAZO") == 0)) {
    ejecutarCanal(MASK_BAJAR_BRAZO, tDur, "BAJAR BRAZO (Salida 6)");
    return;
  }

  // 7. ABRIR PALA / ROTAR CABINA IZQUIERDA
  if (codigo == 7 || (comando != nullptr && (strcasecmp(comando, "ABRIR_PALA") == 0 || strcasecmp(comando, "ROTAR_IZQ") == 0 || strcasecmp(comando, "ROTAR_CABINA_IZQUIERDA") == 0))) {
    ejecutarCanal(MASK_ROTAR_CABINA_IZQ, tDur, "ROTAR CABINA IZQ / ABRIR PALA (Salida 8)");
    return;
  }

  // 8. CERRAR PALA / ROTAR CABINA DERECHA
  if (codigo == 8 || (comando != nullptr && (strcasecmp(comando, "CERRAR_PALA") == 0 || strcasecmp(comando, "ROTAR_DER") == 0 || strcasecmp(comando, "ROTAR_CABINA_DERECHA") == 0))) {
    ejecutarCanal(MASK_ROTAR_CABINA_DER, tDur, "ROTAR CABINA DER / CERRAR PALA (Salida 1)");
    return;
  }

  // 10. ENCENDIDO / CONTROL REMOTO (Pulso corto)
  if (codigo == 10 || (comando != nullptr && (strcasecmp(comando, "ENCENDER") == 0 || strcasecmp(comando, "CONTROL_REMOTO") == 0))) {
    ejecutarCanal(MASK_POWER_CONTROL, DURACION_PULSO_AUXILIAR_MS, "ENCENDIDO REMOTO (Salida 7)");
    return;
  }

  // 11. MÚSICA / SONIDO (Pulso corto)
  if (codigo == 11 || (comando != nullptr && (strcasecmp(comando, "TOGGLE_MUSIC") == 0 || strcasecmp(comando, "SONIDO") == 0))) {
    ejecutarCanal(MASK_SONIDO_MUSICA, DURACION_PULSO_AUXILIAR_MS, "ALTERNAR MUSICA (Salida 10)");
    return;
  }

  // 12. LUZ / FARO (Pulso corto)
  if (codigo == 12 || (comando != nullptr && (strcasecmp(comando, "TOGGLE_LIGHT") == 0 || strcasecmp(comando, "LUZ") == 0))) {
    ejecutarCanal(MASK_LUZ_LED, DURACION_PULSO_AUXILIAR_MS, "ALTERNAR LUZ (Salida 3)");
    return;
  }

  // Modo Demo del control
  if (comando != nullptr && strcasecmp(comando, "MODO_DEMO_REMOTO") == 0) {
    ejecutarCanal(MASK_DEMO_REMOTO, DURACION_PULSO_AUXILIAR_MS, "MODO DEMO CONTROL (Salida 4)");
    return;
  }

  Serial.printf("[AVISO] Comando desconocido recibido: codigo=%d, comando=%s\n", codigo, (comando ? comando : "null"));
}

// ============================================================================
// PROCESAMIENTO DE MENSAJES WEBSOCKET (CONTRATO JSON DEL SERVIDOR)
// ============================================================================
void procesarEventoWebSocket(const char* payload) {
  // Capacidad de buffer suficiente para los payloads del backend
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.printf("[JSON ERROR] Fallo al parsear payload: %s\n", error.c_str());
    return;
  }

  const char* evento = doc["evento"] | "";
  int id_vehiculo    = doc["id_vehiculo"] | 0;

  // Regla de Negocio RN06: Ignorar eventos de otros vehículos
  if (id_vehiculo != 0 && id_vehiculo != VEHICULO_ID) {
    Serial.printf("[FILTRO] Evento descartado (pertenece a vehiculo %d, mi id es %d)\n", id_vehiculo, VEHICULO_ID);
    return;
  }

  // --------------------------------------------------------------------------
  // EVENTO: ESTADO_INICIAL (Handshake al conectar o reconectar)
  // Regla RN07 y RN15: NO ejecutar movimientos por estados históricos/reconexión
  // --------------------------------------------------------------------------
  if (strcmp(evento, "ESTADO_INICIAL") == 0) {
    const char* comando = doc["comando"] | "NINGUNO";
    int codigo = doc["codigo"] | 0;
    Serial.printf("[WSS] -> ESTADO_INICIAL recibido: Vehiculo %d | Ultimo Comando: %s (cod %d). Salidas permanecen seguras.\n", 
                  id_vehiculo, comando, codigo);
    apagarTodo(); // Garantizar reposo seguro
    return;
  }

  // --------------------------------------------------------------------------
  // EVENTO: MOVIMIENTO_INDIVIDUAL (Comandos desde Swagger UI / POST)
  // --------------------------------------------------------------------------
  if (strcmp(evento, "MOVIMIENTO_INDIVIDUAL") == 0) {
    int codigo          = doc["codigo"] | 0;
    const char* comando = doc["comando"] | "";
    const char* origen  = doc["origen"] | "MANUAL";
    Serial.printf("[WSS] -> MOVIMIENTO_INDIVIDUAL: '%s' (cod: %d) [Origen: %s]\n", comando, codigo, origen);

    despacharComando(codigo, comando, DURACION_MOVIMIENTO_DEFAULT);
    return;
  }

  // --------------------------------------------------------------------------
  // EVENTO: DEMO_INICIO
  // --------------------------------------------------------------------------
  if (strcmp(evento, "DEMO_INICIO") == 0) {
    const char* demoNombre = doc["demo"] | "Sin nombre";
    int total = doc["total_movimientos"] | 0;
    Serial.printf("[WSS DEMO] >>> INICIO DE SECUENCIA: '%s' (%d pasos) <<<\n", demoNombre, total);
    apagarTodo();
    return;
  }

  // --------------------------------------------------------------------------
  // EVENTO: DEMO_MOVIMIENTO (Paso de la secuencia con temporización real de RDS)
  // --------------------------------------------------------------------------
  if (strcmp(evento, "DEMO_MOVIMIENTO") == 0) {
    int pasoActual      = doc["paso_actual"] | 0;
    int total           = doc["total_movimientos"] | 0;
    int codigo          = doc["codigo"] | 0;
    const char* comando = doc["comando"] | "";
    unsigned long dur   = doc["duracion_ms"] | 1000;
    unsigned long pausa = doc["pausa_ms"] | 0;

    Serial.printf("[WSS DEMO] Paso %d/%d: '%s' (cod %d) | Duracion: %lu ms | Pausa posterior: %lu ms\n", 
                  pasoActual, total, comando, codigo, dur, pausa);

    despacharComando(codigo, comando, dur);
    return;
  }

  // --------------------------------------------------------------------------
  // EVENTOS: DEMO_FIN / DEMO_CANCELADA / DEMO_ERROR
  // --------------------------------------------------------------------------
  if (strcmp(evento, "DEMO_FIN") == 0) {
    Serial.println("[WSS DEMO] >>> SECUENCIA COMPLETADA CON ÉXITO <<<");
    apagarTodo();
    return;
  }

  if (strcmp(evento, "DEMO_CANCELADA") == 0) {
    const char* motivo = doc["motivo"] | "Cancelado";
    Serial.printf("[WSS DEMO] !!! DEMO CANCELADA: %s. Detención inmediata. !!!\n", motivo);
    apagarTodo();
    return;
  }

  if (strcmp(evento, "DEMO_ERROR") == 0) {
    const char* err = doc["error"] | "Error desconocido";
    Serial.printf("[WSS DEMO ERROR] %s. Pasando a estado seguro.\n", err);
    apagarTodo();
    return;
  }
}

// ============================================================================
// MANEJADOR DE EVENTOS DEL CLIENTE WEBSOCKET
// ============================================================================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[WSS] Desconectado del servidor AWS.");
      // Regla RN11: Pérdida de comunicación debe liberar salidas inmediatamente
      apagarTodo();
      break;

    case WStype_CONNECTED:
      Serial.printf("[WSS] ¡Conectado exitosamente al servidor AWS! URL: %s\n", (char*)payload);
      break;

    case WStype_TEXT:
      procesarEventoWebSocket((const char*)payload);
      break;

    case WStype_BIN:
      Serial.println("[WSS] Mensaje binario recibido (ignorado).");
      break;

    case WStype_ERROR:
      Serial.printf("[WSS ERROR] Error en canal WebSocket: %s\n", (char*)payload);
      apagarTodo();
      break;

    default:
      break;
  }
}

// ============================================================================
// COMPROBACIÓN DEL BOTÓN DE RESET WI-FI (GPIO 4 DURANTE 5 SEGUNDOS)
// ============================================================================
void verificarBotonResetWifi() {
  if (digitalRead(PIN_RESET_WIFI) == LOW) {
    if (tiempoPulsadoResetWifi == 0) {
      tiempoPulsadoResetWifi = millis();
      Serial.println("[RESET WIFI] Botón presionado. Mantén 5 segundos para borrar credenciales...");
    } else if (millis() - tiempoPulsadoResetWifi >= 5000 && !esperandoSoltarResetWifi) {
      Serial.println("\n[RESET WIFI] ¡5 segundos alcanzados! Borrando credenciales y reiniciando...");
      apagarTodo();
      wifiManager.resetSettings();
      delay(1000);
      ESP.restart();
    }
  } else {
    tiempoPulsadoResetWifi = 0;
  }
}

// ============================================================================
// COMPROBACIÓN DE COMANDOS LOCALES DESDE EL MONITOR SERIAL (TESTING DE LABORATORIO)
// ============================================================================
void verificarComandosSerial() {
  if (Serial.available() > 0) {
    char c = Serial.read();

    // Restablecimiento de credenciales Wi-Fi por Serial (RN08 / Criterio 8.1)
    if (c == 'r' || c == 'R') {
      Serial.println("\n[RESET WIFI] Comando 'R' recibido por Serial. Borrando credenciales...");
      apagarTodo();
      wifiManager.resetSettings();
      delay(1000);
      ESP.restart();
      return;
    }

    // Comandos locales de prueba directa de hardware
    switch (c) {
      case 'w': case 'W': despacharComando(1, "AVANZAR", 600); break;
      case 's': case 'S': despacharComando(2, "RETROCEDER", 600); break;
      case 'a': case 'A': despacharComando(3, "GIRAR_IZQUIERDA", 600); break;
      case 'd': case 'D': despacharComando(4, "GIRAR_DERECHA", 600); break;
      case 'k': case 'K': despacharComando(5, "SUBIR_BRAZO", 600); break;
      case 'j': case 'J': despacharComando(6, "BAJAR_BRAZO", 600); break;
      case 'h': case 'H': despacharComando(7, "ROTAR_IZQ", 600); break;
      case 'l': case 'L': despacharComando(8, "ROTAR_DER", 600); break;
      case '1': despacharComando(10, "ENCENDER", DURACION_PULSO_AUXILIAR_MS); break;
      case '2': despacharComando(12, "TOGGLE_LIGHT", DURACION_PULSO_AUXILIAR_MS); break;
      case '3': despacharComando(11, "TOGGLE_MUSIC", DURACION_PULSO_AUXILIAR_MS); break;
      case '4': despacharComando(0, "MODO_DEMO_REMOTO", DURACION_PULSO_AUXILIAR_MS); break;
      case '0': case ' ':
        apagarTodo();
        Serial.println("[PARADA] Todas las salidas apagadas por Serial.");
        break;
      default:
        break;
    }
  }
}

// ============================================================================
// MOSTRAR BANNER DE INICIO
// ============================================================================
void mostrarBannerInicio() {
  Serial.println("\n========================================================");
  Serial.println("   SISTEMA DE CONTROL DE EXCAVADORA IOT - ESP32 + AWS   ");
  Serial.println("========================================================");
  Serial.printf("Vehiculo ID objetivo: %d\n", VEHICULO_ID);
  Serial.printf("Pines 74HC595: DATA=%d, CLOCK=%d, LATCH=%d\n", PIN_DATA, PIN_CLOCK, PIN_LATCH);
  Serial.printf("Pin Reset WiFi: GPIO %d (5 seg a GND)\n", PIN_RESET_WIFI);
  Serial.println("--------------------------------------------------------");
  Serial.println("Comandos Serial de Prueba Local: W/S/A/D, H/L, K/J, 1..4, '0'=Stop, 'R'=Reset WiFi");
  Serial.println("========================================================\n");
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);

  // Configurar pines de hardware para los 74HC595
  pinMode(PIN_DATA, OUTPUT);
  pinMode(PIN_CLOCK, OUTPUT);
  pinMode(PIN_LATCH, OUTPUT);

  // Botón físico de reset Wi-Fi con resistencia interna PULLUP
  pinMode(PIN_RESET_WIFI, INPUT_PULLUP);

  // ESTADO SEGURO INMEDIATO (RN11 / RN08): Todas las salidas en LOW desde el arranque
  apagarTodo();

  mostrarBannerInicio();

  // Configuración de WiFiManager
  Serial.println("[WIFI] Iniciando WiFiManager...");
  wifiManager.setConnectTimeout(30);       // 30 segundos intentando conectar a la red guardada
  wifiManager.setConfigPortalTimeout(180);  // 3 minutos en modo portal antes de reintentar

  // Nombre del Punto de Acceso generado si no hay credenciales
  char apNombre[32];
  snprintf(apNombre, sizeof(apNombre), "Excavadora_IoT_%04X", (uint16_t)(ESP.getEfuseMac() & 0xFFFF));

  if (!wifiManager.autoConnect(apNombre)) {
    Serial.println("[WIFI ERROR] Tiempo de espera agotado. Reiniciando microcontrolador...");
    delay(2000);
    ESP.restart();
  }

  // Conexión Wi-Fi exitosa
  Serial.println("\n[WIFI] ¡Conexión establecida!");
  Serial.printf("[WIFI] IP Asignada: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("[WIFI] MAC: %s\n", WiFi.macAddress().c_str());
  Serial.printf("[WIFI] RSSI: %d dBm\n", WiFi.RSSI());

  // Construir ruta WebSocket para este vehículo
  char wsPath[64];
  snprintf(wsPath, sizeof(wsPath), "/ws/%d", VEHICULO_ID);

  Serial.printf("[WSS] Iniciando cliente hacia %s:%d%s...\n", WS_HOST, WS_PORT, wsPath);

  // Iniciar cliente WebSocket
  if (USE_SSL) {
    webSocket.beginSSL(WS_HOST, WS_PORT, wsPath);
  } else {
    webSocket.begin(WS_HOST, WS_PORT, wsPath);
  }

  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000); // Reintentar reconexión cada 3 segundos automáticamente
  webSocket.enableHeartbeat(15000, 3000, 2); // Ping cada 15s para mantener el canal vivo a través de AWS NAT
}

// ============================================================================
// LOOP PRINCIPAL (100% NO BLOQUEANTE)
// ============================================================================
void loop() {
  // 1. Atender la máquina de estados del cliente WebSocket
  webSocket.loop();

  // 2. Control de apagado automático por temporizador (sin delay)
  if (accionEnCurso && duracionAccionMs > 0) {
    if (millis() - tiempoInicioAccion >= duracionAccionMs) {
      apagarTodo();
      Serial.println("[AUTO-LIBERACIÓN] Fin de temporización. Salidas liberadas.");
    }
  }

  // 3. Revisar botón de reset de Wi-Fi
  verificarBotonResetWifi();

  // 4. Revisar comandos locales de depuración por Monitor Serial
  verificarComandosSerial();
}
