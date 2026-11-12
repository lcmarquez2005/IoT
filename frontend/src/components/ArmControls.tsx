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
      {/* Cluster Ergonómico Gamepad (2x2 Grid) - Altura sincronizada con el Joystick */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full max-w-[240px] sm:max-w-[260px]">
        {/* SUBIR BRAZO (Código 5) */}
        <button
          onClick={() => onCommand(5, 'SUBIR_BRAZO')}
          disabled={disabled}
          title="Subir Brazo Articulado (K)"
          className={`h-19 sm:h-23 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
            isSubirDemo
              ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border-slate-700/80 hover:bg-slate-750 hover:border-cyan-500/50 active:bg-cyan-500 active:text-black'
          } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <ArrowUpCircle className="w-6 h-6 text-amber-400 stroke-[2.2]" />
          <span className="text-[11px] sm:text-xs font-bold leading-none">Subir Brazo</span>
        </button>

        {/* BAJAR BRAZO (Código 6) */}
        <button
          onClick={() => onCommand(6, 'BAJAR_BRAZO')}
          disabled={disabled}
          title="Bajar Brazo Articulado (J)"
          className={`h-19 sm:h-23 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
            isBajarDemo
              ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border-slate-700/80 hover:bg-slate-750 hover:border-cyan-500/50 active:bg-cyan-500 active:text-black'
          } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <ArrowDownCircle className="w-6 h-6 text-amber-400 stroke-[2.2]" />
          <span className="text-[11px] sm:text-xs font-bold leading-none">Bajar Brazo</span>
        </button>

        {/* ABRIR PALA (Código 7) */}
        <button
          onClick={() => onCommand(7, 'ABRIR_PALA')}
          disabled={disabled}
          title="Abrir Pala / Cuchara (H)"
          className={`h-19 sm:h-23 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
            isAbrirDemo
              ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border-slate-700/80 hover:bg-slate-750 hover:border-cyan-500/50 active:bg-cyan-500 active:text-black'
          } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <Maximize2 className="w-5.5 h-5.5 text-cyan-400 stroke-[2.2]" />
          <span className="text-[11px] sm:text-xs font-bold leading-none">Abrir Pala</span>
        </button>

        {/* CERRAR PALA (Código 8) */}
        <button
          onClick={() => onCommand(8, 'CERRAR_PALA')}
          disabled={disabled}
          title="Cerrar Pala / Cuchara (L)"
          className={`h-19 sm:h-23 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
            isCerrarDemo
              ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border-slate-700/80 hover:bg-slate-750 hover:border-cyan-500/50 active:bg-cyan-500 active:text-black'
          } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <Minimize2 className="w-5.5 h-5.5 text-cyan-400 stroke-[2.2]" />
          <span className="text-[11px] sm:text-xs font-bold leading-none">Cerrar Pala</span>
        </button>
      </div>

      <span className="text-[9px] text-slate-500 mt-1 font-mono">
        Botones Táctiles ≥ 48px
      </span>
    </div>
  );
};
