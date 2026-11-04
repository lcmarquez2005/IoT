#include <Arduino.h>

// Pines GPIO para ESP32
const byte PIN_DATA  = 23; // DS (Serial Data)
const byte PIN_CLOCK = 18; // SHCP (Shift Clock)
const byte PIN_LATCH = 5;  // STCP (Latch Clock)

uint16_t estadoSalidas = 0;

// Variables para el apagado automático de pulsos cortos (50 ms)
unsigned long tiempoInicioPulso = 0;
bool pulsoActivo = false;
const unsigned long DURACION_PULSO_MS = 50;

void actualizarSalidas(uint16_t valor) {
  byte byteAlto = (valor >> 8) & 0xFF; // Bits 8 al 15 -> Chip 2
  byte byteBajo = valor & 0xFF;        // Bits 0 al 7  -> Chip 1

  digitalWrite(PIN_LATCH, LOW);
  shiftOut(PIN_DATA, PIN_CLOCK, MSBFIRST, byteAlto);
  shiftOut(PIN_DATA, PIN_CLOCK, MSBFIRST, byteBajo);
  digitalWrite(PIN_LATCH, HIGH);

  estadoSalidas = valor;
}

void apagarTodo() {
  actualizarSalidas(0x0000);
  pulsoActivo = false;
}

// Para movimientos sostenidos (avanzar, retroceder, girar, etc.)
void mover(uint16_t mascara, const char* nombre) {
  pulsoActivo = false; // Cancela cualquier temporizador previo
  actualizarSalidas(mascara);
  Serial.print("[ESTADO] Activo: ");
  Serial.println(nombre);
}

// Para funciones momentáneas que deben apagarse solas tras 50 ms
void pulsar(uint16_t mascara, const char* nombre) {
  actualizarSalidas(mascara);
  tiempoInicioPulso = millis();
  pulsoActivo = true;
  Serial.print("[PULSO 50ms] Ejecutando: ");
  Serial.println(nombre);
}

void mostrarBienvenida() {
  Serial.println("\n========================================================");
  Serial.println("       SISTEMA DE CONTROL DE EXCAVADORA - ESP32         ");
  Serial.println("========================================================");
  Serial.println("Arquitectura:");
  Serial.println("  - Microcontrolador: ESP32");
  Serial.println("  - Expansion: 2x 74HC595 en cascada (16 bits de salida)");
  Serial.println("  - Aislamiento: Optoacopladores PC817 (contacto seco)");
  Serial.println("--------------------------------------------------------");
  Serial.println("Modo de Operacion:");
  Serial.println("  1. Movimientos Continuos (WASD / HJKL):");
  Serial.println("     Permanecen activos hasta enviar otro comando o '0'.");
  Serial.println("  2. Funciones de Pulso (1, 2, 3, 4):");
  Serial.println("     Emulan un clic fisico y se apagan solas en 50 ms.");
  Serial.println("--------------------------------------------------------");
  Serial.println("TABLA DE COMANDOS DISPONIBLES:");
  Serial.println("");
  Serial.println("  [MOVIMIENTO BASE - ORUGAS]");
  Serial.println("    w -> Avanzar               (Salida 9  / Chip 2 Q0)");
  Serial.println("    s -> Retroceder            (Salida 2  / Chip 1 Q1)");
  Serial.println("    a -> Girar Izquierda       (Salida 11 / Chip 2 Q2)");
  Serial.println("    d -> Girar Derecha         (Salida 5  / Chip 1 Q4)");
  Serial.println("");
  Serial.println("  [TORRE Y BRAZO]");
  Serial.println("    h -> Rotar Cabina Izq      (Salida 8  / Chip 1 Q7)");
  Serial.println("    l -> Rotar Cabina Der      (Salida 1  / Chip 1 Q0)");
  Serial.println("    k -> Subir Brazo           (Salida 12 / Chip 2 Q3)");
  Serial.println("    j -> Bajar Brazo           (Salida 6  / Chip 1 Q5)");
  Serial.println("");
  Serial.println("  [ACCIONES RAPIDAS (Pulsos de 50 ms)]");
  Serial.println("    1 -> Encendido / Apagador  (Salida 7  / Chip 1 Q6)");
  Serial.println("    2 -> Apagar Foquito        (Salida 3  / Chip 1 Q2)");
  Serial.println("    3 -> Apagar Musica         (Salida 10 / Chip 2 Q1)");
  Serial.println("    4 -> Modo Demo             (Salida 4  / Chip 1 Q3)");
  Serial.println("");
  Serial.println("  [SEGURIDAD / PARADA]");
  Serial.println("    0 o Espacio -> Detener todo (Apagar salidas)");
  Serial.println("========================================================");
  Serial.println("Sistema listo. Esperando comandos...\n");
}

void setup() {
  pinMode(PIN_DATA, OUTPUT);
  pinMode(PIN_CLOCK, OUTPUT);
  pinMode(PIN_LATCH, OUTPUT);

  // Asegurar salidas apagadas desde el primer instante
  apagarTodo();

  Serial.begin(115200);

  // Espera de 3 segundos para que el Monitor Serial se conecte y estabilice
  delay(3000);

  // Limpiar cualquier residuo de datos en el búfer serial
  while (Serial.available() > 0) {
    Serial.read();
  }

  randomSeed(esp_random());
  
  // Imprimir el banner y la tabla de comandos
  mostrarBienvenida();
}

void loop() {
  // Manejo de apagado automático tras 50 ms (sin delay bloqueante)
  if (pulsoActivo && (millis() - tiempoInicioPulso >= DURACION_PULSO_MS)) {
    apagarTodo();
    Serial.println("[AUTO-OFF] Pulso de 50 ms finalizado.");
  }

  if (Serial.available() > 0) {
    char comando = Serial.read();

    switch (comando) {
      // --- MOVIMIENTO BASE (WASD) ---
      case 'w':
      case 'W': 
        mover(1 << 8, "AVANZAR (Salida 9)"); 
        break;

      case 's':
      case 'S': 
        mover(1 << 1, "RETROCEDER (Salida 2)"); 
        break;

      case 'a':
      case 'A': 
        mover(1 << 10, "GIRAR IZQUIERDA (Salida 11)"); 
        break;

      case 'd':
      case 'D': 
        mover(1 << 4, "GIRAR DERECHA (Salida 5)"); 
        break;

      // --- TORRE Y BRAZO (HJKL) ---
      case 'h':
      case 'H': 
        mover(1 << 7, "ROTAR CABINA IZQUIERDA (Salida 8)"); 
        break;

      case 'l':
      case 'L': 
        mover(1 << 0, "ROTAR CABINA DERECHA (Salida 1)"); 
        break;

      case 'k':
      case 'K': 
        mover(1 << 11, "SUBIR BRAZO (Salida 12)"); 
        break;

      case 'j':
      case 'J': 
        mover(1 << 5, "BAJAR BRAZO (Salida 6)"); 
        break;

      // --- PULSOS CORTOS (50 ms) ---
      case '1': 
        pulsar(1 << 6, "ENCENDIDO / APAGADO (Salida 7)"); 
        break;

      case '2': 
        pulsar(1 << 2, "APAGAR FOQUITO (Salida 3)"); 
        break;

      case '3': 
        pulsar(1 << 9, "APAGAR MUSICA (Salida 10)"); 
        break;

      case '4': 
        pulsar(1 << 3, "MODO DEMO (Salida 4)"); 
        break;

      // --- PARADA GENERAL ---
      case '0':
      case ' ':
        apagarTodo();
        Serial.println("[PARADA] Todas las salidas apagadas.");
        break;
    }
  }
}