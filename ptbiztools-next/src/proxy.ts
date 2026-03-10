import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ptbiz_user";
const LOGIN_PATH = "/login";
const DASHBOARD_PATH = "/dashboard";
const PROTECTED_PATHS = new Set([
  "/dashboard",
  "/discovery-call-grader",
  "/sales-discovery-grader",
  "/analyses",
  "/pl-calculator",
  "/compensation-calculator",
]);

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (pathname === LOGIN_PATH && hasSessionCookie) {
    return redirectTo(request, DASHBOARD_PATH);
  }

  if (PROTECTED_PATHS.has(pathname) && !hasSessionCookie) {
    return redirectTo(request, LOGIN_PATH);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard", "/discovery-call-grader", "/sales-discovery-grader", "/analyses", "/pl-calculator", "/compensation-calculator"],
};
