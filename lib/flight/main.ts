/*
  Version 3 of the About page, "Flight": the script that flies the camera over the planet (public/about-v3.js, built
  by scripts/build-about-scenes.ts). The page is whole without it: a column of words on the night. This takes over the
  stage once it arrives, after the page's HTML; where WebGL 2 is missing it leaves the words as they are.

  window.aboutFlight is for the checks that fly the page in a test browser: goTo(position) scrolls to a place in the
  flight (1 is Karachi, 1.5 halfway to Darwin), state() says where the flight is and what has loaded.
*/
import { Flight } from "./flight";
import { startNightMapDownload } from "./maps";

declare global {
  interface Window {
    aboutFlight?: {
      goTo: (position: number) => void;
      state: () => ReturnType<Flight["state"]>;
      cities: () => ReturnType<Flight["cityPlaces"]>;
    };
  }
}

function elementsOn(root: HTMLElement) {
  const track = root.querySelector<HTMLElement>("[data-flight-track]");
  const stage = root.querySelector<HTMLElement>("[data-flight-stage]");
  const standIn = root.querySelector<HTMLElement>("[data-flight-stand-in]");
  const canvas = root.querySelector<HTMLCanvasElement>("[data-flight-canvas]");
  return track && stage && standIn && canvas
    ? { root, track, stage, standIn, canvas }
    : null;
}

function startFlight() {
  const root = document.querySelector<HTMLElement>("[data-flight-root]");
  if (!root || root.dataset.flightState) return;
  const elements = elementsOn(root);
  if (!elements) return;
  let flight: Flight;
  try {
    flight = new Flight(elements);
  } catch {
    // No WebGL 2 here: the words stay as they are.
    return;
  }
  flight.start();
  window.aboutFlight = {
    goTo: (position) => flight.goTo(position),
    state: () => flight.state(),
    cities: () => flight.cityPlaces(),
  };
}

/** Longest wait for React, after the page has loaded: a page whose own scripts failed still gets its planet. */
const LONGEST_HYDRATION_WAIT_MILLISECONDS = 6000;

/*
  The page is React's until it has hydrated, and a change made to it before then is reported as a mismatch and may be
  thrown away, so the flight takes the stage once components/about/v3/hydration-signal.tsx says React is done. The
  night map is asked for at once, so it is on its way meanwhile.
*/
startNightMapDownload();
if (window.flightPageHydrated) startFlight();
else addEventListener("flight-page-hydrated", startFlight, { once: true });
const startAnyway = () =>
  setTimeout(startFlight, LONGEST_HYDRATION_WAIT_MILLISECONDS);
if (document.readyState === "complete") startAnyway();
else addEventListener("load", startAnyway, { once: true });
