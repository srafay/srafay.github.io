"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const hops = [
  { name: "React", role: "the UI" },
  { name: "GraphQL", role: "the contract" },
  { name: "Lambda", role: "Python" },
  { name: "Postgres", role: "the truth" },
];

const DOT = 15; // px
const OUT = 1.6; // seconds for the request to reach the database
const BACK = 0.9; // seconds for the response to come home

// Each hop starts a column of four; dots sit at the start of each column.
const lastColumn = `${(100 * (hops.length - 1)) / hops.length}%`;
const trackStyle = { left: DOT / 2, width: lastColumn };

/**
 * A request travelling through the stack and back, drawn once on load.
 * "Send another request" replays it.
 */
export function RequestTrace() {
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);

  return (
    <div className="mt-12 max-w-3xl sm:mt-16">
      <div className="relative" key={run}>
        <div className="absolute top-[7px] h-px bg-border" style={trackStyle} />
        <motion.div
          className="absolute top-[6.5px] h-[2px] origin-left bg-signal"
          style={trackStyle}
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: OUT, ease: "easeInOut" }}
        />
        {!reduce && (
          <motion.div
            aria-hidden
            className="absolute top-[3px] size-[9px] -translate-x-1/2 rounded-full bg-foreground"
            initial={{ left: `calc(${lastColumn} + ${DOT / 2}px)`, opacity: 0 }}
            animate={{ left: `${DOT / 2}px`, opacity: [0, 1, 1, 0] }}
            transition={{ delay: OUT + 0.25, duration: BACK, ease: "easeInOut" }}
          />
        )}

        <ol className="relative grid grid-cols-4">
          {hops.map((hop, i) => (
            <li key={hop.name} className="flex flex-col items-start">
              <span
                aria-hidden
                className="relative grid size-[15px] place-items-center rounded-full border-2 border-signal bg-background"
              >
                <motion.span
                  className="size-full rounded-full bg-signal"
                  initial={reduce ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: (OUT * i) / (hops.length - 1),
                    type: "spring",
                    stiffness: 500,
                    damping: 18,
                  }}
                />
              </span>
              <span className="mt-3 text-sm font-semibold sm:text-base">{hop.name}</span>
              <span className="font-serif text-xs text-muted-foreground italic sm:text-sm">
                {hop.role}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {!reduce && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRun((n) => n + 1)}
          className="mt-6 -ml-2.5 text-muted-foreground"
        >
          <RotateCcw data-icon="inline-start" />
          Send another request
        </Button>
      )}
    </div>
  );
}
