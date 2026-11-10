import React, { useState, useEffect } from 'react';
import { DemoItem } from '../types/vehicle';
import { obtenerDemosVehiculo, iniciarDemo, cancelarDemo, obtenerEstadoDemo } from '../services/api';
import { Play, Square, Film, CheckCircle2, AlertCircle } from 'lucide-react';

interface DemoPanelProps {
  vehiculoId: number;
  demoProgress?: {
    demo: string;
    pasoActual: number;
    totalMovimientos: number;
    comando?: string;
  } | null;
  onActionStart?: () => void;
  onActionEnd?: () => void;
}

export const DemoPanel: React.FC<DemoPanelProps> = ({
  vehiculoId,
  demoProgress,
}) => {
  const [demos, setDemos] = useState<DemoItem[]>([]);
  const [selectedDemoId, setSelectedDemoId] = useState<number | null>(null);
  const [factorTiempo, setFactorTiempo] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDemoRunningLocal, setIsDemoRunningLocal] = useState<boolean>(false);

  // Cargar lista de demos del vehículo
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
      .catch((err) => {
        console.warn('No se pudieron cargar las demos:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [vehiculoId]);

  // Chequeo periódico de estado DEMO
  useEffect(() => {
    let interval: number;
    const checkState = () => {
      obtenerEstadoDemo(vehiculoId)
        .then((res) => {
          setIsDemoRunningLocal(res.en_ejecucion);
        })
        .catch(() => {});
    };

    checkState();
    interval = window.setInterval(checkState, 3000);
    return () => clearInterval(interval);
  }, [vehiculoId]);

  const isExecuting = isDemoRunningLocal || Boolean(demoProgress);

  const handleStartDemo = async () => {
    if (!selectedDemoId) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await iniciarDemo(vehiculoId, selectedDemoId, factorTiempo);
      setIsDemoRunningLocal(true);
      setSuccessMsg('Rutina DEMO iniciada.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar la DEMO');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDemo = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await cancelarDemo(vehiculoId);
      setIsDemoRunningLocal(false);
      setSuccessMsg('Rutina DEMO cancelada.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cancelar la DEMO');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  // Cálculo de porcentaje de progreso
  const progressPercent = demoProgress && demoProgress.totalMovimientos > 0
    ? Math.round((demoProgress.pasoActual / demoProgress.totalMovimientos) * 100)
    : 0;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Film className="w-4 h-4 text-amber-400" />
            Secuencias DEMO (RDS)
          </h2>
          <p className="text-xs text-slate-400">Automatización de movimientos pregrabados</p>
        </div>
      </div>

      {/* Selector de Rutina y Factor de Tiempo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1 font-medium">
            Seleccionar Rutina DEMO
          </label>
          <select
            value={selectedDemoId || ''}
            onChange={(e) => setSelectedDemoId(Number(e.target.value))}
            disabled={isExecuting}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
          >
            {demos.length === 0 && <option value="">Sin rutinas registradas</option>}
            {demos.map((d) => (
              <option key={d.id_demo} value={d.id_demo}>
                #{d.id_demo} - {d.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1 font-medium">
            Velocidad
          </label>
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
            {[0.5, 1.0, 1.5].map((factor) => (
              <button
                key={factor}
                type="button"
                onClick={() => setFactorTiempo(factor)}
                disabled={isExecuting}
                className={`flex-1 text-[11px] font-mono py-1 rounded-lg transition-colors cursor-pointer ${
                  factorTiempo === factor
                    ? 'bg-amber-500 text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {factor}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de Progreso en Vivo */}
      {isExecuting && (
        <div className="mb-4 bg-slate-950/80 border border-amber-500/20 rounded-xl p-3.5 animate-in fade-in">
          <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Ejecutando: {demoProgress?.demo || 'DEMO Activa'}
            </span>
            <span className="text-slate-400">
              Paso {demoProgress?.pasoActual || 0} / {demoProgress?.totalMovimientos || 0} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {demoProgress?.comando && (
            <div className="text-[11px] font-mono text-slate-400 mt-2">
              Comando actual: <span className="text-white font-bold">{demoProgress.comando}</span>
            </div>
          )}
        </div>
      )}

      {/* Botones de Control de DEMO */}
      <div className="flex gap-3">
        {!isExecuting ? (
          <button
            onClick={handleStartDemo}
            disabled={loading || !selectedDemoId}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Iniciar Secuencia DEMO
          </button>
        ) : (
          <button
            onClick={handleCancelDemo}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
            Cancelar DEMO en Curso
          </button>
        )}
      </div>

      {/* Mensajes de Feedback */}
      {errorMsg && (
        <div className="mt-3 text-xs text-rose-400 flex items-center gap-1.5 bg-rose-950/40 p-2 rounded-lg border border-rose-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}
    </div>
  );
};
