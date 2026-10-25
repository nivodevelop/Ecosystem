"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";

export type UserResult = { ok: boolean; message: string } | null;

const roleOf = (v: FormDataEntryValue | null): Role =>
  v === "ADMIN" || v === "MANAGER" ? v : "MEMBER";

export async function createUser(_: UserResult, form: FormData): Promise<UserResult> {
  await requirePermission(can.manageUsers);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !name) return { ok: false, message: "Заполните имя и почту" };
  if (password.length < 8) return { ok: false, message: "Пароль не короче 8 символов" };
  if (await db.user.findUnique({ where: { email } })) return { ok: false, message: "Такая почта уже есть" };
  await db.user.create({
    data: { email, name, role: roleOf(form.get("role")), passwordHash: await hashPassword(password) },
  });
  revalidatePath("/users");
  return { ok: true, message: `Пользователь ${name} создан` };
}

export async function updateUser(userId: string, form: FormData) {
  const me = await requirePermission(can.manageUsers);
  const role = roleOf(form.get("role"));
  const active = form.get("active") === "on";
  if (userId === me.id && (role !== "ADMIN" || !active)) throw new Error("Нельзя понизить или отключить себя");
  const password = String(form.get("password") ?? "");
  await db.user.update({
    where: { id: userId },
    data: {
      role,
      active,
      ...(password.length >= 8 ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
  revalidatePath("/users");
}
