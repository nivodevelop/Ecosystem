import { useEffect, useState } from "react";
import { localeName } from "../locales";
import type { AppRecord } from "../store";
import { useHub } from "./context";
import { AppIcon, IMAGE_ACCEPT, pickFiles, useAction } from "./common";
import { LocalizationsTab } from "./LocalizationsTab";
import { ScreenshotsTab } from "./ScreenshotsTab";

const TABS = [
  { id: "info", label: "Основное" },
  { id: "loc", label: "Локализации" },
  { id: "shots", label: "Скрины" },
  { id: "history", label: "История" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function AppPage({ id, onTitle }: { id: string; onTitle: () => void }) {
  const { store } = useHub();
  const [tab, setTab] = useState<Tab>("info");
  const app = store.get(id);
  const title = app ? store.title(app) : "";
  useEffect(onTitle, [title, onTitle]);

  if (!app) return <div className="th-page th-muted">Приложение не найдено. Возможно, его папку переименовали или удалили.</div>;
  const stage = store.stages.find((s) => s.id === app.stage);
  const counts: Partial<Record<Tab, number>> = { loc: Object.keys(app.locales).length, shots: app.shots.length };

  return (
    <div className="th-page">
      <div className="th-hero">
        <AppIcon path={app.icon} title={title} size={72} />
        <div className="th-hero-text">
          <h1>{title}</h1>
          <div className="th-muted">{app.locales[app.primaryLocale]?.subtitle || "—"}</div>
          <div className="th-chips">
            {stage && (
              <span className="th-chip" style={{ background: `${stage.color}22`, color: stage.color }}>{stage.name}</span>
            )}
            {app.bundleId && <span className="th-chip">{app.bundleId}</span>}
          </div>
        </div>
        <select className="dropdown th-stage-select" value={app.stage} onChange={(e) => void store.moveApp(app.id, e.target.value, null)}>
          {store.stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <nav className="th-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
            {counts[t.id] !== undefined && <span className="th-faint">{counts[t.id]}</span>}
          </button>
        ))}
      </nav>

      {tab === "info" && <InfoTab app={app} />}
      {tab === "loc" && <LocalizationsTab app={app} />}
      {tab === "shots" && <ScreenshotsTab app={app} />}
      {tab === "history" && (
        <div className="th-panel th-list">
          {[...app.history].reverse().map((h, i) => (
            <div key={i} className="th-list-row">
              <span className="th-faint th-date">{h.date ? new Date(h.date).toLocaleString("ru-RU") : "—"}</span>
              <span>
                {h.from ? <span className="th-muted">{h.from} → </span> : <span className="th-muted">Создано в </span>}
                <b>{h.to}</b>
              </span>
            </div>
          ))}
          {app.history.length === 0 && <div className="th-list-row th-muted">Пока пусто</div>}
        </div>
      )}
    </div>
  );
}

function InfoTab({ app }: { app: AppRecord }) {
  const { store } = useHub();
  const { busy, run } = useAction();
  const [form, setForm] = useState({ bundleId: app.bundleId, storeUrl: app.storeUrl, account: app.account });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const dirty = form.bundleId !== app.bundleId || form.storeUrl !== app.storeUrl || form.account !== app.account;

  return (
    <div className="th-grid-2">
      <form
        className="th-panel th-form"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => store.updateApp(app, form), "Сохранено");
        }}
      >
        <label>
          <span>Bundle ID</span>
          <input value={form.bundleId} onChange={set("bundleId")} />
        </label>
        <label>
          <span>Аккаунт App Store Connect</span>
          <input value={form.account} onChange={set("account")} />
        </label>
        <label>
          <span>Ссылка в App Store</span>
          <input value={form.storeUrl} onChange={set("storeUrl")} type="url" />
        </label>
        <div className="th-actions">
          <button className="mod-cta" disabled={!dirty || busy}>Сохранить</button>
          <button type="button" disabled={busy} onClick={async () => {
            const [file] = await pickFiles(IMAGE_ACCEPT, false);
            if (file) await run(() => store.setIcon(app, file), "Иконка обновлена");
          }}>
            Загрузить иконку
          </button>
          <button type="button" onClick={() => store.openNote(app)}>Открыть заметку</button>
        </div>
        <p className="th-faint th-small">
          Название и подзаголовок редактируются во вкладке «Локализации» (основная локаль: {localeName(app.primaryLocale)}).
          Свободные заметки по приложению пишите в его заметке.
        </p>
      </form>
      <aside className="th-panel th-facts">
        <Row k="Этап" v={store.stages.find((s) => s.id === app.stage)?.name ?? "—"} />
        <Row k="Локалей" v={Object.keys(app.locales).length} />
        <Row k="Скринов" v={app.shots.length} />
        <Row k="Создано" v={app.created ? new Date(app.created).toLocaleDateString("ru-RU") : "—"} />
        <Row k="Папка" v={app.folder} />
        <button
          className="mod-warning"
          disabled={busy}
          onClick={() => {
            if (confirm("Удалить приложение? Папка уйдёт в корзину Obsidian.")) void run(() => store.deleteApp(app), "Приложение удалено");
          }}
        >
          Удалить приложение
        </button>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="th-row">
      <span className="th-muted">{k}</span>
      <span className="th-ellipsis">{v}</span>
    </div>
  );
}
