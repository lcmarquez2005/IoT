import React, { useState, useEffect } from 'react';
import { WSEventMessage, MovimientoHistorial, formatCommandName } from '../types/vehicle';
import { obtenerHistorialVehiculo } from '../services/api';
import { Terminal, History, Trash2, RefreshCw } from 'lucide-react';

interface TelemetryLogProps {
  vehiculoId: number;
  eventLogs: WSEventMessage[];
  onClearLogs: () => void;
  lastMessage: WSEventMessage | null;
}

export const TelemetryLog: React.FC<TelemetryLogProps> = ({
  vehiculoId,
  eventLogs,
  onClearLogs,
  lastMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'ws' | 'history'>('ws');
  const [history, setHistory] = useState<MovimientoHistorial[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = () => {
    setLoadingHistory(true);
    obtenerHistorialVehiculo(vehiculoId)
      .then((data) => setHistory(data))
      .catch((err) => console.warn('Error cargando historial:', err))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, vehiculoId]);

  const getEventBadgeColor = (evento: string) => {
    switch (evento) {
      case 'MOVIMIENTO_INDIVIDUAL':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'DEMO_INICIO':
      case 'DEMO_MOVIMIENTO':
      case 'DEMO_FIN':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'DEMO_CANCELADA':
      case 'DEMO_ERROR':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'ESTADO_INICIAL':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col h-full">
      {/* Tabs & Acciones */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ws')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ws'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Telemetría WSS ({eventLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial RDS (10)
          </button>
        </div>

        {activeTab === 'ws' ? (
          <button
            onClick={onClearLogs}
            title="Limpiar eventos locales"
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={fetchHistory}
            disabled={loadingHistory}
            title="Actualizar historial de RDS"
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Widget de Último Comando Detectado */}
      {lastMessage && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono flex items-center justify-between">
          <span className="text-slate-400">Último evento WSS:</span>
          <span className="text-amber-400 font-bold">
            {formatCommandName(lastMessage.comando, lastMessage.codigo) || lastMessage.evento}
            {lastMessage.codigo !== undefined && ` (Cod ${lastMessage.codigo})`}
          </span>
        </div>
      )}

      {/* Feed de Eventos */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-72 sm:max-h-80 font-mono text-xs">
        {activeTab === 'ws' && (
          <>
            {eventLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Esperando eventos WebSocket desde AWS...
              </div>
            ) : (
              eventLogs.map((log, idx) => (
                <div
                  key={`${log.timestamp}-${idx}`}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-850 hover:border-slate-700/80 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getEventBadgeColor(
                        log.evento
                      )}`}
                    >
                      {log.evento}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-slate-300 text-[11px] flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {log.comando && (
                      <span>
                        Comando: <strong className="text-white">{formatCommandName(log.comando, log.codigo)}</strong>
                      </span>
                    )}
                    {log.codigo !== undefined && (
                      <span className="text-slate-400">Cód: {log.codigo}</span>
                    )}
                    {log.duracion_ms && (
                      <span className="text-cyan-400">{log.duracion_ms} ms</span>
                    )}
                    {log.origen && (
                      <span className="text-slate-500">[{log.origen}]</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                {loadingHistory ? 'Cargando historial...' : 'No hay movimientos en el historial.'}
              </div>
            ) : (
              history.map((h) => (
                <div
                  key={h.id_historial}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-850 flex items-center justify-between"
                >
                  <div>
                    <div className="text-white font-bold text-xs">{formatCommandName(h.comando, h.codigo)}</div>
                    <div className="text-[10px] text-slate-500">
                      Cód: {h.codigo} • {h.origen}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {h.fecha_ejecucion}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};
