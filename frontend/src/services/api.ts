import { Vehiculo, EstadoVehiculo, MovimientoHistorial, Comando, DemoItem, DemoEstadoEjecucion } from '../types/vehicle';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 7000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado (${timeoutMs / 1000}s)`);
    }
    throw err;
  }
}

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

export function isGitHubPages(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('github.io');
}

export function isVercel(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('vercel.app');
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('IOT_API_BASE_URL');
    // Si el usuario configuró una URL manual explícita (que no sea amazonaws.com, ni bridge viejo, ni vacía)
    if (saved && saved.trim() !== '' && !saved.includes('amazonaws.com') && !saved.includes('iot-bridge-vercel') && saved !== '/api') {
      return saved.replace(/\/$/, '');
    }

    // 1. Detección automática para GitHub Pages: conectar a través del puente Vercel real
    if (isGitHubPages()) {
      const bridgeUrl = (import.meta.env.VITE_VERCEL_BRIDGE_URL || 'https://iot-retroexcavadora-ws.vercel.app').replace(/\/$/, '');
      return bridgeUrl.endsWith('/api') ? bridgeUrl : `${bridgeUrl}/api`;
    }

    // 2. Si está en Vercel, conectarse a su propio proxy local (/api) que despacha a AWS EC2
    if (isVercel()) {
      return '/api';
    }

    // 3. En entorno de desarrollo local (localhost / LAN), usar el proxy de Vite (/api)
    if (isLocalEnvironment()) {
      return '/api';
    }
  }

  // Fallback estándar
  return '/api';
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (url === '/api' || url.trim() === '') {
      localStorage.removeItem('IOT_API_BASE_URL');
    } else {
      localStorage.setItem('IOT_API_BASE_URL', url.replace(/\/$/, ''));
    }
  }
}

export function getWsBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('IOT_WS_BASE_URL');
    if (saved && saved.trim() !== '' && !saved.includes('100-50-120-115')) {
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
    return 'wss://54.82.137.170';
  }
  return 'ws://localhost:3000';
}

export function setWsBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('IOT_WS_BASE_URL', url.replace(/\/$/, ''));
  }
}

export async function enviarMovimiento(
  idVehiculo: number,
  codigo: number,
  origen: string = 'REACT_DASHBOARD',
  signal?: AbortSignal,
  guestToken?: string | null
) {
  const baseUrl = getApiBaseUrl();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (typeof window !== 'undefined') {
    const authToken = localStorage.getItem('IOT_AUTH_TOKEN');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
  }

  const tokenToUse = guestToken || (typeof window !== 'undefined' ? localStorage.getItem('IOT_GUEST_TOKEN') : null);
  const url = tokenToUse
    ? `${baseUrl}/vehiculos/${idVehiculo}/movimiento?guest_token=${encodeURIComponent(tokenToUse)}`
    : `${baseUrl}/vehiculos/${idVehiculo}/movimiento`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ codigo, origen }),
    signal,
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

export async function obtenerVehiculo(idVehiculo: number): Promise<Vehiculo> {
  const baseUrl = getApiBaseUrl();
  const response = await fetchWithTimeout(`${baseUrl}/vehiculos/${idVehiculo}`, {}, 6000);
  if (!response.ok) throw new Error(`Fallo al consultar vehículo (${response.status})`);
  return response.json();
}

export async function verificarSaludApi(): Promise<boolean> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/status`, {}, 4000);
    return response.ok;
  } catch {
    return false;
  }
}

export async function obtenerEstadoVehiculo(idVehiculo: number): Promise<EstadoVehiculo> {
  const baseUrl = getApiBaseUrl();
  const response = await fetchWithTimeout(`${baseUrl}/vehiculos/${idVehiculo}/estado`, {}, 6000);
  if (!response.ok) throw new Error('No se pudo obtener el estado del vehículo');
  return response.json();
}

