"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { isLocale, LOCALIZED_FIELDS, type LocalizedField } from "@/lib/locales";
import { mapLimit, translateListing, translationEnabled, type LocalizedTexts } from "@/lib/translate";

export type LocResult = { ok: boolean; message: string } | null;

const pick = (l: Record<LocalizedField, string>): LocalizedTexts =>
  Object.fromEntries(LOCALIZED_FIELDS.map((f) => [f, l[f]])) as LocalizedTexts;

export async function saveLocalization(appId: string, locale: string, _: LocResult, form: FormData): Promise<LocResult> {
  await requirePermission(can.editApp);
  const data = Object.fromEntries(LOCALIZED_FIELDS.map((f) => [f, String(form.get(f) ?? "")]));
  await db.localization.update({
    where: { appId_locale: { appId, locale } },
    data: { ...data, autoTranslated: false },
  });
  revalidatePath("/");
  revalidatePath(`/apps/${appId}`);
  return { ok: true, message: "Сохранено" };
}

async function translateInto(appId: string, sourceLocale: string, targets: string[]) {
  const source = await db.localization.findUniqueOrThrow({
    where: { appId_locale: { appId, locale: sourceLocale } },
  });
  const results = await mapLimit(targets, 4, async (locale) => {
    const t = await translateListing(pick(source), sourceLocale, locale);
    await db.localization.upsert({
      where: { appId_locale: { appId, locale } },
      create: { appId, locale, ...t, autoTranslated: true },
      update: { ...t, autoTranslated: true },
    });
  });
  return targets.filter((_, i) => results[i].status === "rejected");
}

export async function addLocales(appId: string, _: LocResult, form: FormData): Promise<LocResult> {
  await requirePermission(can.editApp);
  const app = await db.app.findUniqueOrThrow({ where: { id: appId }, include: { localizations: true } });
  const existing = new Set(app.localizations.map((l) => l.locale));
  const locales = form.getAll("locales").map(String).filter((l) => isLocale(l) && !existing.has(l));
  if (!locales.length) return { ok: false, message: "Выберите хотя бы одну новую локаль" };

  const auto = form.get("auto") === "on";
  if (auto && !translationEnabled()) {
    return { ok: false, message: "Автоперевод не настроен: добавьте ANTHROPIC_API_KEY в .env" };
  }
  await db.localization.createMany({ data: locales.map((locale) => ({ appId, locale })) });

  let message = `Добавлено локалей: ${locales.length}`;
  if (auto) {
    const source = String(form.get("source") || app.primaryLocale);
    const failed = await translateInto(appId, source, locales);
    message += failed.length ? `. Не удалось перевести: ${failed.join(", ")}` : ". Переведено автоматически";
  }
  revalidatePath("/");
  revalidatePath(`/apps/${appId}`);
  return { ok: true, message };
}

export async function retranslate(appId: string, _: LocResult, form: FormData): Promise<LocResult> {
  await requirePermission(can.editApp);
  if (!translationEnabled()) return { ok: false, message: "Автоперевод не настроен: добавьте ANTHROPIC_API_KEY в .env" };
  const source = String(form.get("source"));
  const targets = form.getAll("targets").map(String).filter((l) => l !== source);
  if (!targets.length) return { ok: false, message: "Выберите локали для перевода" };
  const failed = await translateInto(appId, source, targets);
  revalidatePath("/");
  revalidatePath(`/apps/${appId}`);
  return failed.length
    ? { ok: false, message: `Не удалось перевести: ${failed.join(", ")}` }
    : { ok: true, message: `Переведено локалей: ${targets.length}` };
}

export async function removeLocale(appId: string, locale: string) {
  await requirePermission(can.editApp);
  const app = await db.app.findUniqueOrThrow({ where: { id: appId } });
  if (app.primaryLocale === locale) throw new Error("Нельзя удалить основную локаль");
  await db.$transaction([
    db.localization.delete({ where: { appId_locale: { appId, locale } } }),
    db.localeScreenshot.deleteMany({ where: { appId, locale } }),
  ]);
  revalidatePath("/");
  revalidatePath(`/apps/${appId}`);
}

export async function setPrimaryLocale(appId: string, locale: string) {
  await requirePermission(can.editApp);
  await db.localization.findUniqueOrThrow({ where: { appId_locale: { appId, locale } } });
  await db.app.update({ where: { id: appId }, data: { primaryLocale: locale } });
  revalidatePath("/");
  revalidatePath(`/apps/${appId}`);
}
