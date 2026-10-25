import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { localeName } from "@/lib/locales";
import { translationProvider } from "@/lib/translate";
import { setStage, updateApp, deleteApp } from "@/actions/apps";
import { AppIcon } from "@/components/AppIcon";
import { LocalizationsTab } from "@/components/LocalizationsTab";
import { ScreenshotsTab } from "@/components/ScreenshotsTab";
import { ConfirmButton } from "@/components/ConfirmButton";

const TABS = [
  { id: "info", label: "Основное" },
  { id: "loc", label: "Локализации" },
  { id: "shots", label: "Скрины" },
  { id: "history", label: "История" },
] as const;

export default async function AppPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; locale?: string }>;
}) {
  const { id } = await params;
  const { tab = "info", locale } = await searchParams;
  const user = await requireUser();
  const [app, stages] = await Promise.all([
    db.app.findUnique({
      where: { id },
      include: {
        stage: true,
        localizations: { orderBy: { locale: "asc" } },
        screenshots: { orderBy: { createdAt: "asc" } },
        localeShots: { orderBy: { sortOrder: "asc" } },
        stageChanges: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } }, take: 100 },
      },
    }),
    db.stage.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!app) notFound();

  const editable = can.editApp(user.role);
  const primary = app.localizations.find((l) => l.locale === app.primaryLocale);
  const title = primary?.title || "Без названия";
  const tabs = [...TABS, ...(can.viewPositions(user.role) ? [{ id: "positions", label: "Позиции" } as const] : [])];
  const counts: Record<string, number> = { loc: app.localizations.length, shots: app.screenshots.length };

  return (
    <main className="mx-auto max-w-6xl px-5 py-6">
      <Link href="/" className="text-sm text-muted transition hover:text-fg">← Доска</Link>

      <div className="card mt-4 flex flex-wrap items-center gap-5 p-5">
        <AppIcon path={app.iconPath} title={title} size={72} />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted">{primary?.subtitle || "—"}</p>
          <div className="mt-2 flex gap-1.5">
            {app.bundleId && <span className="chip bg-panel-3 normal-case text-muted">{app.bundleId}</span>}
            <span className="chip" style={{ background: `${app.stage.color}22`, color: app.stage.color }}>{app.stage.name}</span>
          </div>
        </div>
        <form action={setStage.bind(null, app.id)} className="ml-auto flex items-center gap-2">
          <select name="stage" defaultValue={app.stageId} className="input w-56" disabled={!can.moveCard(user.role)}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {can.moveCard(user.role) && <button className="btn-secondary">Сменить этап</button>}
        </form>
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-line bg-panel/60 p-1">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/apps/${app.id}?tab=${t.id}`}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${tab === t.id ? "bg-panel-3 font-medium text-fg shadow" : "text-muted hover:text-fg"}`}
          >
            {t.label}
            {counts[t.id] !== undefined && <span className="text-xs text-faint">{counts[t.id]}</span>}
          </Link>
        ))}
      </nav>

      <div className="mt-5">
        {tab === "info" && (
          <div className="grid gap-5 md:grid-cols-[1fr_300px]">
            <form action={updateApp.bind(null, app.id)} className="card space-y-5 p-6">
              <fieldset disabled={!editable} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Bundle ID</label>
                    <input className="input" name="bundleId" defaultValue={app.bundleId ?? ""} />
                  </div>
                  <div>
                    <label className="label">Аккаунт App Store Connect</label>
                    <input className="input" name="developerAccount" defaultValue={app.developerAccount ?? ""} />
                  </div>
                  <div>
                    <label className="label">Ссылка в App Store</label>
                    <input className="input" name="storeUrl" type="url" defaultValue={app.storeUrl ?? ""} />
                  </div>
                </div>
                <div>
                  <label className="label">Заметки</label>
                  <textarea className="input min-h-28" name="notes" defaultValue={app.notes ?? ""} />
                </div>
                <div>
                  <label className="label">Новая иконка</label>
                  <input className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-panel-3 file:px-3 file:py-1.5 file:text-fg" type="file" name="icon" accept="image/png,image/jpeg,image/webp" />
                </div>
                {editable && <button className="btn">Сохранить</button>}
              </fieldset>
              <p className="text-xs text-faint">
                Название и подзаголовок редактируются во вкладке «Локализации» (основная локаль: {localeName(app.primaryLocale)}).
              </p>
            </form>
            <aside className="card h-fit space-y-3 p-5 text-sm">
              <Row k="Этап" v={app.stage.name} />
              <Row k="Локалей" v={app.localizations.length} />
              <Row k="Скринов" v={app.screenshots.length} />
              <Row k="Создано" v={app.createdAt.toLocaleDateString("ru-RU")} />
              {can.deleteApp(user.role) && (
                <form action={deleteApp.bind(null, app.id)} className="pt-2">
                  <ConfirmButton className="btn-danger w-full" message="Удалить приложение со всеми локализациями и скринами?">
                    Удалить приложение
                  </ConfirmButton>
                </form>
              )}
            </aside>
          </div>
        )}

        {tab === "loc" && (
          <LocalizationsTab
            appId={app.id}
            primaryLocale={app.primaryLocale}
            localizations={app.localizations}
            selected={locale}
            editable={editable}
            provider={translationProvider()}
          />
        )}

        {tab === "shots" && (
          <ScreenshotsTab
            appId={app.id}
            primaryLocale={app.primaryLocale}
            screenshots={app.screenshots.map((s) => ({ id: s.id, path: s.path, name: s.originalName }))}
            locales={app.localizations.map((l) => l.locale)}
            sets={app.localeShots.map((s) => ({ locale: s.locale, screenshotId: s.screenshotId }))}
            editable={editable}
          />
        )}

        {tab === "history" && (
          <div className="card divide-y divide-line">
            {app.stageChanges.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="w-40 shrink-0 text-faint">{c.createdAt.toLocaleString("ru-RU")}</span>
                <span>
                  {c.fromStageName ? <span className="text-muted">{c.fromStageName} → </span> : <span className="text-muted">Создано в </span>}
                  <b className="font-medium">{c.toStageName}</b>
                </span>
                <span className="ml-auto text-muted">{c.user?.name ?? "—"}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "positions" && can.viewPositions(user.role) && (
          <div className="card p-8 text-center text-sm text-muted">
            Отслеживание позиций по ключевым словам в выбранных странах появится на следующем этапе.
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
