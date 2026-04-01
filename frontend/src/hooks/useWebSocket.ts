/**
 * useWebSocket Hook - WebSocket connection for real-time progress updates
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { ProgressEvent } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || '';

interface UseWebSocketOptions {
  jobId: string;
  onProgress?: (event: ProgressEvent) => void;
  onComplete?: (event: ProgressEvent) => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

export function useWebSocket({
  jobId,
  onProgress,
  onComplete,
  onError,
  autoConnect = true,
}: UseWebSocketOptions) {
  const { accessToken } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ProgressEvent | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  const resolveWsBaseUrl = useCallback(() => {
    if (WS_URL) {
      return WS_URL;
    }

    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}`;
    }

    return 'ws://localhost:8000';
  }, []);

  const connect = useCallback(() => {
    if (!jobId || !accessToken || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${resolveWsBaseUrl()}/ws/progress/${jobId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Send authentication token
      ws.send(JSON.stringify({ token: accessToken }));
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          onError?.(data.error);
          ws.close();
          return;
        }

        if (data.event === 'connected') {
          setIsConnected(true);
          return;
        }

        const progressEvent: ProgressEvent = {
          job_id: data.job_id,
          event: data.event,
          status: data.status,
          stage: data.stage,
          progress: data.progress,
          message: data.message,
          timestamp: data.timestamp,
        };

        setLastEvent(progressEvent);
        onProgress?.(progressEvent);

        // Check if job is complete
        if (['completed', 'failed', 'cancelled'].includes(data.status)) {
          onComplete?.(progressEvent);
          ws.close();
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onerror = () => {
      onError?.('WebSocket connection error');
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      // Attempt reconnect for non-final states
      if (
        reconnectAttempts.current < maxReconnectAttempts &&
        lastEvent?.status &&
        !['completed', 'failed', 'cancelled'].includes(lastEvent.status)
      ) {
        reconnectAttempts.current += 1;
        setTimeout(connect, 2000 * reconnectAttempts.current);
      }
    };

    wsRef.current = ws;
  }, [jobId, accessToken, onProgress, onComplete, onError, lastEvent?.status, resolveWsBaseUrl]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Ping interval to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(sendPing, 30000);

    return () => {
      clearInterval(pingInterval);
    };
  }, [isConnected, sendPing]);

  return {
    isConnected,
    lastEvent,
    connect,
    disconnect,
  };
}

/**
 * useProgress Hook - Higher-level hook for progress tracking
 */
export function useProgress(jobId: string) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProgress = useCallback((event: ProgressEvent) => {
    setProgress(event.progress);
    setStage(event.stage);
    setStatus(event.status);
    setMessage(event.message);
  }, []);

  const handleComplete = useCallback((event: ProgressEvent) => {
    setIsComplete(true);
    if (event.status === 'failed') {
      setError(event.message);
    }
  }, []);

  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
  }, []);

  const { isConnected, connect, disconnect } = useWebSocket({
    jobId,
    onProgress: handleProgress,
    onComplete: handleComplete,
    onError: handleError,
    autoConnect: true,
  });

  return {
    progress,
    stage,
    status,
    message,
    isConnected,
    isComplete,
    error,
    connect,
    disconnect,
  };
}
