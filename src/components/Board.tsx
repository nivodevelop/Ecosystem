"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { fileUrl } from "@/lib/urls";
import type { BoardCard, BoardStage } from "@/lib/board";
import { moveApp } from "@/actions/apps";
import { AppIcon } from "./AppIcon";

type Props = { stages: BoardStage[]; initialCards: BoardCard[]; canMove: boolean };

export function Board({ stages, initialCards, canMove }: Props) {
  const [cards, setCards] = useState(initialCards);
  const [prevInitial, setPrevInitial] = useState(initialCards);
  const [active, setActive] = useState<BoardCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Обновлённые данные с сервера заменяют локальное состояние
  if (initialCards !== prevInitial) {
    setPrevInitial(initialCards);
    setCards(initialCards);
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const card = cards.find((c) => c.id === e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!card || !overId) return;

    // Бросили на колонку (в конец) или на карточку (перед ней)
    const overCard = cards.find((c) => c.id === overId);
    if (overCard?.id === card.id) return;
    const stageId = overCard ? overCard.stageId : overId;
    const beforeId = overCard ? overCard.id : null;

    const rest = cards.filter((c) => c.id !== card.id);
    const moved = { ...card, stageId };
    const idx = beforeId ? rest.findIndex((c) => c.id === beforeId) : -1;
    if (idx === -1) {
      const lastInStage = rest.map((c) => c.stageId).lastIndexOf(stageId);
      rest.splice(lastInStage === -1 ? rest.length : lastInStage + 1, 0, moved);
    } else {
      rest.splice(idx, 0, moved);
    }
    const previous = cards;
    setCards(rest);
    setError(null);
    startTransition(async () => {
      try {
        await moveApp(card.id, stageId, beforeId);
      } catch {
        setCards(previous);
        setError("Не удалось переместить карточку");
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActive(cards.find((c) => c.id === e.active.id) ?? null)}
      onDragCancel={() => setActive(null)}
      onDragEnd={onDragEnd}
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-6">
        {stages.map((stage) => (
          <Column key={stage.id} stage={stage} cards={cards.filter((c) => c.stageId === stage.id)} canMove={canMove} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>{active ? <Card card={active} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

function Column({ stage, cards, canMove }: { stage: BoardStage; cards: BoardCard[]; canMove: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <section
      ref={setNodeRef}
      style={{ borderTopColor: stage.color, boxShadow: isOver ? `0 0 0 1px ${stage.color}, 0 0 30px -10px ${stage.color}` : undefined }}
      className="flex h-fit min-h-[60vh] w-[290px] shrink-0 flex-col rounded-2xl border border-t-2 border-line bg-panel/60 p-2.5 backdrop-blur transition"
    >
      <header className="mb-2.5 flex items-center gap-2 px-1.5 pt-1 text-sm font-medium">
        <span className="h-2 w-2 rounded-full" style={{ background: stage.color, boxShadow: `0 0 10px ${stage.color}` }} />
        <span className="truncate">{stage.name}</span>
        <span className="ml-auto rounded-full bg-panel-3 px-2 py-0.5 text-xs text-muted">{cards.length}</span>
      </header>
      <div className="flex min-h-28 flex-col gap-2.5">
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} canMove={canMove} />
        ))}
        {cards.length === 0 && (
          <div className="grid h-28 place-items-center rounded-xl border border-dashed border-line text-xs text-faint">
            Перетащите сюда
          </div>
        )}
      </div>
    </section>
  );
}

function DraggableCard({ card, canMove }: { card: BoardCard; canMove: boolean }) {
  const drag = useDraggable({ id: card.id, disabled: !canMove });
  const drop = useDroppable({ id: card.id });
  return (
    <div
      ref={(el) => {
        drag.setNodeRef(el);
        drop.setNodeRef(el);
      }}
      {...drag.attributes}
      {...drag.listeners}
      className={`relative ${drag.isDragging ? "opacity-30" : ""}`}
    >
      {drop.isOver && !drag.isDragging && <div className="absolute -top-1.5 left-2 right-2 h-0.5 rounded bg-accent" />}
      <Card card={card} />
    </div>
  );
}

function Card({ card, overlay }: { card: BoardCard; overlay?: boolean }) {
  return (
    <Link
      href={`/apps/${card.id}`}
      draggable={false}
      className={`group block rounded-xl border border-line bg-panel-2 p-3 transition hover:border-line-strong hover:bg-panel-3 ${overlay ? "rotate-2 shadow-2xl shadow-black/60 ring-1 ring-accent/60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <AppIcon path={card.icon} title={card.title} size={42} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{card.title}</div>
          <div className="truncate text-xs text-muted">{card.subtitle || "—"}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((i) =>
          card.shots[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={fileUrl(card.shots[i])!}
              alt=""
              draggable={false}
              className="aspect-[9/19.5] w-full rounded-md object-cover ring-1 ring-white/10"
            />
          ) : (
            <div key={i} className="aspect-[9/19.5] w-full rounded-md border border-dashed border-line bg-bg/40" />
          ),
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted">
        <span className="chip bg-panel-3 text-muted">{card.platform === "IOS" ? "iOS" : "Android"}</span>
        <span className="chip bg-panel-3 text-muted">{card.localeCount} лок.</span>
      </div>
    </Link>
  );
}
