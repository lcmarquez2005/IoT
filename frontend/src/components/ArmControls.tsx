import React, { useState, useRef } from 'react';
import { ArrowUpCircle, ArrowDownCircle, RotateCw, RotateCcw } from 'lucide-react';

interface ArmControlsProps {
  onCommand: (codigo: number, nombre: string) => void;
  onStartContinuous?: (codigo: number, nombre: string) => void;
  onStopContinuous?: () => void;
  demoCommand?: string | null;
  disabled?: boolean;
}

export const ArmControls: React.FC<ArmControlsProps> = ({
  onCommand,
  onStartContinuous,
  onStopContinuous,
  demoCommand = null,
  disabled = false,
}) => {
  const isSubirDemo = demoCommand === 'SUBIR_BRAZO';
  const isBajarDemo = demoCommand === 'BAJAR_BRAZO';
  const isAbrirDemo = demoCommand === 'ABRIR_PALA' || demoCommand === 'ROTAR_DERECHA';
  const isCerrarDemo = demoCommand === 'CERRAR_PALA' || demoCommand === 'ROTAR_IZQUIERDA';

  const activeButtonRef = useRef<number | null>(null);
  const [activeButton, setActiveButton] = useState<number | null>(null);

  const handlePressStart = (codigo: number, nombre: string, e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    activeButtonRef.current = codigo;
    setActiveButton(codigo);
    if (onStartContinuous) {
      onStartContinuous(codigo, nombre);
    } else {
      onCommand(codigo, nombre);
    }
  };

  const handlePressEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    if (activeButtonRef.current !== null) {
      activeButtonRef.current = null;
      setActiveButton(null);
      if (onStopContinuous) {
        onStopContinuous();
      } else {
        onCommand(9, 'DETENER');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full select-none touch-none">
      {/* Cruceta Ergonómica Gamepad (D-Pad Cross 3x3) - Mismas dimensiones y escalado que el Joystick */}
      <div className="relative w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 xl:w-80 xl:h-80 flex items-center justify-center">
        {/* Chasis exterior de la cruceta con relieve */}
        <div
          className="grid grid-cols-3 grid-rows-3 gap-1 sm:gap-1.5 lg:gap-2.5 xl:gap-3 w-full h-full p-1 sm:p-1.5 lg:p-2.5 xl:p-3 rounded-3xl lg:rounded-[2rem] border-4 lg:border-[6px] border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-950 shadow-xl"
          style={{
            boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.6)',
          }}
        >
          {/* Fila 1: Arriba -> SUBIR BRAZO (Código 5) */}
          <div className="col-start-2 row-start-1 flex items-center justify-center">
            <button
              onPointerDown={(e) => handlePressStart(5, 'SUBIR_BRAZO', e)}
              onPointerUp={handlePressEnd}
              onPointerCancel={handlePressEnd}
              onClick={(e) => e.preventDefault()}
              disabled={disabled}
              title="Subir Brazo Articulado (K)"
              className={`w-full h-full rounded-t-2xl rounded-b-md border-2 flex flex-col items-center justify-center transition-all cursor-pointer shadow-md touch-none select-none ${
                isSubirDemo || activeButton === 5
                  ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-95'
                  : 'bg-gradient-to-b from-slate-750 to-slate-850 text-slate-100 border-slate-700 hover:border-amber-400/50 active:bg-amber-500 active:text-black'
              } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
            >
              <ArrowUpCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-11 xl:h-11 text-amber-400 stroke-[2.2]" />
              <span className="text-[8px] sm:text-[9px] lg:text-xs xl:text-sm font-bold leading-none mt-0.5 lg:mt-1 tracking-tight">SUBIR</span>
            </button>
          </div>

          {/* Fila 2: Izquierda -> ROTAR IZQUIERDA (Código 8) */}
          <div className="col-start-1 row-start-2 flex items-center justify-center">
            <button
              onPointerDown={(e) => handlePressStart(8, 'ROTAR_IZQUIERDA', e)}
              onPointerUp={handlePressEnd}
              onPointerCancel={handlePressEnd}
              onClick={(e) => e.preventDefault()}
              disabled={disabled}
              title="Rotar Torreta Izquierda (L)"
              className={`w-full h-full rounded-l-2xl rounded-r-md border-2 flex flex-col items-center justify-center transition-all cursor-pointer shadow-md touch-none select-none ${
                isCerrarDemo || activeButton === 8
                  ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-95'
                  : 'bg-gradient-to-b from-slate-750 to-slate-850 text-slate-100 border-slate-700 hover:border-cyan-400/50 active:bg-cyan-500 active:text-black'
              } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
            >
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-11 xl:h-11 text-cyan-400 stroke-[2.2]" />
              <span className="text-[8px] sm:text-[9px] lg:text-xs xl:text-sm font-bold leading-none mt-0.5 lg:mt-1 tracking-tight">IZQ</span>
            </button>
          </div>

          {/* Fila 2: Centro -> Pivote central neutral */}
          <div className="col-start-2 row-start-2 flex items-center justify-center pointer-events-none">
            <div className="w-full h-full rounded-lg bg-slate-950/90 border border-slate-800 flex items-center justify-center shadow-inner">
              <div className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 lg:w-6 lg:h-6 xl:w-8 xl:h-8 rounded-full bg-slate-800 border border-slate-700/80 shadow-sm" />
            </div>
          </div>

          {/* Fila 2: Derecha -> ROTAR DERECHA (Código 7) */}
          <div className="col-start-3 row-start-2 flex items-center justify-center">
            <button
              onPointerDown={(e) => handlePressStart(7, 'ROTAR_DERECHA', e)}
              onPointerUp={handlePressEnd}
              onPointerCancel={handlePressEnd}
              onClick={(e) => e.preventDefault()}
              disabled={disabled}
              title="Rotar Torreta Derecha (H)"
              className={`w-full h-full rounded-r-2xl rounded-l-md border-2 flex flex-col items-center justify-center transition-all cursor-pointer shadow-md touch-none select-none ${
                isAbrirDemo || activeButton === 7
                  ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-95'
                  : 'bg-gradient-to-b from-slate-750 to-slate-850 text-slate-100 border-slate-700 hover:border-cyan-400/50 active:bg-cyan-500 active:text-black'
              } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
            >
              <RotateCw className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-11 xl:h-11 text-cyan-400 stroke-[2.2]" />
              <span className="text-[8px] sm:text-[9px] lg:text-xs xl:text-sm font-bold leading-none mt-0.5 lg:mt-1 tracking-tight">DER</span>
            </button>
          </div>

          {/* Fila 3: Abajo -> BAJAR BRAZO (Código 6) */}
          <div className="col-start-2 row-start-3 flex items-center justify-center">
            <button
              onPointerDown={(e) => handlePressStart(6, 'BAJAR_BRAZO', e)}
              onPointerUp={handlePressEnd}
              onPointerCancel={handlePressEnd}
              onClick={(e) => e.preventDefault()}
              disabled={disabled}
              title="Bajar Brazo Articulado (J)"
              className={`w-full h-full rounded-b-2xl rounded-t-md border-2 flex flex-col items-center justify-center transition-all cursor-pointer shadow-md touch-none select-none ${
                isBajarDemo || activeButton === 6
                  ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-95'
                  : 'bg-gradient-to-b from-slate-750 to-slate-850 text-slate-100 border-slate-700 hover:border-amber-400/50 active:bg-amber-500 active:text-black'
              } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
            >
              <ArrowDownCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-11 xl:h-11 text-amber-400 stroke-[2.2]" />
              <span className="text-[8px] sm:text-[9px] lg:text-xs xl:text-sm font-bold leading-none mt-0.5 lg:mt-1 tracking-tight">BAJAR</span>
            </button>
          </div>
        </div>
      </div>

      <span className="text-[9px] sm:text-[10px] lg:text-xs xl:text-sm text-slate-500 mt-1 lg:mt-2.5 font-mono">
        Cruceta: Brazo (▲/▼) • Rotación (◀/▶)
      </span>
    </div>
  );
};
