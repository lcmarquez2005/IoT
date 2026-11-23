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


// =============================================================================
// TIPOS PRÁCTICA 4.3: PLATAFORMA COMERCIAL MULTIUSUARIO IoT
// =============================================================================

export type UserRole = 'ADMINISTRADOR' | 'USUARIO' | 'INVITADO';

export interface UserProfile {
  id_usuario: number;
  nombre: string;
  email: string;
  id_rol: number;
  rol: UserRole;
  telefono?: string | null;
  empresa?: string | null;
  activo: boolean | number;
}

export interface UserSession {
  token: string;
  user: UserProfile;
}

export interface ModeloComercial {
  id_modelo: number;
  nombre: string;
  categoria: string;
  descripcion?: string | null;
  especificaciones?: any;
  foto_url?: string | null;
  activo: boolean | number;
  fecha_registro?: string;
}

export interface UnidadFisica {
  id_vehiculo: number;
  nombre: string;
  id_modelo?: number | null;
  modelo_nombre?: string | null;
  categoria_modelo?: string | null;
  id_usuario_propietario?: number | null;
  propietario_nombre?: string | null;
  propietario_email?: string | null;
  estado_comercial: 'DISPONIBLE' | 'VENDIDO' | 'EXHIBICION' | 'MANTENIMIENTO' | string;
  numero_serie?: string | null;
  microcontrolador?: string | null;
  descripcion?: string | null;
  activo: boolean | number;
  conectado: boolean | number;
  fecha_registro?: string;
}

export interface ClienteItem {
  id_usuario: number;
  nombre: string;
  email: string;
  telefono?: string | null;
  empresa?: string | null;
  activo: boolean | number;
  total_vehiculos?: number;
  fecha_registro?: string;
}

export interface SesionInvitado {
  id_sesion: number;
  id_vehiculo: number;
  vehiculo_nombre?: string | null;
  token_sesion: string;
  nombre_invitado: string;
  inicia_en: string;
  expira_en: string;
  activa: boolean | number;
  segundos_restantes?: number;
}

export interface AuditoriaItem {
  id_auditoria: number;
  id_usuario?: number | null;
  usuario_nombre?: string | null;
  accion: string;
  entidad: string;
  id_entidad?: number | null;
  detalle?: any;
  ip?: string | null;
  fecha_hora: string;
}

export interface DemoPasoEditor {
  id_comando: number;
  duracion_ms: number;
  pausa_ms: number;
}

export interface DemoDetalleItem {
  id_demo: number;
  id_vehiculo: number;
  id_usuario?: number | null;
  tipo_demo: 'FABRICA' | 'PRIVADA' | string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean | number;
  movimientos: {
    id_demo_movimiento: number;
    orden: number;
    id_comando: number;
    comando?: string;
    codigo?: number;
    duracion_ms: number;
    pausa_ms: number;
  }[];
}
