import { requestUrl } from "obsidian";
import { LOCALIZED_FIELDS, type LocalizedField } from "./locales";
import { fitListing } from "./fit";

export type LocalizedTexts = Record<LocalizedField, string>;

// Бесплатный перевод без ключей: бесплатный веб-эндпоинт Google Translate,
// либо свой LibreTranslate, если в настройках указан его адрес.
// Языки, которых нет в LibreTranslate, переводятся через Google.

const GOOGLE_URL = "https://translate.googleapis.com/translate_a/single";

function candidates(locale: string): string[] {
  const special: Record<string, string[]> = {
    "zh-Hans": ["zh-Hans", "zh", "zh-CN"],
    "zh-Hant": ["zh-Hant", "zt", "zh-TW"],
    "pt-BR": ["pt-BR", "pt"],
    "pt-PT": ["pt-PT", "pt"],
    no: ["nb", "no"],
    he: ["he", "iw"],
  };
  return special[locale] ?? [locale.split("-")[0]];
}

const GOOGLE_CODES: Record<string, string> = {
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
  "pt-BR": "pt",
  "pt-PT": "pt-PT",
  he: "iw",
};
const googleCode = (locale: string) => GOOGLE_CODES[locale] ?? locale.split("-")[0];

class UnsupportedLanguage extends Error {}

export class Translator {
  private libreLanguages: Promise<Set<string>> | null = null;

  constructor(private libreUrl: () => string) {}

  private base() {
    return this.libreUrl().trim().replace(/\/$/, "");
  }

  private async libreCode(locale: string): Promise<string> {
    this.libreLanguages ??= requestUrl({ url: `${this.base()}/languages` })
      .then((r) => new Set((r.json as { code: string }[]).map((l) => l.code)))
      .catch((e) => {
        this.libreLanguages = null;
        throw new Error(`LibreTranslate недоступен: ${e instanceof Error ? e.message : e}`);
      });
    const supported = await this.libreLanguages;
    const code = candidates(locale).find((c) => supported.has(c));
    if (!code) throw new UnsupportedLanguage(locale);
    return code;
  }

  private async libre(texts: string[], from: string, to: string): Promise<string[]> {
    const [source, target] = await Promise.all([this.libreCode(from), this.libreCode(to)]);
    const res = await requestUrl({
      url: `${this.base()}/translate`,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({ q: texts, source, target, format: "text" }),
    });
    return (res.json as { translatedText: string[] }).translatedText;
  }

  private async googleOne(text: string, from: string, to: string): Promise<string> {
    const params = new URLSearchParams({ client: "gtx", sl: googleCode(from), tl: googleCode(to), dt: "t" });
    const res = await requestUrl({
      url: `${GOOGLE_URL}?${params}`,
      method: "POST",
      contentType: "application/x-www-form-urlencoded;charset=UTF-8",
      body: new URLSearchParams({ q: text }).toString(),
      throw: false,
    });
    if (res.status !== 200) {
      throw new Error("Google временно ограничил бесплатные запросы. Попробуйте позже или укажите LibreTranslate в настройках");
    }
    const data = res.json as [[string, string][]];
    return data[0].map((seg) => seg[0]).join("");
  }

  private async google(texts: string[], from: string, to: string): Promise<string[]> {
    const out: string[] = [];
    for (const t of texts) out.push(t.trim() ? await this.googleOne(t, from, to) : t);
    return out;
  }

  async translate(source: LocalizedTexts, from: string, to: string) {
    const fields = LOCALIZED_FIELDS.filter((f) => source[f].trim());
    const texts = fields.map((f) => (f === "keywords" ? keywordsIn(source[f]) : source[f]));
    let translated: string[];
    try {
      if (!this.base()) throw new UnsupportedLanguage(to);
      translated = await this.libre(texts, from, to);
    } catch (e) {
      if (!(e instanceof UnsupportedLanguage)) throw e;
      translated = await this.google(texts, from, to);
    }
    const result = Object.fromEntries(LOCALIZED_FIELDS.map((f) => [f, ""])) as LocalizedTexts;
    fields.forEach((f, i) => {
      result[f] = f === "keywords" ? keywordsOut(translated[i] ?? "") : (translated[i] ?? "");
    });
    // Перевод обычно длиннее оригинала — обрезаем по лимитам App Store
    return fitListing(result);
  }
}

// Ключевые слова: перевод через запятую с пробелом (так движки не склеивают слова), затем обратно в формат App Store
const keywordsIn = (s: string) => s.split(",").map((k) => k.trim()).filter(Boolean).join(", ");
function keywordsOut(s: string) {
  const words = s.split(/[,，、،]/).map((k) => k.trim()).filter(Boolean);
  return [...new Set(words.map((w) => w.toLocaleLowerCase()))].join(",");
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
