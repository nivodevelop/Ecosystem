"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Localization } from "@prisma/client";
import { FIELD_LABELS, FIELD_LIMITS, LOCALES, LOCALIZED_FIELDS, localeName } from "@/lib/locales";
import { addLocales, removeLocale, retranslate, saveLocalization, setPrimaryLocale } from "@/actions/localizations";

type Props = {
  appId: string;
  primaryLocale: string;
  localizations: Localization[];
  selected?: string;
  editable: boolean;
  translationEnabled: boolean;
};

export function LocalizationsTab(props: Props) {
  const { appId, primaryLocale, localizations, editable } = props;
  const current = localizations.find((l) => l.locale === props.selected) ?? localizations.find((l) => l.locale === primaryLocale);

  return (
    <div className="space-y-4">
      {editable && (
        <div className="grid gap-4 lg:grid-cols-2">
          <AddLocales {...props} />
          <Retranslate {...props} />
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <ul className="card h-fit divide-y divide-gray-100 text-sm">
          {localizations.map((l) => (
            <li key={l.id}>
              <Link
                href={`/apps/${appId}?tab=loc&locale=${l.locale}`}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 ${current?.id === l.id ? "bg-gray-100 font-medium" : ""}`}
              >
                <span className="truncate">{localeName(l.locale)}</span>
                {l.locale === primaryLocale && <span className="rounded bg-gray-900 px-1 text-[10px] text-white">осн.</span>}
                {l.autoTranslated && <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-800">авто</span>}
                <span className="ml-auto text-xs text-gray-400">{l.locale}</span>
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
    <form action={action} className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-medium">{localeName(loc.locale)} <span className="text-gray-400">{loc.locale}</span></h2>
        {loc.autoTranslated && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
            Автоперевод, не проверен. Сохраните после проверки.
          </span>
        )}
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
      <fieldset disabled={!editable} className="space-y-4">
        {LOCALIZED_FIELDS.map((f) => {
          const limit = FIELD_LIMITS[f];
          const len = values[f].length;
          const long = limit > 200;
          const Field = long ? "textarea" : "input";
          return (
            <div key={f}>
              <div className="flex">
                <label className="label">{FIELD_LABELS[f]}</label>
                <span className={`ml-auto text-xs ${len > limit ? "font-semibold text-red-600" : "text-gray-400"}`}>
                  {len}/{limit}
                </span>
              </div>
              <Field
                name={f}
                value={values[f]}
                onChange={(e) => setValues({ ...values, [f]: e.target.value })}
                className={`input ${long ? "min-h-32" : ""} ${len > limit ? "border-red-500" : ""}`}
              />
            </div>
          );
        })}
        {editable && (
          <div className="flex items-center gap-3">
            <button className="btn" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить"}</button>
            {overLimit && <span className="text-sm text-red-600">Есть поля длиннее лимита стора</span>}
            {state && <span className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</span>}
          </div>
        )}
      </fieldset>
    </form>
  );
}

function AddLocales({ appId, primaryLocale, localizations, translationEnabled }: Props) {
  const [state, action, pending] = useActionState(addLocales.bind(null, appId), null);
  const existing = new Set(localizations.map((l) => l.locale));
  const available = LOCALES.filter((l) => !existing.has(l.code));
  return (
    <form action={action} className="card space-y-3 p-4">
      <h3 className="text-sm font-medium">Добавить локали</h3>
      <div className="grid max-h-40 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto rounded border border-gray-200 p-2 text-sm">
        {available.map((l) => (
          <label key={l.code} className="flex items-center gap-1.5">
            <input type="checkbox" name="locales" value={l.code} />
            <span className="truncate">{l.name}</span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="auto" defaultChecked={translationEnabled} disabled={!translationEnabled} />
          Перевести автоматически с
        </label>
        <select name="source" className="input w-auto" defaultValue={primaryLocale}>
          {localizations.map((l) => (
            <option key={l.locale} value={l.locale}>{localeName(l.locale)}</option>
          ))}
        </select>
        <button className="btn ml-auto" disabled={pending}>{pending ? "Добавляем и переводим…" : "Добавить"}</button>
      </div>
      {!translationEnabled && <p className="text-xs text-gray-500">Автоперевод выключен: не задан ANTHROPIC_API_KEY.</p>}
      {state && <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>}
    </form>
  );
}

function Retranslate({ appId, primaryLocale, localizations, translationEnabled }: Props) {
  const [state, action, pending] = useActionState(retranslate.bind(null, appId), null);
  const [source, setSource] = useState(primaryLocale);
  return (
    <form action={action} className="card space-y-3 p-4">
      <h3 className="text-sm font-medium">Перевести существующие локали</h3>
      <div className="flex items-center gap-2 text-sm">
        Источник:
        <select name="source" className="input w-auto" value={source} onChange={(e) => setSource(e.target.value)}>
          {localizations.map((l) => (
            <option key={l.locale} value={l.locale}>{localeName(l.locale)}</option>
          ))}
        </select>
      </div>
      <div className="grid max-h-28 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto rounded border border-gray-200 p-2 text-sm">
        {localizations.filter((l) => l.locale !== source).map((l) => (
          <label key={l.locale} className="flex items-center gap-1.5">
            <input type="checkbox" name="targets" value={l.locale} />
            <span className="truncate">{localeName(l.locale)}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-500">Текущие тексты выбранных локалей будут заменены переводом.</p>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={pending || !translationEnabled}>{pending ? "Переводим…" : "Перевести"}</button>
        {state && <span className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</span>}
      </div>
    </form>
  );
}
