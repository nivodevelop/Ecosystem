export type StoreLocale = {
  code: string;
  name: string;
  // Код локали в App Store Connect и в Google Play Console (null — стор её не поддерживает)
  appStore: string | null;
  googlePlay: string | null;
};

// Все локали листинга App Store и Google Play
export const LOCALES: StoreLocale[] = [
  { code: "af", name: "Африкаанс", appStore: null, googlePlay: "af" },
  { code: "am", name: "Амхарский", appStore: null, googlePlay: "am" },
  { code: "ar-SA", name: "Арабский", appStore: "ar-SA", googlePlay: "ar" },
  { code: "hy", name: "Армянский", appStore: null, googlePlay: "hy-AM" },
  { code: "az", name: "Азербайджанский", appStore: null, googlePlay: "az-AZ" },
  { code: "eu", name: "Баскский", appStore: null, googlePlay: "eu-ES" },
  { code: "be", name: "Белорусский", appStore: null, googlePlay: "be" },
  { code: "bn", name: "Бенгальский", appStore: null, googlePlay: "bn-BD" },
  { code: "bg", name: "Болгарский", appStore: null, googlePlay: "bg" },
  { code: "my", name: "Бирманский", appStore: null, googlePlay: "my-MM" },
  { code: "ca", name: "Каталанский", appStore: "ca", googlePlay: "ca" },
  { code: "zh-Hans", name: "Китайский (упрощённый)", appStore: "zh-Hans", googlePlay: "zh-CN" },
  { code: "zh-Hant", name: "Китайский (традиционный)", appStore: "zh-Hant", googlePlay: "zh-TW" },
  { code: "zh-HK", name: "Китайский (Гонконг)", appStore: null, googlePlay: "zh-HK" },
  { code: "hr", name: "Хорватский", appStore: "hr", googlePlay: "hr" },
  { code: "cs", name: "Чешский", appStore: "cs", googlePlay: "cs-CZ" },
  { code: "da", name: "Датский", appStore: "da", googlePlay: "da-DK" },
  { code: "nl-NL", name: "Нидерландский", appStore: "nl-NL", googlePlay: "nl-NL" },
  { code: "en-US", name: "Английский (США)", appStore: "en-US", googlePlay: "en-US" },
  { code: "en-GB", name: "Английский (Великобритания)", appStore: "en-GB", googlePlay: "en-GB" },
  { code: "en-AU", name: "Английский (Австралия)", appStore: "en-AU", googlePlay: "en-AU" },
  { code: "en-CA", name: "Английский (Канада)", appStore: "en-CA", googlePlay: "en-CA" },
  { code: "en-IN", name: "Английский (Индия)", appStore: null, googlePlay: "en-IN" },
  { code: "en-SG", name: "Английский (Сингапур)", appStore: null, googlePlay: "en-SG" },
  { code: "en-ZA", name: "Английский (ЮАР)", appStore: null, googlePlay: "en-ZA" },
  { code: "et", name: "Эстонский", appStore: null, googlePlay: "et" },
  { code: "fil", name: "Филиппинский", appStore: null, googlePlay: "fil" },
  { code: "fi", name: "Финский", appStore: "fi", googlePlay: "fi-FI" },
  { code: "fr-FR", name: "Французский", appStore: "fr-FR", googlePlay: "fr-FR" },
  { code: "fr-CA", name: "Французский (Канада)", appStore: "fr-CA", googlePlay: "fr-CA" },
  { code: "gl", name: "Галисийский", appStore: null, googlePlay: "gl-ES" },
  { code: "ka", name: "Грузинский", appStore: null, googlePlay: "ka-GE" },
  { code: "de-DE", name: "Немецкий", appStore: "de-DE", googlePlay: "de-DE" },
  { code: "el", name: "Греческий", appStore: "el", googlePlay: "el-GR" },
  { code: "gu", name: "Гуджарати", appStore: null, googlePlay: "gu" },
  { code: "he", name: "Иврит", appStore: "he", googlePlay: "iw-IL" },
  { code: "hi", name: "Хинди", appStore: "hi", googlePlay: "hi-IN" },
  { code: "hu", name: "Венгерский", appStore: "hu", googlePlay: "hu-HU" },
  { code: "is", name: "Исландский", appStore: null, googlePlay: "is-IS" },
  { code: "id", name: "Индонезийский", appStore: "id", googlePlay: "id" },
  { code: "it", name: "Итальянский", appStore: "it", googlePlay: "it-IT" },
  { code: "ja", name: "Японский", appStore: "ja", googlePlay: "ja-JP" },
  { code: "kn", name: "Каннада", appStore: null, googlePlay: "kn-IN" },
  { code: "kk", name: "Казахский", appStore: null, googlePlay: "kk" },
  { code: "km", name: "Кхмерский", appStore: null, googlePlay: "km-KH" },
  { code: "ko", name: "Корейский", appStore: "ko", googlePlay: "ko-KR" },
  { code: "ky", name: "Киргизский", appStore: null, googlePlay: "ky-KG" },
  { code: "lo", name: "Лаосский", appStore: null, googlePlay: "lo-LA" },
  { code: "lv", name: "Латышский", appStore: null, googlePlay: "lv" },
  { code: "lt", name: "Литовский", appStore: null, googlePlay: "lt" },
  { code: "mk", name: "Македонский", appStore: null, googlePlay: "mk-MK" },
  { code: "ms", name: "Малайский", appStore: "ms", googlePlay: "ms" },
  { code: "ms-MY", name: "Малайский (Малайзия)", appStore: null, googlePlay: "ms-MY" },
  { code: "ml", name: "Малаялам", appStore: null, googlePlay: "ml-IN" },
  { code: "mr", name: "Маратхи", appStore: null, googlePlay: "mr-IN" },
  { code: "mn", name: "Монгольский", appStore: null, googlePlay: "mn-MN" },
  { code: "ne", name: "Непальский", appStore: null, googlePlay: "ne-NP" },
  { code: "no", name: "Норвежский", appStore: "no", googlePlay: "no-NO" },
  { code: "fa", name: "Персидский", appStore: null, googlePlay: "fa" },
  { code: "fa-AE", name: "Персидский (ОАЭ)", appStore: null, googlePlay: "fa-AE" },
  { code: "fa-AF", name: "Персидский (Афганистан)", appStore: null, googlePlay: "fa-AF" },
  { code: "fa-IR", name: "Персидский (Иран)", appStore: null, googlePlay: "fa-IR" },
  { code: "pl", name: "Польский", appStore: "pl", googlePlay: "pl-PL" },
  { code: "pt-BR", name: "Португальский (Бразилия)", appStore: "pt-BR", googlePlay: "pt-BR" },
  { code: "pt-PT", name: "Португальский (Португалия)", appStore: "pt-PT", googlePlay: "pt-PT" },
  { code: "pa", name: "Панджаби", appStore: null, googlePlay: "pa" },
  { code: "ro", name: "Румынский", appStore: "ro", googlePlay: "ro" },
  { code: "rm", name: "Романшский", appStore: null, googlePlay: "rm" },
  { code: "ru", name: "Русский", appStore: "ru", googlePlay: "ru-RU" },
  { code: "sr", name: "Сербский", appStore: null, googlePlay: "sr" },
  { code: "si", name: "Сингальский", appStore: null, googlePlay: "si-LK" },
  { code: "sk", name: "Словацкий", appStore: "sk", googlePlay: "sk" },
  { code: "sl", name: "Словенский", appStore: null, googlePlay: "sl" },
  { code: "es-ES", name: "Испанский (Испания)", appStore: "es-ES", googlePlay: "es-ES" },
  { code: "es-MX", name: "Испанский (Мексика)", appStore: "es-MX", googlePlay: null },
  { code: "es-419", name: "Испанский (Латинская Америка)", appStore: null, googlePlay: "es-419" },
  { code: "es-US", name: "Испанский (США)", appStore: null, googlePlay: "es-US" },
  { code: "sw", name: "Суахили", appStore: null, googlePlay: "sw" },
  { code: "sv", name: "Шведский", appStore: "sv", googlePlay: "sv-SE" },
  { code: "ta", name: "Тамильский", appStore: null, googlePlay: "ta-IN" },
  { code: "te", name: "Телугу", appStore: null, googlePlay: "te-IN" },
  { code: "th", name: "Тайский", appStore: "th", googlePlay: "th" },
  { code: "tr", name: "Турецкий", appStore: "tr", googlePlay: "tr-TR" },
  { code: "uk", name: "Украинский", appStore: "uk", googlePlay: "uk" },
  { code: "ur", name: "Урду", appStore: null, googlePlay: "ur" },
  { code: "vi", name: "Вьетнамский", appStore: "vi", googlePlay: "vi" },
  { code: "zu", name: "Зулу", appStore: null, googlePlay: "zu" },
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
