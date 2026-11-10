export interface Vehiculo {
  id_vehiculo: number;
  nombre: string;
  modelo: string;
  descripcion: string;
  microcontrolador: string;
  activo: boolean;
}

export interface EstadoVehiculo {
  id_vehiculo: number;
  nombre: string;
  conectado: boolean;
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
  descripcion: string;
  activo: boolean;
}

export interface MovimientoHistorial {
  id_historial: number;
  id_vehiculo: number;
  id_comando: number;
  comando: string;
  codigo: number;
  origen: string;
  fecha_ejecucion: string;
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
