"use client";

import { useActionState, useState, useTransition } from "react";
import { STAGE_COLORS } from "@/lib/stages";
import { createStage, deleteStage, moveStage, updateStage } from "@/actions/stages";

type Stage = { id: string; name: string; color: string; apps: number };

export function StagesEditor({ stages }: { stages: Stage[] }) {
  const [state, action, pending] = useActionState(createStage, null);
  return (
    <div className="space-y-4">
      <div className="card divide-y divide-line">
        {stages.map((s, i) => (
          <StageRow key={s.id + s.name + s.color} stage={s} index={i} total={stages.length} others={stages.filter((o) => o.id !== s.id)} />
        ))}
      </div>
      <form action={action} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label className="label">Новый этап</label>
          <input className="input" name="name" placeholder="Например: Ожидает оплаты" required />
        </div>
        <ColorPicker name="color" initial={STAGE_COLORS[8]} />
        <button className="btn" disabled={pending}>Добавить</button>
        {state && <p className={`w-full text-sm ${state.ok ? "text-emerald-400" : "text-red-400"}`}>{state.message}</p>}
      </form>
    </div>
  );
}

function StageRow({ stage, index, total, others }: { stage: Stage; index: number; total: number; others: Stage[] }) {
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });

  return (
    <div className="p-4">
      <form action={(fd) => run(() => updateStage(stage.id, fd))} className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col">
          <button type="button" className="btn-ghost leading-none" disabled={index === 0 || pending} onClick={() => run(() => moveStage(stage.id, -1))} title="Выше">▲</button>
          <button type="button" className="btn-ghost leading-none" disabled={index === total - 1 || pending} onClick={() => run(() => moveStage(stage.id, 1))} title="Ниже">▼</button>
        </div>
        <span className="w-5 text-center text-xs text-faint">{index + 1}</span>
        <input className="input w-60 min-w-40 flex-1" name="name" defaultValue={stage.name} required />
        <ColorPicker name="color" initial={stage.color} />
        <span className="w-14 text-xs text-muted">{stage.apps} прил.</span>
        <button className="btn-secondary" disabled={pending}>Сохранить</button>
        <button type="button" className="btn-danger" disabled={total <= 1} onClick={() => setDeleting(!deleting)}>
          Удалить
        </button>
      </form>
      {deleting && (
        <form
          action={(fd) => run(() => deleteStage(stage.id, fd))}
          className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm"
        >
          {stage.apps > 0 ? (
            <>
              <span>Перенести {stage.apps} прил. в</span>
              <select name="moveTo" className="input w-56" required>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </>
          ) : (
            <span>Этап пустой, его можно удалить.</span>
          )}
          <button className="btn-danger ml-auto" disabled={pending}>Удалить этап</button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function ColorPicker({ name, initial }: { name: string; initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="flex flex-wrap gap-1">
      <input type="hidden" name={name} value={value} />
      {STAGE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setValue(c)}
          title={c}
          style={{ background: c }}
          className={`h-4.5 w-4.5 rounded-full transition ${value === c ? "ring-2 ring-white ring-offset-2 ring-offset-panel" : "opacity-70 hover:opacity-100"}`}
        />
      ))}
    </div>
  );
}
