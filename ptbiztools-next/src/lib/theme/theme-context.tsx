"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "ptbiz-theme";

export type AppTheme = "classic" | "midnight" | "ocean" | "evergreen" | "sunset" | "slate" | "sandstone";

export interface ThemeOption {
  value: AppTheme;
  label: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: "classic", label: "Classic Coach" },
  { value: "midnight", label: "Midnight Slate" },
  { value: "ocean", label: "Ocean Ledger" },
  { value: "evergreen", label: "Evergreen" },
  { value: "sunset", label: "Sunset Ember" },
  { value: "slate", label: "Slate Steel" },
  { value: "sandstone", label: "Sandstone" },
];

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  options: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is AppTheme {
  return THEME_OPTIONS.some((option) => option.value === value);
}

function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("classic");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(THEME_STORAGE_KEY) : null;
    if (isTheme(stored)) {
      setThemeState(stored);
      applyTheme(stored);
      return;
    }
    applyTheme("classic");
  }, []);

  const setTheme = (nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      options: THEME_OPTIONS,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
