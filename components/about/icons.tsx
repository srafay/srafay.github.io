import type { ReactNode } from "react";

/*
  The About page's small line icons, drawn here as plain SVG so the page sends no script for them. Each is 16 units
  square, stroked in the text's own colour, and hidden from screen readers: the words beside it say the same.
*/
function LineIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="line-icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const StarIcon = () => (
  <LineIcon>
    <polygon points="8,1.4 9.62,6.38 14.85,6.38 10.62,9.45 12.23,14.43 8,11.35 3.77,14.43 5.38,9.45 1.15,6.38 6.38,6.38" />
  </LineIcon>
);

export const ForkIcon = () => (
  <LineIcon>
    <circle cx="4.5" cy="3" r="1.5" />
    <circle cx="11.5" cy="3" r="1.5" />
    <circle cx="8" cy="13" r="1.5" />
    <path d="M4.5 4.5V6a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V4.5M8 8v3.5" />
  </LineIcon>
);

export const BuildingIcon = () => (
  <LineIcon>
    <path d="M3 14.5v-12h7v12M10 6.5h3v8M1.5 14.5h13M5.5 5h2M5.5 8h2M5.5 11h2" />
  </LineIcon>
);

export const PlaceIcon = () => (
  <LineIcon>
    <path d="M8 14.5S3.5 10.3 3.5 6.8a4.5 4.5 0 0 1 9 0c0 3.5-4.5 7.7-4.5 7.7Z" />
    <circle cx="8" cy="6.8" r="1.6" />
  </LineIcon>
);

export const LinkIcon = () => (
  <LineIcon>
    <path d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1a2.5 2.5 0 0 1-3.5-3.5l1-1" />
  </LineIcon>
);
