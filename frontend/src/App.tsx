import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { VirtualJoystick } from './components/VirtualJoystick';
import { ArmControls } from './components/ArmControls';
import { CenterConsole } from './components/CenterConsole';
import { TelemetryLog } from './components/TelemetryLog';
import { MonitoringView } from './components/MonitoringView';
import { useVehicleWebSocket } from './hooks/useVehicleWebSocket';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { enviarMovimiento, obtenerEstadoVehiculo, verificarSaludApi } from './services/api';
import { Smartphone } from 'lucide-react';
import { WSEventMessage, formatCommandName } from './types/vehicle';

export function App() {
  const [activeTab, setActiveTab] = useState<'control' | 'monitoring'>('control');
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  const [vehiculoId, setVehiculoId] = useState<number>(() => {
    const saved = localStorage.getItem('IOT_VEHICULO_ID');
    return saved ? Number(saved) : 1;
  });

  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const [vehicleConnected, setVehicleConnected] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
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

  // Comprobación periódica de salud de la API (Servidor AWS 21 APIs)
  useEffect(() => {
    let timer: number;
    const checkHealth = () => {
      verificarSaludApi()
        .then((ok) => setApiHealthy(ok))
        .catch(() => setApiHealthy(false));
    };
    checkHealth();
    timer = window.setInterval(checkHealth, 8000);
    return () => clearInterval(timer);
  }, []);

  // Control de scroll y touch-action según la pestaña activa (Control bloquea scroll móvil; Monitoreo lo rehabilita)
  useEffect(() => {
    if (activeTab === 'control') {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.touchAction = 'none';
    } else {
      document.body.style.overflow = 'auto';
      document.body.style.touchAction = 'auto';
      document.documentElement.style.overflow = 'auto';
      document.documentElement.style.touchAction = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
      document.body.style.touchAction = 'auto';
      document.documentElement.style.overflow = 'auto';
      document.documentElement.style.touchAction = 'auto';
    };
  }, [activeTab]);

  // Actualizar bandera 'conectado' y último evento WS
  useEffect(() => {
    if (lastMessage) {
      if (typeof lastMessage.conectado === 'boolean') {
        setVehicleConnected(lastMessage.conectado);
      }
      const displayCmd = formatCommandName(lastMessage.comando, lastMessage.codigo);
      setLastWsEvent(`${lastMessage.evento} ${displayCmd} [${lastMessage.codigo ?? ''}]`);
    }
  }, [lastMessage]);

  // Refs para control de latido continuo y transiciones fluidas de ultra-baja latencia
  const continuousTimerRef = useRef<number | null>(null);
  const activeContinuousRef = useRef<{ codigo: number; nombre: string } | null>(null);
  const stopDebounceTimerRef = useRef<number | null>(null);
  const isSendingHeartbeatRef = useRef(false);
  const heartbeatAbortRef = useRef<AbortController | null>(null);

  // Manejador centralizado de envío de comandos
  const handleSendCommand = useCallback(
    async (codigo: number, nombre: string, isHeartbeat: boolean = false) => {
      // Si se envía DETENER (código 9), limpiar ráfagas y cancelar latidos pendientes
      if (codigo === 9) {
        if (continuousTimerRef.current !== null) {
          clearInterval(continuousTimerRef.current);
          continuousTimerRef.current = null;
        }
        if (stopDebounceTimerRef.current !== null) {
          clearTimeout(stopDebounceTimerRef.current);
          stopDebounceTimerRef.current = null;
        }
        activeContinuousRef.current = null;
      }

      // Si es una orden nueva del usuario (no un latido repetido), abortar cualquier latido previo en vuelo
      if (!isHeartbeat) {
        if (heartbeatAbortRef.current) {
          try {
            heartbeatAbortRef.current.abort();
          } catch {}
          heartbeatAbortRef.current = null;
        }
        const displayCmd = formatCommandName(nombre, codigo);
        setLastAction({ nombre: displayCmd, codigo });
      }

      let signal: AbortSignal | undefined;
      if (isHeartbeat) {
        isSendingHeartbeatRef.current = true;
        const ctrl = new AbortController();
        heartbeatAbortRef.current = ctrl;
        signal = ctrl.signal;
      }

      try {
        const res = await enviarMovimiento(vehiculoId, codigo, 'REACT_DASHBOARD', signal);
        if (!isHeartbeat) {
          setLastHttpResult(`HTTP 200 — ${res.mensaje || 'Aceptado'}`);
        }

        // Si el WS no estuviera conectado en este instante, registrar en el log local para feedback inmediato
        if (wsStatus !== 'connected' && res && !isHeartbeat) {
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
        // Ignorar abortos provocados intencionalmente por cambio inmediato de dirección
        if (err.name === 'AbortError') {
          return;
        }
        console.error('Error enviando comando:', err);
        if (!isHeartbeat) {
          setLastHttpResult(`Error: ${err.message}`);
          setNotification({
            msg: err.message || `Fallo al enviar comando ${nombre}`,
            type: 'error',
          });
          setTimeout(() => setNotification(null), 3500);
        }
      } finally {
        if (isHeartbeat) {
          isSendingHeartbeatRef.current = false;
        }
      }
    },
    [vehiculoId, wsStatus]
  );

  // Detener ráfaga continua con buffer inteligente (40 ms) para evitar frenado en transiciones rápidas
  const handleStopContinuous = useCallback(() => {
    const wasActive = activeContinuousRef.current !== null || continuousTimerRef.current !== null;
    if (continuousTimerRef.current !== null) {
      clearInterval(continuousTimerRef.current);
      continuousTimerRef.current = null;
    }
    activeContinuousRef.current = null;

    if (stopDebounceTimerRef.current !== null) {
      clearTimeout(stopDebounceTimerRef.current);
      stopDebounceTimerRef.current = null;
    }

    if (wasActive) {
      // 40 ms de margen: si el usuario pasa rápido a otra tecla, se cancela este DETENER
      stopDebounceTimerRef.current = window.setTimeout(() => {
        stopDebounceTimerRef.current = null;
        handleSendCommand(9, 'DETENER');
      }, 40);
    }
  }, [handleSendCommand]);

  // Iniciar ráfaga continua periódica (Heartbeat a 110 ms para mantener cómodo el watchdog de 300 ms del ESP32)
  const handleStartContinuous = useCallback(
    (codigo: number, nombre: string) => {
      // Si había un DETENER programado, cancelarlo de inmediato: es una transición directa
      if (stopDebounceTimerRef.current !== null) {
        clearTimeout(stopDebounceTimerRef.current);
        stopDebounceTimerRef.current = null;
      }

      if (activeContinuousRef.current?.codigo === codigo && continuousTimerRef.current !== null) {
        return;
      }

      if (continuousTimerRef.current !== null) {
        clearInterval(continuousTimerRef.current);
        continuousTimerRef.current = null;
      }

      // Abortar cualquier latido previo obsoleto
      if (heartbeatAbortRef.current) {
        try {
          heartbeatAbortRef.current.abort();
        } catch {}
        heartbeatAbortRef.current = null;
      }

      activeContinuousRef.current = { codigo, nombre };
      // Enviar la nueva dirección inmediatamente
      handleSendCommand(codigo, nombre, false);

      // Latido continuo a 110 ms (garantiza que el ESP32 nunca se quede sin comando antes de 300 ms)
      continuousTimerRef.current = window.setInterval(() => {
        if (activeContinuousRef.current && !isSendingHeartbeatRef.current) {
          handleSendCommand(activeContinuousRef.current.codigo, activeContinuousRef.current.nombre, true);
        }
      }, 110);
    },
    [handleSendCommand]
  );

  // Limpiar temporizadores al desmontar
  useEffect(() => {
    return () => {
      if (continuousTimerRef.current !== null) {
        clearInterval(continuousTimerRef.current);
      }
      if (stopDebounceTimerRef.current !== null) {
        clearTimeout(stopDebounceTimerRef.current);
      }
      if (heartbeatAbortRef.current) {
        try {
          heartbeatAbortRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Combinar logs de WS con logs locales si los hay
  const combinedLogs = [...localLogs, ...eventLogs].slice(0, 100);

  const handleClearLogs = useCallback(() => {
    clearLogs();
    setLocalLogs([]);
  }, [clearLogs]);

  // Teclado físico (solo activo en la vista Control)
  useKeyboardControls({
    onCommand: handleSendCommand,
    onStartContinuous: handleStartContinuous,
    onStopContinuous: handleStopContinuous,
    enabled: keyboardEnabled && activeTab === 'control',
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

  return (
    <div
      className={`min-h-screen flex flex-col bg-slate-950 text-slate-100 ${
        activeTab === 'control' || isFullscreen ? 'h-screen overflow-hidden' : 'overflow-y-auto'
      }`}
    >
      {/* Header con Estado, Indicadores, Pestañas de Navegación y Botón Fullscreen */}
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        apiHealthy={apiHealthy}
      />

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

      {/* Contenido Principal Multivista (Mobile First) */}
      <main
        className={`w-full max-w-6xl mx-auto p-1.5 sm:p-3 flex flex-col ${
          activeTab === 'control' ? 'flex-1 justify-center' : 'py-3'
        }`}
      >
        {/* VISTA 1: CONTROL REMOTO (GAMEPAD RC) */}
        <div className={activeTab === 'control' ? 'block' : 'hidden'}>
          <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-2 sm:p-3.5 shadow-xl backdrop-blur-md">
            {/* Tip móvil de orientación (solo visible en pantallas verticales estrechas) */}
            <div className="sm:hidden text-center mb-1 text-[9px] text-amber-400/80 font-mono flex items-center justify-center gap-1">
              <Smartphone className="w-2.5 h-2.5" />
              <span>Gira tu celular o pulsa Fullscreen para modo control</span>
            </div>

            {/* Grilla Gamepad: IZQUIERDA (Joystick) | CENTRO (Consola/Comodines/Paro) | DERECHA (Brazo/Pala) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 items-center justify-items-center">
              {/* 1. FLANCO IZQUIERDO: Joystick de Tracción (Orugas 1-4) */}
              <div className="w-full flex flex-col items-center justify-center">
                <VirtualJoystick
                  onCommand={handleSendCommand}
                  onStartContinuous={handleStartContinuous}
                  onStopContinuous={handleStopContinuous}
                  demoCommand={demoCommand}
                  disabled={isDemoExecuting}
                />
              </div>

              {/* 2. CONSOLA CENTRAL: Encendido, Comodines (Luces/Música), Parada de Emergencia y DEMO */}
              <div className="w-full flex flex-col items-center justify-center">
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
              <div className="w-full flex flex-col items-center justify-center">
                <ArmControls
                  onCommand={handleSendCommand}
                  onStartContinuous={handleStartContinuous}
                  onStopContinuous={handleStopContinuous}
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
        </div>

        {/* VISTA 2: MONITOREO EN TIEMPO REAL (PRÁCTICA 4.2) */}
        <div className={activeTab === 'monitoring' ? 'block' : 'hidden'}>
          <MonitoringView
            vehiculoId={vehiculoId}
            lastWsMessage={lastMessage}
            wsStatus={wsStatus}
          />
        </div>
      </main>

      {/* Footer de Créditos */}
      <footer className="border-t border-slate-900 bg-slate-950/90 px-4 py-2 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <span>Desarrollado por <strong>Luis Carlos Márquez Strociak</strong> · 2026</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
