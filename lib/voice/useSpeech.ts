'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { Locale } from '@/lib/i18n';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
    length: number;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: () => void;
  onend: () => void;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: (event: SpeechRecognitionErrorEventLike) => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function getBcp47Locale(loc: Locale): string {
  switch (loc) {
    case 'hi':
      return 'hi-IN';
    case 'kn':
      return 'kn-IN';
    case 'en':
    default:
      return 'en-IN';
  }
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore browser synthesis errors
  }
}

export function speakResponse(
  text: string,
  locale: Locale = 'en',
  callbacks?: { onStart?: () => void; onEnd?: () => void }
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = getBcp47Locale(locale);
    utterance.lang = targetLang;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const langPrefix = targetLang.split('-')[0].toLowerCase();
      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === targetLang.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };
    utterance.onend = () => {
      callbacks?.onEnd?.();
    };
    utterance.onerror = () => {
      callbacks?.onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    callbacks?.onEnd?.();
    return false;
  }
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const speak = useCallback((text: string, locale: Locale = 'en', id?: string) => {
    const ok = speakResponse(text, locale, {
      onStart: () => {
        setIsSpeaking(true);
        setSpeakingId(id || 'active');
      },
      onEnd: () => {
        setIsSpeaking(false);
        setSpeakingId(null);
      },
    });
    if (!ok) {
      setIsSpeaking(false);
      setSpeakingId(null);
    }
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setSpeakingId(null);
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  return { isSpeaking, speakingId, speak, stop };
}

export interface UseSpeechOptions {
  locale?: Locale;
  onFinalTranscript?: (transcript: string) => void;
}

function subscribeNoop() {
  return () => {};
}

function getSpeechSupportSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function useSpeech({ locale = 'en', onFinalTranscript }: UseSpeechOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isSupported = useSyncExternalStore(
    subscribeNoop,
    getSpeechSupportSnapshot,
    () => false
  );

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onFinalRef = useRef(onFinalTranscript);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = getBcp47Locale(locale);

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        setInterimTranscript('');
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let currentInterim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalChunk += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }

        if (finalChunk) {
          setTranscript(finalChunk);
          setInterimTranscript('');
          onFinalRef.current?.(finalChunk);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (event.error !== 'no-speech') {
          setError(event.error || 'Speech recognition error');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch {
      recognitionRef.current = null;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [locale]);

  const startListening = useCallback(
    (customLocale?: Locale) => {
      if (!recognitionRef.current) return;
      setError(null);
      setTranscript('');
      setInterimTranscript('');

      try {
        recognitionRef.current.lang = getBcp47Locale(customLocale || locale);
        recognitionRef.current.start();
      } catch {
        // Ignore if recognition is already running
      }
    },
    [locale]
  );

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
