import type { TranslatorConfig, TranslateResponse } from "./types";

const SYSTEM_PROMPT = `You are a professional translator. Translate the following English text to Chinese (Simplified).
Rules:
- Translate each paragraph separately, keeping the same order
- Each paragraph's translation should be on its own line
- Use "|||" as separator between translations
- Only output the translations, no explanations or extra text
- Maintain the original meaning and tone
- Keep technical terms, proper nouns, code, URLs, and numbers unchanged`;

export async function translateBatch(
  config: TranslatorConfig,
  paragraphs: string[]
): Promise<TranslateResponse> {
  const userContent = paragraphs
    .map((p, i) => `[${i + 1}] ${p}`)
    .join("\n\n");

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const content: string = data.choices[0].message.content.trim();
  const translations = content.split("|||").map((t: string) => t.trim().replace(/^\[\d+\]\s*/, ""));

  while (translations.length < paragraphs.length) {
    translations.push("");
  }

  return {
    translations: translations.slice(0, paragraphs.length),
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
  };
}
