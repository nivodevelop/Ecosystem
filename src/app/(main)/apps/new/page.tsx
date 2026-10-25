import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { LOCALES } from "@/lib/locales";
import { createApp } from "@/actions/apps";

export default async function NewAppPage() {
  const user = await requireUser();
  if (!can.editApp(user.role)) redirect("/");
  return (
    <main className="mx-auto max-w-lg px-5 py-6">
      <Link href="/" className="text-sm text-muted transition hover:text-fg">← Доска</Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Новое приложение</h1>
      <form action={createApp} className="card mt-5 space-y-5 p-6">
        <div>
          <label className="label">Название (до 30 символов)</label>
          <input className="input" name="title" maxLength={30} required />
        </div>
        <div>
          <label className="label">Подзаголовок (до 30 символов)</label>
          <input className="input" name="subtitle" maxLength={30} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Платформа</label>
            <select className="input" name="platform">
              <option value="IOS">iOS</option>
              <option value="ANDROID">Android</option>
            </select>
          </div>
          <div>
            <label className="label">Основная локаль</label>
            <select className="input" name="primaryLocale" defaultValue="en-US">
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code}>{l.name} ({l.code})</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Bundle ID / Package name</label>
          <input className="input" name="bundleId" placeholder="com.company.app" />
        </div>
        <div>
          <label className="label">Иконка (PNG/JPG)</label>
          <input className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-panel-3 file:px-3 file:py-1.5 file:text-fg" type="file" name="icon" accept="image/png,image/jpeg,image/webp" />
        </div>
        <button className="btn w-full">Создать</button>
      </form>
    </main>
  );
}
