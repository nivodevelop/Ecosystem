import { useEffect, useState } from "react";
import { FIELD_LABELS, FIELD_LIMITS, LOCALES, LOCALIZED_FIELDS, localeName } from "../locales";
import { charCount } from "../fit";
import type { AppRecord, TranslateReport } from "../store";
import type { LocalizedTexts } from "../translate";
import { useHub } from "./context";
import { useAction } from "./common";

const reportText = (r: TranslateReport | null | undefined, prefix = "") => {
  if (!r) return prefix || null;
  const parts = [prefix, `Переведено: ${r.translated}`];
  if (r.trimmed) parts.push(`обрезано по лимитам App Store: ${r.trimmed}`);
  if (r.failed.length) parts.push(`не удалось: ${r.failed.join(", ")}${r.error ? ` (${r.error})` : ""}`);
  return parts.filter(Boolean).join(". ");
};

export function LocalizationsTab({ app }: { app: AppRecord }) {
  const codes = Object.keys(app.locales).sort((a, b) => (a === app.primaryLocale ? -1 : b === app.primaryLocale ? 1 : localeName(a).localeCompare(localeName(b), "ru")));
  const [selected, setSelected] = useState(app.primaryLocale);
  const current = app.locales[selected] ? selected : app.primaryLocale;

  return (
    <div className="th-stack">
      <div className="th-grid-2 th-grid-even">
        <AddLocales app={app} />
        <Retranslate app={app} />
      </div>
      <div className="th-loc-layout">
        <ul className="th-panel th-loc-list">
          {codes.map((c) => (
            <li key={c}>
              <button className={c === current ? "is-active" : ""} onClick={() => setSelected(c)}>
                <span className="th-ellipsis">{localeName(c)}</span>
                {c === app.primaryLocale && <span className="th-chip th-chip-accent">осн</span>}
                {app.locales[c].auto && <span className="th-chip th-chip-warn">авто</span>}
                <span className="th-faint th-push">{c}</span>
              </button>
            </li>
          ))}
        </ul>
        {app.locales[current] && <Editor key={`${app.id}/${current}`} app={app} locale={current} />}
      </div>
    </div>
  );
}

function Editor({ app, locale }: { app: AppRecord; locale: string }) {
  const { store } = useHub();
  const { busy, run } = useAction();
  const loc = app.locales[locale];
  const fromLoc = () => Object.fromEntries(LOCALIZED_FIELDS.map((f) => [f, loc[f]])) as LocalizedTexts;
  const [values, setValues] = useState(fromLoc);
  const saved = JSON.stringify(fromLoc());
  // Тексты изменились в файле (автоперевод, правка заметки) — подтягиваем их
  useEffect(() => setValues(JSON.parse(saved)), [saved]);
  const dirty = JSON.stringify(values) !== saved;
  const over = LOCALIZED_FIELDS.filter((f) => charCount(values[f]) > FIELD_LIMITS[f]);

  return (
    <form
      className="th-panel th-form"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => store.saveLocale(app, locale, values), "Сохранено");
      }}
    >
      <div className="th-editor-head">
        <h3>{localeName(locale)}</h3>
        <span className="th-faint">{locale}</span>
        {locale !== app.primaryLocale && (
          <div className="th-actions th-push">
            <button type="button" onClick={() => run(() => store.setPrimaryLocale(app, locale))}>Сделать основной</button>
            <button type="button" className="mod-warning" onClick={() => confirm(`Удалить локаль ${locale}?`) && run(() => store.removeLocale(app, locale))}>
              Удалить
            </button>
          </div>
        )}
      </div>
      {loc.auto && <div className="th-callout">Тексты переведены автоматически и ещё не проверены. Проверьте и сохраните.</div>}
      {LOCALIZED_FIELDS.map((f) => {
        const limit = FIELD_LIMITS[f];
        const len = charCount(values[f]);
        const long = limit > 200;
        const props = {
          value: values[f],
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [f]: e.target.value }),
          className: len > limit ? "is-over" : "",
        };
        return (
          <label key={f}>
            <span className="th-field-head">
              {FIELD_LABELS[f]}
              <span className={`th-counter ${len > limit ? "is-over" : ""}`}>{len}/{limit}</span>
            </span>
            {long ? <textarea rows={7} {...props} /> : <input {...props} />}
          </label>
        );
      })}
      <div className="th-actions">
        <button className="mod-cta" disabled={busy || !dirty}>Сохранить</button>
        {over.length > 0 && <span className="th-error">Длиннее лимита App Store: {over.map((f) => FIELD_LABELS[f]).join(", ")}</span>}
      </div>
    </form>
  );
}

