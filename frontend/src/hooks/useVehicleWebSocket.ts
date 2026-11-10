import { useState, useEffect, useRef, useCallback } from 'react';
import { WSEventMessage } from '../types/vehicle';
import { getWsBaseUrl } from '../services/api';

export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useVehicleWebSocket(idVehiculo: number) {
  const [status, setStatus] = useState<WSStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WSEventMessage | null>(null);
  const [eventLogs, setEventLogs] = useState<WSEventMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const isUnmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;

    // Limpiar temporizadores anteriores
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Cerrar socket previo asegurando no disparar onclose no deseado
    if (wsRef.current) {
      const oldWs = wsRef.current;
      wsRef.current = null;
      oldWs.onclose = null;
      oldWs.onerror = null;
      oldWs.onmessage = null;
      oldWs.onopen = null;
      if (oldWs.readyState === WebSocket.OPEN || oldWs.readyState === WebSocket.CONNECTING) {
        oldWs.close();
      }
    }

    const wsBase = getWsBaseUrl();
    const wsUrl = `${wsBase}/ws/${idVehiculo}`;

    setStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current || wsRef.current !== ws) return;

        setStatus('connected');

        // Heartbeat cada 15 segundos
        heartbeatIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (isUnmountedRef.current || wsRef.current !== ws) return;

        try {
          const data: WSEventMessage = JSON.parse(event.data);
          setLastMessage(data);
          // Filtrar ESTADO_INICIAL del feed para no confundir con comandos nuevos
          if (data.evento !== 'ESTADO_INICIAL') {
            setEventLogs((prev) => [data, ...prev.slice(0, 99)]);
          }
        } catch (err) {
          console.error('[WS Parse Error]:', err);
        }
      };

      ws.onerror = (err) => {
        if (isUnmountedRef.current || wsRef.current !== ws) return;
        console.warn(`[WS Error] Fallo al conectar con ${wsUrl}:`, err);
        setStatus('error');
      };

      ws.onclose = () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Si este socket ya no es el activo o el componente se desmontó, ignorar
        if (isUnmountedRef.current || wsRef.current !== ws) {
          return;
        }

        setStatus('disconnected');
        // Reintento limpio de reconexión tras 4 segundos
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 4000);
      };
    } catch (err) {
      console.error('[WS Init Error]:', err);
      setStatus('error');
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 5000);
    }
  }, [idVehiculo]);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    connect();
  }, [connect]);

  const clearLogs = useCallback(() => {
    setEventLogs([]);
  }, []);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.onopen = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }
    };
  }, [connect]);

  return {
    status,
    isConnected: status === 'connected',
    lastMessage,
    eventLogs,
    reconnect,
    clearLogs,
  };
}
