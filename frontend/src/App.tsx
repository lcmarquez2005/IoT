import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { VirtualJoystick } from './components/VirtualJoystick';
import { ArmControls } from './components/ArmControls';
import { CenterConsole } from './components/CenterConsole';
import { TelemetryLog } from './components/TelemetryLog';
import { useVehicleWebSocket } from './hooks/useVehicleWebSocket';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { enviarMovimiento, obtenerEstadoVehiculo, isLocalEnvironment } from './services/api';
import { ShieldAlert, ExternalLink, X, Smartphone } from 'lucide-react';
import { WSEventMessage } from './types/vehicle';

export function App() {
  const [vehiculoId, setVehiculoId] = useState<number>(() => {
    const saved = localStorage.getItem('IOT_VEHICULO_ID');
    return saved ? Number(saved) : 1;
  });

  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const [vehicleConnected, setVehicleConnected] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [dismissSslBanner, setDismissSslBanner] = useState(false);
  const [localLogs, setLocalLogs] = useState<WSEventMessage[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Retroalimentación operativa compacta
  const [lastAction, setLastAction] = useState<{ nombre: string; codigo: number } | null>(null);
  const [lastHttpResult, setLastHttpResult] = useState<string | null>(null);
  const [lastWsEvent, setLastWsEvent] = useState<string | null>(null);

  // Hook del WebSocket con keep-alive
  const { status: wsStatus, lastMessage, eventLogs, reconnect, clearLogs } = useVehicleWebSocket(vehiculoId);

  // Detección de cambios de pantalla completa
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => {
          if (screen.orientation && (screen.orientation as any).lock) {
            (screen.orientation as any).lock('landscape').catch(() => {});
          }
        })
        .catch((err) => console.warn('Fullscreen no admitido:', err));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, []);

  // Guardar ID en localStorage
  useEffect(() => {
    localStorage.setItem('IOT_VEHICULO_ID', String(vehiculoId));
  }, [vehiculoId]);

  // Consultar estado en base de datos periódicamente (cada 4s)
  useEffect(() => {
    let interval: number;
    const fetchStatus = () => {
      obtenerEstadoVehiculo(vehiculoId)
        .then((res) => {
          setVehicleConnected(Boolean(res.conectado));
        })
        .catch(() => {
          setVehicleConnected(false);
        });
    };

    fetchStatus();
    interval = window.setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [vehiculoId]);

  // Actualizar bandera 'conectado' y último evento WS
  useEffect(() => {
    if (lastMessage) {
      if (typeof lastMessage.conectado === 'boolean') {
        setVehicleConnected(lastMessage.conectado);
      }
      setLastWsEvent(`${lastMessage.evento} ${lastMessage.comando || ''} [${lastMessage.codigo ?? ''}]`);
    }
  }, [lastMessage]);

  // Manejador centralizado de envío de comandos
  const handleSendCommand = useCallback(
    async (codigo: number, nombre: string) => {
      setLastAction({ nombre, codigo });
      try {
        const res = await enviarMovimiento(vehiculoId, codigo, 'REACT_DASHBOARD');
        setLastHttpResult(`HTTP 200 — ${res.mensaje || 'Aceptado'}`);

        // Si el WS no estuviera conectado en este instante, registrar en el log local para feedback inmediato
        if (wsStatus !== 'connected' && res) {
          const mockMsg: WSEventMessage = {
            evento: 'MOVIMIENTO_INDIVIDUAL',
            id_vehiculo: vehiculoId,
            comando: res.comando || nombre,
            codigo: res.codigo || codigo,
            origen: res.origen || 'REACT_DASHBOARD',
            conectado: res.conectado ?? true,
            timestamp: new Date().toISOString(),
          };
          setLocalLogs((prev) => [mockMsg, ...prev.slice(0, 49)]);
        }
      } catch (err: any) {
        console.error('Error enviando comando:', err);
        setLastHttpResult(`Error: ${err.message}`);
        setNotification({
          msg: err.message || `Fallo al enviar comando ${nombre}`,
          type: 'error',
        });
        setTimeout(() => setNotification(null), 3500);
      }
    },
    [vehiculoId, wsStatus]
  );

  // Combinar logs de WS con logs locales si los hay
  const combinedLogs = [...localLogs, ...eventLogs].slice(0, 100);

  const handleClearLogs = useCallback(() => {
    clearLogs();
    setLocalLogs([]);
  }, [clearLogs]);

  // Teclado físico
  useKeyboardControls({
    onCommand: handleSendCommand,
    enabled: keyboardEnabled,
  });

  // Comando activo ÚNICAMENTE durante una rutina DEMO
  const isDemoExecuting = lastMessage?.evento === 'DEMO_MOVIMIENTO';
  const demoCommand = isDemoExecuting ? (lastMessage?.comando || null) : null;

  const demoProgress = lastMessage && (lastMessage.evento === 'DEMO_MOVIMIENTO' || lastMessage.evento === 'DEMO_INICIO')
    ? {
        demo: lastMessage.demo || 'Demo Activa',
        pasoActual: lastMessage.paso_actual || 0,
        totalMovimientos: lastMessage.total_movimientos || 0,
        comando: lastMessage.comando,
      }
    : null;

  const showSslNotice = !isLocalEnvironment() && wsStatus !== 'connected' && !dismissSslBanner;

  return (
    <div className={`min-h-screen flex flex-col bg-slate-950 text-slate-100 ${isFullscreen ? 'h-screen overflow-hidden' : ''}`}>
      {/* Header con Estado, Indicadores y Botón Fullscreen */}
      <Header
        wsStatus={wsStatus}
        vehicleConnected={vehicleConnected}
        onReconnectWs={reconnect}
        vehiculoId={vehiculoId}
        setVehiculoId={setVehiculoId}
        keyboardEnabled={keyboardEnabled}
        setKeyboardEnabled={setKeyboardEnabled}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Banner de Aviso de Certificado SSL de AWS para producción */}
      {showSslNotice && (
        <div className="bg-amber-950/70 border-b border-amber-500/30 px-3 py-2 text-xs text-amber-200">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>¿WSS desconectado en Vercel?</strong> AWS EC2 usa certificado auto-firmado:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://ec2-100-50-120-115.compute-1.amazonaws.com/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded text-xs transition-colors shadow"
              >
                Autorizar Certificado AWS
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setDismissSslBanner(true)}
                className="p-1 text-amber-400/70 hover:text-white"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación flotante de error */}
      {notification && (
        <div className="fixed top-14 right-4 z-50 animate-in fade-in slide-in-from-top-2">
          <div
            className={`px-4 py-2 rounded-xl border text-xs font-semibold shadow-2xl flex items-center gap-2 ${
              notification.type === 'error'
                ? 'bg-rose-950/95 text-rose-300 border-rose-500/40'
                : 'bg-emerald-950/95 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {notification.msg}
          </div>
        </div>
      )}

      {/* Contenido Principal: Chasis de Control Remoto Gamepad (Mobile First) */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 flex flex-col justify-center">
        <div className="bg-slate-900/80 border-2 border-slate-800/90 rounded-3xl p-3 sm:p-5 shadow-2xl backdrop-blur-md">
          {/* Tip móvil de orientación (solo visible en pantallas verticales estrechas) */}
          <div className="sm:hidden text-center mb-1 text-[10px] text-amber-400/80 font-mono flex items-center justify-center gap-1">
            <Smartphone className="w-3 h-3" />
            <span>Gira tu celular o pulsa Pantalla Completa para modo control remoto</span>
          </div>

          {/* Grilla Gamepad: IZQUIERDA (Joystick) | CENTRO (Consola/Comodines/Paro) | DERECHA (Brazo/Pala) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center justify-items-center">
            {/* 1. FLANCO IZQUIERDO: Joystick de Tracción (Orugas 1-4) */}
            <div className="w-full flex flex-col items-center justify-center py-1">
              <VirtualJoystick
                onCommand={handleSendCommand}
                demoCommand={demoCommand}
                disabled={isDemoExecuting}
              />
            </div>

            {/* 2. CONSOLA CENTRAL: Encendido, Comodines (Luces/Música), Parada de Emergencia y DEMO */}
            <div className="w-full flex flex-col items-center justify-center py-1">
              <CenterConsole
                vehiculoId={vehiculoId}
                onCommand={handleSendCommand}
                demoProgress={demoProgress}
                lastAction={lastAction}
                lastHttpResult={lastHttpResult}
                lastWsEvent={lastWsEvent}
                disabled={isDemoExecuting}
              />
            </div>

            {/* 3. FLANCO DERECHO: Clúster de Brazo y Pala (Pulgar Derecho) */}
            <div className="w-full flex flex-col items-center justify-center py-1">
              <ArmControls
                onCommand={handleSendCommand}
                demoCommand={demoCommand}
                disabled={isDemoExecuting}
              />
            </div>
          </div>
        </div>

        {/* Panel secundario de Telemetría expandible en pantallas medianas/grandes */}
        <div className="mt-4 hidden lg:block">
          <TelemetryLog
            vehiculoId={vehiculoId}
            eventLogs={combinedLogs}
            onClearLogs={handleClearLogs}
            lastMessage={lastMessage}
          />
        </div>
      </main>

      {/* Footer de Créditos */}
      <footer className="border-t border-slate-900 bg-slate-950/90 px-4 py-2.5 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>Desarrollado por <strong>Luis Carlos Márquez Strociak</strong> · 2026</span>
          <div className="flex gap-4 opacity-75">
            <span>[WASD] Joystick</span>
            <span>[Espacio] Paro</span>
            <span>[1] Power</span>
            <span>[2] Música</span>
            <span>[3] Luz</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
