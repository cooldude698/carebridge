export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmChatOptions {
  messages: ChatMessage[];
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
}

export function extractJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  try {
    const direct = JSON.parse(cleaned);
    if (direct && typeof direct === "object" && !Array.isArray(direct)) {
      return direct as Record<string, unknown>;
    }
  } catch {
    // Try extracting outermost braces if model included conversational preamble
  }

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const sliced = JSON.parse(cleaned.slice(start, end + 1));
    if (sliced && typeof sliced === "object" && !Array.isArray(sliced)) {
      return sliced as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

export async function callLlmChat({
  messages,
  timeoutMs = 4500,
  temperature = 0.2,
  maxTokens = 450,
}: LlmChatOptions): Promise<{ text: string; model: string } | null> {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2";
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  // 1. Primary: Local Ollama
  if (ollamaBaseUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${ollamaBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: ollamaModel,
          stream: false,
          options: { temperature, num_predict: maxTokens },
          messages,
        }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const content = data?.message?.content;
        if (typeof content === "string" && content.trim()) {
          return { text: content.trim(), model: `ollama-${ollamaModel}` };
        }
      }
    } catch {
      clearTimeout(timer);
    }
  }

  // 2. Optional Cloud Fallback: Gemini
  if (geminiApiKey) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const promptText = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
        }
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof content === "string" && content.trim()) {
          return { text: content.trim(), model: "gemini-1.5-flash" };
        }
      }
    } catch {
      clearTimeout(timer);
    }
  }

  // 3. Optional Cloud Fallback: Anthropic
  if (anthropicApiKey) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const systemMsg = messages.find((m) => m.role === "system")?.content || "";
      const userMsgs = messages.filter((m) => m.role !== "system");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: maxTokens,
          temperature,
          system: systemMsg,
          messages: userMsgs,
        }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const content = data?.content?.[0]?.text;
        if (typeof content === "string" && content.trim()) {
          return { text: content.trim(), model: "claude-3-5-sonnet" };
        }
      }
    } catch {
      clearTimeout(timer);
    }
  }

  return null;
}

export async function openOllamaStream({
  messages,
  timeoutMs = 4500,
  temperature = 0.3,
  maxTokens = 320,
}: LlmChatOptions): Promise<{ body: ReadableStream<Uint8Array>; model: string } | null> {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2";
  if (!ollamaBaseUrl) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: ollamaModel,
        stream: true,
        options: { temperature, num_predict: maxTokens },
        messages,
      }),
    });
    clearTimeout(timer);

    if (!res.ok || !res.body) return null;
    return { body: res.body, model: `ollama-${ollamaModel}` };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

