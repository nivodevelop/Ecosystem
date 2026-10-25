"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" || path.startsWith("/apps") : path.startsWith(href);
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 transition ${active ? "bg-panel-3 text-fg" : "text-muted hover:text-fg"}`}
    >
      {children}
    </Link>
  );
}
