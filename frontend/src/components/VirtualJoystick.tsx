import React, { useRef, useState, useCallback, useEffect } from 'react';

interface VirtualJoystickProps {
  onCommand: (codigo: number, nombre: string) => void;
  onStartContinuous?: (codigo: number, nombre: string) => void;
  onStopContinuous?: () => void;
  disabled?: boolean;
  demoCommand?: string | null;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onCommand,
  onStartContinuous,
  onStopContinuous,
  disabled = false,
  demoCommand = null,
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [handlePos, setHandlePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeDir, setActiveDir] = useState<'up' | 'down' | 'left' | 'right' | null>(null);

  const currentCmdRef = useRef<number | null>(null);
  const currentDirRef = useRef<'up' | 'down' | 'left' | 'right' | null>(null);
  const isPointerDownRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Sincronizar resaltados visuales si hay una rutina DEMO
  useEffect(() => {
    if (demoCommand === 'AVANZAR') setActiveDir('up');
    else if (demoCommand === 'RETROCEDER') setActiveDir('down');
    else if (demoCommand === 'GIRAR_IZQUIERDA') setActiveDir('left');
    else if (demoCommand === 'GIRAR_DERECHA') setActiveDir('right');
    else if (!isPointerDownRef.current) setActiveDir(null);
  }, [demoCommand]);

  const processPosition = useCallback((clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;

    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const maxR = rect.width / 2 - 28; // Límite dentro del anillo
    const distance = Math.hypot(dx, dy);

    if (distance > maxR) {
      dx = (dx / distance) * maxR;
      dy = (dy / distance) * maxR;
    }

    // Actualizar posición del pomo
    setHandlePos({ x: dx, y: dy });

    // Histeresis en la zona muerta para evitar rebotes entre centro y movimiento
    const deadzoneThreshold = currentCmdRef.current !== null ? maxR * 0.22 : maxR * 0.28;

    let newCmd: number | null = null;
    let newDir: 'up' | 'down' | 'left' | 'right' | null = null;
    let cmdName = '';

    if (distance >= deadzoneThreshold) {
      const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 a 180

      // Histeresis de 10 grados en las diagonales para evitar rebote entre direcciones
      const prevDir = currentDirRef.current;

      const isUp = prevDir === 'up'
        ? angle >= -140 && angle <= -40
        : angle >= -135 && angle <= -45;

      const isDown = prevDir === 'down'
        ? angle >= 40 && angle <= 140
        : angle >= 45 && angle <= 135;

      const isLeft = prevDir === 'left'
        ? (angle > 130 && angle <= 180) || (angle >= -180 && angle < -130)
        : (angle > 135 && angle <= 180) || (angle >= -180 && angle < -135);

      if (isUp) {
        newCmd = 1;
        newDir = 'up';
        cmdName = 'AVANZAR';
      } else if (isDown) {
        newCmd = 2;
        newDir = 'down';
        cmdName = 'RETROCEDER';
      } else if (isLeft) {
        newCmd = 3;
        newDir = 'left';
        cmdName = 'GIRAR_IZQUIERDA';
      } else {
        newCmd = 4;
        newDir = 'right';
        cmdName = 'GIRAR_DERECHA';
      }
    }

    currentDirRef.current = newDir;
    setActiveDir(newDir);

    // Solo enviar o disparar evento si hay un cambio real de comando efectivo
    if (newCmd !== currentCmdRef.current) {
      currentCmdRef.current = newCmd;
      if (newCmd !== null) {
        if (onStartContinuous) {
          onStartContinuous(newCmd, cmdName);
        } else {
          onCommand(newCmd, cmdName);
        }
      } else {
        if (onStopContinuous) {
          onStopContinuous();
        } else {
          onCommand(9, 'DETENER');
        }
      }
    }
  }, [onCommand, onStartContinuous, onStopContinuous]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isPointerDownRef.current) return;
    isPointerDownRef.current = true;
    activePointerIdRef.current = e.pointerId;
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    processPosition(e.clientX, e.clientY);
  }, [disabled, processPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || e.pointerId !== activePointerIdRef.current) return;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    const { clientX, clientY } = e;
    rafIdRef.current = requestAnimationFrame(() => {
      processPosition(clientX, clientY);
    });
  }, [processPosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || e.pointerId !== activePointerIdRef.current) return;
    isPointerDownRef.current = false;
    activePointerIdRef.current = null;
    setIsDragging(false);

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    // Volver al centro
    setHandlePos({ x: 0, y: 0 });
    setActiveDir(null);
    currentDirRef.current = null;

    // Emitir DETENER / Parar ráfaga continua inmediatamente al soltar
    currentCmdRef.current = null;
    if (onStopContinuous) {
      onStopContinuous();
    } else {
      onCommand(9, 'DETENER');
    }
  }, [onCommand, onStopContinuous]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center select-none touch-none w-full">
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-950 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none ${
          disabled ? 'opacity-40 pointer-events-none' : ''
        }`}
        style={{
          boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.6)',
        }}
      >
        {/* Zona neutral / Círculo central */}
        <div className="absolute w-12 h-12 rounded-full border border-dashed border-slate-600/60 pointer-events-none" />

        {/* Indicadores Cardinales */}
        <span
          className={`absolute top-2 font-bold text-[9px] tracking-wider transition-all pointer-events-none ${
            activeDir === 'up'
              ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]'
              : 'text-slate-500'
          }`}
        >
          ▲ AVANCE
        </span>
        <span
          className={`absolute bottom-2 font-bold text-[9px] tracking-wider transition-all pointer-events-none ${
            activeDir === 'down'
              ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]'
              : 'text-slate-500'
          }`}
        >
          ▼ REVERSA
        </span>
        <span
          className={`absolute left-2 font-bold text-[9px] tracking-wider transition-all pointer-events-none ${
            activeDir === 'left'
              ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]'
              : 'text-slate-500'
          }`}
        >
          ◀ IZQ
        </span>
        <span
          className={`absolute right-2 font-bold text-[9px] tracking-wider transition-all pointer-events-none ${
            activeDir === 'right'
              ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]'
              : 'text-slate-500'
          }`}
        >
          DER ▶
        </span>

        {/* Pomo móvil del joystick */}
        {/* Sin transición CSS mientras se arrastra (evita rebotes y desfases con el dedo); transición suave al soltar */}
        <div
          className={`absolute w-15 h-15 sm:w-16 sm:h-16 rounded-full border-2 border-amber-300 bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 shadow-lg pointer-events-none flex items-center justify-center will-change-transform ${
            isDragging ? 'transition-none' : 'transition-transform duration-150 ease-out'
          }`}
          style={{
            transform: `translate(${handlePos.x}px, ${handlePos.y}px)`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.4)',
          }}
        >
          <div className="w-4.5 h-4.5 rounded-full bg-amber-950/70 border border-amber-900/50" />
        </div>
      </div>

      <span className="text-[9px] text-slate-500 mt-1 font-mono">
        Pulgar Izquierdo • Centro Parar
      </span>
    </div>
  );
};
