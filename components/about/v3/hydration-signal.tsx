"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    flightPageHydrated?: boolean;
  }
}

/*
  Tells the flight's script (lib/flight/main.ts) that React has finished taking over the page. Until then a change the
  script makes to the page's elements is reported as a mismatch and may be thrown away, so the script waits for this.
  It renders nothing; a page without it (no script at all) is simply the column of words.
*/
export function HydrationSignal() {
  useEffect(() => {
    window.flightPageHydrated = true;
    window.dispatchEvent(new Event("flight-page-hydrated"));
  }, []);
  return null;
}
