import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

export const THEME_STORAGE_KEY = "finance-twa.theme";

export type ResolvedTheme = "dark" | "light";
export type ThemeMode = ResolvedTheme | "auto";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "auto" || value === "dark" || value === "light";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "auto";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);

  return isThemeMode(stored) ? stored : "auto";
}

function applyTheme(theme: ResolvedTheme, themeMode: ThemeMode): void {
  document.documentElement.classList.remove("dark", "light");
  document.body.classList.remove("dark", "light");

  document.documentElement.classList.add(theme);
  document.body.classList.add(theme);
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
  document.documentElement.dataset.themeMode = themeMode;
  document.body.dataset.themeMode = themeMode;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme = theme === "auto" ? systemTheme : theme;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (matches: boolean) => {
      setSystemTheme(matches ? "dark" : "light");
    };

    updateSystemTheme(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      updateSystemTheme(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme, theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [resolvedTheme, theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    resolvedTheme,
    setTheme,
  }), [resolvedTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
