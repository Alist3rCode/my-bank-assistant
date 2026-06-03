import { createContext, useContext, useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    try {
      return (localStorage.getItem("theme") as ThemePreference) || "system";
    } catch {
      return "system";
    }
  });

  const resolved = resolve(preference);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // React to system-level changes when preference is 'system'
  useEffect(() => {
    if (preference !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(resolve("system"));
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [preference]);

  const setPreference = (p: ThemePreference) => {
    try {
      localStorage.setItem("theme", p);
    } catch {
      /* storage unavailable */
    }
    setPreferenceState(p);
  };

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