function AddLocales({ app }: { app: AppRecord }) {
  const { store } = useHub();
  const { busy, run } = useAction();
  const available = LOCALES.filter((l) => !app.locales[l.code]);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [auto, setAuto] = useState(true);
  const [source, setSource] = useState(app.primaryLocale);
  const q = query.trim().toLowerCase();
  const shown = available.filter((l) => !q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q));
  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  return (
    <div className="th-panel th-form">
      <div className="th-editor-head">
        <h3>Добавить локали</h3>
        <span className="th-faint">доступно {available.length} из {LOCALES.length}</span>
      </div>
      <div className="th-toolbar">
        <input placeholder="Поиск" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="th-link" onClick={() => setPicked(available.map((l) => l.code))}>Все</button>
        <button className="th-link" onClick={() => setPicked([])}>Снять</button>
      </div>
      <div className="th-checks">
        {shown.map((l) => (
          <label key={l.code} className="th-check">
            <input type="checkbox" checked={picked.includes(l.code)} onChange={() => toggle(l.code)} />
            <span className="th-ellipsis">{l.name}</span>
            <span className="th-faint th-push">{l.code}</span>
          </label>
        ))}
        {shown.length === 0 && <span className="th-faint">{available.length ? "Ничего не найдено" : "Все локали уже добавлены"}</span>}
      </div>
      <div className="th-toolbar">
        <label className="th-check">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          Перевести с
        </label>
        <select className="dropdown" value={source} onChange={(e) => setSource(e.target.value)}>
          {Object.keys(app.locales).map((c) => (
            <option key={c} value={c}>{localeName(c)}</option>
          ))}
        </select>
        <button
          className="mod-cta th-push"
          disabled={busy || picked.length === 0}
          onClick={async () => {
            await run(() => store.addLocales(app, picked, auto, source), (r) => reportText(r, `Добавлено локалей: ${picked.length}`));
            setPicked([]);
          }}
        >
          {busy ? "Добавляем…" : `Добавить${picked.length ? ` (${picked.length})` : ""}`}
        </button>
      </div>
      <p className="th-faint th-small">Перевод обрезается по лимитам App Store. Много локалей переводятся пару минут.</p>
    </div>
  );
}

function Retranslate({ app }: { app: AppRecord }) {
  const { store } = useHub();
  const { busy, run } = useAction();
  const [source, setSource] = useState(app.primaryLocale);
  const [picked, setPicked] = useState<string[]>([]);
  const targets = Object.keys(app.locales).filter((c) => c !== source).sort((a, b) => localeName(a).localeCompare(localeName(b), "ru"));
  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  return (
    <div className="th-panel th-form">
      <h3>Перевести существующие локали</h3>
      <div className="th-toolbar">
        <span className="th-muted">Источник</span>
        <select className="dropdown" value={source} onChange={(e) => setSource(e.target.value)}>
          {Object.keys(app.locales).map((c) => (
            <option key={c} value={c}>{localeName(c)}</option>
          ))}
        </select>
        <button className="th-link th-push" onClick={() => setPicked(targets)}>Все</button>
        <button className="th-link" onClick={() => setPicked([])}>Снять</button>
      </div>
      <div className="th-checks th-checks-short">
        {targets.map((c) => (
          <label key={c} className="th-check">
            <input type="checkbox" checked={picked.includes(c)} onChange={() => toggle(c)} />
            <span className="th-ellipsis">{localeName(c)}</span>
          </label>
        ))}
        {targets.length === 0 && <span className="th-faint">Других локалей пока нет</span>}
      </div>
      <p className="th-faint th-small">Текущие тексты выбранных локалей будут заменены переводом.</p>
      <div className="th-actions">
        <button
          className="mod-cta"
          disabled={busy || picked.filter((c) => c !== source).length === 0}
          onClick={async () => {
            await run(() => store.retranslate(app, source, picked), (r) => reportText(r));
            setPicked([]);
          }}
        >
          {busy ? "Переводим…" : "Перевести"}
        </button>
      </div>
    </div>
  );
}
