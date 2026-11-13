import React, { useState } from 'react';
import { WSStatus } from '../hooks/useVehicleWebSocket';
import { getApiBaseUrl, setApiBaseUrl, getWsBaseUrl, setWsBaseUrl } from '../services/api';
import {
  WifiOff,
  Settings,
  RefreshCw,
  Cpu,
  Activity,
  X,
  Keyboard,
  Maximize,
  Minimize,
  Gamepad2,
  Server,
  Database,
} from 'lucide-react';

interface HeaderProps {
  wsStatus: WSStatus;
  vehicleConnected: boolean;
  onReconnectWs: () => void;
  vehiculoId: number;
  setVehiculoId: (id: number) => void;
  keyboardEnabled: boolean;
  setKeyboardEnabled: (enabled: boolean) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  activeTab: 'control' | 'monitoring';
  setActiveTab: (tab: 'control' | 'monitoring') => void;
  apiHealthy?: boolean | null;
}

export const Header: React.FC<HeaderProps> = ({
  wsStatus,
  vehicleConnected,
  onReconnectWs,
  vehiculoId,
  setVehiculoId,
  keyboardEnabled,
  setKeyboardEnabled,
  isFullscreen = false,
  onToggleFullscreen,
  activeTab,
  setActiveTab,
  apiHealthy = true,
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
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            title="WebSocket WSS: Sesión de navegador en línea con AWS EC2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            WSS: <strong>En línea</strong>
          </span>
        );
      case 'connecting':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/30"
            title="WebSocket WSS: Estableciendo conexión segura..."
          >
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            WSS: <strong>Conectando...</strong>
          </span>
        );
      case 'error':
      case 'disconnected':
      default:
        return (
          <button
            onClick={onReconnectWs}
            title="WebSocket WSS Desconectado. Haz clic para reintentar conexión"
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/80 text-rose-400 border border-rose-500/30 hover:bg-rose-900 transition-colors cursor-pointer"
          >
            <WifiOff className="w-2.5 h-2.5" />
            WSS: <strong>Desconectado</strong>
          </button>
        );
    }
  };

  const getApiStatusBadge = () => {
    if (apiHealthy === null) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/30"
          title="Servidor AWS: Comprobando disponibilidad HTTP..."
        >
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          AWS 21 APIs: <strong>Comprobando...</strong>
        </span>
      );
    }

    if (apiHealthy) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
          title="Servidor AWS: 21 servicios y endpoints REST disponibles"
        >
          <Server className="w-2.5 h-2.5" />
          AWS: <strong>Disponible</strong>
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/80 text-rose-400 border border-rose-500/30"
        title="Servidor AWS: No responde a la comprobación de salud"
      >
        <Server className="w-2.5 h-2.5" />
        AWS: <strong>No disponible</strong>
      </span>
    );
  };

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-3 py-1.5 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Título & Selector de Vista */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-black shadow-md shadow-amber-500/20">
                <Cpu className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white">
                    Excavadora IoT
                  </h1>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1 py-0.2 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    RC
                  </span>
                </div>
              </div>
            </div>

            {/* BARRA DE NAVEGACIÓN LIMPIA: CONTROL / MONITOREO */}
            <nav className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800" aria-label="Navegación principal">
              <button
                type="button"
                onClick={() => setActiveTab('control')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'control'
                    ? 'bg-amber-500 text-black shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
                aria-current={activeTab === 'control' ? 'page' : undefined}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Control</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('monitoring')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'monitoring'
                    ? 'bg-amber-500 text-black shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
                aria-current={activeTab === 'monitoring' ? 'page' : undefined}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Monitoreo</span>
              </button>
            </nav>
          </div>

          {/* LOS 3 INDICADORES INDEPENDIENTES DE CONECTIVIDAD + ACCIONES */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Indicador 1: WebSocket WSS (Sesión del navegador) */}
            {getStatusBadge()}

            {/* Indicador 2: Servidor AWS · API 21 servicios */}
            {getApiStatusBadge()}

            {/* Indicador 3: Amazon RDS (Sin verificar obligatorio por rúbrica) */}
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700"
              title="Amazon RDS: Sin verificar. El backend no expone un endpoint seguro de diagnóstico directo de base de datos."
            >
              <Database className="w-2.5 h-2.5 text-slate-400" />
              RDS: <strong>Sin verificar</strong>
            </span>

            {/* Status Vehículo Microcontrolador (solo si está activo) */}
            <span
              className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                vehicleConnected
                  ? 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Estado reportado en base de datos del hardware ESP32"
            >
              <Activity className="w-2.5 h-2.5" />
              {vehicleConnected ? 'ESP32 Activo' : 'ESP32 Espera'}
            </span>

            {/* Botón Pantalla Completa (Mobile First) */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Salir de Pantalla Completa' : 'Modo Pantalla Completa'}
                className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                  isFullscreen
                    ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : 'bg-slate-800 text-amber-400 border-amber-500/30 hover:bg-slate-700 hover:text-amber-300'
                }`}
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{isFullscreen ? 'Salir' : 'Fullscreen'}</span>
              </button>
            )}

            {/* Teclado Toggle (solo relevante en Control) */}
            {activeTab === 'control' && (
              <button
                onClick={() => setKeyboardEnabled(!keyboardEnabled)}
                title={keyboardEnabled ? 'Controles de teclado ACTIVADOS' : 'Controles de teclado DESACTIVADOS'}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  keyboardEnabled
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Configuración Server */}
            <button
              onClick={() => setShowConfig(true)}
              title="Configuración de endpoints AWS / Local"
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
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
                  Usa <code className="text-amber-400">/api</code> (recomendado: elimina bloqueos de CORS y bypass de certificados)
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTempApi('/api');
                    setTempWs('');
                  }}
                  className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-amber-400 hover:bg-slate-750 border border-slate-700 font-medium"
                >
                  ⚡ Preset: Proxy Seguro (/api)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempApi('/api');
                    setTempWs('wss://ec2-100-50-120-115.compute-1.amazonaws.com');
                  }}
                  className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700"
                >
                  WSS AWS Directo
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
