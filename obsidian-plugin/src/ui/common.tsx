import { useState } from "react";
import { Notice } from "obsidian";
import { useHub } from "./context";

export function AppIcon({ path, title, size = 40 }: { path: string | null; title: string; size?: number }) {
  const { store } = useHub();
  const url = store.resource(path);
  const style = { width: size, height: size, borderRadius: size * 0.24, fontSize: size * 0.4 };
  if (url) return <img className="th-icon" src={url} style={style} alt="" />;
  return (
    <div className="th-icon th-icon-empty" style={style}>
      {title.slice(0, 1).toUpperCase()}
    </div>
  );
}

// Запускает действие, показывает ошибку уведомлением и блокирует кнопки на время выполнения
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = async <T,>(fn: () => Promise<T>, ok?: string | ((r: T) => string | null)) => {
    setBusy(true);
    try {
      const r = await fn();
      const msg = typeof ok === "function" ? ok(r) : ok;
      if (msg) new Notice(msg, 6000);
      return r;
    } catch (e) {
      new Notice(e instanceof Error ? e.message : String(e), 8000);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

// Выбор файлов через скрытый input
export function pickFiles(accept: string, multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.click();
  });
}

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
