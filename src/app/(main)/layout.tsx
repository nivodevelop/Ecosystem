import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { logout } from "@/actions/auth";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/70 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-6 px-5">
          <Link href="/"><Logo /></Link>
          <nav className="flex gap-1 text-sm">
            <NavLink href="/">Доска</NavLink>
            {can.manageStages(user.role) && <NavLink href="/stages">Этапы</NavLink>}
            {can.manageUsers(user.role) && <NavLink href="/users">Команда</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-panel-3 text-xs font-semibold text-fg ring-1 ring-line-strong">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="hidden leading-tight sm:block">
              <div className="text-fg">{user.name}</div>
              <div className="text-xs text-faint">{ROLE_LABELS[user.role]}</div>
            </div>
            <form action={logout}>
              <button className="btn-ghost">Выйти</button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
