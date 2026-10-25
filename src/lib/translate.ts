import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { FIELD_LIMITS, LOCALIZED_FIELDS, localeName, type LocalizedField } from "./locales";

export type LocalizedTexts = Record<LocalizedField, string>;

export const translationEnabled = () => !!process.env.ANTHROPIC_API_KEY;

const client = () => new Anthropic();

const SYSTEM = `You localize App Store / Google Play listings for a mobile app agency.
Translate the given fields into the target language so they read naturally to native speakers and work for App Store Optimization.
Rules:
- Respect the character limit of every field; it is a hard limit. Shorten or rephrase rather than exceed it.
- "keywords" is a comma-separated list without spaces after commas; translate into the search terms people in that market actually type, not word-for-word.
- Keep brand and app names untranslated unless a localized brand name is obvious.
- Keep line breaks and list formatting in long texts.
- An empty source field stays empty.`;

const schema = {
  type: "object",
  properties: Object.fromEntries(LOCALIZED_FIELDS.map((f) => [f, { type: "string" }])),
  required: [...LOCALIZED_FIELDS],
  additionalProperties: false,
};

export async function translateListing(
  source: LocalizedTexts,
  sourceLocale: string,
  targetLocale: string,
): Promise<LocalizedTexts> {
  const limits = LOCALIZED_FIELDS.map((f) => `${f}: max ${FIELD_LIMITS[f]} characters`).join("\n");
  const response = await client().beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema },
    },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Source language: ${localeName(sourceLocale)} (${sourceLocale})
Target language: ${localeName(targetLocale)} (${targetLocale})

Character limits:
${limits}

Source fields (JSON):
${JSON.stringify(source, null, 2)}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("Модель отказалась переводить этот текст");
  if (response.stop_reason === "max_tokens") throw new Error("Перевод оборвался: текст слишком длинный");
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("Пустой ответ сервиса перевода");
  const parsed = JSON.parse(text.text) as Partial<LocalizedTexts>;
  return Object.fromEntries(
    LOCALIZED_FIELDS.map((f) => [f, typeof parsed[f] === "string" ? parsed[f] : ""]),
  ) as LocalizedTexts;
}

// Запускает задачи параллельно, но не больше `limit` одновременно
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
