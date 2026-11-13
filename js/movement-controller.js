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

    // Control de comandos continuos (Press-and-Hold / Heartbeat)
    this.continuousTimer = null;
    this.activeContinuousCode = null;
    this.activeContinuousSource = null;
    this.heartbeatIntervalMs = 150; // Latido a 150 ms para refrescar el límite de 300 ms del ESP32
  }

  /**
   * Inicia el envío periódico y continuo mientras un control permanezca presionado/activo
   * @param {number} code - Código del comando (1-8)
   * @param {string} source - Origen del control (JOYSTICK, BOTON, TECLADO)
   */
  startContinuousCommand(code, source = 'BOTON') {
    // Si ya estamos emitiendo este mismo código continuo, no reiniciar el intervalo
    if (this.activeContinuousCode === code && this.continuousTimer !== null) {
      return;
    }

    // Detener cualquier temporizador previo
    this.clearContinuousTimer();

    this.activeContinuousCode = code;
    this.activeContinuousSource = source;

    // 1. Emitir inmediatamente el primer pulso
    this.executeCommand(code, source);

    // 2. Mantener latido periódico para refrescar el temporizador en el ESP32
    this.continuousTimer = setInterval(() => {
      if (this.activeContinuousCode !== null) {
        this.executeCommand(this.activeContinuousCode, this.activeContinuousSource);
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * Detiene el envío continuo y opcionalmente emite DETENER
   * @param {boolean} sendStop - Si debe emitirse el código 9 (DETENER) al soltar
   */
  stopContinuousCommand(sendStop = true) {
    const wasActive = this.activeContinuousCode !== null || this.continuousTimer !== null;
    this.clearContinuousTimer();

    if (wasActive && sendStop) {
      this.executeCommand(COMMANDS.DETENER, 'LIBERAR');
    }
  }

  /**
   * Limpia el temporizador sin disparar DETENER
   */
  clearContinuousTimer() {
    if (this.continuousTimer !== null) {
      clearInterval(this.continuousTimer);
      this.continuousTimer = null;
    }
    this.activeContinuousCode = null;
    this.activeContinuousSource = null;
  }

  /**
   * Envía un comando a la API
   * @param {number} code - Código del comando (1-12)
   * @param {string} source - Origen (JOYSTICK, BOTON, EMERGENCIA, etc.)
   */
  async executeCommand(code, source = 'BOTON') {
    const commandName = COMMAND_NAMES[code] || `COMANDO_${code}`;

    // DETENER (código 9) tiene prioridad operativa absoluta
    const isStop = code === COMMANDS.DETENER;

    // Si se invoca DETENER directamente, cancelar cualquier envío continuo activo
    if (isStop) {
      this.clearContinuousTimer();
    }

    // Si ya estamos enviando una petición previa y no es DETENER, no saturar el canal HTTP
    if (this.isSending && !isStop) {
      return;
    }

    this.isSending = true;
    this.lastDispatchedCode = code;

    // Feedback visual inmediato de solicitud
    uiFeedback.setActionSent(commandName, code);

    try {
      const result = await apiClient.enviarMovimiento(code, `CONTROL_${source}`);
      // Evitar que respuestas tardías sobreescriban si ya se emitió DETENER u otro comando
      if (this.lastDispatchedCode === code || isStop) {
        uiFeedback.setHttpResult(result.status, result.data?.mensaje || 'Aceptado');
      }
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
    this.stopContinuousCommand(false);
    return this.executeCommand(COMMANDS.DETENER, 'EMERGENCIA');
  }
}

export const movementController = new MovementController();
