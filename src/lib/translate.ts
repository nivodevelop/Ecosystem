import "server-only";
import { LOCALIZED_FIELDS, type LocalizedField } from "./locales";

export type LocalizedTexts = Record<LocalizedField, string>;

// Бесплатный перевод без ключей:
// - LibreTranslate (свой сервер, open source) — если задан LIBRETRANSLATE_URL;
// - бесплатный веб-эндпоинт Google Translate (неофициальный, может ограничивать частые запросы) —
//   если LibreTranslate не задан или не знает нужный язык.
const LIBRE_URL = process.env.LIBRETRANSLATE_URL?.replace(/\/$/, "");
const GOOGLE_URL = process.env.GOOGLE_TRANSLATE_URL ?? "https://translate.googleapis.com/translate_a/single";

export const translationEnabled = () => true;
export const translationProvider = () =>
  LIBRE_URL ? "LibreTranslate, для неподдерживаемых языков Google Translate" : "Google Translate (бесплатный)";

// Варианты кода языка для движков перевода, от более точного к общему
function candidates(locale: string): string[] {
  const special: Record<string, string[]> = {
    "zh-Hans": ["zh-Hans", "zh", "zh-CN"],
    "zh-Hant": ["zh-Hant", "zt", "zh-TW"],
    "zh-HK": ["zh-Hant", "zt", "zh-TW"],
    "pt-BR": ["pt-BR", "pt"],
    "pt-PT": ["pt-PT", "pt"],
    no: ["nb", "no"],
    fil: ["tl", "fil"],
    he: ["he", "iw"],
  };
  return special[locale] ?? [locale.split("-")[0]];
}

const GOOGLE_CODES: Record<string, string> = {
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
  "zh-HK": "zh-TW",
  "pt-BR": "pt",
  "pt-PT": "pt-PT",
  fil: "tl",
  he: "iw",
};
const googleCode = (locale: string) => GOOGLE_CODES[locale] ?? locale.split("-")[0];

let libreLanguages: Promise<Set<string>> | null = null;

class UnsupportedLanguage extends Error {}

async function libreCode(locale: string): Promise<string> {
  libreLanguages ??= fetch(`${LIBRE_URL}/languages`)
    .then((r) => {
      if (!r.ok) throw new Error(`LibreTranslate недоступен (${r.status})`);
      return r.json() as Promise<{ code: string }[]>;
    })
    .then((list) => new Set(list.map((l) => l.code)))
    .catch((e) => {
      libreLanguages = null;
      throw e;
    });
  const supported = await libreLanguages;
  const code = candidates(locale).find((c) => supported.has(c));
  if (!code) throw new UnsupportedLanguage(`LibreTranslate не поддерживает язык ${locale}`);
  return code;
}

async function libreTranslate(texts: string[], from: string, to: string): Promise<string[]> {
  const [source, target] = await Promise.all([libreCode(from), libreCode(to)]);
  const res = await fetch(`${LIBRE_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: texts, source, target, format: "text", api_key: process.env.LIBRETRANSLATE_API_KEY }),
  });
  if (!res.ok) throw new Error(`LibreTranslate: ошибка ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { translatedText: string[] };
  return data.translatedText;
}

async function googleTranslateOne(text: string, from: string, to: string): Promise<string> {
  const params = new URLSearchParams({ client: "gtx", sl: googleCode(from), tl: googleCode(to), dt: "t" });
  const res = await fetch(`${GOOGLE_URL}?${params}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ q: text }),
    redirect: "manual",
  });
  if (res.status !== 200) {
    throw new Error("Google временно ограничил бесплатные запросы. Попробуйте позже или подключите LibreTranslate");
  }
  const data = (await res.json()) as [[string, string][]];
  return data[0].map((seg) => seg[0]).join("");
}

async function googleTranslate(texts: string[], from: string, to: string): Promise<string[]> {
  const out: string[] = [];
  for (const t of texts) out.push(t.trim() ? await googleTranslateOne(t, from, to) : t);
  return out;
}

// Ключевые слова: перевод через запятую с пробелом (так движки не склеивают слова), затем обратно в формат стора
const keywordsIn = (s: string) => s.split(",").map((k) => k.trim()).filter(Boolean).join(", ");
function keywordsOut(s: string) {
  const words = s.split(/[,，、،]/).map((k) => k.trim()).filter(Boolean);
  return [...new Set(words.map((w) => w.toLocaleLowerCase()))].join(",");
}

export async function translateListing(
  source: LocalizedTexts,
  sourceLocale: string,
  targetLocale: string,
): Promise<LocalizedTexts> {
  const fields = LOCALIZED_FIELDS.filter((f) => source[f].trim());
  const texts = fields.map((f) => (f === "keywords" ? keywordsIn(source[f]) : source[f]));
  let translated: string[];
  try {
    if (!LIBRE_URL) throw new UnsupportedLanguage();
    translated = await libreTranslate(texts, sourceLocale, targetLocale);
  } catch (e) {
    if (!(e instanceof UnsupportedLanguage)) throw e;
    translated = await googleTranslate(texts, sourceLocale, targetLocale);
  }
  const result = Object.fromEntries(LOCALIZED_FIELDS.map((f) => [f, ""])) as LocalizedTexts;
  fields.forEach((f, i) => {
    result[f] = f === "keywords" ? keywordsOut(translated[i] ?? "") : (translated[i] ?? "");
  });
  return result;
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
