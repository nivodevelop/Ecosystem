import { FIELD_LIMITS, LOCALIZED_FIELDS, type LocalizedField } from "./locales";

// Apple считает символы, а не UTF-16 единицы: эмодзи и иероглифы вне BMP — один символ
export const charCount = (s: string) => Array.from(s).length;

const TRAILING = /[\s,;:\-–—/|(]+$/u;

// Обрезает текст до лимита, стараясь не резать слово или предложение
export function fitText(text: string, limit: number): string {
  const chars = Array.from(text);
  if (chars.length <= limit) return text;
  const cut = chars.slice(0, limit).join("");
  const minKeep = Math.floor(cut.length * 0.6);

  if (limit > 170) {
    // Длинные тексты: по концу предложения или абзаца
    const sentenceEnd = Math.max(...[". ", "! ", "? ", "\n", "。", "！", "？"].map((p) => cut.lastIndexOf(p)));
    if (sentenceEnd >= minKeep) return cut.slice(0, sentenceEnd + 1).trimEnd();
  }
  const space = cut.search(/\s\S*$/u);
  const result = space >= minKeep ? cut.slice(0, space) : cut;
  return result.replace(TRAILING, "");
}

// Ключевые слова: убираем целые слова с конца списка, пока строка не уложится в лимит
export function fitKeywords(keywords: string, limit: number): string {
  const out: string[] = [];
  for (const k of keywords.split(",").map((x) => x.trim()).filter(Boolean)) {
    if (charCount([...out, k].join(",")) <= limit) out.push(k);
  }
  return out.join(",");
}

export function fitListing<T extends Record<LocalizedField, string>>(texts: T): { texts: T; trimmed: LocalizedField[] } {
  const result = { ...texts };
  const trimmed: LocalizedField[] = [];
  for (const f of LOCALIZED_FIELDS) {
    const limit = FIELD_LIMITS[f];
    if (charCount(texts[f]) <= limit) continue;
    result[f] = (f === "keywords" ? fitKeywords(texts[f], limit) : fitText(texts[f], limit)) as T[typeof f];
    trimmed.push(f);
  }
  return { texts: result, trimmed };
}
