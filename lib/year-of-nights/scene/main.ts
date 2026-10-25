/*
  Version 2 of the About page, "A year of nights": the script that draws its sky (public/about-v2.js, built by
  scripts/build-about-scenes.ts). The page is whole without it. This takes over the drawing, the motion and the taps
  once it arrives, after the page's HTML. It waits for the faces, at most a moment, so the name never reflows in the
  middle of its intro.
*/
import { Sky } from "./sky";

const LONGEST_FONT_WAIT_MILLISECONDS = 2500;

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

declare global {
  interface Window {
    aboutSky?: {
      days: () => ReturnType<Sky["inspect"]>;
      where: () => ReturnType<Sky["where"]>;
    };
  }
}

async function startSky() {
  const root = document.querySelector<HTMLElement>("[data-sky-root]");
  if (!root || root.dataset.skyStarted) return;
  root.dataset.skyStarted = "true";
  await Promise.race([
    document.fonts?.ready,
    wait(LONGEST_FONT_WAIT_MILLISECONDS),
  ]);
  const sky = new Sky(root);
  sky.start();
  window.aboutSky = { days: () => sky.inspect(), where: () => sky.where() };
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", startSky, { once: true });
else void startSky();
