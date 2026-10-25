import { useState } from "react";
import { BOARD_SHOTS, MAX_SHOTS_PER_LOCALE, localeName } from "../locales";
import type { AppRecord } from "../store";
import { useHub } from "./context";
import { IMAGE_ACCEPT, pickFiles, useAction } from "./common";

export function ScreenshotsTab({ app }: { app: AppRecord }) {
  const { store } = useHub();
  const { busy, run } = useAction();
  const locales = Object.keys(app.locales).sort((a, b) => localeName(a).localeCompare(localeName(b), "ru"));
  const [draft, setDraft] = useState<string[]>(() => app.sets[app.primaryLocale] ?? []);
  const [targets, setTargets] = useState<string[]>([app.primaryLocale]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const draftShown = draft.filter((p) => app.shots.includes(p));

  const toggleShot = (p: string) =>
    setDraft((d) => (d.includes(p) ? d.filter((x) => x !== p) : d.length < MAX_SHOTS_PER_LOCALE ? [...d, p] : d));
  const toggleLocale = (l: string) => setTargets((t) => (t.includes(l) ? t.filter((x) => x !== l) : [...t, l]));
  const moveTo = (to: number) => {
    if (dragIdx === null || dragIdx === to) return;
    const next = [...draftShown];
    const [item] = next.splice(dragIdx, 1);
    next.splice(to, 0, item);
    setDraft(next);
    setDragIdx(to);
  };
  const withSets = locales.filter((l) => app.sets[l]?.length);
  const without = locales.filter((l) => !app.sets[l]?.length);

  return (
    <div className="th-stack">
      <div className="th-panel">
        <div className="th-editor-head">
          <h3>Загруженные скрины ({app.shots.length})</h3>
          <button
            className="mod-cta th-push"
            disabled={busy}
            onClick={async () => {
              const files = await pickFiles(IMAGE_ACCEPT, true);
              if (files.length) await run(() => store.uploadShots(app, files), `Загружено: ${files.length}`);
            }}
          >
            Загрузить скрины
          </button>
        </div>
        <p className="th-faint th-small">Нажмите на скрин, чтобы добавить его в набор или убрать из набора.</p>
        <div className="th-shots">
          {app.shots.map((p) => {
            const n = draftShown.indexOf(p);
            return (
              <div key={p} className={`th-shot ${n >= 0 ? "is-picked" : ""}`} onClick={() => toggleShot(p)}>
                <img src={store.resource(p) ?? ""} alt="" draggable={false} />
                {n >= 0 && <span className="th-badge">{n + 1}</span>}
                <button
                  className="th-shot-x"
                  aria-label="Удалить скрин"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Удалить скрин из всех локалей?")) void run(() => store.deleteShot(app, p));
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
          {app.shots.length === 0 && <span className="th-faint">Пока ничего не загружено.</span>}
        </div>
      </div>

      <div className="th-panel th-form">
        <h3>Набор: порядок скринов</h3>
        <p className="th-faint th-small">
          Перетаскивайте, чтобы поменять порядок. Первые {BOARD_SHOTS} видны в карточке на доске. Максимум {MAX_SHOTS_PER_LOCALE}.
        </p>
        <div className="th-shots">
          {draftShown.map((p, i) => (
            <div
              key={p}
              className={`th-shot is-sortable ${dragIdx === i ? "is-dragging" : ""}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                setDragIdx(i);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                moveTo(i);
              }}
              onDragEnd={() => setDragIdx(null)}
            >
              <img src={store.resource(p) ?? ""} alt="" draggable={false} />
              <span className="th-badge">{i + 1}</span>
              <button className="th-shot-x is-visible" aria-label="Убрать из набора" onClick={() => toggleShot(p)}>✕</button>
            </div>
          ))}
          {draftShown.length === 0 && <span className="th-faint">Набор пуст. Выберите скрины выше или возьмите набор из локали ниже.</span>}
        </div>

        <div className="th-toolbar">
          <b>Применить к локалям</b>
          <span className="th-faint">выбрано {targets.length} из {locales.length}</span>
          <button className="th-link th-push" onClick={() => setTargets(locales)}>Все</button>
          <button className="th-link" onClick={() => setTargets(without)}>Без скринов</button>
          <button className="th-link" onClick={() => setTargets([])}>Снять</button>
        </div>
        <div className="th-checks th-checks-3">
          {locales.map((l) => (
            <label key={l} className="th-check">
              <input type="checkbox" checked={targets.includes(l)} onChange={() => toggleLocale(l)} />
              <span className="th-ellipsis">{localeName(l)}</span>
              {app.sets[l] && <span className="th-faint th-push">{app.sets[l].length}</span>}
            </label>
          ))}
        </div>
        <div className="th-actions">
          <button className="mod-cta" disabled={busy || targets.length === 0} onClick={() => run(() => store.applySet(app, draftShown, targets), `Набор применён к локалям: ${targets.length}`)}>
            Применить набор
          </button>
        </div>
      </div>

      <div className="th-panel th-list">
        <h3 className="th-list-title">Скрины по локалям</h3>
        {withSets.map((l) => (
          <div key={l} className="th-list-row">
            <span className="th-loc-name">
              {localeName(l)} <span className="th-faint">{l}</span>
            </span>
            <div className="th-mini-shots">
              {app.sets[l].map((p) => (
                <img key={p} src={store.resource(p) ?? ""} alt="" />
              ))}
            </div>
            <button
              className="th-push"
              onClick={() => {
                setDraft(app.sets[l]);
                setTargets([l]);
              }}
            >
              В набор
            </button>
          </div>
        ))}
        {without.length > 0 && <div className="th-list-row th-faint th-small">Без скринов: {without.map(localeName).join(", ")}</div>}
      </div>
    </div>
  );
}
