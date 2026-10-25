import "server-only";
import { db } from "./db";
import { BOARD_SHOTS } from "./locales";

export type BoardStage = { id: string; name: string; color: string };

export type BoardCard = {
  id: string;
  stageId: string;
  title: string;
  subtitle: string;
  icon: string | null;
  platform: "IOS" | "ANDROID";
  shots: string[];
  localeCount: number;
};

export const loadStages = (): Promise<BoardStage[]> =>
  db.stage.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, color: true } });

export async function loadBoard(): Promise<BoardCard[]> {
  const apps = await db.app.findMany({
    orderBy: { position: "asc" },
    include: {
      localizations: { select: { locale: true, title: true, subtitle: true } },
      localeShots: { orderBy: { sortOrder: "asc" }, include: { screenshot: { select: { path: true } } } },
      screenshots: { orderBy: { createdAt: "asc" }, take: BOARD_SHOTS, select: { path: true } },
    },
  });
  return apps.map((app) => {
    const primary = app.localizations.find((l) => l.locale === app.primaryLocale);
    const primaryShots = app.localeShots.filter((s) => s.locale === app.primaryLocale);
    // Если набор для основной локали ещё не собран, показываем первые загруженные
    const shots = (primaryShots.length ? primaryShots.map((s) => s.screenshot.path) : app.screenshots.map((s) => s.path))
      .slice(0, BOARD_SHOTS);
    return {
      id: app.id,
      stageId: app.stageId,
      title: primary?.title || "Без названия",
      subtitle: primary?.subtitle ?? "",
      icon: app.iconPath,
      platform: app.platform,
      shots,
      localeCount: app.localizations.length,
    };
  });
}
