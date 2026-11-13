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
      if (commandCode === COMMANDS.DETENER) {
        movementController.stopContinuousCommand(true);
      } else {
        movementController.startContinuousCommand(commandCode, 'JOYSTICK');
      }
    } else {
      movementController.stopContinuousCommand(true);
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
    const code = parseInt(btn.getAttribute('data-command-code'), 10);
    if (isNaN(code)) return;

    // Códigos 5 al 8 son movimientos continuos de brazo y pala (Press-and-Hold con Heartbeat)
    if (code >= 5 && code <= 8) {
      let isPressed = false;

      const handleStart = (e) => {
        if (e.button !== undefined && e.button !== 0) return; // Solo clic primario
        if (isPressed) return;
        isPressed = true;
        btn.classList.add('btn-state-active');
        try {
          if (btn.setPointerCapture && e.pointerId !== undefined) {
            btn.setPointerCapture(e.pointerId);
          }
        } catch {}
        movementController.startContinuousCommand(code, 'BOTON');
      };

      const handleEnd = (e) => {
        if (!isPressed) return;
        isPressed = false;
        btn.classList.remove('btn-state-active');
        try {
          if (btn.releasePointerCapture && e.pointerId !== undefined) {
            btn.releasePointerCapture(e.pointerId);
          }
        } catch {}
        movementController.stopContinuousCommand(true);
      };

      btn.addEventListener('pointerdown', handleStart);
      btn.addEventListener('pointerup', handleEnd);
      btn.addEventListener('pointercancel', handleEnd);
      btn.addEventListener('pointerleave', (e) => {
        // Solo cancelar en leave si no hay pointer capture activo
        if (!btn.hasPointerCapture || !btn.hasPointerCapture(e.pointerId)) {
          handleEnd(e);
        }
      });
      // Prevenir el evento de clic predeterminado para evitar disparos duplicados
      btn.addEventListener('click', (e) => e.preventDefault());
    } else {
      // Códigos 10, 11, 12 son auxiliares de pulso (Power, Música, Luces)
      btn.addEventListener('click', () => {
        btn.classList.add('btn-state-active');
        movementController.executeCommand(code, 'BOTON');
        setTimeout(() => btn.classList.remove('btn-state-active'), 250);
      });
    }
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

  // 10. Botón de Pantalla Completa y Orientación (Mobile First)
  initFullscreen();

  // 11. Soporte opcional de teclado ergonómico
  initKeyboardControls();
});

/**
 * Gestión de Pantalla Completa (Mobile First)
 */
function initFullscreen() {
  const btn = document.getElementById('btn-fullscreen');
  const icon = document.getElementById('fullscreen-icon');

  if (btn) {
    btn.addEventListener('click', async () => {
      if (!document.fullscreenElement) {
        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          } else if (document.documentElement.webkitRequestFullscreen) {
            await document.documentElement.webkitRequestFullscreen();
          }
          // Intento de bloqueo en horizontal para celulares
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
          }
        } catch (err) {
          console.warn('[Pantalla Completa]:', err.message);
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(() => {});
        }
      }
    });
  }

  const handleFsChange = () => {
    const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    if (icon) {
      icon.className = isFs ? 'bi bi-fullscreen-exit' : 'bi bi-arrows-fullscreen';
    }
    document.body.classList.toggle('is-fullscreen', isFs);
  };

  document.addEventListener('fullscreenchange', handleFsChange);
  document.addEventListener('webkitfullscreenchange', handleFsChange);
}

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
      if (cmd === COMMANDS.DETENER) {
        movementController.emergencyStop();
      } else {
        movementController.startContinuousCommand(cmd, 'TECLADO');
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (activeKey === e.code) {
      activeKey = null;
      // Al soltar cualquier tecla de movimiento o brazo, detener y enviar DETENER
      movementController.stopContinuousCommand(true);
    }
  });
}
