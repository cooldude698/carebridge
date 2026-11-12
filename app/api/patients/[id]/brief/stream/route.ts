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

  let supabase: any = null;
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
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const geminiApiKey = process.env.GEMINI_API_KEY;
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;

      let tokensReceived = false;
      let accumulatedText = "";

      const timeout = setTimeout(() => {
        if (!tokensReceived) {
          sendEvent({
            type: "done",
            text: fallbackText,
            citations: [],
            source: "fallback",
          });
          controller.close();
        }
      }, 4000);

      try {
        let streamStarted = false;

        // 1. Try local Ollama first
        const effectiveOllamaUrl = ollamaBaseUrl || "http://localhost:11434";
        try {
          const res = await fetch(`${effectiveOllamaUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: process.env.OLLAMA_MODEL || "llama3.2",
              messages: [
                { role: "system", content: BRIEF_SYSTEM_PROMPT },
                { role: "user", content: `Context:\n${JSON.stringify(briefContext)}` },
              ],
              stream: true,
            }),
          });

          if (res.ok && res.body) {
            streamStarted = true;
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
                  const token = parsed?.message?.content;
                  if (token) {
                    tokensReceived = true;
                    accumulatedText += token;
                    sendEvent({ type: "token", delta: token });
                  }
                } catch {}
              }
            }
          }
        } catch {
          // Ollama not reachable, fall through
        }

        if (!streamStarted && geminiApiKey) {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${geminiApiKey}&alt=sse`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
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
        }

        clearTimeout(timeout);

        if (accumulatedText) {
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
        } else {
          const words = fallbackText.split(" ");
          for (let i = 0; i < words.length; i++) {
            const token = i === words.length - 1 ? words[i] : words[i] + " ";
            sendEvent({ type: "token", delta: token });
            await new Promise((r) => setTimeout(r, 20));
          }
          sendEvent({
            type: "done",
            text: fallbackText,
            citations: [],
            source: "fallback",
          });
        }

        controller.close();
      } catch {
        clearTimeout(timeout);
        sendEvent({ type: "error", message: "Brief unavailable" });
        controller.close();
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
