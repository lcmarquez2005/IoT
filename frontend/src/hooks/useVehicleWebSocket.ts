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
  const isUnmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      wsRef.current.close();
    }

    const wsBase = getWsBaseUrl();
    const wsUrl = `${wsBase}/ws/${idVehiculo}`;

    setStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isUnmountedRef.current) {
          setStatus('connected');
        }
      };

      ws.onmessage = (event) => {
        try {
          const data: WSEventMessage = JSON.parse(event.data);
          if (!isUnmountedRef.current) {
            setLastMessage(data);
            setEventLogs((prev) => [data, ...prev.slice(0, 99)]); // Mantener los últimos 100
          }
        } catch (err) {
          console.error('[WS Parse Error]:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('[WS Warning/Error]:', err);
        if (!isUnmountedRef.current) {
          setStatus('error');
        }
      };

      ws.onclose = () => {
        if (!isUnmountedRef.current) {
          setStatus('disconnected');
          // Auto-reconnect cada 3.5 segundos
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, 3500);
        }
      };
    } catch (err) {
      console.error('[WS Init Error]:', err);
      setStatus('error');
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 4000);
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
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
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
