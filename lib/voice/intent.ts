// lib/voice/intent.ts
// Deterministic zero-latency voice intent parser + natural language routing to local LLM
// Supports English (en-IN), Hindi (hi-IN), and Kannada (kn-IN)

export type VoiceIntentType =
  | 'LOG_MED_TAKEN'
  | 'LOG_BP'
  | 'ASK_AI_HEALTH_QUERY'
  | 'UNKNOWN';

export interface ActiveMedicineOption {
  id: string;
  name: string;
  dose?: string;
}

export interface MedTakenIntent {
  type: 'LOG_MED_TAKEN';
  medicineId?: string;
  medicineName?: string;
  confidence: number;
  rawText: string;
}

export interface BpIntent {
  type: 'LOG_BP';
  systolic: number;
  diastolic: number;
  pulse?: number;
  confidence: number;
  rawText: string;
}

export interface AskAiHealthQueryIntent {
  type: 'ASK_AI_HEALTH_QUERY';
  question: string;
  rawText: string;
}

export interface UnknownIntent {
  type: 'UNKNOWN';
  rawText: string;
}

export type VoiceIntent =
  | MedTakenIntent
  | BpIntent
  | AskAiHealthQueryIntent
  | UnknownIntent;

const MED_KEYWORDS = [
  // Hindi
  'maine dawai le li',
  'dawai le li',
  'dawa le li',
  'dawai kha li',
  'dawa kha li',
  'goli le li',
  'goli kha li',
  'dawai ho gayi',
  'dawa le liya',
  'dawai le liya',
  'dawa kha liya',
  'maine goli le li',
  'dawai khayi',
  'maine dawa kha li',
  'मैंने दवाई ले ली',
  'दवाई ले ली',
  'दवा ले ली',
  'गोली खा ली',

  // Kannada
  'medicine tiskondidini',
  'oushadhi togonde',
  'ouhadhi togonde',
  'tablet togonde',
  'goli togondidini',
  'mathre togonde',
  'ಔಷಧಿ ತಗೊಂಡೆ',
  'ಮಾತ್ರೆ ತಗೊಂಡೆ',

  // English
  'took my medicine',
  'took medicine',
  'taken medicine',
  'took my pills',
  'took pills',
  'medicine taken',
  'took tablet',
  'took my dose',
  'dose taken',
  'logged meds',
  'mark medicine taken',
];

const FALLBACK_KNOWN_MEDS = [
  'metformin',
  'amlodipine',
  'telmisartan',
  'atorvastatin',
  'salbutamol',
  'aspirin',
  'insulin',
];

export function parseVoiceIntent(
  rawText: string,
  activeMedicines?: ActiveMedicineOption[]
): VoiceIntent {
  const trimmed = rawText.trim();
  const text = trimmed.toLowerCase();
  if (!text) {
    return { type: 'UNKNOWN', rawText };
  }

  // 1. Check for Blood Pressure Logging Intent (only when clearly a BP measurement)
  const bpKeywords = ['bp', 'blood pressure', 'pressure', 'बीपी', 'रक्तचाप', 'ರಕ್ತದೊತ್ತಡ'];
  const hasBpKeyword = bpKeywords.some((k) => text.includes(k));
  const bpRegex =
    /(?:bp|blood pressure|pressure|बीपी|रक्तचाप)?\s*(\d{2,3})\s*(?:by|over|\/|aur|and|और|ಮತ್ತು|-|\s+)\s*(\d{2,3})/i;
  const bpMatch = text.match(bpRegex);

  // Guard against questions like "is 140/90 normal?" being treated as logging unless imperative or short phrase
  const looksLikeQuestion =
    text.includes('?') ||
    text.startsWith('can i') ||
    text.startsWith('is ') ||
    text.startsWith('what ') ||
    text.startsWith('how ') ||
    text.startsWith('why ') ||
    text.startsWith('does ') ||
    text.startsWith('should ');

  if (bpMatch && !looksLikeQuestion) {
    const num1 = parseInt(bpMatch[1], 10);
    const num2 = parseInt(bpMatch[2], 10);

    if (num1 >= 70 && num1 <= 260 && num2 >= 40 && num2 <= 160 && num1 > num2) {
      const pulseMatch = text.match(/(?:pulse|heart rate|पल्स)\s*(\d{2,3})/i);
      const pulse = pulseMatch ? parseInt(pulseMatch[1], 10) : undefined;

      return {
        type: 'LOG_BP',
        systolic: num1,
        diastolic: num2,
        pulse,
        confidence: hasBpKeyword ? 0.95 : 0.85,
        rawText,
      };
    }
  }

  // 2. Check for Medicine Taken Logging Intent (and resolve real active medicine ID)
  const matchedKeyword = MED_KEYWORDS.find((k) => text.includes(k));
  const matchedActive = activeMedicines?.find((m) =>
    text.includes(m.name.toLowerCase())
  );
  const mentionedFallback = FALLBACK_KNOWN_MEDS.find((m) => text.includes(m));
  const hasTakeVerb =
    text.includes('took') ||
    text.includes('taken') ||
    text.includes('le li') ||
    text.includes('kha li') ||
    text.includes('togonde');

  if (!looksLikeQuestion && (matchedKeyword || (matchedActive && hasTakeVerb) || (mentionedFallback && hasTakeVerb))) {
    const resolvedMed = matchedActive || activeMedicines?.[0];
    return {
      type: 'LOG_MED_TAKEN',
      medicineId: resolvedMed?.id,
      medicineName: resolvedMed
        ? `${resolvedMed.name}${resolvedMed.dose ? ` ${resolvedMed.dose}` : ''}`
        : mentionedFallback
        ? capitalize(mentionedFallback)
        : undefined,
      confidence: matchedKeyword ? 0.95 : 0.82,
      rawText,
    };
  }

  // 3. Route ALL natural language food, vitamin, nutrition, sugar, cholesterol, or symptom queries to Local LLM
  return {
    type: 'ASK_AI_HEALTH_QUERY',
    question: trimmed,
    rawText,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
