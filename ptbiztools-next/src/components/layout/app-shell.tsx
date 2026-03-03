"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/auth/session-context";
import { getEffectiveRole, getRoleLabel } from "@/lib/auth/roles";

interface NavItem {
  href: string;
  label: string;
}

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarDidError, setAvatarDidError] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  const role = getEffectiveRole(user);
  const isAdmin = role === "admin";
  const isAdvisor = role === "advisor";

  const navItems = useMemo<NavItem[]>(() => {
    if (isAdmin) {
      return [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/discovery-call-grader", label: "Call Grader" },
        { href: "/pl-calculator", label: "P&L Calculator" },
        { href: "/compensation-calculator", label: "Comp Calculator" },
        { href: "/sales-discovery-grader", label: "Sales Grader" },
        { href: "/analyses", label: "Analyses" },
        { href: "/knowledge", label: "Knowledge" },
        { href: "/media", label: "Media" },
      ];
    }

    if (isAdvisor) {
      return [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/discovery-call-grader", label: "Call Grader" },
        { href: "/pl-calculator", label: "P&L Calculator" },
        { href: "/compensation-calculator", label: "Comp Calculator" },
        { href: "/sales-discovery-grader", label: "Sales Grader" },
        { href: "/analyses", label: "My Analyses" },
        { href: "/knowledge", label: "Knowledge" },
      ];
    }

    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/discovery-call-grader", label: "Call Grader" },
      { href: "/pl-calculator", label: "P&L Calculator" },
      { href: "/compensation-calculator", label: "Comp Calculator" },
      { href: "/analyses", label: "My Analyses" },
      { href: "/knowledge", label: "Knowledge" },
    ];
  }, [isAdmin, isAdvisor]);

  const featuredNavItems = useMemo(() => navItems.slice(0, Math.max(navItems.length - 2, 0)), [navItems]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-10">
        <div className="rounded-(--radius-xl) border border-border bg-surface px-6 py-5 text-sm text-muted-foreground">
          Loading workspace...
        </div>
      </main>
    );
  }

  const initials = getInitials(user.name);
  const isJack = normalizeText(user.name) === "jack licata";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      {menuOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/35 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[280px] border-r border-border bg-surface p-5 transition-transform lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-semibold tracking-[0.12em] text-accent" onClick={() => setMenuOpen(false)}>
            PT BIZ TOOLS
          </Link>
          <button className="text-sm text-muted-foreground lg:hidden" onClick={() => setMenuOpen(false)}>
            Close
          </button>
        </div>

        <nav className="mt-8 space-y-1">
          {featuredNavItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-accent text-white"
                    : "text-foreground hover:bg-white"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-xl border border-border bg-white/75 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Migration Lab</p>
          <Link href="/stack-lab" className="mt-2 inline-block text-sm font-medium text-accent">
            View New Stack Controls
          </Link>
        </div>

        <div className="mt-auto pt-8">
          <div className="rounded-xl border border-border bg-white p-3">
            <div className="flex items-center gap-3">
              {user.imageUrl && !avatarDidError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={`h-10 w-10 rounded-full object-cover ${isJack ? "object-[50%_8%]" : ""}`}
                  src={user.imageUrl}
                  alt={user.name}
                  onError={() => setAvatarDidError(true)}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold leading-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground">{getRoleLabel(user)}</p>
              </div>
            </div>
            <button
              className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-background"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <button
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm lg:hidden"
              onClick={() => setMenuOpen(true)}
            >
              Menu
            </button>
            <p className="text-sm text-muted-foreground">PT Biz Coach Workspace</p>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
