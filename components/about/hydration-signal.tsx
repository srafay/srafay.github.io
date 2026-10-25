"use client";

import { useEffect } from "react";
import { announceHydration } from "@/lib/about/hydration";

/*
  Tells the About page's script (lib/about/script/) that React has finished taking over the page, so it may add to
  the page from then on (lib/about/hydration.ts). It renders nothing.
*/
export function HydrationSignal() {
  useEffect(announceHydration, []);
  return null;
}
