"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={action} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-lg font-semibold">Вход в Traffic Hub</h1>
        <div>
          <label className="label" htmlFor="email">Почта</label>
          <input className="input" id="email" name="email" type="email" required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">Пароль</label>
          <input className="input" id="password" name="password" type="password" required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn w-full" disabled={pending}>{pending ? "Входим…" : "Войти"}</button>
      </form>
    </main>
  );
}
