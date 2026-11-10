import { EstadoVehiculo, MovimientoHistorial, Comando, DemoItem, DemoEstadoEjecucion } from '../types/vehicle';

export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.startsWith('192.168.') ||
    h.startsWith('10.') ||
    h.startsWith('172.') ||
    h.endsWith('.local') ||
    window.location.port === '3000' ||
    window.location.port === '5173'
  );
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('IOT_API_BASE_URL');
    // Si el usuario configuró una URL manual explícita (que no sea amazonaws.com ni vacía)
    if (saved && saved.trim() !== '' && !saved.includes('amazonaws.com') && saved !== '/api') {
      return saved.replace(/\/$/, '');
    }
  }

  // SIEMPRE usar /api por defecto (en local con Vite proxy y en Vercel con proxy Serverless/Rewrites)
  return '/api';
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('IOT_API_BASE_URL', url.replace(/\/$/, ''));
  }
}

export function getWsBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('IOT_WS_BASE_URL');
    if (saved && saved.trim() !== '') {
      return saved.replace(/\/$/, '');
    }

    // En localhost o red local (IP LAN), usamos el proxy de WebSocket de Vite
    if (isLocalEnvironment()) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}`;
    }

    // En Vercel / producción, el navegador se conecta al WebSocket seguro de AWS EC2
    const envWs = import.meta.env.VITE_WS_BASE_URL;
    if (envWs && envWs.trim() !== '') return envWs.replace(/\/$/, '');
    return 'wss://ec2-100-50-120-115.compute-1.amazonaws.com';
  }
  return 'ws://localhost:3000';
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
