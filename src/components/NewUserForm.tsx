"use client";

import { useActionState } from "react";
import { createUser } from "@/actions/users";
import { ROLE_LABELS } from "@/lib/permissions";

export function NewUserForm() {
  const [state, action, pending] = useActionState(createUser, null);
  return (
    <form action={action} className="card flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="label">Имя</label>
        <input className="input w-40" name="name" required />
      </div>
      <div>
        <label className="label">Почта</label>
        <input className="input w-52" name="email" type="email" required />
      </div>
      <div>
        <label className="label">Пароль</label>
        <input className="input w-40" name="password" type="password" minLength={8} required />
      </div>
      <div>
        <label className="label">Роль</label>
        <select className="input w-36" name="role" defaultValue="MEMBER">
          {Object.entries(ROLE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <button className="btn" disabled={pending}>Добавить</button>
      {state && <p className={`w-full text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>}
    </form>
  );
}
