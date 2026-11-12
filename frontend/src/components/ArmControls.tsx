import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Maximize2, Minimize2 } from 'lucide-react';

interface ArmControlsProps {
  onCommand: (codigo: number, nombre: string) => void;
  demoCommand?: string | null;
  disabled?: boolean;
}

export const ArmControls: React.FC<ArmControlsProps> = ({
  onCommand,
  demoCommand = null,
  disabled = false,
}) => {
  const isSubirDemo = demoCommand === 'SUBIR_BRAZO';
  const isBajarDemo = demoCommand === 'BAJAR_BRAZO';
  const isAbrirDemo = demoCommand === 'ABRIR_PALA';
  const isCerrarDemo = demoCommand === 'CERRAR_PALA';

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      <div className="w-full text-center mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
          Brazo y Pala (Pulgar Der.)
        </span>
      </div>

      {/* Cluster Ergonómico Gamepad (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-[260px] sm:max-w-[280px]">
        {/* SUBIR BRAZO (Código 5) */}
        <button
          onClick={() => onCommand(5, 'SUBIR_BRAZO')}
          disabled={disabled}
          title="Subir Brazo Articulado (K)"
          className={`h-20 sm:h-22 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-lg active:scale-95 ${
            isSubirDemo
              ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border-slate-700/80 hover:bg-slate-750 hover:border-cyan-500/50 active:bg-cyan-500 active:text-black'
          } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <ArrowUpCircle className="w-7 h-7 text-amber-400 stroke-[2.2]" />
          <span className="text-[11px] sm:text-xs font-extrabold leading-tight">Subir Brazo</span>
          <span className="text-[9px] font-mono text-slate-400">Cod 5</span>
        </button>

        {/* BAJAR BRAZO (Código 6) */}
        <button
          onClick={() => onCommand(6, 'BAJAR_BRAZO')}
          disabled={disabled}
          title="Bajar Brazo Articulado (J)"
          className={`h-20 sm:h-22 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-lg active:scale-95 ${
            isBajarDemo
              ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border-slate-700/80 hover:bg-slate-750 hover:border-cyan-500/50 active:bg-cyan-500 active:text-black'
          } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <ArrowDownCircle className="w-7 h-7 text-amber-400 stroke-[2.2]" />
          <span className="text-[11px] sm:text-xs font-extrabold leading-tight">Bajar Brazo</span>
          <span className="text-[9px] font-mono text-slate-400">Cod 6</span>
        </button>

        {/* ABRIR PALA (Código 7) */}
        <button
          onClick={() => onCommand(7, 'ABRIR_PALA')}
          disabled={disabled}
          title="Abrir Pala / Cuchara (H)"
          className={`h-20 sm:h-22 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-lg active:scale-95 ${
            isAbrirDemo
              ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border-slate-700/80 hover:bg-slate-750 hover:border-cyan-500/50 active:bg-cyan-500 active:text-black'
          } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <Maximize2 className="w-6 h-6 text-cyan-400 stroke-[2.2]" />
          <span className="text-[11px] sm:text-xs font-extrabold leading-tight">Abrir Pala</span>
          <span className="text-[9px] font-mono text-slate-400">Cod 7</span>
        </button>

        {/* CERRAR PALA (Código 8) */}
        <button
          onClick={() => onCommand(8, 'CERRAR_PALA')}
          disabled={disabled}
          title="Cerrar Pala / Cuchara (L)"
          className={`h-20 sm:h-22 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-lg active:scale-95 ${
            isCerrarDemo
              ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border-slate-700/80 hover:bg-slate-750 hover:border-cyan-500/50 active:bg-cyan-500 active:text-black'
          } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <Minimize2 className="w-6 h-6 text-cyan-400 stroke-[2.2]" />
          <span className="text-[11px] sm:text-xs font-extrabold leading-tight">Cerrar Pala</span>
          <span className="text-[9px] font-mono text-slate-400">Cod 8</span>
        </button>
      </div>

      <span className="text-[10px] text-slate-400 mt-2 font-mono">
        Botones Táctiles ≥ 48px
      </span>
    </div>
  );
};
