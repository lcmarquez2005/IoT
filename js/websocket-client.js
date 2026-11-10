/**
 * websocket-client.js — Cliente WebSocket nativo para eventos en tiempo real
 * Refleja el estado de conexión WSS y recibe eventos de movimientos y DEMO.
 * Autor: Luis Carlos Márquez Strociak · 2026
 */

import { getActiveConfig } from './config.js';

export class WebSocketClient {
  constructor() {
    this.ws = null;
    this.status = 'disconnected'; // 'connected' | 'connecting' | 'disconnected' | 'error'
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.listeners = {
      message: [],
      statusChange: [],
    };
    this.isManuallyClosed = false;
  }

  /**
   * Inicia la conexión WebSocket
   */
  connect() {
    this.isManuallyClosed = false;
    this.clearTimers();

    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    const config = getActiveConfig();
    const wsUrl = `${config.wsBaseUrl}/ws/${config.vehicleId}`;

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        // Heartbeat cada 15 segundos para mantener activo el enlace
        this.heartbeatTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send('ping');
          }
        }, 15000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyMessage(data);
        } catch (err) {
          console.warn('[WS Parse Warning]: Mensaje no-JSON recibido:', event.data);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS Error]: Falla en conexión WebSocket:', err);
        this.setStatus('error');
      };

      this.ws.onclose = (event) => {
        this.clearHeartbeat();
        if (!this.isManuallyClosed) {
          this.setStatus('disconnected');
          // Reintento limpio de reconexión tras 4 segundos
          this.reconnectTimer = setTimeout(() => {
            this.connect();
          }, 4000);
        }
      };
    } catch (err) {
      console.error('[WS Init Error]:', err);
      this.setStatus('error');
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    }
  }

  /**
   * Cierra intencionalmente la sesión activa
   */
  disconnect() {
    this.isManuallyClosed = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.listeners.statusChange.forEach((fn) => fn(newStatus));
    }
  }

  notifyMessage(msg) {
    this.listeners.message.forEach((fn) => fn(msg));
  }

  onMessage(callback) {
    this.listeners.message.push(callback);
  }

  onStatusChange(callback) {
    this.listeners.statusChange.push(callback);
    callback(this.status); // Notifica estado inicial
  }

  clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearHeartbeat();
  }

  clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const wsClient = new WebSocketClient();
