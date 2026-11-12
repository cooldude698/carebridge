import type { SupabaseClient } from "@supabase/supabase-js";
import { store } from "@/lib/supabase/localStore";
import { createClient } from "@/lib/supabase/server";
import { buildBriefContext, parseBriefOutput } from "./contextBuilder";

export interface BriefSections {
  sinceLastVisit: string;
  concerns: string;
  suggestedChecks: string;
}

export interface BriefCitationItem {
  readingId: string;
  value: string;
  at: string;
}

export interface BriefResult {
  text: string;
  source: "llm" | "fallback";
  sections: BriefSections;
  citations: BriefCitationItem[];
  generatedAt?: string;
}

export const BRIEF_SYSTEM_PROMPT = `You are a clinical decision-support tool. Generate a pre-consult brief in exactly 3 sections.

Rules:
- Max 100 words total across all three sections.
- Three sections in this exact order, with these exact labels:
  'Since last visit:' / 'Concerns:' / 'Suggested checks:'
- Cite every specific value as Reading:{readingId} using the readingIndex provided.
  Example: 'Heart rate elevated (Reading:abc123).' NOT 'Heart rate elevated at 108 bpm.'
- If anomalyFlags contains HIGH severity items, list them first in Concerns.
- Never say 'diagnose', 'treatment', or specific drug doses.
- End the entire brief with: 'Doctor decides.'
- Output plain text only. No markdown, no bullet points.`;

export async function generateBrief(patientId: string): Promise<BriefResult> {
  let supabase: SupabaseClient | null = null;
  try {
    supabase = await createClient();
  } catch {
    // local/offline
  }

  const { context } = await buildBriefContext(patientId, supabase);

  // Deterministic rule-based fallback
  const highAnomalies = context.wearable.anomalyFlags
    .filter((f) => f.severity === "HIGH")
    .map((f) => f.title);

  const fallbackSections: BriefSections = {
    sinceLastVisit: `Adherence ${context.adherence.pct7d}% over last 7 days. Latest BP ${context.wearable.bloodPressure.latestSystolic} mmHg.`,
    concerns: highAnomalies.length > 0 ? highAnomalies.join(". ") + "." : "No active concerns.",
    suggestedChecks: "Review BP trend. Check medicine schedule. Doctor decides.",
  };

  const fallbackText = `Since last visit: ${fallbackSections.sinceLastVisit} Concerns: ${fallbackSections.concerns} Suggested checks: ${fallbackSections.suggestedChecks}`;

  // Check for LLM keys (Gemini / Anthropic / Ollama)
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const llmApiKey = process.env.LLM_API_KEY;
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;

  const hasLlm = Boolean(geminiApiKey || anthropicApiKey || llmApiKey || ollamaBaseUrl);

  if (!hasLlm) {
    const result: BriefResult = {
      text: fallbackText,
      source: "fallback",
      sections: fallbackSections,
      citations: [],
      generatedAt: new Date().toISOString(),
    };
    await persistBrief(patientId, result, supabase);
    return result;
  }

  // Attempt LLM generation with 4-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    let rawOutput: string | null = null;

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
                  { text: `${BRIEF_SYSTEM_PROMPT}\n\nContext:\n${JSON.stringify(context, null, 2)}` },
                ],
              },
            ],
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    } else if (anthropicApiKey) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 300,
          system: BRIEF_SYSTEM_PROMPT,
          messages: [{ role: "user", content: JSON.stringify(context) }],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        rawOutput = data.content?.[0]?.text;
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
            { role: "system", content: BRIEF_SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(context) },
          ],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        rawOutput = data.message?.content;
      }
    }

    clearTimeout(timeoutId);

    if (rawOutput && typeof rawOutput === "string") {
      let cleaned = rawOutput.trim();
      if (!cleaned.endsWith("Doctor decides.")) {
        cleaned += " Doctor decides.";
      }

      const { sections, citations } = parseBriefOutput(cleaned, context.readingIndex);
      const result: BriefResult = {
        text: cleaned,
        source: "llm",
        sections,
        citations,
        generatedAt: new Date().toISOString(),
      };
      await persistBrief(patientId, result, supabase);
      return result;
    }
  } catch {
    // Timeout or network failure — fall through to graceful fallback
  } finally {
    clearTimeout(timeoutId);
  }

  // Graceful fallback
  const result: BriefResult = {
    text: fallbackText,
    source: "fallback",
    sections: fallbackSections,
    citations: [],
    generatedAt: new Date().toISOString(),
  };
  await persistBrief(patientId, result, supabase);
  return result;
}

async function persistBrief(
  patientId: string,
  result: BriefResult,
  supabase?: SupabaseClient | null
) {
  try {
    store.addBrief({
      id: `brief-${Date.now()}`,
      patient_id: patientId,
      text: result.text,
      source: result.source,
      sections: result.sections,
      citations: result.citations,
      created_at: result.generatedAt || new Date().toISOString(),
    });

    if (supabase && typeof supabase.from === "function") {
      await supabase.from("briefs").insert({
        id: `brief-${Date.now()}`,
        patient_id: patientId,
        text: result.text,
        source: result.source,
        sections: result.sections,
        citations: result.citations,
      });
    }
  } catch {
    // Non-blocking persistence failure
  }
}
