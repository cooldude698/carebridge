import { Locale } from "@/lib/i18n";
import { PatientDetail, Prescription, SymptomLog } from "@/lib/types";
import {
  getPatientDetailDb,
  getPrescriptionsDb,
  saveAiQaLogDb,
  saveSymptomLogDb,
} from "@/lib/supabase/db";
import { openOllamaStream, callLlmChat } from "./llmClient";

const SYMPTOM_PATTERNS: Array<{ keyword: string; label: string; severity: "low" | "moderate" | "high" }> = [
  { keyword: "chest pain", label: "chest pain", severity: "high" },
  { keyword: "breathless", label: "shortness of breath", severity: "high" },
  { keyword: "shortness of breath", label: "shortness of breath", severity: "high" },
  { keyword: "difficulty breathing", label: "breathing difficulty", severity: "high" },
  { keyword: "sans phool", label: "shortness of breath", severity: "high" },
  { keyword: "saans", label: "shortness of breath", severity: "high" },
  { keyword: "dizzy", label: "dizziness", severity: "moderate" },
  { keyword: "dizziness", label: "dizziness", severity: "moderate" },
  { keyword: "chakkar", label: "dizziness", severity: "moderate" },
  { keyword: "faint", label: "faintness", severity: "high" },
  { keyword: "swelling", label: "swelling", severity: "moderate" },
  { keyword: "fever", label: "fever", severity: "moderate" },
  { keyword: "headache", label: "headache", severity: "low" },
  { keyword: "fatigue", label: "fatigue", severity: "low" },
  { keyword: "tired", label: "fatigue", severity: "low" },
  { keyword: "thakan", label: "fatigue", severity: "low" },
  { keyword: "nausea", label: "nausea", severity: "moderate" },
  { keyword: "blurred vision", label: "blurred vision", severity: "high" },
  { keyword: "palpitation", label: "palpitations", severity: "high" },
  { keyword: "तलेसुत्तु", label: "dizziness", severity: "moderate" },
  { keyword: "चक्कर", label: "dizziness", severity: "moderate" },
  { keyword: "सांस", label: "shortness of breath", severity: "high" },
];

export function detectSymptomsFromText(text: string): {
  symptoms: string[];
  severityHint: "low" | "moderate" | "high";
} {
  const lower = text.toLowerCase();
  const found: string[] = [];
  let maxSeverity: "low" | "moderate" | "high" = "low";

  for (const p of SYMPTOM_PATTERNS) {
    if (lower.includes(p.keyword)) {
      if (!found.includes(p.label)) found.push(p.label);
      if (p.severity === "high") maxSeverity = "high";
      else if (p.severity === "moderate" && maxSeverity === "low") maxSeverity = "moderate";
    }
  }

  return { symptoms: found, severityHint: maxSeverity };
}

