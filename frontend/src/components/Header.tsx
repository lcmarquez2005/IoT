import React, { useState } from 'react';
import { WSStatus } from '../hooks/useVehicleWebSocket';
import { getApiBaseUrl, setApiBaseUrl, getWsBaseUrl, setWsBaseUrl } from '../services/api';
import { WifiOff, Settings, RefreshCw, Cpu, Activity, X, Keyboard } from 'lucide-react';

interface HeaderProps {
  wsStatus: WSStatus;
  vehicleConnected: boolean;
  onReconnectWs: () => void;
  vehiculoId: number;
  setVehiculoId: (id: number) => void;
  keyboardEnabled: boolean;
  setKeyboardEnabled: (enabled: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  wsStatus,
  vehicleConnected,
  onReconnectWs,
  vehiculoId,
  setVehiculoId,
  keyboardEnabled,
  setKeyboardEnabled,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [tempApi, setTempApi] = useState(getApiBaseUrl());
  const [tempWs, setTempWs] = useState(getWsBaseUrl());

  const handleSaveConfig = () => {
    setApiBaseUrl(tempApi);
    setWsBaseUrl(tempWs);
    setShowConfig(false);
    window.location.reload();
  };

  const getStatusBadge = () => {
    switch (wsStatus) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            WSS En Línea
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/30">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Reconectando WSS...
          </span>
        );
      case 'error':
      case 'disconnected':
      default:
        return (
          <button
            onClick={onReconnectWs}
            title="Haz clic para reintentar conexión"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-500/30 hover:bg-rose-900 transition-colors cursor-pointer"
          >
            <WifiOff className="w-3 h-3" />
            WSS Desconectado
          </button>
        );
    }
  };

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Título */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-black shadow-lg shadow-amber-500/20">
              <Cpu className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Excavadora IoT
                </h1>
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  v3.1 WSS
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Teleoperación y telemetría en tiempo real
              </p>
            </div>
          </div>

          {/* Estado & Acciones */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Status WSS */}
            {getStatusBadge()}

            {/* Status Vehículo Microcontrolador */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                vehicleConnected
                  ? 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Activity className="w-3 h-3" />
              {vehicleConnected ? 'ESP32 Activo' : 'ESP32 En Espera'}
            </span>

            {/* Teclado Toggle */}
            <button
              onClick={() => setKeyboardEnabled(!keyboardEnabled)}
              title={keyboardEnabled ? 'Controles de teclado ACTIVADOS (WASD, Espacio)' : 'Controles de teclado DESACTIVADOS'}
              className={`p-2 rounded-lg border transition-all ${
                keyboardEnabled
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Configuración Server */}
            <button
              onClick={() => setShowConfig(true)}
              title="Configuración de endpoints AWS / Local"
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Modal de Configuración */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowConfig(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-amber-400" />
              Configuración de Conexión
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Ajusta las direcciones de tu backend en AWS EC2 o entorno local.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ID de Vehículo
                </label>
                <input
                  type="number"
                  value={vehiculoId}
                  onChange={(e) => setVehiculoId(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  URL Base HTTP (API REST)
                </label>
                <input
                  type="text"
                  value={tempApi}
                  onChange={(e) => setTempApi(e.target.value)}
                  placeholder="https://tu-instancia-ec2.compute.amazonaws.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Usa <code className="text-amber-400">/api</code> para el proxy local anti-CORS
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTempApi('/api');
                    setTempWs('');
                  }}
                  className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-amber-400 hover:bg-slate-750 border border-slate-700"
                >
                  ⚡ Preset: Proxy Local (/api)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempApi('https://ec2-100-50-120-115.compute-1.amazonaws.com');
                    setTempWs('wss://ec2-100-50-120-115.compute-1.amazonaws.com');
                  }}
                  className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700"
                >
                  AWS Directo
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  URL Base WebSocket (WSS / WS)
                </label>
                <input
                  type="text"
                  value={tempWs}
                  onChange={(e) => setTempWs(e.target.value)}
                  placeholder="wss://tu-instancia-ec2.compute.amazonaws.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Ej: ws://localhost:8000 o wss://tu-ec2-url.com
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                Guardar y Recargar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
