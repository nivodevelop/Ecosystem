import { readFile } from "fs/promises";
import { getCurrentUser } from "@/lib/auth";
import { resolveStoragePath } from "@/lib/storage";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const rel = (await params).path.join("/");
  try {
    const data = await readFile(resolveStoragePath(rel));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[rel.split(".").pop() ?? ""] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
