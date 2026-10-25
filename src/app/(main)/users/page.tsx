import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { updateUser } from "@/actions/users";
import { NewUserForm } from "@/components/NewUserForm";

export default async function UsersPage() {
  const me = await requireUser();
  if (!can.manageUsers(me.role)) redirect("/");
  const users = await db.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-5 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Команда</h1>
        <p className="mt-1 text-sm text-muted">Сотрудники, роли и доступы</p>
      </div>
      <NewUserForm />
      <div className="card divide-y divide-line">
        {users.map((u) => (
          <form key={u.id} action={updateUser.bind(null, u.id)} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <div className="min-w-48">
              <div className={u.active ? "font-medium" : "text-faint line-through"}>{u.name}</div>
              <div className="text-xs text-muted">{u.email}</div>
            </div>
            <select name="role" defaultValue={u.role} className="input w-36">
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input name="password" type="password" placeholder="Новый пароль" className="input w-40" minLength={8} />
            <label className="flex items-center gap-1.5">
              <input type="checkbox" className="check" name="active" defaultChecked={u.active} /> активен
            </label>
            <button className="btn-secondary ml-auto">Сохранить</button>
          </form>
        ))}
      </div>
      <div className="card p-4 text-xs text-muted">
        <b>Права ролей.</b> Админ: всё, включая пользователей, удаление приложений и позиции по ключам.
        Менеджер: создаёт и редактирует приложения, локализации и скрины. Сотрудник: видит доску и
        приложения, двигает карточки по этапам.
      </div>
    </main>
  );
}
