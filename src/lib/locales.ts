export type StoreLocale = { code: string; name: string };

// Локали листинга App Store Connect
export const LOCALES: StoreLocale[] = [
  { code: "ar-SA", name: "Арабский" },
  { code: "ca", name: "Каталанский" },
  { code: "zh-Hans", name: "Китайский (упрощённый)" },
  { code: "zh-Hant", name: "Китайский (традиционный)" },
  { code: "hr", name: "Хорватский" },
  { code: "cs", name: "Чешский" },
  { code: "da", name: "Датский" },
  { code: "nl-NL", name: "Нидерландский" },
  { code: "en-US", name: "Английский (США)" },
  { code: "en-GB", name: "Английский (Великобритания)" },
  { code: "en-AU", name: "Английский (Австралия)" },
  { code: "en-CA", name: "Английский (Канада)" },
  { code: "fi", name: "Финский" },
  { code: "fr-FR", name: "Французский" },
  { code: "fr-CA", name: "Французский (Канада)" },
  { code: "de-DE", name: "Немецкий" },
  { code: "el", name: "Греческий" },
  { code: "he", name: "Иврит" },
  { code: "hi", name: "Хинди" },
  { code: "hu", name: "Венгерский" },
  { code: "id", name: "Индонезийский" },
  { code: "it", name: "Итальянский" },
  { code: "ja", name: "Японский" },
  { code: "ko", name: "Корейский" },
  { code: "ms", name: "Малайский" },
  { code: "no", name: "Норвежский" },
  { code: "pl", name: "Польский" },
  { code: "pt-BR", name: "Португальский (Бразилия)" },
  { code: "pt-PT", name: "Португальский (Португалия)" },
  { code: "ro", name: "Румынский" },
  { code: "ru", name: "Русский" },
  { code: "sk", name: "Словацкий" },
  { code: "es-ES", name: "Испанский (Испания)" },
  { code: "es-MX", name: "Испанский (Мексика)" },
  { code: "sv", name: "Шведский" },
  { code: "th", name: "Тайский" },
  { code: "tr", name: "Турецкий" },
  { code: "uk", name: "Украинский" },
  { code: "vi", name: "Вьетнамский" },
];

export const localeName = (code: string) => LOCALES.find((l) => l.code === code)?.name ?? code;
export const isLocale = (code: string) => LOCALES.some((l) => l.code === code);

// Лимиты символов App Store Connect
export const FIELD_LIMITS = {
  title: 30,
  subtitle: 30,
  promoText: 170,
  keywords: 100,
  description: 4000,
  whatsNew: 4000,
} as const;

export type LocalizedField = keyof typeof FIELD_LIMITS;

export const FIELD_LABELS: Record<LocalizedField, string> = {
  title: "Название",
  subtitle: "Подзаголовок",
  promoText: "Промо-текст",
  keywords: "Ключевые слова",
  description: "Описание",
  whatsNew: "Что нового",
};

export const LOCALIZED_FIELDS = Object.keys(FIELD_LIMITS) as LocalizedField[];

// Сколько скринов показываем в карточке канбана и сколько максимум в локали
export const BOARD_SHOTS = 3;
export const MAX_SHOTS_PER_LOCALE = 10;
