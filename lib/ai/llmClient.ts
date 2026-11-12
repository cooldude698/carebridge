/**
 * Standardized Local LLM (Ollama llama3.2) & Fallback Invocation Helper
 * Priority:
 * 1. Local Ollama (default http://localhost:11434, llama3.2) via /api/chat with 4500ms timeout.
 * 2. Gemini API / Anthropic API (if keys are present).
 * 3. Returns null immediately so callers invoke their deterministic medical fallbacks.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface QueryLlmOptions {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
}

export async function queryLlm(options: QueryLlmOptions): Promise<string | null> {
  const { systemPrompt, userPrompt, temperature = 0.2, timeoutMs = 4500 } = options;

  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2";

  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  // 1. Try local Ollama first
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: ollamaModel,
        messages,
        stream: false,
        options: {
          temperature,
        },
      }),
    });

    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      const content = data?.message?.content;
      if (typeof content === "string" && content.trim().length > 0) {
        return content.trim();
      }
    }
  } catch {
    // Ollama not running or timed out — continue to optional cloud fallback
  }

  // 2. Optional Gemini Cloud Fallback
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const combinedPrompt = systemPrompt
        ? `${systemPrompt}\n\nTask:\n${userPrompt}`
        : userPrompt;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: combinedPrompt }] }],
            generationConfig: { temperature },
          }),
        }
      );

      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === "string" && text.trim().length > 0) {
          return text.trim();
        }
      }
    } catch {
      // Cloud fallback unavailable
    }
  }

  // 3. Optional Anthropic Cloud Fallback
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1024,
          system: systemPrompt || undefined,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const text = data?.content?.[0]?.text;
        if (typeof text === "string" && text.trim().length > 0) {
          return text.trim();
        }
      }
    } catch {
      // Cloud fallback unavailable
    }
  }

  return null;
}

/**
 * Connects to Ollama /api/chat with streaming enabled (stream: true).
 * Returns the raw fetch Response body ReadableStream, or null if unreachable.
 */
export async function streamOllamaChat(
  messages: ChatMessage[],
  timeoutMs: number = 4500
): Promise<ReadableStream<Uint8Array> | null> {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: ollamaModel,
        messages,
        stream: true,
      }),
    });

    clearTimeout(timer);

    if (response.ok && response.body) {
      return response.body;
    }
  } catch {
    // Unreachable
  }

  return null;
}
