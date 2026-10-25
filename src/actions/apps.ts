"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { isLocale } from "@/lib/locales";
import { deleteFile, saveImage } from "@/lib/storage";

const opt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};

export async function createApp(form: FormData) {
  const user = await requirePermission(can.editApp);
  const title = String(form.get("title") ?? "").trim();
  const primaryLocale = String(form.get("primaryLocale") ?? "en-US");
  if (!title) throw new Error("Укажите название");
  if (!isLocale(primaryLocale)) throw new Error("Неизвестная локаль");

  // Новое приложение попадает в первую колонку
  const firstStage = await db.stage.findFirst({ orderBy: { sortOrder: "asc" } });
  if (!firstStage) throw new Error("Нет ни одного этапа");
  const top = await db.app.findFirst({ where: { stageId: firstStage.id }, orderBy: { position: "asc" } });
  const app = await db.app.create({
    data: {
      bundleId: opt(form.get("bundleId")),
      primaryLocale,
      stageId: firstStage.id,
      position: (top?.position ?? 0) - 1,
      localizations: {
        create: { locale: primaryLocale, title, subtitle: String(form.get("subtitle") ?? "").trim() },
      },
      stageChanges: { create: { toStageId: firstStage.id, toStageName: firstStage.name, userId: user.id } },
    },
  });
  const icon = form.get("icon");
  if (icon instanceof File && icon.size > 0) {
    await db.app.update({ where: { id: app.id }, data: { iconPath: await saveImage(icon, `apps/${app.id}`) } });
  }
  revalidatePath("/");
  redirect(`/apps/${app.id}`);
}

export async function updateApp(appId: string, form: FormData) {
  await requirePermission(can.editApp);
  const app = await db.app.findUniqueOrThrow({ where: { id: appId } });
  const icon = form.get("icon");
  let iconPath = app.iconPath;
  if (icon instanceof File && icon.size > 0) {
    iconPath = await saveImage(icon, `apps/${app.id}`);
    if (app.iconPath) await deleteFile(app.iconPath);
  }
  await db.app.update({
    where: { id: appId },
    data: {
      bundleId: opt(form.get("bundleId")),
      storeUrl: opt(form.get("storeUrl")),
      developerAccount: opt(form.get("developerAccount")),
      notes: opt(form.get("notes")),
      iconPath,
    },
  });
  revalidatePath("/");
  revalidatePath(`/apps/${appId}`);
}

export async function moveApp(appId: string, stageId: string, beforeAppId: string | null) {
  const user = await requirePermission(can.moveCard);
  const stage = await db.stage.findUnique({ where: { id: stageId } });
  if (!stage) throw new Error("Неизвестный этап");
  const app = await db.app.findUniqueOrThrow({ where: { id: appId }, include: { stage: true } });

  // Позиция: перед указанной карточкой или в конец колонки
  let position: number;
  const column = await db.app.findMany({
    where: { stageId, NOT: { id: appId } },
    orderBy: { position: "asc" },
    select: { id: true, position: true },
  });
  const idx = beforeAppId ? column.findIndex((c) => c.id === beforeAppId) : -1;
  if (idx === -1) position = (column.at(-1)?.position ?? 0) + 1;
  else if (idx === 0) position = column[0].position - 1;
  else position = (column[idx - 1].position + column[idx].position) / 2;

  await db.$transaction([
    db.app.update({ where: { id: appId }, data: { stageId, position } }),
    ...(app.stageId !== stageId
      ? [
          db.stageChange.create({
            data: {
              appId,
              fromStageId: app.stageId,
              fromStageName: app.stage.name,
              toStageId: stageId,
              toStageName: stage.name,
              userId: user.id,
            },
          }),
        ]
      : []),
  ]);
  revalidatePath("/");
  revalidatePath(`/apps/${appId}`);
}

export async function setStage(appId: string, form: FormData) {
  await moveApp(appId, String(form.get("stage")), null);
}

export async function deleteApp(appId: string) {
  await requirePermission(can.deleteApp);
  const shots = await db.screenshot.findMany({ where: { appId } });
  const app = await db.app.delete({ where: { id: appId } });
  await Promise.all([...shots.map((s) => deleteFile(s.path)), app.iconPath ? deleteFile(app.iconPath) : null]);
  revalidatePath("/");
  redirect("/");
}
