"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:border-black/40 hover:text-foreground dark:border-white/20 dark:hover:border-white/50"
    >
      {isDark === null ? null : isDark ? (
        <SunIcon className="size-4" />
      ) : (
        <MoonIcon className="size-4" />
      )}
      {isDark === null ? "Theme" : isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
