import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { LOCALES } from "@/lib/locales";
import { createApp } from "@/actions/apps";
import { redirect } from "next/navigation";

export default async function NewAppPage() {
  const user = await requireUser();
  if (!can.editApp(user.role)) redirect("/");
  return (
    <main className="mx-auto max-w-lg p-4">
      <h1 className="mb-4 text-lg font-semibold">Новое приложение</h1>
      <form action={createApp} className="card space-y-4 p-5">
        <div>
          <label className="label">Название (до 30 символов)</label>
          <input className="input" name="title" maxLength={30} required />
        </div>
        <div>
          <label className="label">Подзаголовок (до 30 символов)</label>
          <input className="input" name="subtitle" maxLength={30} />
        </div>
        <div className="grid grid-cols-2 gap-3">
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
          <input className="text-sm" type="file" name="icon" accept="image/png,image/jpeg,image/webp" />
        </div>
        <button className="btn">Создать</button>
      </form>
    </main>
  );
}
