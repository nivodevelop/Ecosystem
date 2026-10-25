"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={action} className="card w-full max-w-sm space-y-5 p-7 shadow-2xl shadow-black/40">
        <Logo />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">С возвращением</h1>
          <p className="mt-1 text-sm text-muted">Войдите в рабочее пространство команды</p>
        </div>
        <div>
          <label className="label" htmlFor="email">Почта</label>
          <input className="input" id="email" name="email" type="email" required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">Пароль</label>
          <input className="input" id="password" name="password" type="password" required />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn w-full" disabled={pending}>{pending ? "Входим…" : "Войти"}</button>
      </form>
    </main>
  );
}
