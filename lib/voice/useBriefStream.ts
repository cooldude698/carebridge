'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface CitationItem {
  readingId: string;
  value: string;
  at: string;
}

export interface UseBriefStreamReturn {
  streamText: string;
  citations: CitationItem[];
  isStreaming: boolean;
  source: 'llm' | 'fallback' | null;
  error: string | null;
  startStream: (patientId: string) => void;
  reset: () => void;
}

export function useBriefStream(): UseBriefStreamReturn {
  const [streamText, setStreamText] = useState<string>('');
  const [citations, setCitations] = useState<CitationItem[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [source, setSource] = useState<'llm' | 'fallback' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    closeStream();
    setStreamText('');
    setCitations([]);
    setIsStreaming(false);
    setSource(null);
    setError(null);
  }, [closeStream]);

  const startStream = useCallback(
    (patientId: string) => {
      reset();

      if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
        setError('Streaming not supported');
        setIsStreaming(false);
        return;
      }

      setIsStreaming(true);

      const targetUrl = `/api/patients/${encodeURIComponent(patientId)}/brief/stream`;
      const es = new EventSource(targetUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'token') {
            if (data.delta) {
              setStreamText((prev) => prev + data.delta);
            }
          } else if (data.type === 'done') {
            if (data.text) {
              // Direct fallback payload without prior tokens
              setStreamText((prev) => (prev ? prev : data.text));
            }
            if (data.citations && Array.isArray(data.citations)) {
              setCitations(data.citations);
            }
            if (data.source) {
              setSource(data.source);
            }
            setIsStreaming(false);
            closeStream();
          } else if (data.type === 'error') {
            setError(data.message || 'Brief unavailable');
            setIsStreaming(false);
            closeStream();
          }
        } catch {
          // Non-JSON or malformed frame
        }
      };

      es.onerror = () => {
        // If some text was received, finish streaming smoothly
        setIsStreaming(false);
        closeStream();
      };
    },
    [closeStream, reset]
  );

  useEffect(() => {
    return () => {
      closeStream();
    };
  }, [closeStream]);

  return {
    streamText,
    citations,
    isStreaming,
    source,
    error,
    startStream,
    reset,
  };
}
