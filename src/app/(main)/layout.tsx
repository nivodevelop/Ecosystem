import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { logout } from "@/actions/auth";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="flex h-12 items-center gap-6 px-4">
          <Link href="/" className="font-semibold">Traffic Hub</Link>
          <nav className="flex gap-4 text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900">Доска</Link>
            {can.manageUsers(user.role) && <Link href="/users" className="hover:text-gray-900">Пользователи</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-gray-600">
              {user.name} · <span className="text-gray-400">{ROLE_LABELS[user.role]}</span>
            </span>
            <form action={logout}>
              <button className="text-gray-500 hover:text-gray-900">Выйти</button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
