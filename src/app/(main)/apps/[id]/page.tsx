import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { STAGES, stageLabel } from "@/lib/stages";
import { localeName } from "@/lib/locales";
import { translationEnabled } from "@/lib/translate";
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
  const app = await db.app.findUnique({
    where: { id },
    include: {
      localizations: { orderBy: { locale: "asc" } },
      screenshots: { orderBy: { createdAt: "asc" } },
      localeShots: { orderBy: { sortOrder: "asc" } },
      stageChanges: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } }, take: 100 },
    },
  });
  if (!app) notFound();

  const editable = can.editApp(user.role);
  const primary = app.localizations.find((l) => l.locale === app.primaryLocale);
  const title = primary?.title || "Без названия";
  const tabs = [...TABS, ...(can.viewPositions(user.role) ? [{ id: "positions", label: "Позиции" } as const] : [])];

  return (
    <main className="mx-auto max-w-6xl p-4">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Доска</Link>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <AppIcon path={app.iconPath} title={title} size={64} />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-gray-500">{primary?.subtitle || "—"}</p>
        </div>
        <form action={setStage.bind(null, app.id)} className="ml-auto flex items-center gap-2">
          <select name="stage" defaultValue={app.stage} className="input w-56" disabled={!can.moveCard(user.role)}>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          {can.moveCard(user.role) && <button className="btn-secondary">Сменить этап</button>}
        </form>
      </div>

      <nav className="mt-6 flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/apps/${app.id}?tab=${t.id}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === t.id ? "border-gray-900 font-medium" : "border-transparent text-gray-500 hover:text-gray-900"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        {tab === "info" && (
          <div className="grid gap-4 md:grid-cols-[1fr_280px]">
            <form action={updateApp.bind(null, app.id)} className="card space-y-4 p-5">
              <fieldset disabled={!editable} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Платформа</label>
                    <select className="input" name="platform" defaultValue={app.platform}>
                      <option value="IOS">iOS</option>
                      <option value="ANDROID">Android</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Bundle ID / Package name</label>
                    <input className="input" name="bundleId" defaultValue={app.bundleId ?? ""} />
                  </div>
                  <div>
                    <label className="label">Аккаунт разработчика</label>
                    <input className="input" name="developerAccount" defaultValue={app.developerAccount ?? ""} />
                  </div>
                  <div>
                    <label className="label">Ссылка в сторе</label>
                    <input className="input" name="storeUrl" type="url" defaultValue={app.storeUrl ?? ""} />
                  </div>
                </div>
                <div>
                  <label className="label">Заметки</label>
                  <textarea className="input min-h-28" name="notes" defaultValue={app.notes ?? ""} />
                </div>
                <div>
                  <label className="label">Новая иконка</label>
                  <input className="text-sm" type="file" name="icon" accept="image/png,image/jpeg,image/webp" />
                </div>
                {editable && <button className="btn">Сохранить</button>}
              </fieldset>
              <p className="text-xs text-gray-500">
                Название и подзаголовок редактируются во вкладке «Локализации» (основная локаль: {localeName(app.primaryLocale)}).
              </p>
            </form>
            <aside className="card space-y-2 p-4 text-sm">
              <div><span className="text-gray-500">Этап:</span> {stageLabel(app.stage)}</div>
              <div><span className="text-gray-500">Локалей:</span> {app.localizations.length}</div>
              <div><span className="text-gray-500">Скринов загружено:</span> {app.screenshots.length}</div>
              <div><span className="text-gray-500">Создано:</span> {app.createdAt.toLocaleDateString("ru-RU")}</div>
              {can.deleteApp(user.role) && (
                <form action={deleteApp.bind(null, app.id)} className="pt-3">
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
            translationEnabled={translationEnabled()}
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
          <div className="card divide-y divide-gray-100">
            {app.stageChanges.map((c) => (
              <div key={c.id} className="flex gap-3 px-4 py-2.5 text-sm">
                <span className="w-36 shrink-0 text-gray-500">{c.createdAt.toLocaleString("ru-RU")}</span>
                <span>
                  {c.fromStage ? `${stageLabel(c.fromStage)} → ` : "Создано: "}
                  <b>{stageLabel(c.toStage)}</b>
                </span>
                <span className="ml-auto text-gray-500">{c.user?.name ?? "—"}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "positions" && can.viewPositions(user.role) && (
          <div className="card p-6 text-sm text-gray-600">
            Отслеживание позиций по ключевым словам в выбранных странах появится на следующем этапе.
          </div>
        )}
      </div>
    </main>
  );
}
