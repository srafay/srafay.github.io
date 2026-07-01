import type { ReactNode } from "react";

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-signal bg-surface px-5 py-4 font-sans text-base">
      {children}
    </div>
  );
}
