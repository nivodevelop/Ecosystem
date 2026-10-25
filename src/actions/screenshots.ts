"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { MAX_SHOTS_PER_LOCALE } from "@/lib/locales";
import { deleteFile, saveImage } from "@/lib/storage";

function refresh(appId: string) {
  revalidatePath("/");
  revalidatePath(`/apps/${appId}`);
}

export async function uploadScreenshots(appId: string, form: FormData) {
  await requirePermission(can.editApp);
  await db.app.findUniqueOrThrow({ where: { id: appId } });
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    const path = await saveImage(file, `apps/${appId}/shots`);
    await db.screenshot.create({ data: { appId, path, originalName: file.name } });
  }
  refresh(appId);
}

export async function deleteScreenshot(appId: string, screenshotId: string) {
  await requirePermission(can.editApp);
  const shot = await db.screenshot.delete({ where: { id: screenshotId, appId } });
  await deleteFile(shot.path);
  // Сдвигаем порядок в локалях, где был этот скрин, чтобы не было дыр
  const locales = await db.localeScreenshot.findMany({ where: { appId }, orderBy: { sortOrder: "asc" } });
  const byLocale = Map.groupBy(locales, (l) => l.locale);
  for (const [locale, rows] of byLocale) {
    await applySet(appId, locale, rows.map((r) => r.screenshotId));
  }
  refresh(appId);
}

async function applySet(appId: string, locale: string, screenshotIds: string[]) {
  await db.$transaction([
    db.localeScreenshot.deleteMany({ where: { appId, locale } }),
    db.localeScreenshot.createMany({
      data: screenshotIds.map((screenshotId, sortOrder) => ({ appId, locale, screenshotId, sortOrder })),
    }),
  ]);
}

// Менеджер выбрал скрины, выставил порядок и отметил локали — применяем набор ко всем отмеченным
export async function applyScreenshotSet(appId: string, screenshotIds: string[], locales: string[]) {
  await requirePermission(can.editApp);
  if (screenshotIds.length > MAX_SHOTS_PER_LOCALE) throw new Error(`Не больше ${MAX_SHOTS_PER_LOCALE} скринов в локали`);
  const app = await db.app.findUniqueOrThrow({
    where: { id: appId },
    include: { localizations: { select: { locale: true } }, screenshots: { select: { id: true } } },
  });
  const known = new Set(app.screenshots.map((s) => s.id));
  if (!screenshotIds.every((id) => known.has(id))) throw new Error("Скрин не найден");
  const appLocales = new Set(app.localizations.map((l) => l.locale));
  for (const locale of locales.filter((l) => appLocales.has(l))) {
    await applySet(appId, locale, screenshotIds);
  }
  refresh(appId);
}
