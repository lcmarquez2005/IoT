import { useEffect, useState } from 'react';

interface KeyboardControlsProps {
  onCommand: (codigo: number, nombre: string) => void;
  enabled?: boolean;
}

export function useKeyboardControls({ onCommand, enabled = true }: KeyboardControlsProps) {
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

      switch (key) {
        // --- MOVIMIENTO BASE ---
        case 'w':
        case 'arrowup':
          e.preventDefault();
          onCommand(1, 'AVANZAR');
          break;
        case 's':
        case 'arrowdown':
          e.preventDefault();
          onCommand(2, 'RETROCEDER');
          break;
        case 'a':
        case 'arrowleft':
          e.preventDefault();
          onCommand(3, 'GIRAR_IZQUIERDA');
          break;
        case 'd':
        case 'arrowright':
          e.preventDefault();
          onCommand(4, 'GIRAR_DERECHA');
          break;

        // --- BRAZO Y TORRE ---
        case 'k':
          e.preventDefault();
          onCommand(5, 'SUBIR_BRAZO');
          break;
        case 'j':
          e.preventDefault();
          onCommand(6, 'BAJAR_BRAZO');
          break;
        case 'h':
          e.preventDefault();
          onCommand(7, 'ABRIR_PALA');
          break;
        case 'l':
          e.preventDefault();
          onCommand(8, 'CERRAR_PALA');
          break;

        // --- PARO DE EMERGENCIA ---
        case ' ':
          e.preventDefault();
          onCommand(9, 'DETENER');
          break;

        // --- AUXILIARES ---
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

    const handleKeyUp = () => {
      setActiveKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, onCommand]);

  return { activeKey };
}
