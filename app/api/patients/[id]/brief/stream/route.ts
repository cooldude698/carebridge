import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { buildBriefContext, parseBriefOutput } from "@/lib/ai/contextBuilder";
import { BRIEF_SYSTEM_PROMPT } from "@/lib/ai/brief";
import { createClient } from "@/lib/supabase/server";
import { store } from "@/lib/supabase/localStore";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const patientId = params.id;

  let supabase: SupabaseClient | null = null;
  try {
    supabase = await createClient();
  } catch {
    // local/offline
  }

  const { context: briefContext } = await buildBriefContext(patientId, supabase);

  const fallbackText = `Since last visit: Adherence ${briefContext.adherence.pct7d}% over last 7 days. Latest BP ${briefContext.wearable.bloodPressure.latestSystolic} mmHg. Concerns: ${
    briefContext.wearable.anomalyFlags.filter((f) => f.severity === "HIGH").map((f) => f.title).join(". ") || "No active concerns."
  } Suggested checks: Review BP trend. Check medicine schedule. Doctor decides.`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let streamClosed = false;

      const sendEvent = (data: Record<string, unknown>) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          streamClosed = true;
        }
      };

      const safeClose = () => {
        if (streamClosed) return;
        streamClosed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const emitFallbackStream = async () => {
        const words = fallbackText.split(" ");
        for (let i = 0; i < words.length && !streamClosed; i++) {
          const token = i === words.length - 1 ? words[i] : words[i] + " ";
          sendEvent({ type: "token", delta: token });
          await new Promise((r) => setTimeout(r, 18));
        }
        sendEvent({
          type: "done",
          text: fallbackText,
          citations: [],
          source: "fallback",
        });
        safeClose();
      };

      const geminiApiKey = process.env.GEMINI_API_KEY;
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;

      let tokensReceived = false;
      let accumulatedText = "";
      const abortController = new AbortController();

      const timeout = setTimeout(() => {
        abortController.abort();
        if (!tokensReceived && !streamClosed) {
          sendEvent({
            type: "done",
            text: fallbackText,
            citations: [],
            source: "fallback",
          });
          safeClose();
        }
      }, 4000);

      try {
        if (!geminiApiKey && !anthropicApiKey && !ollamaBaseUrl) {
          clearTimeout(timeout);
          await emitFallbackStream();
          return;
        }

        if (geminiApiKey) {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${geminiApiKey}&alt=sse`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: abortController.signal,
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: `${BRIEF_SYSTEM_PROMPT}\n\nContext:\n${JSON.stringify(briefContext)}` }],
                  },
                ],
              }),
            }
          );

          if (!res.ok || !res.body) {
            throw new Error("Gemini stream failed");
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (chunkText) {
                    tokensReceived = true;
                    accumulatedText += chunkText;
                    sendEvent({ type: "token", delta: chunkText });
                  }
                } catch {
                  // ignore non-json chunk
                }
              }
            }
          }
        } else if (anthropicApiKey) {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicApiKey,
              "anthropic-version": "2023-06-01",
            },
            signal: abortController.signal,
            body: JSON.stringify({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 300,
              system: BRIEF_SYSTEM_PROMPT,
              messages: [{ role: "user", content: JSON.stringify(briefContext) }],
              stream: true,
            }),
          });

          if (!res.ok || !res.body) {
            throw new Error("Anthropic stream failed");
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                    tokensReceived = true;
                    accumulatedText += parsed.delta.text;
                    sendEvent({ type: "token", delta: parsed.delta.text });
                  }
                } catch {}
              }
            }
          }
        } else if (ollamaBaseUrl) {
          const res = await fetch(`${ollamaBaseUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: abortController.signal,
            body: JSON.stringify({
              model: process.env.OLLAMA_MODEL || "llama3.2",
              stream: true,
              messages: [
                { role: "system", content: BRIEF_SYSTEM_PROMPT },
                { role: "user", content: JSON.stringify(briefContext) },
              ],
            }),
          });

          if (!res.ok || !res.body) {
            throw new Error("Ollama stream failed");
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

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
                const chunkText = parsed?.message?.content;
                if (chunkText) {
                  tokensReceived = true;
                  accumulatedText += chunkText;
                  sendEvent({ type: "token", delta: chunkText });
                }
              } catch {}
            }
          }
        }

        clearTimeout(timeout);

        if (accumulatedText && !streamClosed) {
          if (!accumulatedText.includes("Doctor decides.")) {
            sendEvent({ type: "token", delta: " Doctor decides." });
            accumulatedText += " Doctor decides.";
          }
          const { citations, sections } = parseBriefOutput(accumulatedText, briefContext.readingIndex);

          store.addBrief({
            id: `brief-${Date.now()}`,
            patient_id: patientId,
            text: accumulatedText,
            source: "llm",
            sections,
            citations,
            created_at: new Date().toISOString(),
          });

          sendEvent({
            type: "done",
            citations,
            source: "llm",
          });
          safeClose();
        } else if (!streamClosed) {
          await emitFallbackStream();
        }
      } catch {
        clearTimeout(timeout);
        if (!tokensReceived && !streamClosed) {
          await emitFallbackStream();
        } else {
          safeClose();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
