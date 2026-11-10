import { EstadoVehiculo, MovimientoHistorial, Comando, DemoItem, DemoEstadoEjecucion } from '../types/vehicle';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // En localhost, priorizar el proxy /api para evitar problemas de CORS y certificados auto-firmados
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const saved = localStorage.getItem('IOT_API_BASE_URL');
      if (saved && !saved.includes('amazonaws.com')) {
        return saved.replace(/\/$/, '');
      }
      return '/api';
    }
    const saved = localStorage.getItem('IOT_API_BASE_URL');
    if (saved) return saved.replace(/\/$/, '');
  }
  return DEFAULT_API_BASE_URL.replace(/\/$/, '');
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('IOT_API_BASE_URL', url.replace(/\/$/, ''));
  }
}

export function getWsBaseUrl(): string {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const saved = localStorage.getItem('IOT_WS_BASE_URL');
      if (saved && !saved.includes('amazonaws.com')) {
        return saved.replace(/\/$/, '');
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}`;
    }
    const saved = localStorage.getItem('IOT_WS_BASE_URL');
    if (saved) return saved.replace(/\/$/, '');
  }

  const api = getApiBaseUrl();

  if (api.startsWith('/') || api === '') {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}`;
    }
  }

  return api.replace(/^http/, 'ws');
}

export function setWsBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('IOT_WS_BASE_URL', url.replace(/\/$/, ''));
  }
}

export async function enviarMovimiento(idVehiculo: number, codigo: number, origen: string = 'REACT_DASHBOARD') {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/vehiculos/${idVehiculo}/movimiento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo, origen }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Error en movimiento (${response.status})`);
  }

  return response.json();
}

export async function detenerVehiculo(idVehiculo: number) {
  return enviarMovimiento(idVehiculo, 9, 'REACT_EMERGENCY_STOP');
}

export async function obtenerEstadoVehiculo(idVehiculo: number): Promise<EstadoVehiculo> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/vehiculos/${idVehiculo}/estado`);
  if (!response.ok) throw new Error('No se pudo obtener el estado del vehículo');
  return response.json();
}

export async function obtenerHistorialVehiculo(idVehiculo: number): Promise<MovimientoHistorial[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/vehiculos/${idVehiculo}/historial`);
  if (!response.ok) throw new Error('No se pudo obtener el historial');
  return response.json();
}

export async function obtenerComandosVehiculo(idVehiculo: number): Promise<Comando[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/vehiculos/${idVehiculo}/comandos`);
  if (!response.ok) throw new Error('No se pudieron obtener los comandos');
  return response.json();
}

export async function obtenerDemosVehiculo(idVehiculo: number): Promise<DemoItem[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/vehiculos/${idVehiculo}/demos`);
  if (!response.ok) throw new Error('No se pudieron obtener las demos');
  return response.json();
}

export async function iniciarDemo(idVehiculo: number, idDemo: number, factorTiempo: number = 1.0) {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/vehiculos/${idVehiculo}/demos/${idDemo}/iniciar?factor_tiempo=${factorTiempo}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || 'Error al iniciar demo');
  }
  return response.json();
}

export async function cancelarDemo(idVehiculo: number) {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/vehiculos/${idVehiculo}/demos/cancelar`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || 'Error al cancelar demo');
  }
  return response.json();
}

export async function obtenerEstadoDemo(idVehiculo: number): Promise<DemoEstadoEjecucion> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/vehiculos/${idVehiculo}/demos/estado-ejecucion`);
  if (!response.ok) throw new Error('No se pudo consultar el estado de la demo');
  return response.json();
}
