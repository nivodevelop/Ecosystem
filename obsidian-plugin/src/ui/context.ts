import { createContext, useContext, useSyncExternalStore } from "react";
import type { Store } from "../store";

export type HubContext = {
  store: Store;
  openApp: (id: string) => void;
  newApp: () => void;
  openStages: () => void;
};

export const Ctx = createContext<HubContext | null>(null);

export function useHub() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Traffic Hub context missing");
  // Перерисовываемся при любом изменении данных
  useSyncExternalStore(
    (cb) => ctx.store.subscribe(cb),
    () => ctx.store.version,
  );
  return ctx;
}
