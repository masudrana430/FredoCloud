"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { themeMode, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={toggleTheme}
        className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white"
      >
        {resolvedTheme === "dark" ? "☀️ Light" : "🌙 Dark"}
      </button>

      <select
        value={themeMode}
        onChange={event => setTheme(event.target.value)}
        className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-700"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}