function buildFallbackNutritionAnswer(
  question: string,
  language: Locale,
  detail: PatientDetail,
  prescriptions: Prescription[],
  detectedSymptoms: string[]
): string {
  const q = question.toLowerCase();
  const bpSys = detail.wearable?.bloodPressure.latestSystolic ?? 140;
  const bpDia = detail.wearable?.bloodPressure.latestDiastolic ?? 88;
  const glucose = detail.wearable?.glucose.latestFasting ?? 155;
  const spo2 = detail.wearable?.spo2.latest ?? 97;
  const activeMeds = prescriptions
    .flatMap((rx) => rx.medicines.map((m) => `${m.medicine_name} ${m.dosage}`))
    .slice(0, 3)
    .join(", ") || "Metformin 500mg, Amlodipine 5mg";
  const condStr = detail.profile.conditions.join(" and ") || "Diabetes Type 2 and Hypertension";

  if (detectedSymptoms.length > 0) {
    const isUrgent = detectedSymptoms.some(
      (s) => s.includes("chest") || s.includes("breath") || s.includes("faint") || s.includes("palpitation")
    );
    if (language === "hi") {
      return isUrgent
        ? `मैंने आपका लक्षण (${detectedSymptoms.join(", ")}) डॉ. मीरा राव के लिए नोट कर लिया है। आपका SpO2 ${spo2}% और BP ${bpSys}/${bpDia} mmHg है। कृपया तुरंत आराम करें और अभी डॉ. मीरा राव या नज़दीकी क्लिनिक को कॉल करें।`
        : `मैंने आपका लक्षण (${detectedSymptoms.join(", ")}) रिकॉर्ड कर लिया है। आपका ताज़ा BP ${bpSys}/${bpDia} mmHg है। आज ज़्यादा मेहनत न करें, पानी पिएं और यदि यह बना रहे तो डॉ. मीरा राव से बात करें।`;
    }
    if (language === "kn") {
      return isUrgent
        ? `ನಿಮ್ಮ ಲಕ್ಷಣವನ್ನು (${detectedSymptoms.join(", ")}) ಡಾ. ಮೀರಾ ರಾವ್ ಅವರಿಗೆ ದಾಖಲಿಸಿದ್ದೇನೆ. ನಿಮ್ಮ SpO2 ${spo2}% ಮತ್ತು BP ${bpSys}/${bpDia} mmHg ಇದೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ ಮತ್ತು ವೈದ್ಯರಿಗೆ ಕರೆ ಮಾಡಿ.`
        : `ನಿಮ್ಮ ಲಕ್ಷಣವನ್ನು (${detectedSymptoms.join(", ")}) ದಾಖಲಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ಇಂದಿನ BP ${bpSys}/${bpDia} mmHg ಇದೆ. ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ ಮತ್ತು ಮುಂದುವರಿದರೆ ಡಾ. ಮೀರಾ ರಾವ್ ಅವರನ್ನು ಸಂಪರ್ಕಿಸಿ.`;
    }
    return isUrgent
      ? `I have logged your symptom (${detectedSymptoms.join(", ")}) for Dr. Meera Rao's immediate review. With your SpO2 at ${spo2}% and BP at ${bpSys}/${bpDia} mmHg, please sit comfortably and call Sunrise Clinic or your doctor right away.`
      : `I have logged your symptom (${detectedSymptoms.join(", ")}) for Dr. Meera Rao. Your recent BP is ${bpSys}/${bpDia} mmHg and fasting sugar is ${glucose} mg/dL. Please rest, hydrate, and check in with your clinic if it persists.`;
  }

  if (q.includes("dosa") || q.includes("masala") || q.includes("idli") || q.includes("chutney")) {
    if (language === "hi") {
      return `एक मसाला डोसा में लगभग 350–420 kcal, विटामिन B1/B6 और आयरन (दाल से) होते हैं, लेकिन आलू और अतिरिक्त तेल के कारण ग्लाइसेमिक लोड और वसा मध्यम-उच्च रहते हैं। आपकी शुगर (${glucose} mg/dL) और BP (${bpSys}/${bpDia}) के लिए: सादा डोसा कम तेल में लें, आलू थोड़ा कम रखें और नारियल चटनी की जगह सांभर ज़्यादा लें।`;
    }
    if (language === "kn") {
      return `ಒಂದು ಮಸಾಲ ದೋಸೆಯಲ್ಲಿ ಸುಮಾರು 350–420 kcal ಹಾಗೂ ವಿಟಮಿನ್ B1/B6 ಮತ್ತು ಕಬ್ಬಿಣಾಂಶ ಇರುತ್ತದೆ, ಆದರೆ ಆಲೂಗಡ್ಡೆ ಮತ್ತು ಎಣ್ಣೆಯಿಂದ ಸಕ್ಕರೆ ಹಾಗೂ ಕೊಬ್ಬು ಹೆಚ್ಚಾಗಬಹುದು. ನಿಮ್ಮ ಶುಗರ್ (${glucose} mg/dL) ಮತ್ತು BP (${bpSys}/${bpDia}) ಗಾಗಿ: ಕಡಿಮೆ ಎಣ್ಣೆಯ ಪ್ಲೇನ್ ದೋಸೆ ಮತ್ತು ಹೆಚ್ಚಿನ ಸಾಂಬಾರ್ ಉತ್ತಮ.`;
    }
    return `One masala dosa has ~350–420 kcal with B-vitamins (B1, B6) and iron from fermented lentils, plus potassium from sambar. However, potato filling and extra oil/ghee raise saturated fat and glycemic impact. With your ${condStr} (sugar ${glucose} mg/dL, BP ${bpSys}/${bpDia}), enjoy 1 crisp plain or light-oil dosa with extra vegetable sambar and small coconut chutney.`;
  }

  if (q.includes("biryani") || q.includes("oil") || q.includes("fried") || q.includes("samosa") || q.includes("pakora") || q.includes("cholesterol")) {
    if (language === "hi") {
      return `बिरयानी या तले हुए नाश्ते (समोसा/पकौड़ा) में प्रति प्लेट 450–650 kcal और अधिक सैचुरेटेड फैट, कोलेस्ट्रॉल व नमक होता है। आपकी ${condStr} (BP ${bpSys}/${bpDia}, शुगर ${glucose} mg/dL) और ${activeMeds} के साथ आज इसे टालना बेहतर है। विकल्प: दाल-रोटी, उबली सब्ज़ी या ग्रिल्ड पनीर/सब्ज़ियों वाला ब्राउन-राइस पुलाव चुनें।`;
    }
    if (language === "kn") {
      return `ಬಿರಿಯಾನಿ ಅಥವಾ ಎಣ್ಣೆಯಲ್ಲಿ ಕರಿದ ತಿಂಡಿಗಳಲ್ಲಿ 450–650 kcal ಮತ್ತು ಹೆಚ್ಚಿನ ಎಣ್ಣೆ, ಕೊಲೆಸ್ಟ್ರಾಲ್ ಹಾಗೂ ಉಪ್ಪು ಇರುತ್ತದೆ. ನಿಮ್ಮ ${condStr} (BP ${bpSys}/${bpDia}, ಸಕ್ಕರೆ ${glucose} mg/dL) ಸ್ಥಿತಿಗೆ ಇಂದು ಇದನ್ನು ತಪ್ಪಿಸುವುದು ಉತ್ತಮ. ಬದಲಿಗೆ ಕಡಿಮೆ ಎಣ್ಣೆಯ ರಾಗಿ ಮುದ್ದೆ/ಚಪಾತಿ ಮತ್ತು ತರಕಾರಿ ಸಾರು ಸೇವಿಸಿ.`;
    }
    return `Biryani and deep-fried snacks carry ~450–650 kcal per serving with high oil, saturated fat, cholesterol load, and sodium—which can push your BP (${bpSys}/${bpDia} mmHg) and blood sugar (${glucose} mg/dL) higher. Recommendation: Avoid today or keep to a rare 1-cup portion with cucumber raita; better option is dal, multigrain roti, and lightly sautéed vegetables.`;
  }

  if (q.includes("banana") || q.includes("fruit") || q.includes("mango") || q.includes("apple") || q.includes("vitamin")) {
    if (language === "hi") {
      return `छोटा केला (~90 kcal) विटामिन B6, विटामिन C और पोटैशियम से भरपूर है—जो BP (${bpSys}/${bpDia}) में मददगार है। आपकी शुगर (${glucose} mg/dL) और ${activeMeds} के साथ आधा या 1 छोटा कच्चा-पका केला दोपहर में ले सकते हैं; आम की जगह अमरूद, सेब या पपीता सबसे सुरक्षित हैं।`;
    }
    if (language === "kn") {
      return `ಒಂದು ಸಣ್ಣ ಬಾಳೆಹಣ್ಣಿನಲ್ಲಿ (~90 kcal) ವಿಟಮಿನ್ B6, C ಮತ್ತು ಪೊಟ್ಯಾಶಿಯಮ್ ಇದ್ದು BP (${bpSys}/${bpDia}) ನಿಯಂತ್ರಣಕ್ಕೆ ಸಹಕಾರಿ. ನಿಮ್ಮ ಸಕ್ಕರೆ (${glucose} mg/dL) ಮತ್ತು ${activeMeds} ಗಾಗಿ 1 ಸಣ್ಣ ಬಾಳೆಹಣ್ಣು ಅಥವಾ ಸೀಬೆ/ಸೇಬು ಮಿತವಾಗಿ ಸೇವಿಸಬಹುದು.`;
    }
    return `A small banana (~90 kcal) gives Vitamin B6, Vitamin C, fiber, and ~360 mg potassium (helpful for blood pressure ${bpSys}/${bpDia}). Since your recent fasting glucose is ${glucose} mg/dL on ${activeMeds}, safe in small portion: half to 1 small banana in the daytime (not with heavy rice/dessert). Even safer daily fruits for sugar & cholesterol: guava, apple, papaya, and berries.`;
  }

  if (q.includes("rice") || q.includes("roti") || q.includes("chapati") || q.includes("sugar") || q.includes("diabetes")) {
    return language === "hi"
      ? `आपकी शुगर (${glucose} mg/dL) और ${activeMeds} के लिए रात में सफेद चावल कम रखकर 2 मल्टीग्रेन या जवार/रागी की रोटी, दाल और हरी सब्ज़ियाँ लेना सबसे अच्छा है। इसमें फाइबर और विटामिन B कॉम्प्लेक्स अधिक होता है और शुगर धीरे बढ़ती है।`
      : language === "kn"
      ? `ನಿಮ್ಮ ಸಕ್ಕರೆ ಮಟ್ಟ (${glucose} mg/dL) ಮತ್ತು ${activeMeds} ಗಾಗಿ ರಾತ್ರಿ ಬಿಳಿ ಅನ್ನ ಕಡಿಮೆ ಮಾಡಿ 2 ಚಪಾತಿ ಅಥವಾ ರಾಗಿ ಮುದ್ದೆ, ಬೇಳೆ ಮತ್ತು ಹಸಿರು ತರಕಾರಿ ಸೇವಿಸುವುದು ಉತ್ತಮ.`
      : `For your ${condStr} (fasting glucose ${glucose} mg/dL on ${activeMeds}), replace white rice at dinner with 2 multigrain/jowar rotis or millet, paired with dal and fibrous greens. Rotis provide B-vitamins, slower sugar release, and better overnight glucose stability.`;
  }

  if (language === "hi") {
    return `आपके सक्रिय प्लान (${activeMeds}, BP ${bpSys}/${bpDia}, शुगर ${glucose} mg/dL) के अनुसार: कम तेल, कम नमक और कम ग्लाइसेमिक इंडेक्स वाला घर का भोजन लें, रोज़ 4,500 कदम टहलें और दवाएँ समय पर लें। किसी विशेष व्यंजन की विटामिन या कैलोरी जानकारी के लिए उसका नाम पूछें।`;
  }
  if (language === "kn") {
    return `ನಿಮ್ಮ ಸಕ್ರಿಯ ಚಿಕಿತ್ಸೆ (${activeMeds}, BP ${bpSys}/${bpDia}, ಸಕ್ಕರೆ ${glucose} mg/dL) ಪ್ರಕಾರ: ಕಡಿಮೆ ಎಣ್ಣೆ ಮತ್ತು ಕಡಿಮೆ ಉಪ್ಪಿನ ಮನೆಯ ಊಟ ಸೇವಿಸಿ, ದಿನಕ್ಕೆ 4,500 ಹೆಜ್ಜೆ ನಡೆಯಿರಿ ಮತ್ತು ಔಷಧಿಗಳನ್ನು ಸಮಯಕ್ಕೆ ತೆಗೆದುಕೊಳ್ಳಿ.`;
  }
  return `Based on your active profile (${condStr}, ${activeMeds}, latest BP ${bpSys}/${bpDia} mmHg, glucose ${glucose} mg/dL, SpO2 ${spo2}%): stick to low-oil, low-salt, high-fiber home meals, aim for your 4,500 daily steps, and avoid fried or sugary foods. Ask me about any specific Indian dish, fruit, or vitamin!`;
}

