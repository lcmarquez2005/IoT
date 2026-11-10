import React from 'react';
import { ChevronsUp, ChevronsDown, RotateCcw, RotateCw } from 'lucide-react';

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
  const isRotarIzqDemo = demoCommand === 'ABRIR_PALA' || demoCommand === 'ROTAR_IZQ';
  const isRotarDerDemo = demoCommand === 'CERRAR_PALA' || demoCommand === 'ROTAR_DER';

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Brazo y Cabina
          </h2>
          <p className="text-xs text-slate-400">Elevación y rotación de torre</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
          Teclas H, J, K, L
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3.5 my-2">
        {/* SUBIR BRAZO */}
        <button
          onClick={() => onCommand(5, 'SUBIR_BRAZO')}
          disabled={disabled}
          title="Subir Brazo (K)"
          className={`h-24 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isSubirDemo
              ? 'bg-amber-500 text-black border-amber-400'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 hover:text-white active:bg-amber-500 active:text-black active:scale-98'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <ChevronsUp className="w-7 h-7 stroke-[2.2]" />
          <div className="text-center">
            <div className="text-xs font-bold leading-tight">Subir Brazo</div>
            <span className="text-[10px] font-mono opacity-60">Tecla K</span>
          </div>
        </button>

        {/* BAJAR BRAZO */}
        <button
          onClick={() => onCommand(6, 'BAJAR_BRAZO')}
          disabled={disabled}
          title="Bajar Brazo (J)"
          className={`h-24 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isBajarDemo
              ? 'bg-amber-500 text-black border-amber-400'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 hover:text-white active:bg-amber-500 active:text-black active:scale-98'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <ChevronsDown className="w-7 h-7 stroke-[2.2]" />
          <div className="text-center">
            <div className="text-xs font-bold leading-tight">Bajar Brazo</div>
            <span className="text-[10px] font-mono opacity-60">Tecla J</span>
          </div>
        </button>

        {/* ROTAR CABINA IZQ / ABRIR PALA */}
        <button
          onClick={() => onCommand(7, 'ABRIR_PALA')}
          disabled={disabled}
          title="Rotar Cabina Izquierda / Abrir Pala (H)"
          className={`h-24 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isRotarIzqDemo
              ? 'bg-amber-500 text-black border-amber-400'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 hover:text-white active:bg-amber-500 active:text-black active:scale-98'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <RotateCcw className="w-6 h-6 stroke-[2.2]" />
          <div className="text-center">
            <div className="text-xs font-bold leading-tight">Giro Cabina Izq</div>
            <span className="text-[10px] font-mono opacity-60">Tecla H</span>
          </div>
        </button>

        {/* ROTAR CABINA DER / CERRAR PALA */}
        <button
          onClick={() => onCommand(8, 'CERRAR_PALA')}
          disabled={disabled}
          title="Rotar Cabina Derecha / Cerrar Pala (L)"
          className={`h-24 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isRotarDerDemo
              ? 'bg-amber-500 text-black border-amber-400'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 hover:text-white active:bg-amber-500 active:text-black active:scale-98'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <RotateCw className="w-6 h-6 stroke-[2.2]" />
          <div className="text-center">
            <div className="text-xs font-bold leading-tight">Giro Cabina Der</div>
            <span className="text-[10px] font-mono opacity-60">Tecla L</span>
          </div>
        </button>
      </div>

      <div className="flex justify-between items-center text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-800/60 font-mono">
        <span>Canales: Salidas 12, 6, 8, 1</span>
        <span>Aislamiento: PC817</span>
      </div>
    </div>
  );
};
