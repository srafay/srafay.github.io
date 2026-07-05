"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const subscribe = () => () => {};

/** The homepage's toggle: a moon in light mode, a sun at night (globals.css shows the right one). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is only known in the browser; label it generically on the server.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const isDark = resolvedTheme === "dark";
  const label = !mounted ? "Toggle theme" : isDark ? "Switch to the ink chart (light)" : "Switch to the night sky (dark)";

  return (
    <button type="button" className="flip" aria-label={label} title={mounted ? label : undefined} onClick={() => setTheme(isDark ? "light" : "dark")}>
      <svg className="moon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
      <svg className="sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
      </svg>
    </button>
  );
}
