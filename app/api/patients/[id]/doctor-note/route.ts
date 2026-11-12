import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/supabase/localStore";
import { createClient } from "@/lib/supabase/server";
import { extractJsonObject } from "@/lib/ai/llmClient";

export const dynamic = "force-dynamic";

interface ParsedGoal {
  category: "steps" | "medicine" | "bp" | "glucose" | "other";
  target: string;
  by?: string;
}

interface ParsedReminder {
  medicine: string;
  time: string;
  instruction: string;
}

interface ParsedInstructions {
  reminders: ParsedReminder[];
  goals: ParsedGoal[];
  followUpDate: string | null;
}

const DOCTOR_NOTE_SYSTEM_PROMPT = `Extract structured care instructions from a doctor's note. Return ONLY valid JSON with no other text:
{ 
  "reminders": [{ "medicine": "string", "time": "string", "instruction": "string" }],
  "goals": [{ "category": "steps|medicine|bp|glucose|other", "target": "string", "by": "YYYY-MM-DD" }],
  "followUpDate": "YYYY-MM-DD or null"
}
Rules: No diagnosis language. No drug dose advice. If a field is unclear, omit it.`;

function buildHeuristicDoctorNote(noteText: string): ParsedInstructions {
  const goals: ParsedGoal[] = [];
  const lower = noteText.toLowerCase();
  if (lower.includes("step") || lower.includes("walk")) {
    goals.push({
      category: "steps",
      target: "Walk 4,000 steps daily",
      by: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    });
  }
  if (lower.includes("bp") || lower.includes("pressure")) {
    goals.push({
      category: "bp",
      target: "Monitor morning BP daily",
      by: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    });
  }
  if (lower.includes("salt") || lower.includes("diet") || lower.includes("water")) {
    goals.push({
      category: "other",
      target: "Reduce dietary sodium intake",
      by: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    });
  }
  return {
    reminders: [],
    goals,
    followUpDate: null,
  };
}

async function parseDoctorNoteWithLLM(noteText: string): Promise<ParsedInstructions> {
  const fallback = buildHeuristicDoctorNote(noteText);

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const llmApiKey = process.env.LLM_API_KEY;
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;

  const hasLlm = Boolean(geminiApiKey || anthropicApiKey || llmApiKey || ollamaBaseUrl);
  if (!hasLlm) {
    return fallback;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    let rawText: string | null = null;

    if (geminiApiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: `${DOCTOR_NOTE_SYSTEM_PROMPT}\n\nDoctor note:\n"${noteText}"` },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 300,
            },
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }
    } else if (anthropicApiKey || llmApiKey) {
      const apiKey = anthropicApiKey || llmApiKey;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey as string,
          "anthropic-version": "2023-06-01",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 300,
          temperature: 0.1,
          system: DOCTOR_NOTE_SYSTEM_PROMPT,
          messages: [{ role: "user", content: noteText }],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        rawText = data?.content?.[0]?.text || null;
      }
    } else if (ollamaBaseUrl) {
      const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || "llama3.2",
          stream: false,
          messages: [
            { role: "system", content: DOCTOR_NOTE_SYSTEM_PROMPT },
            { role: "user", content: noteText },
          ],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        rawText = data?.message?.content || null;
      }
    }

    clearTimeout(timeoutId);

    if (!rawText) return fallback;

    const parsed = extractJsonObject(rawText);
    if (!parsed) return fallback;

    return {
      reminders: Array.isArray(parsed.reminders) ? (parsed.reminders as ParsedReminder[]) : [],
      goals: Array.isArray(parsed.goals) ? (parsed.goals as ParsedGoal[]) : fallback.goals,
      followUpDate: typeof parsed.followUpDate === "string" ? parsed.followUpDate : null,
    };
  } catch {
    clearTimeout(timeoutId);
    return fallback;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const patientId = params.id;

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { noteText, doctorId = "d1" } = body;

    if (typeof noteText !== "string" || noteText.trim().length < 20 || noteText.trim().length > 500) {
      return NextResponse.json(
        { error: "Note must be 20–500 characters" },
        { status: 400 }
      );
    }

    const trimmedNote = noteText.trim();

    // Parse structured instructions
    const parsedInstructions = await parseDoctorNoteWithLLM(trimmedNote);

    // Save in localStore
    const savedNote = store.addDoctorNote(
      patientId,
      doctorId,
      trimmedNote,
      parsedInstructions
    );

    // Sync to Supabase if connected
    try {
      const supabase = await createClient();
      if (supabase && typeof supabase.from === "function") {
        await supabase.from("doctor_notes").insert({
          id: savedNote.id,
          patient_id: patientId,
          doctor_id: doctorId,
          note_text: trimmedNote,
          parsed_instructions: parsedInstructions,
          created_at: savedNote.created_at,
        });

        if (parsedInstructions.goals.length > 0) {
          const goalRows = parsedInstructions.goals.map((g) => ({
            id: `pg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            patient_id: patientId,
            category: g.category || "other",
            target: g.target || "Health target",
            by_date: g.by || null,
            source_note_id: savedNote.id,
            completed_at: null,
            created_at: new Date().toISOString(),
          }));
          await supabase.from("patient_goals").insert(goalRows);
        }

        await supabase.from("alerts").insert({
          id: `alt-${Date.now()}`,
          patient_id: patientId,
          level: "reminder",
          audience: "patient",
          message: "Dr. Rao updated your care plan. Tap to review.",
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      // Local mode fallback
    }

    return NextResponse.json({
      noteId: savedNote.id,
      parsedInstructions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process doctor note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
