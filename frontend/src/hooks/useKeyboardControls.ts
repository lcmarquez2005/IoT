import { useEffect, useState, useRef } from 'react';

interface KeyboardControlsProps {
  onCommand: (codigo: number, nombre: string) => void;
  onStartContinuous?: (codigo: number, nombre: string) => void;
  onStopContinuous?: () => void;
  enabled?: boolean;
}

const MOVEMENT_KEY_MAP: Record<string, { code: number; name: string }> = {
  w: { code: 1, name: 'AVANZAR' },
  arrowup: { code: 1, name: 'AVANZAR' },
  s: { code: 2, name: 'RETROCEDER' },
  arrowdown: { code: 2, name: 'RETROCEDER' },
  a: { code: 3, name: 'GIRAR_IZQUIERDA' },
  arrowleft: { code: 3, name: 'GIRAR_IZQUIERDA' },
  d: { code: 4, name: 'GIRAR_DERECHA' },
  arrowright: { code: 4, name: 'GIRAR_DERECHA' },
  k: { code: 5, name: 'SUBIR_BRAZO' },
  j: { code: 6, name: 'BAJAR_BRAZO' },
  h: { code: 7, name: 'ROTAR_DERECHA' },
  l: { code: 8, name: 'ROTAR_IZQUIERDA' },
};

export function useKeyboardControls({
  onCommand,
  onStartContinuous,
  onStopContinuous,
  enabled = true,
}: KeyboardControlsProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  // Pila de teclas de movimiento activas para soportar transiciones fluidas sin interrupción
  const activeMovementStackRef = useRef<string[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.repeat) return; // Evitar disparos repetidos automáticos por mantener presionada

      const key = e.key.toLowerCase();

      // Si es una tecla de movimiento continuo
      if (key in MOVEMENT_KEY_MAP) {
        e.preventDefault();
        setActiveKey(key);

        // Agregar al tope de la pila de movimientos activos
        activeMovementStackRef.current = activeMovementStackRef.current.filter((k) => k !== key);
        activeMovementStackRef.current.push(key);

        const cmd = MOVEMENT_KEY_MAP[key];
        if (onStartContinuous) {
          onStartContinuous(cmd.code, cmd.name);
        } else {
          onCommand(cmd.code, cmd.name);
        }
        return;
      }

      // Paro de emergencia
      if (key === ' ') {
        e.preventDefault();
        activeMovementStackRef.current = [];
        setActiveKey(null);
        if (onStopContinuous) {
          onStopContinuous();
        } else {
          onCommand(9, 'DETENER');
        }
        return;
      }

      // Comandos auxiliares de pulso único
      setActiveKey(key);
      switch (key) {
        case '1':
          e.preventDefault();
          onCommand(10, 'ENCENDER');
          break;
        case '2':
          e.preventDefault();
          onCommand(11, 'TOGGLE_MUSIC');
          break;
        case '3':
          e.preventDefault();
          onCommand(12, 'TOGGLE_LIGHT');
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key in MOVEMENT_KEY_MAP) {
        // Remover de la pila de movimientos activos
        activeMovementStackRef.current = activeMovementStackRef.current.filter((k) => k !== key);

        if (activeMovementStackRef.current.length > 0) {
          // Si aún quedan teclas de movimiento presionadas, transicionar directamente a la última
          const previousKey = activeMovementStackRef.current[activeMovementStackRef.current.length - 1];
          setActiveKey(previousKey);
          const nextCmd = MOVEMENT_KEY_MAP[previousKey];
          if (onStartContinuous) {
            onStartContinuous(nextCmd.code, nextCmd.name);
          } else {
            onCommand(nextCmd.code, nextCmd.name);
          }
        } else {
          // Solo si no queda ninguna tecla de movimiento presionada, emitir DETENER
          setActiveKey(null);
          if (onStopContinuous) {
            onStopContinuous();
          } else {
            onCommand(9, 'DETENER');
          }
        }
        return;
      }

      if (activeKey === key) {
        setActiveKey(null);
      }
    };

    const handleWindowBlur = () => {
      // Si la ventana pierde foco, detener cualquier movimiento por seguridad
      if (activeMovementStackRef.current.length > 0) {
        activeMovementStackRef.current = [];
        setActiveKey(null);
        if (onStopContinuous) {
          onStopContinuous();
        } else {
          onCommand(9, 'DETENER');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, activeKey, onCommand, onStartContinuous, onStopContinuous]);

  return { activeKey };
}
