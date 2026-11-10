import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DriveControls } from './components/DriveControls';
import { ArmControls } from './components/ArmControls';
import { AuxiliaryActions } from './components/AuxiliaryActions';
import { DemoPanel } from './components/DemoPanel';
import { TelemetryLog } from './components/TelemetryLog';
import { useVehicleWebSocket } from './hooks/useVehicleWebSocket';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { enviarMovimiento, obtenerEstadoVehiculo } from './services/api';

export function App() {
  const [vehiculoId, setVehiculoId] = useState<number>(() => {
    const saved = localStorage.getItem('IOT_VEHICULO_ID');
    return saved ? Number(saved) : 1;
  });

  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const [vehicleConnected, setVehicleConnected] = useState(false);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Hook del WebSocket
  const { status: wsStatus, lastMessage, eventLogs, reconnect, clearLogs } = useVehicleWebSocket(vehiculoId);

  // Guardar ID en localStorage
  useEffect(() => {
    localStorage.setItem('IOT_VEHICULO_ID', String(vehiculoId));
  }, [vehiculoId]);

  // Consultar estado en base de datos
  useEffect(() => {
    let interval: number;
    const fetchStatus = () => {
      obtenerEstadoVehiculo(vehiculoId)
        .then((res) => {
          setVehicleConnected(res.conectado);
        })
        .catch(() => {
          setVehicleConnected(false);
        });
    };

    fetchStatus();
    interval = window.setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [vehiculoId]);

  // Actualizar estado si llega evento por WS
  useEffect(() => {
    if (lastMessage) {
      if (typeof lastMessage.conectado === 'boolean') {
        setVehicleConnected(lastMessage.conectado);
      }
      if (lastMessage.comando) {
        setActiveCommand(lastMessage.comando);
        const timer = setTimeout(() => setActiveCommand(null), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [lastMessage]);

  // Manejador centralizado para enviar comandos
  const handleSendCommand = useCallback(
    async (codigo: number, nombre: string) => {
      setActiveCommand(nombre);
      try {
        await enviarMovimiento(vehiculoId, codigo, 'REACT_DASHBOARD');
      } catch (err: any) {
        console.error('Error enviando comando:', err);
        setNotification({
          msg: err.message || `Fallo al enviar comando ${nombre}`,
          type: 'error',
        });
        setTimeout(() => setNotification(null), 3500);
      }
    },
    [vehiculoId]
  );

  // Teclado físico
  useKeyboardControls({
    onCommand: handleSendCommand,
    enabled: keyboardEnabled,
  });

  // Progreso de rutina DEMO en vivo desde eventos WebSocket
  const demoProgress = lastMessage && lastMessage.evento === 'DEMO_MOVIMIENTO'
    ? {
        demo: lastMessage.demo || 'Demo Activa',
        pasoActual: lastMessage.paso_actual || 0,
        totalMovimientos: lastMessage.total_movimientos || 0,
        comando: lastMessage.comando,
      }
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Header con Estado y Configuración */}
      <Header
        wsStatus={wsStatus}
        vehicleConnected={vehicleConnected}
        onReconnectWs={reconnect}
        vehiculoId={vehiculoId}
        setVehiculoId={setVehiculoId}
        keyboardEnabled={keyboardEnabled}
        setKeyboardEnabled={setKeyboardEnabled}
      />

      {/* Notificación flotante */}
      {notification && (
        <div className="fixed top-16 right-4 z-50 animate-in fade-in slide-in-from-top-2">
          <div
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-2xl flex items-center gap-2 ${
              notification.type === 'error'
                ? 'bg-rose-950/90 text-rose-300 border-rose-500/30'
                : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {notification.msg}
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Grilla Superior de Controles Principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Col 1: Navegación y Orugas */}
          <DriveControls
            onCommand={handleSendCommand}
            activeCommand={activeCommand}
          />

          {/* Col 2: Brazo y Torre */}
          <ArmControls
            onCommand={handleSendCommand}
            activeCommand={activeCommand}
          />

          {/* Col 3: Auxiliares y Parada de Emergencia */}
          <AuxiliaryActions
            onCommand={handleSendCommand}
            activeCommand={activeCommand}
          />
        </div>

        {/* Grilla Inferior: Automatización DEMO y Telemetría */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* DEMO Panel */}
          <div className="lg:col-span-5">
            <DemoPanel
              vehiculoId={vehiculoId}
              demoProgress={demoProgress}
            />
          </div>

          {/* Telemetría y Log */}
          <div className="lg:col-span-7">
            <TelemetryLog
              vehiculoId={vehiculoId}
              eventLogs={eventLogs}
              onClearLogs={clearLogs}
              lastMessage={lastMessage}
            />
          </div>
        </div>
      </main>

      {/* Footer de Estado y Atajos */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>Control Remoto por WSS • 74HC595 + Optoacopladores • AWS EC2 & RDS</span>
          <div className="flex gap-4">
            <span>[W,A,S,D] Orugas</span>
            <span>[H,J,K,L] Brazo</span>
            <span>[Espacio] Paro</span>
            <span>[1,2,3] Auxiliares</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
