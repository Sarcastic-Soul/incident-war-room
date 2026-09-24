"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

// The DOM's .dark class (set synchronously by the pre-hydration script in
// layout.tsx, before React ever mounts) is the actual source of truth for
// theme — useSyncExternalStore reads it directly instead of mirroring it
// into local state via an effect, so there's no cascading setState-in-effect
// render and no hydration mismatch (getServerSnapshot matches the
// server-rendered markup; the real value is picked up on the client's first
// paint).
let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

function setTheme(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  localStorage.setItem("theme", next ? "dark" : "light");
  listeners.forEach((listener) => listener());
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => setTheme(!isDark)}
      className="flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:border-black/40 hover:text-foreground dark:border-white/20 dark:hover:border-white/50"
    >
      {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
