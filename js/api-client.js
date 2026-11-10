/**
 * api-client.js — Cliente REST modular con Fetch API y async/await
 * Consume los endpoints documentados en Swagger de la instancia AWS EC2.
 * Autor: Luis Carlos Márquez Strociak · 2026
 */

import { getActiveConfig } from './config.js';

/**
 * Petición fetch envuelta con timeout y manejo robusto de errores
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado (${timeoutMs / 1000}s)`);
    }
    throw err;
  }
}

export class ApiClient {
  constructor() {
    this.refreshConfig();
  }

  refreshConfig() {
    this.config = getActiveConfig();
    this.baseUrl = this.config.apiBaseUrl;
    this.vehicleId = this.config.vehicleId;
  }

  /**
   * 1. Consulta información general del vehículo
   * GET /vehiculos/{id_vehiculo}
   */
  async obtenerVehiculo() {
    this.refreshConfig();
    const url = `${this.baseUrl}/vehiculos/${this.vehicleId}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Fallo al consultar vehículo (${res.status})`);
    return res.json();
  }

  /**
   * 2. Consulta el catálogo de comandos válidos del vehículo
   * GET /vehiculos/{id_vehiculo}/comandos
   */
  async obtenerComandos() {
    this.refreshConfig();
    const url = `${this.baseUrl}/vehiculos/${this.vehicleId}/comandos`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Fallo al obtener comandos (${res.status})`);
    return res.json();
  }

  /**
   * 3. Consulta el catálogo de rutinas DEMO disponibles
   * GET /vehiculos/{id_vehiculo}/demos
   */
  async obtenerDemos() {
    this.refreshConfig();
    const url = `${this.baseUrl}/vehiculos/${this.vehicleId}/demos`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Fallo al obtener DEMOs (${res.status})`);
    return res.json();
  }

  /**
   * 4. Ejecuta un movimiento individual
   * POST /vehiculos/{id_vehiculo}/movimiento
   */
  async enviarMovimiento(codigo, origen = 'CONTROL_WEB') {
    this.refreshConfig();
    const url = `${this.baseUrl}/vehiculos/${this.vehicleId}/movimiento`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: parseInt(codigo, 10), origen }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Error al ejecutar movimiento (${res.status})`);
    }
    return { status: res.status, data };
  }

  /**
   * 5. Inicia una rutina DEMO
   * POST /vehiculos/{id_vehiculo}/demos/{id_demo}/iniciar
   */
  async iniciarDemo(idDemo, factorTiempo = 1.0) {
    this.refreshConfig();
    const url = `${this.baseUrl}/vehiculos/${this.vehicleId}/demos/${idDemo}/iniciar?factor_tiempo=${factorTiempo}`;
    const res = await fetchWithTimeout(url, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Error al iniciar DEMO (${res.status})`);
    }
    return { status: res.status, data };
  }

  /**
   * 6. Cancela una rutina DEMO en ejecución
   * POST /vehiculos/{id_vehiculo}/demos/cancelar
   */
  async cancelarDemo() {
    this.refreshConfig();
    const url = `${this.baseUrl}/vehiculos/${this.vehicleId}/demos/cancelar`;
    const res = await fetchWithTimeout(url, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Error al cancelar DEMO (${res.status})`);
    }
    return { status: res.status, data };
  }

  /**
   * 7. Consulta el estado de ejecución de la DEMO
   * GET /vehiculos/{id_vehiculo}/demos/estado-ejecucion
   */
  async obtenerEstadoDemo() {
    this.refreshConfig();
    const url = `${this.baseUrl}/vehiculos/${this.vehicleId}/demos/estado-ejecucion`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Fallo al consultar estado DEMO (${res.status})`);
    return res.json();
  }

  /**
   * 8. Verificación periódica de salud de la API (GET /status o GET /estado)
   * Valida la disponibilidad del servidor AWS EC2
   */
  async verificarSaludApi() {
    this.refreshConfig();
    const url = `${this.baseUrl}/status`;
    const res = await fetchWithTimeout(url, {}, 4000);
    return res.ok;
  }
}

export const apiClient = new ApiClient();
