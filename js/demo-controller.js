/**
 * demo-controller.js — Consulta, selección, ejecución y cancelación de DEMO
 * Respeta la secuencia del servidor sin inventar pasos locales.
 * Autor: Luis Carlos Márquez Strociak · 2026
 */

import { apiClient } from './api-client.js';
import { uiFeedback } from './ui-feedback.js';

export class DemoController {
  constructor(joystickInstance) {
    this.joystick = joystickInstance;
    this.isDemoRunning = false;

    this.selectEl = document.getElementById('demo-select');
    this.startBtn = document.getElementById('btn-demo-start');
    this.cancelBtn = document.getElementById('btn-demo-cancel');
    this.statusContainer = document.getElementById('demo-status-card');
    this.progressBar = document.getElementById('demo-progress-bar');
    this.statusText = document.getElementById('demo-status-text');

    this.initEvents();
  }

  initEvents() {
    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => this.handleStartDemo());
    }
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => this.handleCancelDemo());
    }
  }

  /**
   * Carga la lista de DEMOs almacenadas en base de datos
   */
  async loadDemos() {
    if (!this.selectEl) return;
    this.selectEl.innerHTML = '<option value="">Cargando catálogo de DEMO...</option>';

    try {
      const demos = await apiClient.obtenerDemos();
      this.selectEl.innerHTML = '';

      if (!demos || demos.length === 0) {
        this.selectEl.innerHTML = '<option value="">No hay DEMOs registradas</option>';
        if (this.startBtn) this.startBtn.disabled = true;
        return;
      }

      demos.forEach((d) => {
        const opt = document.createElement('option');
        opt.value = d.id_demo;
        opt.textContent = `${d.nombre} (${d.descripcion || 'Secuencia pregrabada'})`;
        this.selectEl.appendChild(opt);
      });

      if (this.startBtn) this.startBtn.disabled = false;
    } catch (err) {
      console.warn('[DEMO Error]: No se pudieron consultar las DEMOs:', err);
      this.selectEl.innerHTML = '<option value="">Fallo al cargar catálogo</option>';
      if (this.startBtn) this.startBtn.disabled = true;
    }
  }

  async handleStartDemo() {
    if (this.isDemoRunning) return;
    const selectedDemoId = this.selectEl?.value;
    if (!selectedDemoId) {
      uiFeedback.showNotification('Selecciona una DEMO válida del catálogo', 'error');
      return;
    }

    try {
      if (this.startBtn) this.startBtn.disabled = true;
      uiFeedback.setActionSent(`INICIAR_DEMO_${selectedDemoId}`, 0);
      const res = await apiClient.iniciarDemo(selectedDemoId);
      uiFeedback.setHttpResult(res.status, 'DEMO iniciada en servidor');
      this.setRunningState(true, 'Secuencia DEMO iniciada');
    } catch (err) {
      uiFeedback.showNotification(err.message, 'error');
      this.setRunningState(false);
    }
  }

  async handleCancelDemo() {
    try {
      uiFeedback.setActionSent('CANCELAR_DEMO', 0);
      const res = await apiClient.cancelarDemo();
      uiFeedback.setHttpResult(res.status, 'DEMO cancelada');
      this.setRunningState(false, 'DEMO cancelada por usuario');
      uiFeedback.showNotification('Rutina DEMO cancelada con éxito', 'success');
    } catch (err) {
      uiFeedback.showNotification(err.message, 'error');
    }
  }

  /**
   * Actualiza el progreso en respuesta a eventos WebSocket reales del servidor
   */
  handleWebSocketEvent(msg) {
    if (!msg || !msg.evento) return;

    if (msg.evento === 'DEMO_INICIO') {
      this.setRunningState(true, `Iniciando DEMO: ${msg.demo || 'Rutina'}`);
    } else if (msg.evento === 'DEMO_MOVIMIENTO') {
      const step = msg.paso_actual || 1;
      const total = msg.total_movimientos || 1;
      const pct = Math.round((step / total) * 100);

      this.setRunningState(true, `Paso ${step}/${total}: ${msg.comando || 'Moviendo...'}`);
      if (this.progressBar) {
        this.progressBar.style.width = `${pct}%`;
        this.progressBar.setAttribute('aria-valuenow', pct);
      }
    } else if (msg.evento === 'DEMO_FIN' || msg.evento === 'DEMO_CANCELADA' || msg.evento === 'DEMO_ERROR') {
      const msgText = msg.evento === 'DEMO_FIN'
        ? 'DEMO completada con éxito'
        : msg.evento === 'DEMO_CANCELADA'
        ? 'DEMO cancelada'
        : `DEMO finalizada con error (${msg.motivo || ''})`;

      this.setRunningState(false, msgText);
      if (this.progressBar) this.progressBar.style.width = '100%';
    }
  }

  setRunningState(running, statusMessage = '') {
    this.isDemoRunning = running;

    if (this.startBtn) this.startBtn.disabled = running;
    if (this.cancelBtn) this.cancelBtn.disabled = !running;

    // Bloquear joystick durante DEMO para evitar comandos conflictivos
    if (this.joystick) {
      if (running) {
        this.joystick.disable();
      } else {
        this.joystick.enable();
      }
    }

    if (this.statusText && statusMessage) {
      this.statusText.textContent = statusMessage;
    }

    if (!running && this.progressBar) {
      setTimeout(() => {
        if (!this.isDemoRunning && this.progressBar) {
          this.progressBar.style.width = '0%';
        }
      }, 3000);
    }
  }
}
