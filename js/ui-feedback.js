/**
 * ui-feedback.js — Retroalimentación visual de acciones y eventos
 * Presenta solicitud, aceptación HTTP y evento WebSocket sin transformarse en monitoreo.
 * Autor: Luis Carlos Márquez Strociak · 2026
 */

export class UiFeedback {
  constructor() {
    this.actionSentEl = document.getElementById('feedback-action-sent');
    this.httpStatusEl = document.getElementById('feedback-http-status');
    this.wsEventEl = document.getElementById('feedback-ws-event');
    this.toastContainer = document.getElementById('toast-container');
  }

  /**
   * Muestra la última acción emitida desde el control
   */
  setActionSent(commandName, code) {
    if (this.actionSentEl) {
      this.actionSentEl.textContent = `${commandName} (Código ${code})`;
      this.actionSentEl.className = 'telemetry-badge text-warning';
    }
  }

  /**
   * Muestra la respuesta HTTP retornada por la API
   */
  setHttpResult(statusCode, message = '') {
    if (this.httpStatusEl) {
      this.httpStatusEl.textContent = `HTTP ${statusCode} — ${message || 'OK'}`;
      this.httpStatusEl.className = statusCode >= 200 && statusCode < 300
        ? 'telemetry-badge text-success'
        : 'telemetry-badge text-danger';
    }
  }

  /**
   * Muestra el evento WebSocket recibido en tiempo real
   */
  setWsEvent(eventData) {
    if (this.wsEventEl && eventData) {
      const evento = eventData.evento || 'EVENTO';
      const cmd = eventData.comando || '';
      const codigo = eventData.codigo !== undefined ? `[${eventData.codigo}]` : '';
      const time = eventData.timestamp ? new Date(eventData.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

      this.wsEventEl.textContent = `${evento} ${cmd} ${codigo} (${time})`;
      this.wsEventEl.className = 'telemetry-badge text-info';
    }
  }

  /**
   * Muestra un mensaje flotante accesible
   */
  showNotification(msg, type = 'info') {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} alert-dismissible fade show shadow-lg py-2 px-3 small`;
    toast.role = 'alert';
    toast.innerHTML = `
      <strong>${type === 'error' ? '⚠️ Error:' : 'ℹ️'}</strong> ${msg}
      <button type="button" class="btn-close py-2" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      try {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
      } catch (e) {}
    }, 4000);
  }
}

export const uiFeedback = new UiFeedback();
