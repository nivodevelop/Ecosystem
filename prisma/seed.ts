import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Создаёт первого админа. Почту и пароль можно задать через ADMIN_EMAIL / ADMIN_PASSWORD.
async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin12345";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Админ ${email} уже существует`);
    return;
  }
  await db.user.create({
    data: { email, name: "Админ", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Создан админ ${email} / ${password}. Смените пароль после входа.`);
}

main().finally(() => db.$disconnect());
