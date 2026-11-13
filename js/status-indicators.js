/**
 * status-indicators.js — Gestión de los 3 indicadores independientes de conectividad
 * 1. WebSocket WSS (En línea / Conectando o Reconectando / Desconectado)
 * 2. Servidor AWS · API de 21 servicios (Disponible / Comprobando / No disponible)
 * 3. Base de datos · Amazon RDS (Disponible / No disponible / Sin verificar)
 * Autor: Luis Carlos Márquez Strociak · 2026
 */

import { apiClient } from './api-client.js';
import { wsClient } from './websocket-client.js';
import { getActiveConfig } from './config.js';

export class StatusIndicatorsManager {
  constructor() {
    this.wsEl = document.getElementById('indicator-ws');
    this.apiEl = document.getElementById('indicator-api');
    this.rdsEl = document.getElementById('indicator-rds');

    this.healthTimer = null;
    this.init();
  }

  init() {
    // 1. Escuchar cambios de estado del WebSocket WSS nativo
    wsClient.onStatusChange((status) => this.updateWsIndicator(status));

    // 2. Comprobación periódica de salud del Servidor AWS (API REST)
    this.checkApiHealth();
    const config = getActiveConfig();
    this.healthTimer = setInterval(() => this.checkApiHealth(), config.healthCheckIntervalMs);

    // 3. Estado de Amazon RDS:
    // Conforme a la regla del profesor: Dado que el backend no expone un endpoint seguro
    // de diagnóstico directo de base de datos (/health o /ready exclusivo), el estado
    // OBLIGATORIO por seguridad y rigor técnico es «Sin verificar».
    this.setRdsIndicator('unverified', 'Sin verificar');
  }

  /**
   * Actualiza el indicador (1) WebSocket WSS
   */
  updateWsIndicator(status) {
    if (!this.wsEl) return;

    this.wsEl.className = 'indicator-badge';
    const dot = '<span class="indicator-dot"></span>';

    switch (status) {
      case 'connected':
        this.wsEl.classList.add('indicator-online');
        this.wsEl.innerHTML = `${dot} <span>WebSocket WSS: <strong>En línea</strong></span>`;
        this.wsEl.title = 'Sesión WSS activa entre navegador y servidor AWS (no garantiza vehículo físico)';
        break;
      case 'connecting':
        this.wsEl.classList.add('indicator-connecting');
        this.wsEl.innerHTML = `${dot} <span>WebSocket WSS: <strong>Conectando...</strong></span>`;
        this.wsEl.title = 'Estableciendo enlace WebSocket seguro...';
        break;
      case 'error':
      case 'disconnected':
      default:
        this.wsEl.classList.add('indicator-offline');
        this.wsEl.innerHTML = `${dot} <span>WebSocket WSS: <strong>Desconectado</strong></span>`;
        this.wsEl.title = 'Sesión WebSocket fuera de línea';
        break;
    }
  }

  /**
   * Comprueba y actualiza el indicador (2) Servidor AWS · API de 21 servicios
   */
  async checkApiHealth() {
    if (!this.apiEl) return;

    // Estado transitorio: Comprobando
    const dot = '<span class="indicator-dot"></span>';
    this.apiEl.className = 'indicator-badge indicator-connecting';
    this.apiEl.innerHTML = `${dot} <span>API AWS: <strong>Comprobando...</strong></span>`;

    try {
      const isHealthy = await apiClient.verificarSaludApi();
      this.apiEl.className = 'indicator-badge';
      if (isHealthy) {
        this.apiEl.classList.add('indicator-online');
        this.apiEl.innerHTML = `${dot} <span>Servidor AWS (21 APIs): <strong>Disponible</strong></span>`;
        this.apiEl.title = 'Operación de salud de AWS EC2 respondiendo HTTP 200';
      } else {
        this.apiEl.classList.add('indicator-offline');
        this.apiEl.innerHTML = `${dot} <span>Servidor AWS (21 APIs): <strong>No disponible</strong></span>`;
      }
    } catch (err) {
      this.apiEl.className = 'indicator-badge indicator-offline';
      this.apiEl.innerHTML = `${dot} <span>Servidor AWS (21 APIs): <strong>No disponible</strong></span>`;
      this.apiEl.title = `Error de conexión: ${err.message}`;
    }
  }

  /**
   * Actualiza el indicador (3) Base de datos · Amazon RDS
   */
  setRdsIndicator(state, text) {
    if (!this.rdsEl) return;
    this.rdsEl.className = `indicator-badge indicator-${state}`;
    const dot = '<span class="indicator-dot"></span>';
    this.rdsEl.innerHTML = `${dot} <span>Amazon RDS: <strong>${text}</strong></span>`;
    this.rdsEl.title = 'El backend no expone un diagnóstico aislado de RDS; se reporta como Sin verificar para evitar suposiciones no comprobadas.';
  }

  destroy() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }
}
