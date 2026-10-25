import { useRef, useState } from "react";
import { BOARD_SHOTS } from "../locales";
import type { AppRecord, Stage } from "../store";
import { useHub } from "./context";
import { AppIcon } from "./common";

export function Board() {
  const { store, newApp, openStages } = useHub();
  const [dragId, setDragIdState] = useState<string | null>(null);
  // Ref, а не только состояние: drop может прийти раньше, чем React перерисует доску после dragstart
  const dragRef = useRef<string | null>(null);
  const setDragId = (id: string | null) => {
    dragRef.current = id;
    setDragIdState(id);
  };

  const drop = (stageId: string, beforeId: string | null, draggedId: string | null) => {
    const id = draggedId || dragRef.current;
    // Перемещаем после dragend: если убрать карточку из DOM раньше, браузер не завершит перетаскивание
    if (id && id !== beforeId) window.setTimeout(() => void store.moveApp(id, stageId, beforeId), 0);
    setDragId(null);
  };

  return (
    <div className="th-board-page">
      <div className="th-page-head">
        <div>
          <h1>Приложения</h1>
          <p className="th-muted">
            {store.apps.length} в работе · {store.stages.length} этапов
          </p>
        </div>
        <div className="th-actions">
          <button onClick={openStages}>Этапы</button>
          <button className="mod-cta" onClick={newApp}>+ Новое приложение</button>
        </div>
      </div>
      <div className="th-board">
        {store.stages.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            apps={store.apps.filter((a) => a.stage === stage.id)}
            dragId={dragId}
            onDragStart={setDragId}
            onDrop={drop}
          />
        ))}
      </div>
    </div>
  );
}

function Column(props: {
  stage: Stage;
  apps: AppRecord[];
  dragId: string | null;
  onDragStart: (id: string | null) => void;
  onDrop: (stageId: string, beforeId: string | null, draggedId: string | null) => void;
}) {
  const { stage, apps } = props;
  const [over, setOver] = useState(false);
  return (
    <section
      className={`th-column ${over ? "is-over" : ""}`}
      style={{ "--th-stage": stage.color } as React.CSSProperties}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        props.onDrop(stage.id, null, e.dataTransfer.getData("text/plain") || null);
      }}
    >
      <header className="th-column-head">
        <span className="th-dot" />
        <span className="th-column-title">{stage.name}</span>
        <span className="th-count">{apps.length}</span>
      </header>
      <div className="th-column-body">
        {apps.map((a) => (
          <Card key={a.id} app={a} {...props} />
        ))}
        {apps.length === 0 && <div className="th-empty">Перетащите сюда</div>}
      </div>
    </section>
  );
}

function Card({ app, dragId, onDragStart, onDrop }: { app: AppRecord; dragId: string | null; onDragStart: (id: string | null) => void; onDrop: (stageId: string, beforeId: string | null, draggedId: string | null) => void }) {
  const { store, openApp } = useHub();
  const [over, setOver] = useState(false);
  const title = store.title(app);
  const primary = app.locales[app.primaryLocale];
  const shots = (app.sets[app.primaryLocale] ?? app.shots).slice(0, BOARD_SHOTS);

  return (
    <div
      className={`th-card ${dragId === app.id ? "is-dragging" : ""} ${over && dragId !== app.id ? "is-drop-target" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", app.id);
        onDragStart(app.id);
      }}
      onDragEnd={() => onDragStart(null)}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        onDrop(app.stage, app.id, e.dataTransfer.getData("text/plain") || null);
      }}
      onClick={() => openApp(app.id)}
    >
      <div className="th-card-head">
        <AppIcon path={app.icon} title={title} size={42} />
        <div className="th-card-text">
          <div className="th-card-title">{title}</div>
          <div className="th-card-sub">{primary?.subtitle || "—"}</div>
        </div>
      </div>
      <div className="th-card-shots">
        {Array.from({ length: BOARD_SHOTS }, (_, i) =>
          shots[i] ? (
            <img key={i} src={store.resource(shots[i]) ?? ""} alt="" draggable={false} />
          ) : (
            <div key={i} className="th-shot-empty" />
          ),
        )}
      </div>
      <div className="th-card-meta">
        <span className="th-chip">{Object.keys(app.locales).length} лок.</span>
        {app.bundleId && <span className="th-chip th-ellipsis">{app.bundleId}</span>}
      </div>
    </div>
  );
}
