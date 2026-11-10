/**
 * movement-controller.js — Coordinación de movimientos y prioridad de DETENER
 * Centraliza la lógica de envío de comandos para joystick y botones complementarios.
 * Autor: Luis Carlos Márquez Strociak · 2026
 */

import { apiClient } from './api-client.js';
import { COMMANDS, COMMAND_NAMES } from './config.js';
import { uiFeedback } from './ui-feedback.js';

export class MovementController {
  constructor() {
    this.isSending = false;
    this.lastDispatchedCode = null;
    this.activeActionTimeout = null;
  }

  /**
   * Envía un comando a la API
   * @param {number} code - Código del comando (1-12)
   * @param {string} source - Origen (JOYSTICK, BOTON, EMERGENCIA)
   */
  async executeCommand(code, source = 'BOTON') {
    const commandName = COMMAND_NAMES[code] || `COMANDO_${code}`;

    // DETENER (código 9) tiene prioridad operativa absoluta
    const isStop = code === COMMANDS.DETENER;

    // Si ya estamos enviando un comando no prioritario, no duplicar peticiones en ráfaga
    if (this.isSending && !isStop) {
      return;
    }

    this.isSending = true;
    this.lastDispatchedCode = code;

    // Feedback visual inmediato de solicitud
    uiFeedback.setActionSent(commandName, code);

    try {
      const result = await apiClient.enviarMovimiento(code, `CONTROL_${source}`);
      uiFeedback.setHttpResult(result.status, result.data?.mensaje || 'Aceptado');
    } catch (err) {
      console.error(`[Movement Error]: Fallo al enviar ${commandName}:`, err);
      uiFeedback.setHttpResult(0, err.message);
      uiFeedback.showNotification(`Error al emitir ${commandName}: ${err.message}`, 'error');
    } finally {
      this.isSending = false;
    }
  }

  /**
   * Ejecuta parada de emergencia con prioridad máxima
   */
  async emergencyStop() {
    return this.executeCommand(COMMANDS.DETENER, 'EMERGENCIA');
  }
}

export const movementController = new MovementController();
