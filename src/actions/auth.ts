"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkPassword, createSession, destroySession } from "@/lib/auth";

export async function login(_: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await checkPassword(password, user.passwordHash))) {
    return "Неверная почта или пароль";
  }
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