export async function createNutritionQaStream(params: {
  patientId: string;
  question: string;
  language: Locale;
}): Promise<{ stream: ReadableStream<Uint8Array>; modelUsed: string; symptomLogged: SymptomLog | null }> {
  const { patientId, question, language } = params;
  const detail = await getPatientDetailDb(patientId, "patient");
  if (!detail) {
    throw new Error(`Patient ${patientId} not found`);
  }

  const prescriptions = detail.activePrescriptions?.length
    ? detail.activePrescriptions
    : await getPrescriptionsDb(patientId);

  // Auto-detect physical symptoms ("word of mouth") and save for Doctor Cockpit
  const { symptoms, severityHint } = detectSymptomsFromText(question);
  let symptomLogged: SymptomLog | null = null;
  if (symptoms.length > 0) {
    symptomLogged = await saveSymptomLogDb({
      id: `sym-${Date.now()}`,
      patient_id: patientId,
      raw_text: question,
      language,
      extracted_symptoms: symptoms,
      severity_hint: severityHint,
      created_at: new Date().toISOString(),
    });
  }

  const langName = language === "hi" ? "Hindi" : language === "kn" ? "Kannada" : "English";
  const activeMedsText =
    prescriptions
      .flatMap((rx) =>
        rx.medicines.map(
          (m) => `${m.medicine_name} ${m.dosage} (${m.frequency}, ${m.with_food ? "after food" : "before food"})`
        )
      )
      .join("; ") || "Metformin 500mg twice daily, Amlodipine 5mg morning";

  const lifestyleText =
    prescriptions
      .flatMap((rx) => rx.lifestyle_targets.map((t) => t.description))
      .join("; ") || "4,500 steps/day, 350 active kcal/day, low-oil low-GI meals";

  const systemPrompt = `You are CareBridge Voice Companion, a warm local medical nutrition & health assistant for senior outpatient care.
Patient Profile:
- Name: ${detail.profile.name}, Age: ${detail.profile.age}
- Conditions: ${detail.profile.conditions.join(", ")}
- Allergies: ${(detail.profile.allergies || []).join(", ") || "None reported"}
- Active Prescriptions: ${activeMedsText}
- Prescribed Lifestyle Targets: ${lifestyleText}
- Latest Watch Vitals: BP ${detail.wearable?.bloodPressure.latestSystolic ?? 140}/${detail.wearable?.bloodPressure.latestDiastolic ?? 88} mmHg, HR ${detail.wearable?.heartRate.mean ?? 72} bpm, SpO2 ${detail.wearable?.spo2.latest ?? 97}%, Fasting Glucose ${detail.wearable?.glucose.latestFasting ?? 155} mg/dL, Steps ${detail.wearable?.steps.dailyMean ?? 2840}/day.
- Latest Doctor-Reviewed Summary: ${detail.latestDiagnosis?.ai_summary || "Stable post-discharge care."}

Strict Instructions:
1. Reply in natural, warm ${langName} under 110 words. Plain conversational text only (no markdown asterisks or tables) so it reads aloud cleanly via SpeechSynthesis.
2. For food/dish questions: estimate approximate calories, key vitamins/nutrients, oil/cholesterol/sodium & glycemic impact specifically for this patient's conditions & medicines, and give a clear recommendation ("Safe in small portion", "Avoid today", or "Better alternative").
3. Never claim to replace their doctor; if acute emergency symptoms (chest pain, breathlessness, dizziness) appear, tell them to contact Dr. Meera Rao immediately.`;

  const ollamaResult = await openOllamaStream({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    timeoutMs: 4500,
    temperature: 0.3,
    maxTokens: 280,
  });

  const encoder = new TextEncoder();

  if (ollamaResult) {
    let fullAnswer = "";
    const reader = ollamaResult.body.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                const chunk = parsed?.message?.content;
                if (typeof chunk === "string" && chunk.length > 0) {
                  fullAnswer += chunk;
                  controller.enqueue(encoder.encode(chunk));
                }
              } catch {
                // ignore malformed NDJSON fragment
              }
            }
          }
        } catch {
          // If Ollama stream drops midway without emitting anything, emit fallback
          if (!fullAnswer.trim()) {
            const fb = buildFallbackNutritionAnswer(
              question,
              language,
              detail,
              prescriptions,
              symptoms
            );
            fullAnswer = fb;
            controller.enqueue(encoder.encode(fb));
          }
        } finally {
          if (fullAnswer.trim()) {
            await saveAiQaLogDb({
              id: `qa-${Date.now()}`,
              patient_id: patientId,
              question,
              answer: fullAnswer.trim(),
              model_used: ollamaResult.model,
              created_at: new Date().toISOString(),
            });
          }
          controller.close();
        }
      },
    });

    return { stream, modelUsed: ollamaResult.model, symptomLogged };
  }

  // Try non-streaming cloud LLM fallback if configured, else deterministic Indian nutrition fallback
  let answerText: string | null = null;
  let modelUsed = "carebridge-clinical-offline";

  if (process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY) {
    const cloudRes = await callLlmChat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      timeoutMs: 4500,
      temperature: 0.3,
      maxTokens: 280,
    });
    if (cloudRes) {
      answerText = cloudRes.text;
      modelUsed = cloudRes.model;
    }
  }

  if (!answerText) {
    answerText = buildFallbackNutritionAnswer(question, language, detail, prescriptions, symptoms);
  }

  await saveAiQaLogDb({
    id: `qa-${Date.now()}`,
    patient_id: patientId,
    question,
    answer: answerText,
    model_used: modelUsed,
    created_at: new Date().toISOString(),
  });

  const finalWords = answerText.split(" ");
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (let i = 0; i < finalWords.length; i++) {
        const piece = i === finalWords.length - 1 ? finalWords[i] : finalWords[i] + " ";
        controller.enqueue(encoder.encode(piece));
        await new Promise((r) => setTimeout(r, 15));
      }
      controller.close();
    },
  });

  return { stream, modelUsed, symptomLogged };
}

