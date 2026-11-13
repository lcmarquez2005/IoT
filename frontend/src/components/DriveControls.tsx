import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square } from 'lucide-react';

interface DriveControlsProps {
  onCommand: (codigo: number, nombre: string) => void;
  onStartContinuous?: (codigo: number, nombre: string) => void;
  onStopContinuous?: () => void;
  demoCommand?: string | null;
  disabled?: boolean;
}

export const DriveControls: React.FC<DriveControlsProps> = ({
  onCommand,
  onStartContinuous,
  onStopContinuous,
  demoCommand = null,
  disabled = false,
}) => {
  const isAvanzarDemo = demoCommand === 'AVANZAR';
  const isRetrocederDemo = demoCommand === 'RETROCEDER';
  const isGirarIzqDemo = demoCommand === 'GIRAR_IZQUIERDA';
  const isGirarDerDemo = demoCommand === 'GIRAR_DERECHA';

  const [activeCode, setActiveCode] = React.useState<number | null>(null);

  const handleStart = (codigo: number, nombre: string, e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setActiveCode(codigo);
    if (onStartContinuous) {
      onStartContinuous(codigo, nombre);
    } else {
      onCommand(codigo, nombre);
    }
  };

  const handleEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    if (activeCode !== null) {
      setActiveCode(null);
      if (onStopContinuous) {
        onStopContinuous();
      } else {
        onCommand(9, 'DETENER');
      }
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative select-none">
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
          onPointerDown={(e) => handleStart(1, 'AVANZAR', e)}
          onPointerUp={handleEnd}
          onPointerCancel={handleEnd}
          onClick={(e) => e.preventDefault()}
          disabled={disabled}
          title="Avanzar (W / ↑)"
          className={`absolute top-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer touch-none select-none ${
            isAvanzarDemo || activeCode === 1
              ? 'bg-amber-500 text-black border-amber-400 scale-95'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 hover:text-white active:bg-amber-500 active:text-black'
          } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <ArrowUp className="w-6 h-6 stroke-[2.5]" />
          <span className="text-[9px] font-bold mt-0.5 font-mono">W</span>
        </button>

        {/* Abajo: RETROCEDER */}
        <button
          onPointerDown={(e) => handleStart(2, 'RETROCEDER', e)}
          onPointerUp={handleEnd}
          onPointerCancel={handleEnd}
          onClick={(e) => e.preventDefault()}
          disabled={disabled}
          title="Retroceder (S / ↓)"
          className={`absolute bottom-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer touch-none select-none ${
            isRetrocederDemo || activeCode === 2
              ? 'bg-amber-500 text-black border-amber-400 scale-95'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 hover:text-white active:bg-amber-500 active:text-black'
          } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <span className="text-[9px] font-bold mb-0.5 font-mono">S</span>
          <ArrowDown className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Izquierda: GIRAR_IZQUIERDA */}
        <button
          onPointerDown={(e) => handleStart(3, 'GIRAR_IZQUIERDA', e)}
          onPointerUp={handleEnd}
          onPointerCancel={handleEnd}
          onClick={(e) => e.preventDefault()}
          disabled={disabled}
          title="Girar Izquierda (A / ←)"
          className={`absolute left-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer touch-none select-none ${
            isGirarIzqDemo || activeCode === 3
              ? 'bg-amber-500 text-black border-amber-400 scale-95'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 hover:text-white active:bg-amber-500 active:text-black'
          } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
          <span className="text-[9px] font-bold mt-0.5 font-mono">A</span>
        </button>

        {/* Derecha: GIRAR_DERECHA */}
        <button
          onPointerDown={(e) => handleStart(4, 'GIRAR_DERECHA', e)}
          onPointerUp={handleEnd}
          onPointerCancel={handleEnd}
          onClick={(e) => e.preventDefault()}
          disabled={disabled}
          title="Girar Derecha (D / →)"
          className={`absolute right-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer touch-none select-none ${
            isGirarDerDemo || activeCode === 4
              ? 'bg-amber-500 text-black border-amber-400 scale-95'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 hover:text-white active:bg-amber-500 active:text-black'
          } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <ArrowRight className="w-6 h-6 stroke-[2.5]" />
          <span className="text-[9px] font-bold mt-0.5 font-mono">D</span>
        </button>

        {/* Centro: STOP RÁPIDO */}
        <button
          onClick={() => {
            if (onStopContinuous) onStopContinuous();
            else onCommand(9, 'DETENER');
          }}
          disabled={disabled}
          title="Detener Tracción (Espacio)"
          className="w-14 h-14 rounded-full bg-slate-950 border border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:text-rose-400 hover:border-rose-500/50 active:scale-90 transition-all cursor-pointer"
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
