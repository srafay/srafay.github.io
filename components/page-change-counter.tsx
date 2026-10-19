"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/*
  A React page can lead to another without a full page load (the posts list to a post, and Back again). GoatCounter's
  script counts only the page it was loaded on (lib/visit-counter.ts), so each page reached this way is counted here,
  at a quiet moment. A change in the first few seconds, before that script has loaded, goes uncounted.
  The address's own path is sent, with its trailing slash, as a page loaded in full is counted.
*/
declare global {
  interface Window {
    goatcounter?: { count?(visit: { path: string }): void };
  }
}

function countPageChange() {
  const count = () => window.goatcounter?.count?.({ path: location.pathname });
  // Safari has no requestIdleCallback.
  if ("requestIdleCallback" in window)
    requestIdleCallback(count, { timeout: 2000 });
  else setTimeout(count, 0);
}

export function PageChangeCounter() {
  const pathname = usePathname();
  const countedPathname = useRef(pathname);
  useEffect(() => {
    if (pathname === countedPathname.current) return;
    countedPathname.current = pathname;
    countPageChange();
  }, [pathname]);
  return null;
}
