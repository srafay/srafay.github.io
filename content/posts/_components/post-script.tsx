"use client";

import { useEffect } from "react";

/**
 * Runs a post's own script. The marker it renders is what the cosmos pages' reader looks for: the reader shows a
 * post's markup but none of its code, so it runs the named script itself. On the post's page, this component
 * loads the same script once the browser is idle, so the text renders and responds first and the script never
 * delays it. The script must be safe to run more than once: each run looks for parts it has not set up yet.
 */
export function PostScript({ src }: { src: string }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    const load = () => document.body.append(script);
    const waitForIdle =
      "requestIdleCallback" in window
        ? () => {
            const handle = requestIdleCallback(load, { timeout: 2500 });
            return () => cancelIdleCallback(handle);
          }
        : () => {
            const handle = setTimeout(load, 300);
            return () => clearTimeout(handle);
          };
    const cancel = waitForIdle();
    return () => {
      cancel();
      script.remove();
    };
  }, [src]);
  return <div hidden data-post-script={src} />;
}
