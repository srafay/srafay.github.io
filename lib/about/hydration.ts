/*
  How the About page tells its script that React has taken over the page (components/about/hydration-signal.tsx).
  Until then a change the script makes to the page is reported as a mismatch and may be thrown away, so the script
  (lib/about/script/hydration.ts) waits for this before it writes anything.
*/
export const HYDRATED_EVENT = "about-page-hydrated";

declare global {
  interface Window {
    aboutPageHydrated?: boolean;
  }
}

export function announceHydration() {
  window.aboutPageHydrated = true;
  window.dispatchEvent(new Event(HYDRATED_EVENT));
}
