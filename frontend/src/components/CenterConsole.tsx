import React, { useState, useEffect } from 'react';
import { Power, Music, Lightbulb, OctagonAlert, Play, Square, Film } from 'lucide-react';
import { DemoItem } from '../types/vehicle';
import { obtenerDemosVehiculo, iniciarDemo, cancelarDemo, obtenerEstadoDemo } from '../services/api';

interface CenterConsoleProps {
  vehiculoId: number;
  onCommand: (codigo: number, nombre: string) => void;
  demoProgress?: {
    demo: string;
    pasoActual: number;
    totalMovimientos: number;
    comando?: string;
  } | null;
  lastAction?: {
    nombre: string;
    codigo: number;
  } | null;
  lastHttpResult?: string | null;
  lastWsEvent?: string | null;
  disabled?: boolean;
}

export const CenterConsole: React.FC<CenterConsoleProps> = ({
  vehiculoId,
  onCommand,
  demoProgress,
  lastAction,
  lastHttpResult,
  lastWsEvent,
  disabled = false,
}) => {
  const [demos, setDemos] = useState<DemoItem[]>([]);
  const [selectedDemoId, setSelectedDemoId] = useState<number | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [isDemoRunningLocal, setIsDemoRunningLocal] = useState(false);

  // Cargar lista de demos
  useEffect(() => {
    let isMounted = true;
    obtenerDemosVehiculo(vehiculoId)
      .then((data) => {
        if (isMounted) {
          setDemos(data);
          if (data.length > 0 && selectedDemoId === null) {
            setSelectedDemoId(data[0].id_demo);
          }
        }
      })
      .catch((err) => console.warn('No se pudieron cargar las demos:', err));

    return () => {
      isMounted = false;
    };
  }, [vehiculoId]);

  // Chequeo periódico de estado DEMO
  useEffect(() => {
    const checkState = () => {
      obtenerEstadoDemo(vehiculoId)
        .then((res) => setIsDemoRunningLocal(res.en_ejecucion))
        .catch(() => {});
    };

    checkState();
    const interval = setInterval(checkState, 3500);
    return () => clearInterval(interval);
  }, [vehiculoId]);

  const isExecuting = isDemoRunningLocal || Boolean(demoProgress);

  const handleStartDemo = async () => {
    if (!selectedDemoId) return;
    setLoadingDemo(true);
    try {
      await iniciarDemo(vehiculoId, selectedDemoId, 1.0);
      setIsDemoRunningLocal(true);
    } catch (err: any) {
      console.error('Error al iniciar DEMO:', err);
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleCancelDemo = async () => {
    setLoadingDemo(true);
    try {
      await cancelarDemo(vehiculoId);
      setIsDemoRunningLocal(false);
    } catch (err: any) {
      console.error('Error al cancelar DEMO:', err);
    } finally {
      setLoadingDemo(false);
    }
  };

  const progressPercent = demoProgress && demoProgress.totalMovimientos > 0
    ? Math.round((demoProgress.pasoActual / demoProgress.totalMovimientos) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-2.5 w-full max-w-[340px] mx-auto select-none">
      {/* 1. Fila de Encendido y Botones Comodines */}
      <div className="flex items-center gap-2">
        {/* ENCENDIDO (Código 10) */}
        <button
          onClick={() => onCommand(10, 'ENCENDER')}
          disabled={disabled}
          title="Encender Sistema (1)"
          className="flex-1 py-2.5 px-3 rounded-xl border-2 border-emerald-500/60 bg-gradient-to-r from-emerald-700 to-emerald-950 text-white font-extrabold text-xs shadow-md shadow-emerald-900/40 hover:from-emerald-600 hover:to-emerald-900 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Power className="w-4 h-4 text-emerald-300 stroke-[2.5]" />
          <span>ENCENDER</span>
        </button>

        {/* COMODÍN: MÚSICA (Código 11) */}
        <button
          onClick={() => onCommand(11, 'TOGGLE_MUSIC')}
          disabled={disabled}
          title="Alternar Sonido / Música (2)"
          className="flex-1 py-2.5 px-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-750 active:bg-amber-500 active:text-black active:scale-95 transition-all text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
        >
          <Music className="w-3.5 h-3.5 text-cyan-400" />
          <span>Música</span>
        </button>

        {/* COMODÍN: LUCES (Código 12) */}
        <button
          onClick={() => onCommand(12, 'TOGGLE_LIGHT')}
          disabled={disabled}
          title="Alternar Luces LED (3)"
          className="flex-1 py-2.5 px-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-750 active:bg-amber-500 active:text-black active:scale-95 transition-all text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Luces</span>
        </button>
      </div>

      {/* 2. Botón DETENER (Parada de Emergencia Prioritaria - Código 9) */}
      <button
        onClick={() => onCommand(9, 'DETENER')}
        disabled={disabled}
        title="Parada Inmediata (Espacio)"
        className="w-full py-3 px-4 rounded-xl border-2 border-rose-400 bg-gradient-to-r from-rose-600 via-rose-700 to-rose-900 hover:from-rose-500 hover:to-rose-800 text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl shadow-rose-950/60 active:scale-97 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <OctagonAlert className="w-5 h-5 text-rose-200 animate-pulse" />
        <span>DETENER (PARO TOTAL)</span>
      </button>

      {/* 3. Módulo DEMO Compacto */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-md flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 font-mono">
            <Film className="w-3 h-3 text-emerald-400" /> Rutinas DEMO
          </span>
          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">
            {demoProgress ? `${demoProgress.pasoActual}/${demoProgress.totalMovimientos} • ${demoProgress.comando}` : 'En espera'}
          </span>
        </div>

        <div className="flex gap-1.5">
          <select
            value={selectedDemoId || ''}
            onChange={(e) => setSelectedDemoId(Number(e.target.value))}
            disabled={isExecuting}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-amber-500 font-mono truncate"
          >
            {demos.map((d) => (
              <option key={d.id_demo} value={d.id_demo}>
                {d.nombre}
              </option>
            ))}
          </select>

          <button
            onClick={handleStartDemo}
            disabled={isExecuting || loadingDemo || !selectedDemoId}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Play</span>
          </button>

          <button
            onClick={handleCancelDemo}
            disabled={!isExecuting || loadingDemo}
            className="px-2 py-1 bg-rose-600/80 hover:bg-rose-600 disabled:opacity-30 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop</span>
          </button>
        </div>

        {/* Barra de Progreso DEMO */}
        {isExecuting && (
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden mt-0.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* 4. Mini HUD de Retroalimentación de Última Acción */}
      <div className="bg-slate-950/90 border border-slate-800/80 rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5 text-[10px] font-mono">
        <div className="flex justify-between items-center text-slate-400">
          <span>Última Acción:</span>
          <span className="text-amber-400 font-bold truncate max-w-[180px]">
            {lastAction ? `${lastAction.nombre} [${lastAction.codigo}]` : 'Ninguna'}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Respuesta HTTP:</span>
          <span className="text-emerald-400 font-medium truncate max-w-[180px]">
            {lastHttpResult || 'En espera'}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Evento WSS:</span>
          <span className="text-cyan-400 font-medium truncate max-w-[180px]">
            {lastWsEvent || 'Sin eventos'}
          </span>
        </div>
      </div>
    </div>
  );
};
