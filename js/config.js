/**
 * config.js — Configuración centralizada de la aplicación de control IoT
 * M.C. Víctor Manuel Pinedo Fernández — Implementación de Soluciones IoT
 * Autor: Luis Carlos Márquez Strociak · 2026
 */

export const DEFAULT_CONFIG = {
  // URLs oficiales de la instancia AWS EC2
  apiBaseUrl: 'https://ec2-100-50-120-115.compute-1.amazonaws.com',
  wsBaseUrl: 'wss://ec2-100-50-120-115.compute-1.amazonaws.com',
  defaultVehicleId: 1,
  // Tiempos y umbrales de operación
  requestTimeoutMs: 7000,
  healthCheckIntervalMs: 8000,
  joystickDeadzoneRatio: 0.25, // 25% radio muerto en centro
};

// Diccionario oficial de comandos del vehículo (según catálogo de la base de datos)
export const COMMANDS = {
  AVANZAR: 1,
  RETROCEDER: 2,
  GIRAR_IZQUIERDA: 3,
  GIRAR_DERECHA: 4,
  SUBIR_BRAZO: 5,
  BAJAR_BRAZO: 6,
  ABRIR_PALA: 7,
  CERRAR_PALA: 8,
  DETENER: 9,
  ENCENDER: 10,
  TOGGLE_MUSIC: 11,
  TOGGLE_LIGHT: 12,
};

// Mapeo inverso de código a nombre
export const COMMAND_NAMES = Object.entries(COMMANDS).reduce((acc, [name, code]) => {
  acc[code] = name;
  return acc;
}, {});

/**
 * Obtiene la configuración activa (persistida en localStorage o por defecto)
 */
export function getActiveConfig() {
  const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  const savedApi = hasStorage ? localStorage.getItem('IOT_CTRL_API_URL') : null;
  const savedWs = hasStorage ? localStorage.getItem('IOT_CTRL_WS_URL') : null;
  const savedVehiculo = hasStorage ? localStorage.getItem('IOT_CTRL_VEHICULO_ID') : null;

  return {
    apiBaseUrl: savedApi && savedApi.trim() !== '' ? savedApi.replace(/\/$/, '') : DEFAULT_CONFIG.apiBaseUrl,
    wsBaseUrl: savedWs && savedWs.trim() !== '' ? savedWs.replace(/\/$/, '') : DEFAULT_CONFIG.wsBaseUrl,
    vehicleId: savedVehiculo ? parseInt(savedVehiculo, 10) : DEFAULT_CONFIG.defaultVehicleId,
    requestTimeoutMs: DEFAULT_CONFIG.requestTimeoutMs,
    healthCheckIntervalMs: DEFAULT_CONFIG.healthCheckIntervalMs,
    joystickDeadzoneRatio: DEFAULT_CONFIG.joystickDeadzoneRatio,
  };
}

/**
 * Guarda la configuración activa en localStorage
 */
export function saveActiveConfig(apiBaseUrl, wsBaseUrl, vehicleId) {
  if (apiBaseUrl) localStorage.setItem('IOT_CTRL_API_URL', apiBaseUrl.trim().replace(/\/$/, ''));
  if (wsBaseUrl) localStorage.setItem('IOT_CTRL_WS_URL', wsBaseUrl.trim().replace(/\/$/, ''));
  if (vehicleId) localStorage.setItem('IOT_CTRL_VEHICULO_ID', String(vehicleId));
}

/**
 * Restablece la configuración a los valores por defecto
 */
export function resetConfigToDefaults() {
  localStorage.removeItem('IOT_CTRL_API_URL');
  localStorage.removeItem('IOT_CTRL_WS_URL');
  localStorage.removeItem('IOT_CTRL_VEHICULO_ID');
}
