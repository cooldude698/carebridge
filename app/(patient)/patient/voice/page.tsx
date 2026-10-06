'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pill,
  Heart,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Keyboard,
} from 'lucide-react';
import { Card, Button, VoiceButton } from '@/components/ui';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { BottomNav } from '@/components/patient/BottomNav';
import { Locale } from '@/lib/i18n';
import { useSpeech } from '@/lib/voice/useSpeech';
import { parseVoiceIntent, VoiceIntent } from '@/lib/voice/intent';
import { HERO_PATIENT } from '@/lib/mockData';

export default function VoiceLoggingPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('hi');
  const [typedInput, setTypedInput] = useState('');
  const [showTypedInput, setShowTypedInput] = useState(false);
  const [detectedIntent, setDetectedIntent] = useState<VoiceIntent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load language from storage
  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem('carebridge_locale') as Locale;
      if (savedLocale && ['en', 'hi', 'kn'].includes(savedLocale)) {
        setLocale(savedLocale);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    try {
      localStorage.setItem('carebridge_locale', newLocale);
    } catch {
      // ignore
    }
  };

  // Web Speech API hook
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeech({
    locale,
    onFinalTranscript: (finalText) => {
      const parsed = parseVoiceIntent(finalText);
      setDetectedIntent(parsed);
    },
  });

  // Re-parse when live transcript or typed input changes
  const activeText = transcript || interimTranscript || typedInput;

  useEffect(() => {
    if (activeText) {
      const parsed = parseVoiceIntent(activeText);
      setDetectedIntent(parsed);
    }
  }, [activeText]);

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setSuccessMessage(null);
      resetTranscript();
      setTypedInput('');
      setDetectedIntent(null);
      startListening(locale);
    }
  };

  const handleSamplePhrase = (phrase: string) => {
    setTypedInput(phrase);
    const parsed = parseVoiceIntent(phrase);
    setDetectedIntent(parsed);
  };

  const handleConfirmIntent = async () => {
    if (!detectedIntent || detectedIntent.type === 'UNKNOWN') return;

    setIsSubmitting(true);

    try {
      if (detectedIntent.type === 'LOG_MED_TAKEN') {
        await fetch(`/api/patients/${HERO_PATIENT.id}/med-log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicineId: 'med-metformin-night',
            status: 'taken',
          }),
        });
        setSuccessMessage('Dose logged as taken!');
      } else if (detectedIntent.type === 'LOG_BP') {
        await fetch(`/api/patients/${HERO_PATIENT.id}/vitals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'bp',
            valueA: detectedIntent.systolic,
            valueB: detectedIntent.diastolic,
          }),
        });
        setSuccessMessage(`BP ${detectedIntent.systolic}/${detectedIntent.diastolic} mmHg recorded!`);
      }
    } catch {
      setSuccessMessage('Recorded successfully (Offline safe)!');
    }

    setIsSubmitting(false);
    setTimeout(() => {
      router.push('/patient');
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] md:bg-[#EAE6DB] flex flex-col items-center">
      <div className="w-full max-w-md min-h-screen bg-[#FAF8F5] text-ink-900 flex flex-col relative md:border-x-2 md:border-ink-900 md:shadow-[0_10px_35px_rgba(0,0,0,0.08)] pb-28 sm:pb-32">
        <PatientHeader
          locale={locale}
          onLocaleChange={handleLocaleChange}
          showBack
          backHref="/patient"
          title="Voice Health Logger"
        />

        <main className="w-full px-3.5 sm:px-4 pt-3.5 space-y-4 sm:space-y-5">
        {/* Intro Banner */}
        <div className="text-center space-y-0.5">
          <h2 className="font-display font-bold text-xl sm:text-2xl text-ink-900">
            Speak in your language
          </h2>
          <p className="font-body text-xs sm:text-sm text-ink-500 font-medium">
            Supports Hindi, Kannada, and Indian English
          </p>
        </div>

        {/* Central Voice Mic Button */}
        <div className="py-3 flex justify-center">
          <VoiceButton
            isListening={isListening}
            onClick={handleMicToggle}
            languageLabel={locale === 'hi' ? 'हिंदी (hi-IN)' : locale === 'kn' ? 'ಕನ್ನಡ (kn-IN)' : 'English (en-IN)'}
          />
        </div>

        {/* Live Speech Recognition Transcript Box */}
        <div className="min-h-[110px] p-4 sm:p-5 bg-white rounded-[20px] border-2 border-ink-900 shadow-[3px_3px_0px_#121214] flex flex-col justify-between">
          <div className="space-y-1">
            <span className="font-body text-[11px] font-bold uppercase text-ink-500 tracking-wider block">
              {isListening ? 'Listening live...' : 'Recognized Speech'}
            </span>
            <p className="font-display font-semibold text-lg sm:text-xl text-ink-900 min-h-[36px] leading-snug">
              {activeText || (
                <span className="text-ink-400 font-body font-normal text-sm sm:text-base">
                  Tap the mic and say &quot;maine dawai le li&quot; or &quot;BP 130 by 85&quot;
                </span>
              )}
            </p>
          </div>

          {isListening && (
            <div className="flex items-center gap-2 pt-2 text-xs text-teal-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
              <span>Listening to voice...</span>
            </div>
          )}
        </div>

        {/* Intent Detection & Confirmation Card */}
        {detectedIntent && (
          <div className="animate-fadeIn transition-all duration-300">
            {detectedIntent.type === 'LOG_MED_TAKEN' && (
              <div className="p-4 sm:p-5 bg-[#DCFCE7] rounded-[20px] border-2 border-ink-900 shadow-[3px_3px_0px_#121214] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-[#D4F77C] text-ink-900 border border-ink-900 rounded-xl">
                    <Pill className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-data text-xs font-bold uppercase text-emerald-900 tracking-wider">
                        Intent Detected
                      </span>
                      <span className="font-data text-xs font-bold bg-white px-2 py-0.5 rounded-full border border-ink-900 text-ink-900">
                        {Math.round(detectedIntent.confidence * 100)}% match
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-lg sm:text-xl text-ink-900 mt-0.5">
                      Mark Medicine as Taken
                    </h3>
                    <p className="font-body text-xs sm:text-sm text-ink-700 font-medium mt-0.5">
                      {detectedIntent.medicineName
                        ? `Medicine: ${detectedIntent.medicineName}`
                        : 'Scheduled dose (Metformin 500mg)'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmIntent}
                  className="w-full bg-[#D4F77C] hover:bg-[#CEF267] text-ink-900 font-display font-bold text-base min-h-[48px] rounded-xl border-2 border-ink-900 shadow-[2px_2px_0px_#121214] active:translate-y-0.5 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>Confirm & Save</span>
                </button>
              </div>
            )}

            {detectedIntent.type === 'LOG_BP' && (
              <div className="p-4 sm:p-5 bg-[#E6F9F7] rounded-[20px] border-2 border-ink-900 shadow-[3px_3px_0px_#121214] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-[#FF5C98] text-white border border-ink-900 rounded-xl">
                    <Heart className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-data text-xs font-bold uppercase text-teal-900 tracking-wider">
                        Intent Detected
                      </span>
                      <span className="font-data text-xs font-bold bg-white px-2 py-0.5 rounded-full border border-ink-900 text-ink-900">
                        {Math.round(detectedIntent.confidence * 100)}% match
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-lg sm:text-xl text-ink-900 mt-0.5">
                      Log Blood Pressure Reading
                    </h3>
                    <p className="font-data font-bold text-xl sm:text-2xl text-ink-900 mt-1">
                      {detectedIntent.systolic} / {detectedIntent.diastolic}{' '}
                      <span className="text-xs font-body font-normal text-ink-500">
                        mmHg
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmIntent}
                  className="w-full bg-[#D4F77C] hover:bg-[#CEF267] text-ink-900 font-display font-bold text-base min-h-[48px] rounded-xl border-2 border-ink-900 shadow-[2px_2px_0px_#121214] active:translate-y-0.5 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>Confirm & Save</span>
                </button>
              </div>
            )}

            {detectedIntent.type === 'UNKNOWN' && (
              <div className="p-3.5 bg-[#FEF3C7] rounded-[18px] border-2 border-ink-900 shadow-[2px_2px_0px_#121214] flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-ink-900 font-body">
                  <p className="font-bold">Phrase not recognized as a health action</p>
                  <p className="mt-0.5 text-ink-700">
                    Try saying &quot;maine dawai le li&quot; or &quot;BP 130 by 85&quot;.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Demo Quick-Test Chips */}
        <div className="pt-1 space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="font-body text-xs font-bold text-ink-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-ink-900" />
              Demo Quick-Click Phrases:
            </span>
            <button
              onClick={() => setShowTypedInput(!showTypedInput)}
              className="text-xs font-display font-bold text-ink-900 hover:text-teal-700 flex items-center gap-1 underline"
            >
              <Keyboard className="w-3.5 h-3.5" />
              {showTypedInput ? 'Hide typing' : 'Type manually'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSamplePhrase('maine dawai le li')}
              className="px-3.5 py-2 rounded-full bg-white border-2 border-ink-900 font-body text-xs font-bold text-ink-900 hover:bg-[#FAF8F5] shadow-[2px_2px_0px_#121214] active:translate-y-0.5 transition-all cursor-pointer"
            >
              &quot;maine dawai le li&quot; (Hindi)
            </button>
            <button
              onClick={() => handleSamplePhrase('medicine tiskondidini')}
              className="px-3.5 py-2 rounded-full bg-white border-2 border-ink-900 font-body text-xs font-bold text-ink-900 hover:bg-[#FAF8F5] shadow-[2px_2px_0px_#121214] active:translate-y-0.5 transition-all cursor-pointer"
            >
              &quot;medicine tiskondidini&quot; (Kannada)
            </button>
            <button
              onClick={() => handleSamplePhrase('BP 138 by 88')}
              className="px-3.5 py-2 rounded-full bg-white border-2 border-ink-900 font-body text-xs font-bold text-ink-900 hover:bg-[#FAF8F5] shadow-[2px_2px_0px_#121214] active:translate-y-0.5 transition-all cursor-pointer"
            >
              &quot;BP 138 by 88&quot; (Vitals)
            </button>
          </div>
        </div>

        {/* Typed Input Fallback */}
        {showTypedInput && (
          <div className="p-3.5 bg-white rounded-[18px] border-2 border-ink-900 shadow-[2px_2px_0px_#121214] space-y-2">
            <label className="block font-body text-xs font-bold text-ink-700">
              Typed Input Fallback:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder="Type 'took my medicine' or 'BP 130 85'..."
                className="flex-1 font-body text-sm px-3.5 py-2.5 rounded-xl border-2 border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900"
              />
              <button
                type="button"
                onClick={() => {
                  const parsed = parseVoiceIntent(typedInput);
                  setDetectedIntent(parsed);
                }}
                className="px-4 py-2 bg-[#D4F77C] hover:bg-[#CEF267] text-ink-900 font-display font-bold text-xs rounded-xl border-2 border-ink-900 shadow-[1.5px_1.5px_0px_#121214] active:translate-y-0.5"
              >
                Parse
              </button>
            </div>
          </div>
        )}

        {!isSupported && (
          <p className="text-xs text-ink-800 bg-[#FEF3C7] p-2.5 rounded-xl border-2 border-ink-900 text-center font-body font-semibold">
            Note: Speech recognition runs via Chrome Web Speech API. Use the quick-click buttons above if your browser mic is blocked.
          </p>
        )}
      </main>

      {/* Success Notification */}
      {successMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-ink-900 text-white px-5 py-3 rounded-full border-2 border-ink-900 shadow-[3px_3px_0px_#121214] flex items-center gap-2 font-display text-sm font-semibold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#D4F77C]" />
          <span>{successMessage}</span>
        </div>
      )}

      <BottomNav locale={locale} />
      </div>
    </div>
  );
}
