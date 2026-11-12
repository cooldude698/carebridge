'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  Cpu,
  Heart,
  Loader2,
  Mic,
  Pill,
  Send,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { BottomNav } from '@/components/patient/BottomNav';
import { PatientToast } from '@/components/patient/PatientToast';
import { usePatientLocale } from '@/components/patient/usePatientLocale';
import { t } from '@/lib/i18n';
import {
  ActiveMedicineOption,
  parseVoiceIntent,
  useSpeech,
  useSpeechSynthesis,
  VoiceIntent,
} from '@/lib/voice';
import { PatientDetail, Prescription } from '@/lib/types';

const PATIENT_ID = 'p1';

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isStreaming?: boolean;
  symptomLogged?: boolean;
}

const FOOD_QUICK_CHIPS = [
  'How many vitamins & nutrients are in masala dosa? Is it good for my sugar and cholesterol?',
  'Does biryani have too much oil for me to eat today?',
  'Can I eat a banana with my Metformin?',
  'What fruits are safe for my blood pressure?',
];

export default function PatientVoiceAssistantPage() {
  const { locale, changeLocale } = usePatientLocale('en');

  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [activeMedicines, setActiveMedicines] = useState<ActiveMedicineOption[]>([]);
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: 'Namaste Ramesh ji! Ask me by voice or text about any food, vitamins, sugar, cholesterol, or say "Maine dawai le li" or "BP 138 by 86" to log instantly.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isStreamingReply, setIsStreamingReply] = useState(false);
  const [pendingAction, setPendingAction] = useState<VoiceIntent | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const { isSpeaking, speakingId, speak, stop } = useSpeechSynthesis();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Load real patient context & active prescribed medicines on mount
  useEffect(() => {
    let active = true;
    async function loadContext() {
      try {
        const [pRes, rxRes] = await Promise.all([
          fetch(`/api/patients/${PATIENT_ID}?actor=patient`, { cache: 'no-store' }),
          fetch(`/api/patients/${PATIENT_ID}/prescriptions`, { cache: 'no-store' }),
        ]);

        const medsMap = new Map<string, ActiveMedicineOption>();

        if (pRes.ok && active) {
          const pData = (await pRes.json()) as PatientDetail;
          setDetail(pData);
          (pData.medicines || []).forEach((m) => {
            medsMap.set(m.id, { id: m.id, name: m.name, dose: m.dose });
          });
        }

        if (rxRes.ok && active) {
          const rxList = (await rxRes.json()) as Prescription[];
          rxList
            .filter((rx) => rx.status === 'active')
            .forEach((rx) => {
              rx.medicines.forEach((m) => {
                const realId = m.medicine_id || m.id;
                medsMap.set(realId, {
                  id: realId,
                  name: m.medicine_name,
                  dose: m.dosage,
                });
              });
            });
        }

        if (active) {
          setActiveMedicines(Array.from(medsMap.values()));
        }
      } catch {
        // Fallback handled gracefully
      }
    }
    loadContext();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAction]);

  const askLocalLlm = useCallback(
    async (question: string, shouldSpeak: boolean) => {
      const userId = `u-${Date.now()}`;
      const botId = `a-${Date.now() + 1}`;

      setMessages((prev) => [
        ...prev,
        { id: userId, role: 'user', text: question },
        { id: botId, role: 'assistant', text: '', isStreaming: true },
      ]);
      setIsStreamingReply(true);

      let fullReply = '';
      try {
        const res = await fetch('/api/ai/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: PATIENT_ID,
            question,
            language: locale,
          }),
        });

        const symptomFlag = res.headers.get('X-CareBridge-Symptom-Logged') === '1';

        if (!res.ok || !res.body) {
          throw new Error('Failed to stream AI reply');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullReply += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, text: fullReply } : m))
          );
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? { ...m, text: fullReply, isStreaming: false, symptomLogged: symptomFlag }
              : m
          )
        );

        if (shouldSpeak && fullReply.trim()) {
          speak(fullReply, locale, botId);
        }
      } catch {
        const fallbackMsg =
          'Please verify with Dr. Meera Rao or Sunrise Clinic. Keep meals low-oil and low-sugar.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId ? { ...m, text: fallbackMsg, isStreaming: false } : m
          )
        );
      } finally {
        setIsStreamingReply(false);
      }
    },
    [locale, speak]
  );

  const processInputText = useCallback(
    (rawText: string, viaMic: boolean) => {
      const clean = rawText.trim();
      if (!clean) return;

      const parsed = parseVoiceIntent(clean, activeMedicines);
      if (parsed.type === 'LOG_MED_TAKEN' || parsed.type === 'LOG_BP') {
        setPendingAction(parsed);
        return;
      }

      if (parsed.type === 'ASK_AI_HEALTH_QUERY') {
        setPendingAction(null);
        askLocalLlm(parsed.question, viaMic || autoSpeak);
      }
    },
    [activeMedicines, askLocalLlm, autoSpeak]
  );

  const {
    isListening,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeech({
    locale,
    onFinalTranscript: (finalText) => {
      setInputText('');
      processInputText(finalText, true);
    },
  });

  const handleMicToggle = () => {
    stop();
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening(locale);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreamingReply) return;
    const text = inputText;
    setInputText('');
    processInputText(text, false);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setIsConfirmingAction(true);

    try {
      if (pendingAction.type === 'LOG_MED_TAKEN') {
        const targetMedId = pendingAction.medicineId || activeMedicines[0]?.id || 'm1';
        const targetMedLabel =
          pendingAction.medicineName || activeMedicines[0]?.name || 'Metformin 500mg';

        const res = await fetch(`/api/patients/${PATIENT_ID}/med-log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medicineId: targetMedId, status: 'taken' }),
        });

        if (res.ok) {
          const confirmMsg = `Logged ${targetMedLabel} as taken ✓`;
          setMessages((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: 'user', text: pendingAction.rawText },
            { id: `a-${Date.now() + 1}`, role: 'assistant', text: confirmMsg },
          ]);
          showToast(t('med_logged', locale));
          if (autoSpeak) speak(confirmMsg, locale);
        }
      } else if (pendingAction.type === 'LOG_BP') {
        const res = await fetch(`/api/patients/${PATIENT_ID}/vitals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'bp',
            valueA: pendingAction.systolic,
            valueB: pendingAction.diastolic,
            source: 'manual',
          }),
        });

        if (res.ok) {
          const confirmMsg = `Saved blood pressure ${pendingAction.systolic}/${pendingAction.diastolic} mmHg ✓`;
          setMessages((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: 'user', text: pendingAction.rawText },
            { id: `a-${Date.now() + 1}`, role: 'assistant', text: confirmMsg },
          ]);
          showToast(t('reading_saved', locale));
          if (autoSpeak) speak(confirmMsg, locale);
        }
      }
    } finally {
      setPendingAction(null);
      setIsConfirmingAction(false);
    }
  };

  const conditionBadge =
    detail?.profile?.conditions?.join(' · ') || 'Diabetes Type 2 · Hypertension';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-32">
      <PatientHeader
        locale={locale}
        onLocaleChange={changeLocale}
        showBack
        backHref="/patient"
        title={t('voice.title', locale)}
      />

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* Personalized Local LLM Header */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0FDFA] border border-[#CCFBF1] text-[#0F766E] text-xs font-medium">
              <Cpu className="w-3.5 h-3.5" />
              <span>{t('voice.local_llm_badge', locale)}</span>
            </div>
            <p className="text-sm font-medium text-[#334155]">
              Tailored for {detail?.profile?.name || 'Ramesh K.'} · {conditionBadge}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (autoSpeak) stop();
              setAutoSpeak(!autoSpeak);
            }}
            aria-pressed={autoSpeak}
            className={`inline-flex items-center gap-2 min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              autoSpeak
                ? 'bg-[#F0FDFA] border-[#CCFBF1] text-[#0F766E]'
                : 'bg-white border-[#E2E8F0] text-[#475569]'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{t('voice.auto_speak', locale)}</span>
          </button>
        </section>

        {/* Quick Food & Action Chips */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {FOOD_QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isStreamingReply}
                onClick={() => processInputText(chip, false)}
                className="shrink-0 max-w-[270px] truncate px-3.5 min-h-[40px] rounded-full bg-white border border-[#E2E8F0] hover:border-[#0D9488] hover:text-[#0F766E] text-xs sm:text-sm font-medium text-[#334155] transition-colors cursor-pointer"
                title={chip}
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => processInputText('Maine dawai le li', false)}
              className="px-3.5 min-h-[38px] rounded-full bg-[#F0FDFA] border border-[#CCFBF1] text-xs font-semibold text-[#0F766E] hover:bg-[#CCFBF1]/60 transition-colors cursor-pointer"
            >
              ✓ &quot;Maine dawai le li&quot;
            </button>
            <button
              type="button"
              onClick={() => processInputText('BP 138 by 86', false)}
              className="px-3.5 min-h-[38px] rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              ♥ &quot;BP 138 by 86&quot;
            </button>
          </div>
        </section>

        {/* Action Confirmation Card (when LOG_MED_TAKEN or LOG_BP detected) */}
        {pendingAction && (pendingAction.type === 'LOG_MED_TAKEN' || pendingAction.type === 'LOG_BP') && (
          <div className="bg-white border border-[#0D9488] rounded-2xl p-4 sm:p-5 shadow-md space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center shrink-0">
                  {pendingAction.type === 'LOG_MED_TAKEN' ? (
                    <Pill className="w-5 h-5" />
                  ) : (
                    <Heart className="w-5 h-5" />
                  )}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
                    Voice Action Detected ({Math.round(pendingAction.confidence * 100)}%)
                  </p>
                  <h3 className="text-base sm:text-lg font-semibold text-[#0F172A]">
                    {pendingAction.type === 'LOG_MED_TAKEN'
                      ? `Mark ${pendingAction.medicineName || activeMedicines[0]?.name || 'Metformin'} as Taken?`
                      : `Save BP ${pendingAction.systolic}/${pendingAction.diastolic} mmHg?`}
                  </h3>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isConfirmingAction}
                onClick={handleConfirmAction}
                className="flex-1 min-h-[48px] rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isConfirmingAction ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Confirm &amp; Save</span>
              </button>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="min-h-[48px] px-4 rounded-xl border border-[#E2E8F0] bg-white text-sm font-medium text-[#475569] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Chat Stream */}
        <section className="space-y-3 min-h-[260px]">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isThisSpeaking = isSpeaking && speakingId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3.5 space-y-2 ${
                    isUser
                      ? 'bg-[#0F172A] text-white rounded-br-sm'
                      : 'bg-white border border-[#E2E8F0] text-[#0F172A] rounded-bl-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
                  }`}
                >
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {msg.text || (msg.isStreaming ? 'Thinking...' : '')}
                  </p>

                  {!isUser && msg.symptomLogged && (
                    <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                      Symptom shared with Dr. Meera Rao
                    </span>
                  )}

                  {!isUser && !msg.isStreaming && msg.text && (
                    <div className="pt-1 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          isThisSpeaking ? stop() : speak(msg.text, locale, msg.id)
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D9488] hover:text-[#0F766E] min-h-[34px] cursor-pointer"
                      >
                        {isThisSpeaking ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>{t('voice.stop_reading', locale)}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{t('voice.read_aloud', locale)}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {interimTranscript && (
            <div className="p-3 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-sm text-[#0F766E]">
              {t('voice.listening', locale)} &ldquo;{interimTranscript}&rdquo;
            </div>
          )}
          <div ref={chatEndRef} />
        </section>

        {/* Bottom Voice + Text Input Dock */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMicToggle}
              aria-pressed={isListening}
              aria-label={isListening ? t('voice.listening', locale) : t('voice.tap_to_speak', locale)}
              className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                isListening
                  ? 'bg-[#DC2626] text-white ring-4 ring-[#FECACA]'
                  : 'bg-[#0D9488] hover:bg-[#0F766E] text-white shadow-sm'
              }`}
            >
              <Mic className="w-6 h-6" />
            </button>

            <form onSubmit={handleFormSubmit} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('voice.ask_placeholder', locale)}
                className="flex-1 min-h-[48px] px-4 rounded-xl border border-[#CBD5E1] text-base text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isStreamingReply}
                className="min-h-[48px] px-4 sm:px-5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isStreamingReply ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{t('voice.send', locale)}</span>
              </button>
            </form>
          </div>

          {!isSupported && (
            <p className="text-xs text-[#64748B]">
              Microphone input uses Web Speech API in Chrome/Edge. Quick chips and typed input always work.
            </p>
          )}
        </section>
      </main>

      <PatientToast message={toast} />
      <BottomNav locale={locale} />
    </div>
  );
}
