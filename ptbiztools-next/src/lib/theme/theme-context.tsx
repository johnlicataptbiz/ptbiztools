/**
 * Theme Context - PT Biz Tools
 * 
 * Provides theme management with design token integration.
 * Reduced from 7 themes to 3 brand-aligned themes for stronger identity.
 */

"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  type AppTheme,
  type ThemeDefinition,
  THEME_DEFINITIONS,
  getThemeOptions,
  isValidTheme,
  applyThemeToDocument,
} from "@/constants/design-tokens";

const THEME_STORAGE_KEY = "ptbiz-theme-v2";

// Export the AppTheme type for use in other files
export type { AppTheme };

export interface ThemeOption {
  value: AppTheme;
  label: string;
  description: string;
}

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  options: ThemeOption[];
  currentTheme: ThemeDefinition;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Get the default theme - using 'evergreen' as the brand-aligned default
 */
function getDefaultTheme(): AppTheme {
  return "evergreen";
}

/**
 * Validate and migrate legacy theme values
 */
function migrateLegacyTheme(stored: string | null): AppTheme {
  if (!stored) return getDefaultTheme();
  
  // Map legacy theme names to new ones
  const legacyMap: Record<string, AppTheme> = {
    classic: "classic",
    midnight: "midnight",
    ocean: "evergreen", // Ocean -> Evergreen
    evergreen: "evergreen",
    sunset: "classic", // Sunset -> Classic
    slate: "midnight", // Slate -> Midnight
    sandstone: "classic", // Sandstone -> Classic
  };
  
  const mapped = legacyMap[stored];
  if (mapped && isValidTheme(mapped)) {
    return mapped;
  }
  
  return isValidTheme(stored) ? stored : getDefaultTheme();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window === "undefined") {
      return getDefaultTheme();
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    
    // Check for old storage key and migrate
    if (!stored) {
      const oldStored = window.localStorage.getItem("ptbiz-theme");
      if (oldStored) {
        const migrated = migrateLegacyTheme(oldStored);
        window.localStorage.setItem(THEME_STORAGE_KEY, migrated);
        window.localStorage.removeItem("ptbiz-theme");
        return migrated;
      }
    }
    
    return migrateLegacyTheme(stored);
  });

  // Apply theme to document when it changes
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = (nextTheme: AppTheme) => {
    if (!isValidTheme(nextTheme)) {
      console.warn(`Invalid theme: ${nextTheme}. Falling back to default.`);
      nextTheme = getDefaultTheme();
    }
    
    setThemeState(nextTheme);
    applyThemeToDocument(nextTheme);
    
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }
  };

  const currentTheme = THEME_DEFINITIONS[theme];
  const options = getThemeOptions();

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      options,
      currentTheme,
      isDark: currentTheme.isDark,
    }),
    [theme, currentTheme],
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

/**
 * Hook to get CSS variable values for the current theme
 */
export function useThemeColor(token: keyof ThemeDefinition["colors"]): string {
  const { currentTheme } = useTheme();
  return currentTheme.colors[token];
}

/**
 * Hook to check if current theme is dark mode
 */
export function useIsDarkMode(): boolean {
  const { isDark } = useTheme();
  return isDark;
}
