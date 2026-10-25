import { useState } from "react";
import { LOCALES } from "../locales";
import { useHub } from "./context";
import { useAction } from "./common";

export function NewAppForm({ onCreated }: { onCreated: (id: string) => void }) {
  const { store } = useHub();
  const { busy, run } = useAction();
  const [form, setForm] = useState({ title: "", subtitle: "", primaryLocale: "en-US", bundleId: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <form
      className="th-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const id = await run(() => store.createApp(form));
        if (id) onCreated(id);
      }}
    >
      <label>
        <span>Название (до 30 символов)</span>
        <input value={form.title} onChange={set("title")} maxLength={30} required autoFocus />
      </label>
      <label>
        <span>Подзаголовок (до 30 символов)</span>
        <input value={form.subtitle} onChange={set("subtitle")} maxLength={30} />
      </label>
      <label>
        <span>Основная локаль</span>
        <select className="dropdown" value={form.primaryLocale} onChange={set("primaryLocale")}>
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>{l.name} ({l.code})</option>
          ))}
        </select>
      </label>
      <label>
        <span>Bundle ID</span>
        <input value={form.bundleId} onChange={set("bundleId")} placeholder="com.company.app" />
      </label>
      <button className="mod-cta" disabled={busy}>Создать</button>
    </form>
  );
}
