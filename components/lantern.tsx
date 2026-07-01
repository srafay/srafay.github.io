"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * Text that sits in the dark until a lantern passes over it. On load the light
 * drifts across once and settles; after that it follows the pointer.
 */
export function Lantern({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;

    const place = (x: number, y: number) => {
      el.style.setProperty("--lx", `${x}px`);
      el.style.setProperty("--ly", `${y}px`);
    };

    const { width, height } = el.getBoundingClientRect();
    const drift = animate(0, 1, {
      duration: 2.6,
      ease: [0.45, 0, 0.2, 1],
      onUpdate: (t) => place(width * (-0.15 + 0.47 * t), height * (0.55 - 0.2 * Math.sin(t * Math.PI))),
    });

    const follow = (e: PointerEvent) => {
      drift.stop();
      const box = el.getBoundingClientRect();
      place(e.clientX - box.left, e.clientY - box.top);
    };
    window.addEventListener("pointermove", follow);
    return () => {
      drift.stop();
      window.removeEventListener("pointermove", follow);
    };
  }, [reduce]);

  return (
    <span ref={ref} className="lantern relative block">
      <span className={reduce ? undefined : "text-foreground/25"}>{children}</span>
      {!reduce && (
        <span aria-hidden className="lantern-lit absolute inset-0 text-foreground">
          {children}
        </span>
      )}
    </span>
  );
}
