"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Localization } from "@prisma/client";
import { FIELD_LABELS, FIELD_LIMITS, LOCALES, LOCALIZED_FIELDS, localeName, type StoreLocale } from "@/lib/locales";
import { addLocales, removeLocale, retranslate, saveLocalization, setPrimaryLocale } from "@/actions/localizations";

type Props = {
  appId: string;
  primaryLocale: string;
  localizations: Localization[];
  selected?: string;
  editable: boolean;
  provider: string;
};

const storeOf = (code: string) => LOCALES.find((l) => l.code === code);

function StoreChips({ locale }: { locale?: StoreLocale }) {
  if (!locale) return null;
  return (
    <span className="flex gap-1">
      {locale.appStore && <span className="chip bg-sky-500/10 text-sky-300" title={`App Store: ${locale.appStore}`}>iOS</span>}
      {locale.googlePlay && <span className="chip bg-emerald-500/10 text-emerald-300" title={`Google Play: ${locale.googlePlay}`}>GP</span>}
    </span>
  );
}

export function LocalizationsTab(props: Props) {
  const { appId, primaryLocale, localizations, editable } = props;
  const current = localizations.find((l) => l.locale === props.selected) ?? localizations.find((l) => l.locale === primaryLocale);

  return (
    <div className="space-y-5">
      {editable && (
        <div className="grid gap-5 lg:grid-cols-2">
          <AddLocales {...props} />
          <Retranslate {...props} />
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-[250px_1fr]">
        <ul className="card max-h-[70vh] overflow-y-auto p-1.5 text-sm md:sticky md:top-20">
          {localizations.map((l) => (
            <li key={l.id}>
              <Link
                href={`/apps/${appId}?tab=loc&locale=${l.locale}`}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 transition ${current?.id === l.id ? "bg-panel-3 text-fg" : "text-muted hover:bg-panel-2 hover:text-fg"}`}
              >
                <span className="truncate">{localeName(l.locale)}</span>
                {l.locale === primaryLocale && <span className="chip bg-accent/20 text-[#b7a6ff]">осн</span>}
                {l.autoTranslated && <span className="chip bg-amber-500/15 text-amber-300">авто</span>}
                <span className="ml-auto shrink-0 text-xs text-faint">{l.locale}</span>
              </Link>
            </li>
          ))}
        </ul>
        {current && <Editor key={current.id} loc={current} {...props} />}
      </div>
    </div>
  );
}

function Editor({ loc, appId, primaryLocale, editable }: Props & { loc: Localization }) {
  const [state, action, pending] = useActionState(saveLocalization.bind(null, appId, loc.locale), null);
  const fromLoc = () => Object.fromEntries(LOCALIZED_FIELDS.map((f) => [f, loc[f]]));
  const [values, setValues] = useState(fromLoc);
  const [version, setVersion] = useState(loc.updatedAt.getTime());
  // Тексты изменились на сервере (сохранение или автоперевод) — подтягиваем их
  if (loc.updatedAt.getTime() !== version) {
    setVersion(loc.updatedAt.getTime());
    setValues(fromLoc());
  }
  const overLimit = LOCALIZED_FIELDS.some((f) => values[f].length > FIELD_LIMITS[f]);

  return (
    <form action={action} className="card space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">{localeName(loc.locale)}</h2>
        <span className="text-sm text-faint">{loc.locale}</span>
        <StoreChips locale={storeOf(loc.locale)} />
        {editable && loc.locale !== primaryLocale && (
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => setPrimaryLocale(appId, loc.locale)}>
              Сделать основной
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => confirm(`Удалить локаль ${loc.locale}?`) && removeLocale(appId, loc.locale)}
            >
              Удалить
            </button>
          </div>
        )}
      </div>
      {loc.autoTranslated && (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          Тексты переведены автоматически и ещё не проверены. Проверьте и сохраните.
        </p>
      )}
      <fieldset disabled={!editable} className="space-y-5">
        {LOCALIZED_FIELDS.map((f) => {
          const limit = FIELD_LIMITS[f];
          const len = values[f].length;
          const long = limit > 200;
          const Field = long ? "textarea" : "input";
          return (
            <div key={f}>
              <div className="flex">
                <label className="label">{FIELD_LABELS[f]}</label>
                <span className={`ml-auto text-xs tabular-nums ${len > limit ? "font-semibold text-red-400" : "text-faint"}`}>
                  {len}/{limit}
                </span>
              </div>
              <Field
                name={f}
                value={values[f]}
                onChange={(e) => setValues({ ...values, [f]: e.target.value })}
                className={`input ${long ? "min-h-36" : ""} ${len > limit ? "!border-red-500/70 focus:!ring-red-500/25" : ""}`}
              />
            </div>
          );
        })}
        {editable && (
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить"}</button>
            {overLimit && <span className="text-sm text-red-400">Есть поля длиннее лимита стора</span>}
            {state && <span className={`text-sm ${state.ok ? "text-emerald-400" : "text-red-400"}`}>{state.message}</span>}
          </div>
        )}
      </fieldset>
    </form>
  );
}

function AddLocales({ appId, primaryLocale, localizations, provider }: Props) {
  const [state, action, pending] = useActionState(addLocales.bind(null, appId), null);
  const existing = new Set(localizations.map((l) => l.locale));
  const available = LOCALES.filter((l) => !existing.has(l.code));
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = available.filter((l) => !q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q));
  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const pick = (list: StoreLocale[]) => setPicked(list.map((l) => l.code));

  return (
    <form action={action} className="card space-y-3 p-5">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">Добавить локали</h3>
        <span className="text-xs text-faint">доступно {available.length} из {LOCALES.length}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <input className="input mr-auto w-44 py-1.5" placeholder="Поиск" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="button" className="btn-ghost" onClick={() => pick(available)}>Все</button>
        <button type="button" className="btn-ghost" onClick={() => pick(available.filter((l) => l.appStore))}>App Store</button>
        <button type="button" className="btn-ghost" onClick={() => pick(available.filter((l) => l.googlePlay))}>Google Play</button>
        <button type="button" className="btn-ghost" onClick={() => setPicked([])}>Снять</button>
      </div>
      <div className="grid max-h-52 grid-cols-1 gap-x-3 overflow-y-auto rounded-xl border border-line bg-bg/40 p-2 text-sm sm:grid-cols-2">
        {shown.map((l) => (
          <label key={l.code} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-panel-2">
            <input type="checkbox" className="check" name="locales" value={l.code} checked={picked.includes(l.code)} onChange={() => toggle(l.code)} />
            <span className="truncate">{l.name}</span>
            <span className="ml-auto"><StoreChips locale={l} /></span>
          </label>
        ))}
        {shown.length === 0 && (
          <span className="p-2 text-faint">{available.length ? "Ничего не найдено" : "Все локали уже добавлены"}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="check" name="auto" defaultChecked />
          Перевести с
        </label>
        <select name="source" className="input w-auto py-1.5" defaultValue={primaryLocale}>
          {localizations.map((l) => (
            <option key={l.locale} value={l.locale}>{localeName(l.locale)}</option>
          ))}
        </select>
        <button className="btn ml-auto" disabled={pending || picked.length === 0}>
          {pending ? "Добавляем и переводим…" : `Добавить${picked.length ? ` (${picked.length})` : ""}`}
        </button>
      </div>
      <p className="text-xs text-faint">Перевод: {provider}. Много локалей за раз переводятся несколько минут.</p>
      {state && <p className={`text-sm ${state.ok ? "text-emerald-400" : "text-red-400"}`}>{state.message}</p>}
    </form>
  );
}

function Retranslate({ appId, primaryLocale, localizations }: Props) {
  const [state, action, pending] = useActionState(retranslate.bind(null, appId), null);
  const [source, setSource] = useState(primaryLocale);
  const [picked, setPicked] = useState<string[]>([]);
  const targets = localizations.filter((l) => l.locale !== source);
  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  return (
    <form action={action} className="card space-y-3 p-5">
      <h3 className="font-medium">Перевести существующие локали</h3>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Источник</span>
        <select name="source" className="input w-auto py-1.5" value={source} onChange={(e) => setSource(e.target.value)}>
          {localizations.map((l) => (
            <option key={l.locale} value={l.locale}>{localeName(l.locale)}</option>
          ))}
        </select>
        <button type="button" className="btn-ghost ml-auto" onClick={() => setPicked(targets.map((l) => l.locale))}>Все</button>
        <button type="button" className="btn-ghost" onClick={() => setPicked([])}>Снять</button>
      </div>
      <div className="grid max-h-40 grid-cols-1 gap-x-3 overflow-y-auto rounded-xl border border-line bg-bg/40 p-2 text-sm sm:grid-cols-2">
        {targets.map((l) => (
          <label key={l.locale} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-panel-2">
            <input type="checkbox" className="check" name="targets" value={l.locale} checked={picked.includes(l.locale)} onChange={() => toggle(l.locale)} />
            <span className="truncate">{localeName(l.locale)}</span>
          </label>
        ))}
        {targets.length === 0 && <span className="p-2 text-faint">Других локалей пока нет</span>}
      </div>
      <p className="text-xs text-faint">Текущие тексты выбранных локалей будут заменены переводом.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending || picked.length === 0}>{pending ? "Переводим…" : "Перевести"}</button>
        {state && <span className={`text-sm ${state.ok ? "text-emerald-400" : "text-red-400"}`}>{state.message}</span>}
      </div>
    </form>
  );
}
