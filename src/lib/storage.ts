import "server-only";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Локальное хранилище файлов. Для продакшена можно заменить на S3/R2,
// сохранив те же функции.
export const STORAGE_ROOT = path.resolve(process.env.STORAGE_DIR ?? "./storage");

const ALLOWED = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

export async function saveImage(file: File, folder: string): Promise<string> {
  const ext = ALLOWED.get(file.type);
  if (!ext) throw new Error(`Неподдерживаемый формат: ${file.type || file.name}`);
  const rel = path.posix.join(folder, `${randomUUID()}.${ext}`);
  const abs = path.join(STORAGE_ROOT, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, Buffer.from(await file.arrayBuffer()));
  return rel;
}

export async function deleteFile(rel: string) {
  try {
    await unlink(resolveStoragePath(rel));
  } catch {
    // файл уже удалён
  }
}

export function resolveStoragePath(rel: string) {
  const abs = path.resolve(STORAGE_ROOT, rel);
  if (!abs.startsWith(STORAGE_ROOT + path.sep)) throw new Error("Bad path");
  return abs;
}

