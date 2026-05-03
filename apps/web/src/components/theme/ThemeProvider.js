"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode) {
  if (typeof document === "undefined") return;

  const resolvedTheme = mode === "system" ? getSystemTheme() : mode;

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.dataset.theme = resolvedTheme;
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState("system");
  const [resolvedTheme, setResolvedTheme] = useState("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme-mode") || "system";

    setThemeMode(savedTheme);
    applyTheme(savedTheme);
    setResolvedTheme(savedTheme === "system" ? getSystemTheme() : savedTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemThemeChange() {
      const currentMode = window.localStorage.getItem("theme-mode") || "system";

      if (currentMode === "system") {
        applyTheme("system");
        setResolvedTheme(getSystemTheme());
      }
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  function setTheme(mode) {
    window.localStorage.setItem("theme-mode", mode);

    setThemeMode(mode);
    applyTheme(mode);
    setResolvedTheme(mode === "system" ? getSystemTheme() : mode);
  }

  function toggleTheme() {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      setTheme,
      toggleTheme
    }),
    [themeMode, resolvedTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}