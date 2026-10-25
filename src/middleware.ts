import { NextResponse, type NextRequest } from "next/server";

// Быстрая проверка наличия сессии; полная проверка подписи в getCurrentUser
export function middleware(req: NextRequest) {
  if (!req.cookies.get("session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!login|_next|favicon.ico).*)"],
};