export async function obtenerHistorialVehiculo(idVehiculo: number): Promise<MovimientoHistorial[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetchWithTimeout(`${baseUrl}/vehiculos/${idVehiculo}/historial`, {}, 6000);
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


// =============================================================================
// SERVICIOS API PRÁCTICA 4.3: PLATAFORMA COMERCIAL MULTIUSUARIO IoT
// =============================================================================

import {
  UserProfile,
  UserSession,
  ModeloComercial,
  UnidadFisica,
  ClienteItem,
  SesionInvitado,
  AuditoriaItem,
  DemoDetalleItem,
  DemoPasoEditor,
} from '../types/vehicle';

export async function loginUser(email: string, password: string): Promise<UserSession> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Credenciales inválidas');
  }
  const data = await response.json();
  return {
    token: data.access_token,
    user: data.user,
  };
}

export async function getMe(token: string): Promise<UserProfile> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Token expirado');
  return response.json();
}

export async function obtenerModelos(): Promise<ModeloComercial[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/modelos`);
  if (!response.ok) throw new Error('Error al consultar catálogo de modelos');
  return response.json();
}

export async function crearModelo(token: string, data: Partial<ModeloComercial>): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/modelos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al crear modelo');
  }
  return response.json();
}

export async function obtenerUnidades(token: string): Promise<UnidadFisica[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/unidades`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al consultar inventario de unidades');
  return response.json();
}

export async function crearUnidad(token: string, data: any): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/unidades`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al dar de alta la unidad');
  }
  return response.json();
}

export async function asignarUnidad(
  token: string,
  idVehiculo: number,
  idUsuarioPropietario: number | null,
  estadoComercial: string = 'VENDIDO'
): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/unidades/${idVehiculo}/asignar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id_usuario_propietario: idUsuarioPropietario,
      estado_comercial: estadoComercial,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al asignar unidad');
  }
  return response.json();
}

export async function obtenerClientes(token: string): Promise<ClienteItem[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/usuarios/clientes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al listar clientes');
  return response.json();
}

export async function crearCliente(token: string, data: any): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/usuarios/clientes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al registrar cliente');
  }
  return response.json();
}

export async function obtenerMisVehiculos(token: string): Promise<UnidadFisica[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/mis-vehiculos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al consultar mis vehículos');
  return response.json();
}

export async function obtenerUnidadExhibicion(): Promise<{
  unidad: UnidadFisica;
  disponible: boolean;
  sesion_activa?: SesionInvitado | null;
}> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/invitado/unidad-exhibicion`);
  if (!response.ok) throw new Error('Error al consultar unidad de exhibición');
  return response.json();
}

export async function solicitarPruebaInvitado(
  idVehiculo: number,
  nombreInvitado: string,
  duracionMinutos: number = 3
): Promise<SesionInvitado> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/invitado/solicitar-prueba`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_vehiculo: idVehiculo,
      nombre_invitado: nombreInvitado,
      duracion_minutos: duracionMinutos,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'No se pudo iniciar el turno de prueba');
  }
  return response.json();
}

export async function liberarPruebaInvitado(tokenSesion: string): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/invitado/liberar-prueba`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_sesion: tokenSesion }),
  });
  return response.json();
}

export async function verificarSesionInvitado(tokenSesion: string): Promise<SesionInvitado> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/invitado/sesion/${tokenSesion}`);
  if (!response.ok) throw new Error('Sesión finalizada o no encontrada');
  return response.json();
}

export async function obtenerAuditoria(token: string, limite: number = 50): Promise<AuditoriaItem[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/auditoria?limite=${limite}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al consultar auditoría');
  return response.json();
}

export async function obtenerDemosEditor(token: string, idVehiculo: number): Promise<DemoDetalleItem[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/demos/editor/vehiculo/${idVehiculo}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al consultar rutinas en el editor');
  return response.json();
}

export async function crearDemoEditor(
  token: string,
  idVehiculo: number,
  nombre: string,
  descripcion: string,
  tipoDemo: string,
  pasos: DemoPasoEditor[]
): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/demos/editor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id_vehiculo: idVehiculo,
      nombre,
      descripcion,
      tipo_demo: tipoDemo,
      pasos,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al guardar la rutina');
  }
  return response.json();
}

export async function eliminarDemoEditor(token: string, idDemo: number): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/demos/editor/${idDemo}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al eliminar demo');
  }
  return response.json();
}

export async function verificarSaludRds(): Promise<boolean> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetchWithTimeout(`${baseUrl}/vehiculos/1/estado`, {}, 3000);
    return res.ok;
  } catch {
    return false;
  }
}
