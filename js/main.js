/**
 * main.js — Módulo principal de la aplicación web de control IoT
 * M.C. Víctor Manuel Pinedo Fernández — Implementación de Soluciones IoT
 * Autor: Luis Carlos Márquez Strociak · 2026
 */

import { getActiveConfig, saveActiveConfig, resetConfigToDefaults, COMMANDS } from './config.js';
import { apiClient } from './api-client.js';
import { wsClient } from './websocket-client.js';
import { VirtualJoystick } from './joystick.js';
import { movementController } from './movement-controller.js';
import { DemoController } from './demo-controller.js';
import { StatusIndicatorsManager } from './status-indicators.js';
import { uiFeedback } from './ui-feedback.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[IoT Control]: Inicializando aplicación de control modular...');

  // 1. Inicializar indicadores de conectividad (WebSocket, Servidor AWS 21 APIs, Amazon RDS)
  const statusManager = new StatusIndicatorsManager();

  // 2. Conectar cliente WebSocket nativo
  wsClient.connect();

  // 3. Inicializar Joystick circular (Pointer Events)
  const joystickBase = document.getElementById('joystick-base');
  const joystickHandle = document.getElementById('joystick-handle');

  const joystick = new VirtualJoystick(joystickBase, joystickHandle, (commandCode) => {
    if (commandCode !== null) {
      movementController.executeCommand(commandCode, 'JOYSTICK');
    }
  });

  // 4. Inicializar controlador de rutinas DEMO
  const demoController = new DemoController(joystick);
  demoController.loadDemos();

  // 5. Vincular eventos WebSocket con feedback y DEMO
  wsClient.onMessage((msg) => {
    uiFeedback.setWsEvent(msg);
    demoController.handleWebSocketEvent(msg);
  });

  // 6. Vincular botón DETENER (Parada de Emergencia Prioritaria)
  const emergencyStopBtn = document.getElementById('btn-emergency-stop');
  if (emergencyStopBtn) {
    emergencyStopBtn.addEventListener('click', () => {
      movementController.emergencyStop();
    });
  }

  // 7. Vincular botones de movimientos complementarios (Brazo, Pala, Auxiliares)
  document.querySelectorAll('[data-command-code]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const code = parseInt(btn.getAttribute('data-command-code'), 10);
      if (!isNaN(code)) {
        btn.classList.add('btn-state-active');
        movementController.executeCommand(code, 'BOTON');
        setTimeout(() => btn.classList.remove('btn-state-active'), 250);
      }
    });
  });

  // 8. Cargar información real del vehículo desde la API
  try {
    const vehiculo = await apiClient.obtenerVehiculo();
    const titleEl = document.getElementById('vehicle-name');
    const descEl = document.getElementById('vehicle-desc');
    if (titleEl && vehiculo.nombre) titleEl.textContent = vehiculo.nombre;
    if (descEl && vehiculo.microcontrolador) {
      descEl.textContent = `${vehiculo.modelo || 'Excavadora'} • ${vehiculo.microcontrolador}`;
    }
  } catch (err) {
    console.warn('[Vehículo]: No se pudo cargar nombre del vehículo:', err.message);
  }

  // 9. Configuración modal (Endpoints y Vehículo)
  initSettingsModal(statusManager);

  // 10. Soporte opcional de teclado ergonómico
  initKeyboardControls();
});

/**
 * Gestión del modal de configuración de endpoints
 */
function initSettingsModal(statusManager) {
  const modalEl = document.getElementById('configModal');
  const inputApi = document.getElementById('cfg-api-url');
  const inputWs = document.getElementById('cfg-ws-url');
  const inputVehicle = document.getElementById('cfg-vehicle-id');
  const saveBtn = document.getElementById('btn-save-config');
  const resetBtn = document.getElementById('btn-reset-config');

  const populateInputs = () => {
    const cfg = getActiveConfig();
    if (inputApi) inputApi.value = cfg.apiBaseUrl;
    if (inputWs) inputWs.value = cfg.wsBaseUrl;
    if (inputVehicle) inputVehicle.value = cfg.vehicleId;
  };

  if (modalEl) {
    modalEl.addEventListener('show.bs.modal', populateInputs);
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveActiveConfig(inputApi.value, inputWs.value, inputVehicle.value);
      uiFeedback.showNotification('Configuración guardada. Reconectando...', 'success');
      wsClient.connect();
      statusManager.checkApiHealth();
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetConfigToDefaults();
      populateInputs();
      uiFeedback.showNotification('Configuración restablecida a valores originales', 'info');
    });
  }
}

/**
 * Atajos de teclado para accesibilidad física
 */
function initKeyboardControls() {
  const keyMap = {
    KeyW: COMMANDS.AVANZAR,
    KeyS: COMMANDS.RETROCEDER,
    KeyA: COMMANDS.GIRAR_IZQUIERDA,
    KeyD: COMMANDS.GIRAR_DERECHA,
    Space: COMMANDS.DETENER,
    KeyH: COMMANDS.SUBIR_BRAZO,
    KeyJ: COMMANDS.BAJAR_BRAZO,
    KeyK: COMMANDS.ABRIR_PALA,
    KeyL: COMMANDS.CERRAR_PALA,
  };

  let activeKey = null;

  window.addEventListener('keydown', (e) => {
    // Ignorar si está escribiendo en un input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    const cmd = keyMap[e.code];
    if (cmd && activeKey !== e.code) {
      activeKey = e.code;
      e.preventDefault();
      movementController.executeCommand(cmd, 'TECLADO');
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (activeKey === e.code) {
      activeKey = null;
      // Al soltar teclas de dirección (WASD), envía DETENER
      if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
        movementController.executeCommand(COMMANDS.DETENER, 'TECLADO_LIBERAR');
      }
    }
  });
}
