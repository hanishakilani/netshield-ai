"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "@/app/lib/auth-context";

type AlertEvent = { type: string; alert?: unknown } | null;

type AlertsSocketContextType = {
  lastEvent: AlertEvent;
  connected: boolean;
};

const AlertsSocketContext = createContext<AlertsSocketContextType>({
  lastEvent: null,
  connected: false,
});

export function AlertsSocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [lastEvent, setLastEvent] = useState<AlertEvent>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) {
      wsRef.current?.close();
      setConnected(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const wsUrl = apiUrl.replace(/^http/, "ws") + `/ws/alerts?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        setLastEvent(JSON.parse(event.data));
      } catch {
        // ignore malformed messages
      }
    };

    return () => {
      ws.close();
    };
  }, [token]);

  return (
    <AlertsSocketContext.Provider value={{ lastEvent, connected }}>
      {children}
    </AlertsSocketContext.Provider>
  );
}

export function useAlertsSocket() {
  return useContext(AlertsSocketContext);
}