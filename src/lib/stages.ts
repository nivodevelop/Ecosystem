import type { Stage } from "@prisma/client";

export const STAGES: { id: Stage; label: string; color: string }[] = [
  { id: "DEVELOPMENT", label: "Разработка", color: "bg-slate-400" },
  { id: "FIRST_REVIEW", label: "Первичная модерация", color: "bg-amber-400" },
  { id: "REJECTED", label: "Реджект", color: "bg-red-500" },
  { id: "LIVE_WHITE", label: "Белая в сторе", color: "bg-sky-400" },
  { id: "TECH_UPDATE", label: "Техническое обновление", color: "bg-violet-400" },
  { id: "SCREENSHOTS", label: "Скрины", color: "bg-pink-400" },
  { id: "WORKING", label: "Работающая", color: "bg-emerald-500" },
  { id: "BLOCKED", label: "Заблокированная", color: "bg-zinc-800" },
];

export const stageLabel = (s: Stage) => STAGES.find((x) => x.id === s)?.label ?? s;
