/** Small line icons for the post, drawn on a 24 by 24 grid in the current text colour. */
export function LineIcon({
  name,
}: {
  name:
    | "sun"
    | "no-sun"
    | "pin"
    | "bell"
    | "calendar"
    | "moon"
    | "clock"
    | "info"
    | "pencil"
    | "arrow"
    | "mail"
    | "document"
    | "link"
    | "leaf"
    | "chevron-left"
    | "chevron-right"
    | "pause"
    | "play"
    | "ballot"
    | "sunrise"
    | "shield"
    | "walker"
    | "car"
    | "people"
    | "bolt";
}) {
  const strokes = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const rays =
    "M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6";
  return (
    <svg
      className={`dst-icon is-${name}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {name === "sun" && (
        <>
          <circle cx="12" cy="12" r="4.4" fill="currentColor" />
          <path d={rays} {...strokes} />
        </>
      )}
      {name === "no-sun" && (
        <>
          <circle cx="12" cy="12" r="4.4" {...strokes} />
          <path d={rays} {...strokes} />
          <path d="M4 20 20 4" {...strokes} />
        </>
      )}
      {name === "pin" && (
        <>
          <path
            d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"
            fill="currentColor"
          />
          <circle cx="12" cy="10" r="2.3" fill="var(--dst-explorer-card)" />
        </>
      )}
      {name === "bell" && (
        <path
          d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5a2 2 0 0 0 4 0"
          fill="currentColor"
        />
      )}
      {name === "calendar" && (
        <>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" {...strokes} />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" {...strokes} />
          <path
            d="M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01"
            {...strokes}
            strokeWidth={2.4}
          />
        </>
      )}
      {name === "clock" && (
        <>
          <circle cx="12" cy="12" r="8.5" {...strokes} />
          <path d="M12 7.5V12l3 2" {...strokes} />
        </>
      )}
      {name === "info" && (
        <>
          <circle cx="12" cy="12" r="9" fill="currentColor" />
          <path
            d="M12 11v5.5M12 7.6v.1"
            stroke="var(--dst-ground)"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </>
      )}
      {name === "pencil" && (
        <path
          d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5zM13.5 7l3 3"
          {...strokes}
        />
      )}
      {name === "arrow" && <path d="M5 12h14M13 6l6 6-6 6" {...strokes} />}
      {name === "mail" && (
        <>
          <rect x="3" y="5.5" width="18" height="13" rx="2" {...strokes} />
          <path d="M3.5 7l8.5 6 8.5-6" {...strokes} />
        </>
      )}
      {name === "document" && (
        <>
          <path d="M6 3h8l4 4v14H6z" {...strokes} />
          <path d="M14 3v4h4M9 12h6M9 15.5h6M9 9h2" {...strokes} />
        </>
      )}
      {name === "link" && (
        <path
          d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"
          {...strokes}
        />
      )}
      {name === "leaf" && (
        <>
          <path d="M5 21C9 15 13 9 20 3" {...strokes} />
          <path
            d="M9.5 15.5C6 15 4 12 4.5 8.5c3.5.2 5.8 2.6 5 7zM13.5 10.5c-2.6-1-3.6-4-2.2-7 3 .9 4.2 3.8 2.2 7zM15 9c.6-3 3.6-4.6 6.5-3.6-.8 3-3.6 4.4-6.5 3.6zM11 14c1-2.8 4-4.2 7-3-1.2 2.8-4.2 4-7 3z"
            fill="currentColor"
          />
        </>
      )}
      {name === "chevron-left" && (
        <path d="M14.5 5.5 8 12l6.5 6.5" {...strokes} strokeWidth={2.2} />
      )}
      {name === "chevron-right" && (
        <path d="M9.5 5.5 16 12l-6.5 6.5" {...strokes} strokeWidth={2.2} />
      )}
      {name === "pause" && (
        <path d="M8 5v14M16 5v14" {...strokes} strokeWidth={3} />
      )}
      {name === "play" && <path d="M7 4.5v15L19.5 12z" fill="currentColor" />}
      {name === "ballot" && (
        <>
          <path
            d="M3.5 11.5h17v9h-17zM3.5 11.5l2.5-3h2.5M20.5 11.5l-2.5-3h-2.5M9 14.5h6"
            {...strokes}
          />
          <path d="M9.2 9.8 11 3.5l5 1.4-1.6 4.9" {...strokes} />
        </>
      )}
      {name === "sunrise" && (
        <path
          d="M6.5 16a5.5 5.5 0 0 1 11 0M2.5 16h19M5 20h14M12 5.5v2.5M5.3 8.8l1.7 1.7M18.7 8.8 17 10.5M2.8 13h1.8M19.4 13h1.8"
          {...strokes}
        />
      )}
      {name === "shield" && (
        <path
          d="M12 3.2 19 6v5.3c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5V6z"
          {...strokes}
        />
      )}
      {name === "walker" && (
        <>
          <circle cx="9" cy="4.5" r="1.6" {...strokes} />
          <path
            d="M9 7.5 7.5 13l2.5 2.5V20M7.8 11.5 5 13.5M9 8.5l2.5 3H13M7.5 13 6 20"
            {...strokes}
          />
          <circle cx="15.5" cy="17.5" r="2.5" {...strokes} />
          <circle cx="21" cy="17.5" r="2.5" {...strokes} />
          <path d="M15.5 17.5 17.5 13h2l1.5 4.5M17.5 13l-1-1.5" {...strokes} />
        </>
      )}
      {name === "car" && (
        <>
          <path d="M4 16.5V12l2-5h12l2 5v4.5zM4 12h16" {...strokes} />
          <path d="M6 16.5V19M18 16.5V19" {...strokes} />
          <circle cx="7.5" cy="14.2" r="0.9" fill="currentColor" />
          <circle cx="16.5" cy="14.2" r="0.9" fill="currentColor" />
        </>
      )}
      {name === "people" && (
        <>
          <circle cx="9" cy="8" r="3" {...strokes} />
          <circle cx="17" cy="9.5" r="2.3" {...strokes} />
          <path
            d="M3.5 19.5a5.5 5.5 0 0 1 11 0M14.5 15.2a4.4 4.4 0 0 1 6.5 4.3"
            {...strokes}
          />
        </>
      )}
      {name === "bolt" && (
        <path
          d="M13.5 2.5 5.5 13.5h6l-1 8 8-11h-6z"
          fill="currentColor"
          stroke="none"
        />
      )}
      {name === "moon" && (
        <path
          d="M15.2 3.6a8.6 8.6 0 1 0 5.6 15.2A7.2 7.2 0 0 1 15.2 3.6z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

/** The drawings for each place a reader can share to, the same ones the post script uses. */
const shareDrawings: Record<string, React.ReactNode> = {
  X: (
    <>
      <path d="M4 4h4.6L20 20h-4.6z" fill="currentColor" stroke="none" />
      <path d="M20 4l-6.8 7.4M10.8 12.6 4 20" />
    </>
  ),
  Facebook: (
    <path d="M14.5 8H17V4.5h-2.5A3.5 3.5 0 0 0 11 8v2.5H8.5V14H11v6.5h3.5V14H17l.5-3.5h-3V8z" />
  ),
  WhatsApp: (
    <>
      <path d="M4 20l1.3-4A8 8 0 1 1 8.5 19z" />
      <path d="M9 9.5c.4 2 2.5 4.6 5.5 5.3l1.2-1.3-1.8-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-1.8z" />
    </>
  ),
  Bluesky: (
    <path d="M12 11c-1.5-3-5-6-7-6-1 0-1.5.8-1.5 2 0 2 .6 4.5 2.5 5.2-2.4.6-2.3 3.3-.5 4.3 2.3 1.3 4.5-.8 6.5-4.5 2 3.7 4.2 5.8 6.5 4.5 1.8-1 1.9-3.7-.5-4.3 1.9-.7 2.5-3.2 2.5-5.2 0-1.2-.5-2-1.5-2-2 0-5.5 3-7 6z" />
  ),
  Email: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </>
  ),
};

/** A small icon for one share link, or nothing for a place without a drawing. */
export function ShareIcon({ name }: { name: string }) {
  const drawing = shareDrawings[name];
  if (!drawing) return null;
  return (
    <svg
      className="dst-share-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {drawing}
    </svg>
  );
}
