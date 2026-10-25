import { useState } from "react";
import { STAGE_COLORS, type Stage } from "../store";
import { useHub } from "./context";
import { useAction } from "./common";

export function StagesEditor() {
  const { store } = useHub();
  const { busy, run } = useAction();
  const [draft, setDraft] = useState<Stage[]>(() => store.stages.map((s) => ({ ...s })));
  const [deleting, setDeleting] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [newName, setNewName] = useState("");
  const counts = (id: string) => store.apps.filter((a) => a.stage === id).length;
  const dirty = JSON.stringify(draft) !== JSON.stringify(store.stages);

  const update = (i: number, patch: Partial<Stage>) => setDraft(draft.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const swap = (i: number, j: number) => {
    const next = [...draft];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
  };

  return (
    <div className="th-stages">
      <p className="th-muted">Колонки доски. Новые приложения попадают в первый этап.</p>
      {draft.map((s, i) => (
        <div key={s.id} className="th-stage-row">
          <div className="th-arrows">
            <button className="clickable-icon" disabled={i === 0} onClick={() => swap(i, i - 1)} aria-label="Выше">▲</button>
            <button className="clickable-icon" disabled={i === draft.length - 1} onClick={() => swap(i, i + 1)} aria-label="Ниже">▼</button>
          </div>
          <input value={s.name} onChange={(e) => update(i, { name: e.target.value })} />
          <Colors value={s.color} onChange={(color) => update(i, { color })} />
          <span className="th-muted th-nowrap">{counts(s.id)} прил.</span>
          <button className="mod-warning" disabled={draft.length <= 1 || dirty} title={dirty ? "Сначала сохраните изменения" : ""} onClick={() => {
            setDeleting(deleting === s.id ? null : s.id);
            setMoveTo(draft.find((d) => d.id !== s.id)?.id ?? "");
          }}>
            Удалить
          </button>
          {deleting === s.id && (
            <div className="th-stage-delete">
              {counts(s.id) > 0 ? (
                <>
                  <span>Перенести {counts(s.id)} прил. в</span>
                  <select className="dropdown" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                    {draft.filter((d) => d.id !== s.id).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </>
              ) : (
                <span>Этап пустой.</span>
              )}
              <button
                className="mod-warning"
                disabled={busy}
                onClick={async () => {
                  await run(() => store.deleteStage(s.id, moveTo || null), "Этап удалён");
                  setDraft(store.stages.map((x) => ({ ...x })));
                  setDeleting(null);
                }}
              >
                Удалить этап
              </button>
            </div>
          )}
        </div>
      ))}
      <div className="th-stage-row">
        <input placeholder="Новый этап" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button
          disabled={!newName.trim()}
          onClick={() => {
            setDraft([...draft, { id: `stage-${Date.now().toString(36)}`, name: newName.trim(), color: STAGE_COLORS[draft.length % STAGE_COLORS.length] }]);
            setNewName("");
          }}
        >
          Добавить
        </button>
      </div>
      <div className="th-actions">
        <button className="mod-cta" disabled={!dirty || busy || draft.some((s) => !s.name.trim())} onClick={() => run(() => store.saveStages(draft.map((s) => ({ ...s, name: s.name.trim() }))), "Этапы сохранены")}>
          Сохранить
        </button>
        {dirty && <button onClick={() => setDraft(store.stages.map((s) => ({ ...s })))}>Отменить</button>}
      </div>
    </div>
  );
}

function Colors({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="th-colors">
      {STAGE_COLORS.map((c) => (
        <button key={c} type="button" className={`th-swatch ${value === c ? "is-active" : ""}`} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
      ))}
    </div>
  );
}
