import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { loadBoard, loadStages } from "@/lib/board";
import { Board } from "@/components/Board";

export default async function BoardPage() {
  const user = await requireUser();
  const [stages, cards] = await Promise.all([loadStages(), loadBoard()]);
  return (
    <main className="px-5 py-6">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Приложения</h1>
          <p className="mt-1 text-sm text-muted">
            {cards.length} в работе · {stages.length} этапов
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {can.manageStages(user.role) && <Link href="/stages" className="btn-secondary">Настроить этапы</Link>}
          {can.editApp(user.role) && <Link href="/apps/new" className="btn">+ Новое приложение</Link>}
        </div>
      </div>
      <Board stages={stages} initialCards={cards} canMove={can.moveCard(user.role)} />
    </main>
  );
}
