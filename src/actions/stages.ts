"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";

export type StageResult = { ok: boolean; message: string } | null;

const color = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return /^#[0-9a-f]{6}$/i.test(s) ? s : "#94a3b8";
};

function refresh() {
  revalidatePath("/", "layout");
}

export async function createStage(_: StageResult, form: FormData): Promise<StageResult> {
  await requirePermission(can.manageStages);
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Введите название" };
  const last = await db.stage.findFirst({ orderBy: { sortOrder: "desc" } });
  await db.stage.create({ data: { name, color: color(form.get("color")), sortOrder: (last?.sortOrder ?? -1) + 1 } });
  refresh();
  return { ok: true, message: `Этап «${name}» добавлен` };
}

export async function updateStage(stageId: string, form: FormData) {
  await requirePermission(can.manageStages);
  const name = String(form.get("name") ?? "").trim();
  if (!name) throw new Error("Введите название");
  await db.stage.update({ where: { id: stageId }, data: { name, color: color(form.get("color")) } });
  refresh();
}

export async function moveStage(stageId: string, direction: -1 | 1) {
  await requirePermission(can.manageStages);
  const stages = await db.stage.findMany({ orderBy: { sortOrder: "asc" } });
  const i = stages.findIndex((s) => s.id === stageId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= stages.length) return;
  [stages[i], stages[j]] = [stages[j], stages[i]];
  await db.$transaction(stages.map((s, sortOrder) => db.stage.update({ where: { id: s.id }, data: { sortOrder } })));
  refresh();
}

// Приложения из удаляемого этапа переносятся в выбранный
export async function deleteStage(stageId: string, form: FormData) {
  const user = await requirePermission(can.manageStages);
  const stages = await db.stage.findMany({ orderBy: { sortOrder: "asc" } });
  if (stages.length <= 1) throw new Error("Нужен хотя бы один этап");
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) return;
  const target = stages.find((s) => s.id === String(form.get("moveTo")) && s.id !== stageId);
  const apps = await db.app.findMany({ where: { stageId }, select: { id: true } });
  if (apps.length && !target) throw new Error("Выберите, куда перенести приложения");
  await db.$transaction([
    ...(target
      ? [
          db.app.updateMany({ where: { stageId }, data: { stageId: target.id } }),
          db.stageChange.createMany({
            data: apps.map((a) => ({
              appId: a.id,
              fromStageId: stageId,
              fromStageName: stage.name,
              toStageId: target.id,
              toStageName: target.name,
              userId: user.id,
            })),
          }),
        ]
      : []),
    db.stage.delete({ where: { id: stageId } }),
  ]);
  refresh();
}
