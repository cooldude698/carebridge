import { NextRequest, NextResponse } from "next/server";
import {
  getPatientDetailDb,
  getPrescriptionsDb,
  getDiagnosisReportsDb,
  getPatientVitalsDb,
  saveSymptomLogDb,
  saveAiQaLogDb,
} from "@/lib/supabase/db";
import {
  detectAcuteSymptom,
  generateOfflineNutritionAnswer,
  NutritionQaContext,
} from "@/lib/ai/nutritionQa";
import { streamOllamaChat } from "@/lib/ai/llmClient";
import { SymptomLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { patientId = "p1", question, language = "en" } = body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json(
        { error: "A valid non-empty question string is required." },
        { status: 400 }
      );
    }

    const cleanQuestion = question.trim();

    // 1. Fetch live patient context
    const patientDetail = await getPatientDetailDb(patientId, "patient");
    const [prescriptions, diagnosisReports, vitals] = await Promise.all([
      getPrescriptionsDb(patientId).catch(() => []),
      getDiagnosisReportsDb(patientId).catch(() => []),
      getPatientVitalsDb(patientId).catch(() => []),
    ]);

    const activePrescriptions = prescriptions.filter((rx) => rx.status === "active");
    const latestDiagnosis = diagnosisReports[0] || null;

    const latestBpVital = vitals.find((v) => v.type === "bp");
    const latestHrVital = vitals.find((v) => v.type === "hr");
    const latestSpo2Vital = vitals.find((v) => v.type === "spo2");
    const latestGluVital = vitals.find((v) => v.type === "glucose");
    const latestStepsVital = vitals.find((v) => v.type === "steps");
    const latestCalVital = vitals.find((v) => v.type === "calories");

    const context: NutritionQaContext = {
      patient: patientDetail?.profile || {
        id: patientId,
        name: "Ramesh K.",
        age: 62,
        language: "Hindi",
        conditions: ["Diabetes Type 2", "Hypertension"],
        doctor_id: "d1",
        family_id: "f1",
        created_at: new Date().toISOString(),
      },
      conditions: patientDetail?.profile.conditions || ["Diabetes Type 2", "Hypertension"],
      allergies: patientDetail?.profile.allergies || [],
      activePrescriptions,
      latestDiagnosis,
      latestVitals: {
        bp: latestBpVital ? `${latestBpVital.value_a}/${latestBpVital.value_b} mmHg` : "138/86 mmHg",
        hr: latestHrVital?.value_a ?? 72,
        spo2: latestSpo2Vital?.value_a ?? 97,
        glucose: latestGluVital?.value_a ?? 148,
        steps: latestStepsVital?.value_a ?? 3400,
        calories: latestCalVital?.value_a ?? 310,
      },
      language,
    };

    // 2. Symptom Auto-Detection: save "word of mouth" to symptom_logs
    const symptomCheck = detectAcuteSymptom(cleanQuestion);
    if (symptomCheck.isSymptom) {
      const sympLog: SymptomLog = {
        id: `symp-voice-${Date.now()}`,
        patient_id: patientId,
        raw_text: cleanQuestion,
        language,
        extracted_symptoms: symptomCheck.symptoms,
        severity_hint: symptomCheck.severity,
        created_at: new Date().toISOString(),
      };
      await saveSymptomLogDb(sympLog).catch((err) =>
        console.warn("[ask/route] Failed to log auto-detected symptom", err)
      );
    }

    // 3. Prepare System Prompt for Ollama
    const systemPrompt = `You are CareBridge AI, a clinical nutrition and preventive health assistant speaking with patient ${context.patient.name}.
Patient Profile:
- Age: ${context.patient.age}, Conditions: ${context.conditions.join(", ")}
- Allergies: ${context.allergies.length > 0 ? context.allergies.join(", ") : "None"}
- Active Medications: ${activePrescriptions.flatMap((rx) => rx.medicines.map((m) => `${m.medicine_name} ${m.dosage}`)).join(", ") || "Metformin, Amlodipine"}
- Latest Vitals: BP ${context.latestVitals.bp}, Glucose ${context.latestVitals.glucose} mg/dL, SpO2 ${context.latestVitals.spo2}%
Rules:
- Speak in warm, conversational, culturally grounded tone under 110 words.
- Language: Respond in ${language === "hi" ? "Hindi" : language === "kn" ? "Kannada" : "English"}.
- If asked about food: estimate calories, glycemic and sodium/oil impact for their specific conditions, and give a clear verdict (Safe / Avoid today / Better alternative).
- If symptoms are mentioned: advise resting, checking vitals, and contacting Dr. Rao if unresolving.
- Never state you replace their doctor.`;

    // 4. Try streaming from Ollama (stream: true)
    const ollamaStream = await streamOllamaChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: cleanQuestion },
      ],
      4000
    );

    const encoder = new TextEncoder();

    if (ollamaStream) {
      let fullAnswer = "";
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          const textChunk = new TextDecoder().decode(chunk);
          const lines = textChunk.split("\n");
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              const content = parsed?.message?.content;
              if (content) {
                fullAnswer += content;
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Ignore NDJSON parse noise
            }
          }
        },
        flush() {
          if (fullAnswer.trim().length > 0) {
            saveAiQaLogDb({
              patient_id: patientId,
              question: cleanQuestion,
              answer: fullAnswer.trim(),
              model_used: "ollama-llama3.2",
            }).catch(() => {});
          }
        },
      });

      return new Response(ollamaStream.pipeThrough(transformStream), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
        },
      });
    }

    // 5. Deterministic Offline Fallback Stream
    const fallbackAnswer = generateOfflineNutritionAnswer(cleanQuestion, context);

    // Save to AI QA logs
    saveAiQaLogDb({
      patient_id: patientId,
      question: cleanQuestion,
      answer: fallbackAnswer,
      model_used: "deterministic-nutrition-engine-v2",
    }).catch(() => {});

    // Stream the fallback tokens smoothly for rich voice UX
    const customReadable = new ReadableStream({
      async start(controller) {
        const words = fallbackAnswer.split(" ");
        for (let i = 0; i < words.length; i++) {
          const piece = i === words.length - 1 ? words[i] : words[i] + " ";
          controller.enqueue(encoder.encode(piece));
          await new Promise((r) => setTimeout(r, 20));
        }
        controller.close();
      },
    });

    return new Response(customReadable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process nutrition Q&A" },
      { status: 500 }
    );
  }
}
