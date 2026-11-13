import { useEffect, useState } from 'react';

interface KeyboardControlsProps {
  onCommand: (codigo: number, nombre: string) => void;
  onStartContinuous?: (codigo: number, nombre: string) => void;
  onStopContinuous?: () => void;
  enabled?: boolean;
}

export function useKeyboardControls({
  onCommand,
  onStartContinuous,
  onStopContinuous,
  enabled = true,
}: KeyboardControlsProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

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
      setActiveKey(key);

      const triggerContinuous = (code: number, name: string) => {
        if (onStartContinuous) {
          onStartContinuous(code, name);
        } else {
          onCommand(code, name);
        }
      };

      switch (key) {
        // --- MOVIMIENTO BASE ---
        case 'w':
        case 'arrowup':
          e.preventDefault();
          triggerContinuous(1, 'AVANZAR');
          break;
        case 's':
        case 'arrowdown':
          e.preventDefault();
          triggerContinuous(2, 'RETROCEDER');
          break;
        case 'a':
        case 'arrowleft':
          e.preventDefault();
          triggerContinuous(3, 'GIRAR_IZQUIERDA');
          break;
        case 'd':
        case 'arrowright':
          e.preventDefault();
          triggerContinuous(4, 'GIRAR_DERECHA');
          break;

        // --- BRAZO Y TORRE ---
        case 'k':
          e.preventDefault();
          triggerContinuous(5, 'SUBIR_BRAZO');
          break;
        case 'j':
          e.preventDefault();
          triggerContinuous(6, 'BAJAR_BRAZO');
          break;
        case 'h':
          e.preventDefault();
          triggerContinuous(7, 'ABRIR_PALA');
          break;
        case 'l':
          e.preventDefault();
          triggerContinuous(8, 'CERRAR_PALA');
          break;

        // --- PARO DE EMERGENCIA ---
        case ' ':
          e.preventDefault();
          if (onStopContinuous) {
            onStopContinuous();
          } else {
            onCommand(9, 'DETENER');
          }
          break;

        // --- AUXILIARES (Pulso único) ---
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
      setActiveKey(null);

      // Si se soltó una tecla de movimiento o brazo, enviar DETENER / parar latido
      if (['w', 'arrowup', 's', 'arrowdown', 'a', 'arrowleft', 'd', 'arrowright', 'k', 'j', 'h', 'l'].includes(key)) {
        if (onStopContinuous) {
          onStopContinuous();
        } else {
          onCommand(9, 'DETENER');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, onCommand, onStartContinuous, onStopContinuous]);

  return { activeKey };
}
