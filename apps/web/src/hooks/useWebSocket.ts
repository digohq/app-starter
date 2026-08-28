import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { authStorage } from '@/lib/auth-storage';
import { InAppNotification } from '@/types/notifications';

interface UseWebSocketReturn {
  connected: boolean;
  lastNotification: InAppNotification | null;
  connectionError: Error | null;
  reconnect: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useWebSocket(): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<InAppNotification | null>(null);
  const [connectionError, setConnectionError] = useState<Error | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Prevent multiple connections if already connected
    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      // If instance exists but disconnected, ensure clean slate or just reconnect?
      // socket.io handles reconnect usually.
      // But if we want to ensure fresh auth...
    }

    const token = authStorage.getAccessToken();
    if (!token) return;

    // Disconnect existing if any (to update token)
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
      if (reason === 'io server disconnect') {
        // Disconnected by server (e.g. invalid token), don't auto reconnect
        // socket.close();
        // We might want to try reconnecting if token refresh happened?
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionError(error);
      setConnected(false);
    });

    socket.on('notification:new', (data) => {
      console.log('New notification received:', data);
      if (data && data.notification) {
        setLastNotification(data.notification);
      }
    });

    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 200);
  }, [connect, disconnect]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Listen for auth changes?
  // Ideally if user logs out, we disconnect.
  // If user logs in, we connect.
  // But useWebSocket is used inside components that assume auth.

  return {
    connected,
    lastNotification,
    connectionError,
    reconnect,
  };
}
