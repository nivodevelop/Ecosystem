import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { StagesEditor } from "@/components/StagesEditor";

export default async function StagesPage() {
  const user = await requireUser();
  if (!can.manageStages(user.role)) redirect("/");
  const stages = await db.stage.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { apps: true } } },
  });
  return (
    <main className="mx-auto max-w-5xl px-5 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Этапы канбана</h1>
      <p className="mt-1 text-sm text-muted">
        Колонки доски: названия, цвета и порядок. Новые приложения попадают в первый этап.
      </p>
      <div className="mt-6">
        <StagesEditor stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color, apps: s._count.apps }))} />
      </div>
    </main>
  );
}
