import React from 'react';
import { Lightbulb, Music, Power, OctagonAlert } from 'lucide-react';

interface AuxiliaryActionsProps {
  onCommand: (codigo: number, nombre: string) => void;
  activeCommand?: string | null;
  disabled?: boolean;
}

export const AuxiliaryActions: React.FC<AuxiliaryActionsProps> = ({
  onCommand,
  activeCommand,
  disabled = false,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Funciones y Seguridad
          </h2>
          <p className="text-xs text-slate-400">Auxiliares y parada de emergencia</p>
        </div>
      </div>

      {/* Botón de Parada de Emergencia - Destacado en Rojo */}
      <div className="mb-4">
        <button
          onClick={() => onCommand(9, 'DETENER')}
          disabled={disabled}
          title="Parada Inmediata (Espacio)"
          className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-500 text-white font-bold flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(244,63,94,0.35)] border border-rose-400/40 active:scale-98 transition-all cursor-pointer group"
        >
          <OctagonAlert className="w-6 h-6 stroke-[2.3] group-hover:animate-pulse" />
          <div className="text-left leading-tight">
            <div className="text-sm uppercase tracking-wider font-extrabold">
              Paro de Emergencia
            </div>
            <div className="text-[10px] text-rose-100 font-mono opacity-80">
              Desactiva todos los 12 canales (Espacio)
            </div>
          </div>
        </button>
      </div>

      {/* Acciones Rápidas (Luces, Sonido, Power) */}
      <div className="grid grid-cols-3 gap-3">
        {/* LUZ */}
        <button
          onClick={() => onCommand(12, 'TOGGLE_LIGHT')}
          disabled={disabled}
          title="Alternar Luces LED (3)"
          className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeCommand === 'TOGGLE_LIGHT'
              ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/40 active:scale-95'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <Lightbulb className="w-5 h-5" />
          <span className="text-[11px] font-semibold">Faros</span>
          <span className="text-[9px] font-mono text-slate-400">[3]</span>
        </button>

        {/* SONIDO / MUSICA */}
        <button
          onClick={() => onCommand(11, 'TOGGLE_MUSIC')}
          disabled={disabled}
          title="Alternar Sonido / Música (2)"
          className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeCommand === 'TOGGLE_MUSIC'
              ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/40 active:scale-95'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <Music className="w-5 h-5" />
          <span className="text-[11px] font-semibold">Sonido</span>
          <span className="text-[9px] font-mono text-slate-400">[2]</span>
        </button>

        {/* ENCENDIDO / POWER */}
        <button
          onClick={() => onCommand(10, 'ENCENDER')}
          disabled={disabled}
          title="Encender Control Remoto (1)"
          className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeCommand === 'ENCENDER'
              ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-cyan-500/40 active:scale-95'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <Power className="w-5 h-5" />
          <span className="text-[11px] font-semibold">Remoto</span>
          <span className="text-[9px] font-mono text-slate-400">[1]</span>
        </button>
      </div>
    </div>
  );
};
