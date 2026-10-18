"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

/*
  The cosmos behind a post, as seen from its planet, which is left out of the sky. The sky is drawn by the cosmos
  script in a frame of its own; the backdrop script (cosmos/src/backdrop/loader.js, built to /cosmos/backdrop.js) adds
  that frame once the page has loaded and the browser is idle, and passes on the page's scrolling and theme.
  A React page can come and go without a full page load, so it shows the sky when it mounts and takes it away after.
*/
type SkySettings = {
  planet: string;
  theme?: "dark" | "light";
  zIndex?: string;
  opacity?: string;
  size?: string;
  blur?: string;
};

declare global {
  interface Window {
    cosmosBackdrop?: { show(settings: SkySettings): () => void };
  }
}

// Behind everything on the page, a little dimmed and sharp. The post's words sit on a wash of their own (.post in
// globals.css).
const SKY_BEHIND_A_POST = { zIndex: "-1", opacity: "0.8", blur: "0" };

export function CosmosBackdrop({
  planet,
  scriptAddress,
}: {
  planet: string;
  scriptAddress: string;
}) {
  const [scriptReady, setScriptReady] = useState(false);
  useEffect(() => {
    if (!scriptReady) return;
    return window.cosmosBackdrop?.show({ planet, ...SKY_BEHIND_A_POST });
  }, [scriptReady, planet]);
  return (
    <Script
      src={scriptAddress}
      strategy="lazyOnload"
      onReady={() => setScriptReady(true)}
    />
  );
}
