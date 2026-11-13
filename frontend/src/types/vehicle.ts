export interface Vehiculo {
  id_vehiculo: number;
  nombre: string;
  modelo?: string | null;
  descripcion?: string | null;
  microcontrolador?: string | null;
  activo: boolean | number;
}

export interface EstadoVehiculo {
  id_vehiculo: number;
  vehiculo?: string;
  nombre?: string;
  conectado: boolean | number;
  id_comando: number | null;
  comando: string | null;
  codigo: number | null;
  fecha_actualizacion: string;
}

export interface Comando {
  id_comando: number;
  id_vehiculo: number;
  nombre: string;
  codigo: number;
  descripcion?: string | null;
  activo: boolean | number;
}

export interface MovimientoHistorial {
  id_historial: number;
  id_vehiculo: number;
  id_comando?: number | null;
  comando: string | null;
  codigo: number | null;
  origen: string;
  fecha_hora?: string | null;
  fecha_ejecucion?: string | null;
}

export interface DemoItem {
  id_demo: number;
  id_vehiculo: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface DemoEstadoEjecucion {
  en_ejecucion: boolean;
  detalle?: {
    id_vehiculo: number;
    id_demo: number;
    demo: string;
    paso_actual: number;
    total_movimientos: number;
  } | null;
}

export interface WSEventMessage {
  evento: 'ESTADO_INICIAL' | 'MOVIMIENTO_INDIVIDUAL' | 'DEMO_INICIO' | 'DEMO_MOVIMIENTO' | 'DEMO_FIN' | 'DEMO_CANCELADA' | 'DEMO_ERROR' | string;
  id_vehiculo: number;
  vehiculo?: string;
  id_comando?: number;
  comando?: string;
  codigo?: number;
  origen?: string;
  conectado?: boolean;
  id_demo?: number;
  demo?: string;
  orden?: number;
  paso_actual?: number;
  total_movimientos?: number;
  movimientos_completados?: number;
  duracion_ms?: number;
  pausa_ms?: number;
  motivo?: string;
  error?: string;
  fecha_actualizacion?: string;
  timestamp: string;
}

/**
 * Mapeo visual amigable para comandos del vehículo.
 * En la BD y firmware físico, los códigos 7 y 8 están catalogados como
 * ABRIR_PALA y CERRAR_PALA, pero corresponden físicamente a la rotación
 * de la cabina/torreta: ROTAR DERECHA (7) y ROTAR IZQUIERDA (8).
 */
export function formatCommandName(comando?: string | null, codigo?: number | null): string {
  if (codigo === 7 || comando === 'ABRIR_PALA') {
    return 'ROTAR DERECHA';
  }
  if (codigo === 8 || comando === 'CERRAR_PALA') {
    return 'ROTAR IZQUIERDA';
  }
  return comando || (codigo !== null && codigo !== undefined ? `Comando #${codigo}` : 'SIN MOVIMIENTOS');
}
