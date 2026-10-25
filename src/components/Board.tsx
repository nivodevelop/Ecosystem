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
import { STAGES } from "@/lib/stages";
import { fileUrl } from "@/lib/urls";
import type { BoardCard } from "@/lib/board";
import { moveApp } from "@/actions/apps";
import { AppIcon } from "./AppIcon";

export function Board({ initialCards, canMove }: { initialCards: BoardCard[]; canMove: boolean }) {
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
    const stage = overCard ? overCard.stage : overId;
    const beforeId = overCard && overCard.id !== card.id ? overCard.id : null;
    if (overCard?.id === card.id) return;

    const rest = cards.filter((c) => c.id !== card.id);
    const moved = { ...card, stage };
    const idx = beforeId ? rest.findIndex((c) => c.id === beforeId) : -1;
    if (idx === -1) {
      const lastInStage = rest.map((c) => c.stage).lastIndexOf(stage);
      rest.splice(lastInStage + 1, 0, moved);
    } else {
      rest.splice(idx, 0, moved);
    }
    const previous = cards;
    setCards(rest);
    setError(null);
    startTransition(async () => {
      try {
        await moveApp(card.id, stage, beforeId);
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
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <Column
            key={stage.id}
            id={stage.id}
            label={stage.label}
            color={stage.color}
            cards={cards.filter((c) => c.stage === stage.id)}
            canMove={canMove}
          />
        ))}
      </div>
      <DragOverlay>{active ? <Card card={active} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

function Column(props: { id: string; label: string; color: string; cards: BoardCard[]; canMove: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: props.id });
  return (
    <section
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg bg-gray-200/60 p-2 ${isOver ? "ring-2 ring-gray-400" : ""}`}
    >
      <header className="mb-2 flex items-center gap-2 px-1 text-sm font-medium">
        <span className={`h-2 w-2 rounded-full ${props.color}`} />
        {props.label}
        <span className="ml-auto text-xs text-gray-500">{props.cards.length}</span>
      </header>
      <div className="flex min-h-24 flex-col gap-2">
        {props.cards.map((c) => (
          <DraggableCard key={c.id} card={c} canMove={props.canMove} />
        ))}
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
      className={`${drag.isDragging ? "opacity-30" : ""} ${drop.isOver && !drag.isDragging ? "border-t-2 border-gray-900 pt-1" : ""}`}
    >
      <Card card={card} />
    </div>
  );
}

function Card({ card, overlay }: { card: BoardCard; overlay?: boolean }) {
  return (
    <Link
      href={`/apps/${card.id}`}
      draggable={false}
      className={`card block p-2.5 hover:border-gray-400 ${overlay ? "rotate-2 shadow-lg" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <AppIcon path={card.icon} title={card.title} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{card.title}</div>
          <div className="truncate text-xs text-gray-500">{card.subtitle || "—"}</div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((i) =>
          card.shots[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={fileUrl(card.shots[i])!}
              alt=""
              draggable={false}
              className="aspect-[9/19.5] w-full rounded border border-gray-200 object-cover"
            />
          ) : (
            <div key={i} className="aspect-[9/19.5] w-full rounded border border-dashed border-gray-200 bg-gray-50" />
          ),
        )}
      </div>
      <div className="mt-2 flex gap-2 text-[11px] text-gray-500">
        <span>{card.platform === "IOS" ? "iOS" : "Android"}</span>
        <span>· {card.localeCount} лок.</span>
      </div>
    </Link>
  );
}
