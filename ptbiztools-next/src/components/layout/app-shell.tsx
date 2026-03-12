"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  BarChart3,
  ClipboardList,
  Calculator,
  PhoneCall,
  ScrollText,
  Menu,
  X,
  LogOut,
  Palette,
} from "lucide-react";
import { useSession } from "@/lib/auth/session-context";
import { getEffectiveRole, getRoleLabel } from "@/lib/auth/roles";
import { useTheme } from "@/lib/theme/theme-context";
import { TourAnchors } from "@/lib/tour/anchors";
import { SITE_LOGO_URL } from "@/constants/branding";
import "@/styles/app-shell.css";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
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
  const { theme, setTheme, options } = useTheme();
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
        { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
        { href: "/discovery-call-grader", label: "Call Grader", icon: ClipboardList },
        { href: "/pl-calculator", label: "P&L Calculator", icon: Calculator },
        { href: "/compensation-calculator", label: "Comp Calculator", icon: Calculator },
        { href: "/sales-discovery-grader", label: "Sales Grader", icon: PhoneCall },
        { href: "/analyses", label: "Analyses", icon: ScrollText },
      ];
    }

    if (isAdvisor) {
      return [
        { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
        { href: "/discovery-call-grader", label: "Call Grader", icon: ClipboardList },
        { href: "/pl-calculator", label: "P&L Calculator", icon: Calculator },
        { href: "/compensation-calculator", label: "Comp Calculator", icon: Calculator },
        { href: "/sales-discovery-grader", label: "Sales Grader", icon: PhoneCall },
        { href: "/analyses", label: "My Analyses", icon: ScrollText },
      ];
    }

    return [
      { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
      { href: "/discovery-call-grader", label: "Call Grader", icon: ClipboardList },
      { href: "/pl-calculator", label: "P&L Calculator", icon: Calculator },
      { href: "/compensation-calculator", label: "Comp Calculator", icon: Calculator },
      { href: "/analyses", label: "My Analyses", icon: ScrollText },
    ];
  }, [isAdmin, isAdvisor]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-10">
        <div className="rounded-(--radius-xl) border border-border bg-surface px-6 py-5 text-sm text-muted-foreground shadow-md">
          Loading workspace...
        </div>
      </main>
    );
  }

  const initials = getInitials(user.name);
  const isJack = normalizeText(user.name) === "jack licata";

  return (
    <div className="app-shell min-h-screen lg:grid lg:grid-cols-[296px_minmax(0,1fr)]">
      {menuOpen && (
        <button
          className="app-shell-overlay fixed inset-0 z-30 bg-black/45 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`app-shell-sidebar fixed inset-y-0 left-0 z-40 w-[296px] p-5 transition-transform lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 lg:justify-center">
          <Link
            href="/dashboard"
            className="app-shell-logo-link"
            onClick={() => setMenuOpen(false)}
            data-tour={TourAnchors.shell.logo}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="app-shell-logo-image" src={SITE_LOGO_URL} alt="PT Biz Tools" />
            <span className="app-shell-logo-copy">PTBizCoach</span>
          </Link>
          <button className="app-shell-mobile-close lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        <nav className="mt-8 space-y-1.5" data-tour={TourAnchors.shell.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-shell-nav-link ${
                  isActive
                    ? "app-shell-nav-link-active"
                    : "app-shell-nav-link-idle"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="app-shell-nav-icon-fallback">
                  <Icon size={16} className="shrink-0" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="app-shell-user-slot">
          <div className="app-shell-user-card rounded-xl border border-border bg-white p-3">
            <div className="flex items-center gap-3">
              {user.imageUrl && !avatarDidError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={`h-11 w-11 rounded-full object-cover ${isJack ? "object-[50%_8%]" : ""}`}
                  src={user.imageUrl}
                  alt={user.name}
                  onError={() => setAvatarDidError(true)}
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold leading-tight tracking-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground">{getRoleLabel(user)}</p>
              </div>
            </div>
            <button
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-background"
              onClick={handleLogout}
            >
              <LogOut size={14} />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      <div className="app-shell-main min-h-screen">
        <header className="app-shell-header sticky top-0 z-20 border-b border-border px-4 py-2 lg:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <button
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm shadow-sm lg:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <span className="inline-flex items-center gap-2">
                <Menu size={15} />
                Menu
              </span>
            </button>
            <div /> {/* Spacer for center alignment */}
            <label className="app-shell-theme-control" data-tour={TourAnchors.shell.theme}>
              <span className="app-shell-theme-label">
                <Palette size={14} />
              </span>
              <select
                className="app-shell-theme-select"
                value={theme}
                onChange={(event) => setTheme(event.target.value as typeof theme)}
                aria-label="Select theme"
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">{children}</main>

        <footer className="app-shell-footer border-t border-border px-4 py-3 lg:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-3">
            <p className="text-xs text-muted-foreground">PT Biz Tools</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
