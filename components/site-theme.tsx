"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/*
  The site's menu (lib/site-menu) changes the theme through each page's own switch. On these pages that is next-themes,
  as the header's toggle uses it, so the toggle stays in step: written around it, the toggle's next click would go the
  wrong way.
*/
export function SiteTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => {
    const flip = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");
    window.siteTheme = { flip };
    return () => {
      if (window.siteTheme?.flip === flip) delete window.siteTheme;
    };
  }, [resolvedTheme, setTheme]);
  return null;
}
