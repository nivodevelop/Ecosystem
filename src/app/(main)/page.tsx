import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { loadBoard } from "@/lib/board";
import { Board } from "@/components/Board";

export default async function BoardPage() {
  const user = await requireUser();
  const cards = await loadBoard();
  return (
    <main className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-lg font-semibold">Приложения</h1>
        <span className="text-sm text-gray-500">{cards.length}</span>
        {can.editApp(user.role) && (
          <Link href="/apps/new" className="btn ml-auto">+ Новое приложение</Link>
        )}
      </div>
      <Board initialCards={cards} canMove={can.moveCard(user.role)} />
    </main>
  );
}
