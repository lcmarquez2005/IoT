import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EstadoVehiculo, MovimientoHistorial, WSEventMessage, formatCommandName } from '../types/vehicle';
import { obtenerEstadoVehiculo, obtenerHistorialVehiculo } from '../services/api';
import { WSStatus } from '../hooks/useVehicleWebSocket';
import {
  Activity,
  History,
  Clock,
  RefreshCw,
  AlertCircle,
  Radio,
  Zap,
  CheckCircle2,
  Calendar,
  Layers,
  Info,
} from 'lucide-react';

interface MonitoringViewProps {
  vehiculoId: number;
  lastWsMessage: WSEventMessage | null;
  wsStatus: WSStatus;
}

interface FormattedMovementItem {
  id: string | number;
  codigo: number;
  comando: string;
  origen: string;
  fecha: string;
  hora: string;
  rawTimestamp: number;
  isRealtime?: boolean;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({
  vehiculoId,
  lastWsMessage,
  wsStatus,
}) => {
  const [estado, setEstado] = useState<EstadoVehiculo | null>(null);
  const [historial, setHistorial] = useState<FormattedMovementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [timeAgoText, setTimeAgoText] = useState<string>('Recién cargado');

  // Guardar última marca de tiempo recibida para evitar condiciones de carrera
  const lastStateTimestampRef = useRef<number>(0);
  const prevWsStatusRef = useRef<WSStatus>(wsStatus);

  // Formateador robusto de timestamp
  const parseDateAndFormat = useCallback((dateStr?: string | null): { fecha: string; hora: string; timestamp: number } => {
    if (!dateStr) {
      const now = new Date();
      return {
        fecha: now.toLocaleDateString(),
        hora: now.toLocaleTimeString(),
        timestamp: now.getTime(),
      };
    }

    try {
      // Manejar formato ISO o SQL ("2026-11-12 18:30:00" o con T)
      const sanitized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
      const d = new Date(sanitized);
      if (isNaN(d.getTime())) {
        return { fecha: 'Fecha no disp.', hora: dateStr, timestamp: Date.now() };
      }
      return {
        fecha: d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp: d.getTime(),
      };
    } catch {
      return { fecha: 'Fecha no disp.', hora: dateStr, timestamp: Date.now() };
    }
  }, []);

  // Carga inicial y reconciliación REST desde Amazon RDS
  const fetchRestData = useCallback(async (isManual: boolean = false) => {
    if (isManual) setRefreshing(true);
    setError(null);

    try {
      const [estadoRes, historialRes] = await Promise.all([
        obtenerEstadoVehiculo(vehiculoId).catch((err) => {
          console.warn('[Monitoring] Error obteniendo estado:', err);
          return null;
        }),
        obtenerHistorialVehiculo(vehiculoId).catch((err) => {
          console.warn('[Monitoring] Error obteniendo historial:', err);
          return [] as MovimientoHistorial[];
        }),
      ]);

      // 1. Reconciliar Estado (respetando timestamps para evitar condiciones de carrera)
      if (estadoRes) {
        const { timestamp } = parseDateAndFormat(estadoRes.fecha_actualizacion);
        if (timestamp >= lastStateTimestampRef.current) {
          lastStateTimestampRef.current = timestamp;
          setEstado(estadoRes);
        }
      }

      // 2. Formatear y cargar máximo 10 registros del historial de RDS
      if (Array.isArray(historialRes)) {
        const parsedItems: FormattedMovementItem[] = historialRes.slice(0, 10).map((h) => {
          const rawDate = h.fecha_hora || h.fecha_ejecucion;
          const { fecha, hora, timestamp } = parseDateAndFormat(rawDate);
          return {
            id: h.id_historial || `${timestamp}-${h.codigo}`,
            codigo: h.codigo ?? 0,
            comando: formatCommandName(h.comando, h.codigo),
            origen: h.origen || 'RDS',
            fecha,
            hora,
            rawTimestamp: timestamp,
            isRealtime: false,
          };
        });

        setHistorial(parsedItems);
      }

      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error('[Monitoring] Error general de sincronización:', err);
      setError(err.message || 'Error al conectar con la API de Amazon RDS');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vehiculoId, parseDateAndFormat]);

  // Carga inicial al montar o al cambiar vehiculoId
  useEffect(() => {
    setLoading(true);
    fetchRestData(false);
  }, [fetchRestData]);

  // Reconexión automática: Al pasar de desconectado a conectado, resincronizar
  useEffect(() => {
    if (prevWsStatusRef.current !== 'connected' && wsStatus === 'connected') {
      console.log('[Monitoring] WSS reconectado. Resincronizando con RDS...');
      fetchRestData(false);
    }
    prevWsStatusRef.current = wsStatus;
  }, [wsStatus, fetchRestData]);

  // Temporizador para texto relativo "hace X segundos"
  useEffect(() => {
    const timer = setInterval(() => {
      const diffSec = Math.floor((Date.now() - lastSyncTime.getTime()) / 1000);
      if (diffSec < 5) {
        setTimeAgoText('Hace un momento');
      } else if (diffSec < 60) {
        setTimeAgoText(`Hace ${diffSec}s`);
      } else {
        const diffMin = Math.floor(diffSec / 60);
        setTimeAgoText(`Hace ${diffMin}m`);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [lastSyncTime]);

  // PROCESAMIENTO EN TIEMPO REAL VÍA WEBSOCKET
  useEffect(() => {
    if (!lastWsMessage) return;

    // A. Filtrar por vehículo actual
    if (lastWsMessage.id_vehiculo !== vehiculoId) return;

    const msgTimestamp = parseDateAndFormat(lastWsMessage.timestamp).timestamp;

    // B. Procesamiento de Estado y Panel Principal
    if (
      lastWsMessage.evento === 'MOVIMIENTO_INDIVIDUAL' ||
      lastWsMessage.evento === 'ESTADO_INICIAL' ||
      lastWsMessage.evento === 'DEMO_MOVIMIENTO'
    ) {
      if (msgTimestamp >= lastStateTimestampRef.current) {
        lastStateTimestampRef.current = msgTimestamp;
        setEstado({
          id_vehiculo: lastWsMessage.id_vehiculo,
          nombre: lastWsMessage.vehiculo || estado?.nombre || `Vehículo ${vehiculoId}`,
          vehiculo: lastWsMessage.vehiculo || estado?.vehiculo || `Vehículo ${vehiculoId}`,
          id_comando: lastWsMessage.id_comando ?? null,
          comando: lastWsMessage.comando || null,
          codigo: lastWsMessage.codigo ?? null,
          conectado: lastWsMessage.conectado ?? (estado ? estado.conectado : true),
          fecha_actualizacion: lastWsMessage.timestamp || new Date().toISOString(),
        });
      }
    }

    // C. Procesamiento de la Tabla Dinámica (Top 10 Movimientos Individuales)
    // REGLA ESTRICTA DE NEGOCIO:
    // Solo los eventos 'MOVIMIENTO_INDIVIDUAL' se persisten en RDS.
    // Los eventos DEMO ('DEMO_MOVIMIENTO', 'DEMO_INICIO', etc.) NO deben insertarse en el historial individual.
    if (lastWsMessage.evento === 'MOVIMIENTO_INDIVIDUAL') {
      const { fecha, hora, timestamp } = parseDateAndFormat(lastWsMessage.timestamp);
      const newEntry: FormattedMovementItem = {
        id: `rt-${timestamp}-${lastWsMessage.codigo}`,
        codigo: lastWsMessage.codigo ?? 0,
        comando: formatCommandName(lastWsMessage.comando, lastWsMessage.codigo),
        origen: lastWsMessage.origen || 'WSS_REALTIME',
        fecha,
        hora,
        rawTimestamp: timestamp,
        isRealtime: true,
      };

      setHistorial((prev) => {
        // Deduplicar: Verificar si ya existe un elemento idéntico reciente
        const alreadyExists = prev.some(
          (item) =>
            Math.abs(item.rawTimestamp - timestamp) < 1000 &&
            item.codigo === newEntry.codigo &&
            item.origen === newEntry.origen
        );
        if (alreadyExists) return prev;

        // Añadir al inicio y recortar estrictamente a 10 elementos (fila 11 eliminada del DOM)
        return [newEntry, ...prev].slice(0, 10);
      });
      setLastSyncTime(new Date());
    }
  }, [lastWsMessage, vehiculoId, parseDateAndFormat, estado]);

  // Ayudante de estilo visual para comandos
  const getCommandBadgeStyle = (codigo?: number | null, comandoName?: string | null) => {
    if (codigo === 9 || comandoName === 'DETENER') {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
    if (codigo === 10 || comandoName === 'ENCENDER') {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
    if (codigo && codigo >= 1 && codigo <= 4) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    if (codigo && codigo >= 5 && codigo <= 8) {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
    return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  };

  const parsedEstadoTime = parseDateAndFormat(estado?.fecha_actualizacion);

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-4 space-y-4 animate-in fade-in duration-200">
      {/* Barra de Encabezado de Monitoreo */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Panel de Monitoreo IoT en Tiempo Real
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                Vehículo #{vehiculoId}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Telemetría WSS bidireccional y persistencia sincronizada con Amazon RDS MySQL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 hidden sm:inline flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {timeAgoText}
          </span>
          <button
            onClick={() => fetchRestData(true)}
            disabled={refreshing || loading}
            title="Sincronizar manualmente con Amazon RDS"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{refreshing ? 'Sincronizando...' : 'Actualizar RDS'}</span>
          </button>
        </div>
      </div>

      {/* Alerta de Error si ocurre */}
      {error && (
        <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PANEL PRINCIPAL: TARJETA HERO DE ÚLTIMO ESTADO REPORTADO */}
      <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        {/* Glow de fondo decorativo */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Último Movimiento / Estado Reportado
            </span>
          </div>
          <div className="flex items-center gap-2">
            {wsStatus === 'connected' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Tiempo Real Activo (WSS)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/30">
                <Clock className="w-3 h-3" />
                Modo Offline (Snapshot REST)
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
            <span className="text-xs font-mono">Consultando estado actual del vehículo en AWS...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Columna 1: Acción / Comando Destacado */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 font-mono mb-1">Última Acción Confirmada:</span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-lg sm:text-xl font-extrabold tracking-tight px-2.5 py-1 rounded-lg border ${getCommandBadgeStyle(
                    estado?.codigo,
                    estado?.comando
                  )}`}
                >
                  {formatCommandName(estado?.comando, estado?.codigo)}
                </span>
                {estado?.codigo !== null && estado?.codigo !== undefined && (
                  <span className="text-xs font-mono text-slate-500">
                    Cód. {estado.codigo}
                  </span>
                )}
              </div>
            </div>

            {/* Columna 2: Fecha y Hora Verificable */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 font-mono mb-1">Marca de Tiempo Oficial:</span>
              <div className="flex items-center gap-2 text-white font-mono text-sm sm:text-base font-bold">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>{parsedEstadoTime.fecha}</span>
                <span className="text-slate-500">|</span>
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{parsedEstadoTime.hora}</span>
              </div>
            </div>

            {/* Columna 3: Estado de Conexión del Dispositivo */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 font-mono mb-1">Enlace con Servidor:</span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                    estado?.conectado
                      ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  {estado?.conectado ? 'Servidor Conectado' : 'Sin Conexión Reciente'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nota técnica de negocio (Requerimiento 3.B) */}
        <div className="mt-4 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Diferenciación Técnica:</strong> Este panel reporta el último comando registrado y confirmado en la base de datos de AWS RDS. La ejecución motriz en el mundo físico depende de la recepción, alimentación y cinemática del microcontrolador ESP32.
          </span>
        </div>
      </div>

      {/* TABLA DINÁMICA: LOS 10 ÚLTIMOS MOVIMIENTOS INDIVIDUALES */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                Historial de Movimientos Individuales
                <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {historial.length} / 10 persistidos en RDS
                </span>
              </h3>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
            Orden cronológico descendente • Actualización dinámica
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
            <span className="text-xs font-mono">Cargando los 10 últimos movimientos de Amazon RDS...</span>
          </div>
        ) : historial.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            No hay movimientos registrados en el historial de este vehículo.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-center w-12">#</th>
                  <th scope="col" className="px-3 py-2.5">Movimiento</th>
                  <th scope="col" className="px-3 py-2.5 text-center">Código</th>
                  <th scope="col" className="px-3 py-2.5">Fecha</th>
                  <th scope="col" className="px-3 py-2.5">Hora</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {historial.map((item, index) => {
                  const isFirst = index === 0;
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-slate-850/60 ${
                        item.isRealtime
                          ? 'bg-amber-500/5'
                          : isFirst
                          ? 'bg-slate-900/30'
                          : ''
                      }`}
                    >
                      {/* Numeración visual estricta del 1 al 10 */}
                      <td className="px-3 py-2 text-center font-bold text-slate-400">
                        {isFirst ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-extrabold shadow-sm">
                            1
                          </span>
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </td>

                      {/* Movimiento / Nombre del Comando */}
                      <td className="px-3 py-2 font-bold text-white flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getCommandBadgeStyle(
                            item.codigo,
                            item.comando
                          )}`}
                        >
                          {item.comando}
                        </span>
                        {item.isRealtime && (
                          <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-sans font-bold">
                            En vivo
                          </span>
                        )}
                      </td>

                      {/* Código numérico */}
                      <td className="px-3 py-2 text-center text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                          {item.codigo}
                        </span>
                      </td>

                      {/* Fecha */}
                      <td className="px-3 py-2 text-slate-300">
                        {item.fecha}
                      </td>

                      {/* Hora */}
                      <td className="px-3 py-2 text-slate-300 font-bold">
                        {item.hora}
                      </td>

                      {/* Origen */}
                      <td className="px-3 py-2 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          {item.origen}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>
            Persistencia garantizada mediante Stored Procedure <code className="text-amber-400/90">sp_obtener_historial</code>
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Límite de 10 registros cumplido
          </span>
        </div>
      </div>
    </div>
  );
};
