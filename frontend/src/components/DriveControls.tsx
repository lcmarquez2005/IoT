import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square } from 'lucide-react';

interface DriveControlsProps {
  onCommand: (codigo: number, nombre: string) => void;
  activeCommand?: string | null;
  disabled?: boolean;
}

export const DriveControls: React.FC<DriveControlsProps> = ({
  onCommand,
  activeCommand,
  disabled = false,
}) => {
  const isAvanzar = activeCommand === 'AVANZAR';
  const isRetroceder = activeCommand === 'RETROCEDER';
  const isGirarIzq = activeCommand === 'GIRAR_IZQUIERDA';
  const isGirarDer = activeCommand === 'GIRAR_DERECHA';

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      {/* Luz decorativa ambiental */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Navegación y Orugas
          </h2>
          <p className="text-xs text-slate-400">Control de desplazamiento y giro</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
          WASD / Flechas
        </span>
      </div>

      {/* D-Pad Layout */}
      <div className="relative w-56 h-56 mx-auto flex items-center justify-center my-2">
        {/* Arriba: AVANZAR */}
        <button
          onClick={() => onCommand(1, 'AVANZAR')}
          disabled={disabled}
          title="Avanzar (W / ↑)"
          className={`absolute top-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center transition-all duration-100 cursor-pointer ${
            isAvanzar
              ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-95'
              : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 active:scale-95'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <ArrowUp className="w-6 h-6 stroke-[2.5]" />
          <span className="text-[9px] font-bold mt-0.5 font-mono">W</span>
        </button>

        {/* Abajo: RETROCEDER */}
        <button
          onClick={() => onCommand(2, 'RETROCEDER')}
          disabled={disabled}
          title="Retroceder (S / ↓)"
          className={`absolute bottom-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center transition-all duration-100 cursor-pointer ${
            isRetroceder
              ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-95'
              : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 active:scale-95'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <span className="text-[9px] font-bold mb-0.5 font-mono">S</span>
          <ArrowDown className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Izquierda: GIRAR_IZQUIERDA */}
        <button
          onClick={() => onCommand(3, 'GIRAR_IZQUIERDA')}
          disabled={disabled}
          title="Girar Izquierda (A / ←)"
          className={`absolute left-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center transition-all duration-100 cursor-pointer ${
            isGirarIzq
              ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-95'
              : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 active:scale-95'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
          <span className="text-[9px] font-bold mt-0.5 font-mono">A</span>
        </button>

        {/* Derecha: GIRAR_DERECHA */}
        <button
          onClick={() => onCommand(4, 'GIRAR_DERECHA')}
          disabled={disabled}
          title="Girar Derecha (D / →)"
          className={`absolute right-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center transition-all duration-100 cursor-pointer ${
            isGirarDer
              ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-95'
              : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 active:scale-95'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <ArrowRight className="w-6 h-6 stroke-[2.5]" />
          <span className="text-[9px] font-bold mt-0.5 font-mono">D</span>
        </button>

        {/* Centro: STOP RÁPIDO */}
        <button
          onClick={() => onCommand(9, 'DETENER')}
          disabled={disabled}
          title="Detener Tracción (Espacio)"
          className="w-14 h-14 rounded-full bg-slate-950 border border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:text-rose-400 hover:border-rose-500/50 active:scale-90 transition-all cursor-pointer shadow-inner"
        >
          <Square className="w-4 h-4 fill-current" />
          <span className="text-[8px] font-mono mt-0.5">STOP</span>
        </button>
      </div>

      <div className="flex justify-between items-center text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-800/60 font-mono">
        <span>Canales: Salidas 9, 2, 11, 5</span>
        <span>Exclusión Mutua: Activa</span>
      </div>
    </div>
  );
};
