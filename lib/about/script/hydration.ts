import { HYDRATED_EVENT } from "@/lib/about/hydration";

/** Longest wait for React after the page has loaded: a page whose own scripts failed still answers a touch. */
const LONGEST_WAIT_AFTER_LOAD_MILLISECONDS = 4000;

/**
 * Runs once React has taken over the page (components/about/hydration-signal.tsx). Before then a change made to the
 * page may be thrown away, so everything that writes to it starts here.
 */
export function whenPageIsHydrated(start: () => void) {
  let started = false;
  const startOnce = () => {
    if (started) return;
    started = true;
    start();
  };
  if (window.aboutPageHydrated) return startOnce();
  addEventListener(HYDRATED_EVENT, startOnce, { once: true });
  const startAnyway = () =>
    setTimeout(startOnce, LONGEST_WAIT_AFTER_LOAD_MILLISECONDS);
  if (document.readyState === "complete") startAnyway();
  else addEventListener("load", startAnyway, { once: true });
}
