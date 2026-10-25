"use client";

import { useMemo, useState, useTransition } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fileUrl } from "@/lib/urls";
import { BOARD_SHOTS, MAX_SHOTS_PER_LOCALE, localeName } from "@/lib/locales";
import { applyScreenshotSet, deleteScreenshot, uploadScreenshots } from "@/actions/screenshots";

type Shot = { id: string; path: string; name: string };

type Props = {
  appId: string;
  primaryLocale: string;
  screenshots: Shot[];
  locales: string[];
  sets: { locale: string; screenshotId: string }[];
  editable: boolean;
};

export function ScreenshotsTab({ appId, primaryLocale, screenshots, locales, sets, editable }: Props) {
  const byId = useMemo(() => new Map(screenshots.map((s) => [s.id, s])), [screenshots]);
  const setsByLocale = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of sets) m.set(s.locale, [...(m.get(s.locale) ?? []), s.screenshotId]);
    return m;
  }, [sets]);

  const [draft, setDraft] = useState<string[]>(() => setsByLocale.get(primaryLocale) ?? []);
  const [targets, setTargets] = useState<string[]>([primaryLocale]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const toggleShot = (id: string) =>
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : d.length < MAX_SHOTS_PER_LOCALE ? [...d, id] : d));
  const toggleLocale = (l: string) => setTargets((t) => (t.includes(l) ? t.filter((x) => x !== l) : [...t, l]));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setDraft((d) => arrayMove(d, d.indexOf(String(e.active.id)), d.indexOf(String(e.over!.id))));
  }

  function apply() {
    setMessage(null);
    startTransition(async () => {
      try {
        await applyScreenshotSet(appId, draft, targets);
        setMessage({ ok: true, text: `Набор применён к локалям: ${targets.length}` });
      } catch (e) {
        setMessage({ ok: false, text: e instanceof Error ? e.message : "Ошибка" });
      }
    });
  }

  return (
    <div className="space-y-4">
      {editable && (
        <form
          action={(fd) => startTransition(() => uploadScreenshots(appId, fd))}
          className="card flex flex-wrap items-center gap-3 p-4"
        >
          <span className="font-medium">Загрузить скрины</span>
          <input type="file" name="files" multiple accept="image/png,image/jpeg,image/webp" className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-panel-3 file:px-3 file:py-1.5 file:text-fg" required />
          <button className="btn ml-auto" disabled={pending}>{pending ? "Загружаем…" : "Загрузить"}</button>
        </form>
      )}

      <section className="card p-5">
        <h3 className="mb-1 text-sm font-medium">Все загруженные скрины ({screenshots.length})</h3>
        <p className="mb-3 text-xs text-muted">
          {editable ? "Нажмите на скрин, чтобы добавить его в набор или убрать из набора." : "Загруженные скрины приложения."}
        </p>
        {screenshots.length === 0 && <p className="text-sm text-muted">Пока ничего не загружено.</p>}
        <div className="flex flex-wrap gap-3">
          {screenshots.map((s) => {
            const n = draft.indexOf(s.id);
            return (
              <div key={s.id} className="group relative w-24">
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => toggleShot(s.id)}
                  className={`block w-full overflow-hidden rounded-lg border-2 ${n >= 0 ? "border-accent" : "border-transparent"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileUrl(s.path)!} alt={s.name} className="aspect-[9/19.5] w-full object-cover" />
                </button>
                {n >= 0 && (
                  <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 text-xs font-semibold text-white">{n + 1}</span>
                )}
                {editable && (
                  <button
                    type="button"
                    title="Удалить скрин"
                    onClick={() => confirm("Удалить скрин из всех локалей?") && startTransition(() => deleteScreenshot(appId, s.id))}
                    className="absolute right-1 top-1 hidden rounded bg-black/70 px-1 text-xs text-red-400 group-hover:block"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {editable && (
        <section className="card space-y-4 p-4">
          <div>
            <h3 className="font-medium">Набор: порядок скринов</h3>
            <p className="text-xs text-muted">
              Перетаскивайте, чтобы поменять порядок. Первые {BOARD_SHOTS} видны в карточке на доске. Максимум {MAX_SHOTS_PER_LOCALE}.
            </p>
          </div>
          {draft.length === 0 ? (
            <p className="text-sm text-muted">Набор пуст. Выберите скрины выше или загрузите набор из локали ниже.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={draft} strategy={horizontalListSortingStrategy}>
                <div className="flex flex-wrap gap-3">
                  {draft.map((id, i) =>
                    byId.has(id) ? (
                      <SortableShot key={id} shot={byId.get(id)!} index={i} onRemove={() => toggleShot(id)} />
                    ) : null,
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium">Применить к локалям</span>
              <span className="text-xs text-faint">выбрано {targets.length} из {locales.length}</span>
              <button type="button" className="btn-ghost ml-auto" onClick={() => setTargets(locales)}>Все</button>
              <button type="button" className="btn-ghost" onClick={() => setTargets(locales.filter((l) => !setsByLocale.has(l)))}>
                Без скринов
              </button>
              <button type="button" className="btn-ghost" onClick={() => setTargets([])}>Снять</button>
            </div>
            <div className="grid max-h-52 grid-cols-1 gap-x-3 overflow-y-auto rounded-xl border border-line bg-bg/40 p-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {locales.map((l) => (
                <label key={l} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-panel-2">
                  <input type="checkbox" className="check" checked={targets.includes(l)} onChange={() => toggleLocale(l)} />
                  <span className="truncate">{localeName(l)}</span>
                  {setsByLocale.has(l) && <span className="ml-auto text-xs text-faint">{setsByLocale.get(l)!.length}</span>}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="btn" onClick={apply} disabled={pending || targets.length === 0}>
              {pending ? "Применяем…" : "Применить набор"}
            </button>
            {message && <span className={`text-sm ${message.ok ? "text-emerald-400" : "text-red-400"}`}>{message.text}</span>}
          </div>
        </section>
      )}

      <section className="card divide-y divide-line">
        <h3 className="px-5 py-3 font-medium">Скрины по локалям</h3>
        {locales.filter((l) => setsByLocale.has(l)).map((l) => {
          const ids = setsByLocale.get(l) ?? [];
          return (
            <div key={l} className="flex items-center gap-3 px-5 py-2.5">
              <span className="w-56 shrink-0 text-sm">
                {localeName(l)} <span className="text-xs text-faint">{l}</span>
              </span>
              <div className="flex gap-1.5 overflow-x-auto">
                {ids.map((id) =>
                  byId.has(id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={id} src={fileUrl(byId.get(id)!.path)!} alt="" className="h-16 rounded-md ring-1 ring-white/10" />
                  ) : null,
                )}
              </div>
              {editable && ids.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary ml-auto shrink-0"
                  onClick={() => {
                    setDraft(ids);
                    setTargets([l]);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  В набор
                </button>
              )}
            </div>
          );
        })}
        {locales.some((l) => !setsByLocale.has(l)) && (
          <p className="px-5 py-3 text-sm text-faint">
            Без скринов: {locales.filter((l) => !setsByLocale.has(l)).map(localeName).join(", ")}
          </p>
        )}
      </section>
    </div>
  );
}

function SortableShot({ shot, index, onRemove }: { shot: Shot; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shot.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative w-24 cursor-grab touch-none ${isDragging ? "z-10 opacity-70" : ""}`}
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={fileUrl(shot.path)!} alt="" draggable={false} className="aspect-[9/19.5] w-full rounded-md border border-line-strong object-cover" />
      <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 text-xs font-semibold text-white">{index + 1}</span>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className="absolute right-1 top-1 rounded bg-black/70 px-1 text-xs"
        title="Убрать из набора"
      >
        ✕
      </button>
    </div>
  );
}
