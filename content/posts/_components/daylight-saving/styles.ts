/*
  The daylight saving post's own styles. They travel inside the post body, because the homepage's reader copies only
  that body into its panel: a stylesheet anywhere else would be left behind.

  The post page and the reader name their colours differently (globals.css against cosmos.css), so each colour here
  takes the post page's token first and falls back to the reader's.

  Motion comes in two kinds. Loops (the clock, the sliding ruler, the deck's art) run on CSS alone. Reveals wait for
  the post's script: it adds .is-enhanced to the post and .is-seen to each figure as it scrolls into view. Without
  the script, every figure simply shows its final state.
*/

/** The mood check's answers. Each needs its own rule, so the reply for the ticked answer shows. */
const moodIds = ["dst-quick", "dst-full"].flatMap((prefix) =>
  ["fine", "off", "wrecked"].map((mood) => `${prefix}-mood-${mood}`),
);
const moodReplyRules = moodIds
  .map(
    (id) =>
      `.dst-mood:has(#${id}:checked) [data-mood="${id}"] { display: block; animation: dst-rise 0.5s both; }`,
  )
  .join("\n");

/** The calendar's sky icons: a moon, a sun on the horizon, and a full sun. Inline SVG, so nothing extra loads. */
const skyIcon = (drawing: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${drawing}</svg>`)}")`;
const moonIcon = skyIcon(
  '<path d="M15.2 3.6a8.6 8.6 0 1 0 5.6 15.2A7.2 7.2 0 0 1 15.2 3.6z" fill="#f6efdc"/>',
);
const horizonSunIcon = skyIcon(
  '<path d="M5.5 17a6.5 6.5 0 0 1 13 0z" fill="#c4572b"/><path d="M2.5 17.5h19" stroke="#8c3a1c" stroke-width="1.6" stroke-linecap="round"/><path d="M12 5.2v2.6M5.4 8.4l1.7 1.8M18.6 8.4l-1.7 1.8" stroke="#c4572b" stroke-width="1.6" stroke-linecap="round"/>',
);
const sunIcon = skyIcon(
  '<circle cx="12" cy="12" r="4.6" fill="#e0861a"/><g stroke="#e0861a" stroke-width="1.7" stroke-linecap="round"><path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.4 5.4l1.6 1.6M17 17l1.6 1.6M5.4 18.6 7 17M17 7l1.6-1.6"/></g>',
);

export const daylightSavingStyles = `
@property --dst-hour { syntax: "<integer>"; inherits: false; initial-value: 3; }
@property --dst-minute { syntax: "<integer>"; inherits: false; initial-value: 0; }

.dst {
  --dst-ink: var(--foreground, var(--ink));
  --dst-dim: var(--muted-foreground, var(--dim));
  --dst-rule: var(--border, var(--rule));
  --dst-ground: var(--background, var(--ground));
  --dst-accent: var(--signal, var(--accent));
  --dst-warm: var(--red, #b4441f);
  --dst-display: var(--face-display, var(--display));
  --dst-text: var(--face-text, var(--text));
  --dst-panel: color-mix(in oklab, var(--dst-ground) 72%, var(--dst-rule));
  --dst-cream: #ece6dc;
  --dst-card: #141d29;
  --dst-card-line: rgba(236, 230, 220, 0.12);
  --dst-waves: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200' fill='none' stroke='%239de6c4' stroke-opacity='.16'%3E%3Cpath d='M0 200C120 190 200 120 400 40'/%3E%3Cpath d='M20 200C140 186 220 126 400 56'/%3E%3Cpath d='M40 200C160 182 240 132 400 72'/%3E%3Cpath d='M60 200C180 178 260 138 400 88'/%3E%3Cpath d='M80 200C200 174 280 144 400 104'/%3E%3Cpath d='M100 200C220 170 300 150 400 120'/%3E%3Cpath d='M120 200C240 166 320 156 400 136'/%3E%3C/svg%3E");
  --dst-card-dim: #948b80;
  --dst-card-accent: #9de6c4;
  --dst-card-warm: #ffb991;
  --dst-grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  --dst-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
:root[data-theme="dark"] .dst { --dst-warm: var(--red, #ffd2a8); }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .dst { --dst-warm: var(--red, #ffd2a8); }
}

@keyframes dst-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes dst-pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: none; } }
@keyframes dst-blink { 50% { opacity: 0.25; } }
@keyframes dst-scrawl { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }

/* ---------- The hero: a clock reading that skips an hour ----------
  The reading counts 1:59:57, :58, :59, then lands on 3:00:00 and rests there. Under it, the night as a ruler, with
  the skipped hour hatched out and a playhead that jumps the gap. */
@property --dst-second { syntax: "<integer>"; inherits: false; initial-value: 0; }
.dst-hero { display: grid; gap: 16px; margin-bottom: 1.8rem; }
.dst-panel, .dst-hero-card, .dst-you-card { border: 1px solid var(--dst-rule); border-radius: 18px; background: color-mix(in oklab, var(--dst-ground) 88%, white); }
:root[data-theme="dark"] .dst-hero-card, :root[data-theme="dark"] .dst-you-card { background: color-mix(in oklab, var(--dst-ground) 92%, var(--dst-ink)); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .dst-hero-card, :root:not([data-theme="light"]) .dst-you-card { background: color-mix(in oklab, var(--dst-ground) 92%, var(--dst-ink)); } }
.dst-hero-card { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 20px 32px; padding: 20px 22px; }
.dst-hero-reading-block { display: flex; align-items: flex-start; gap: 14px; }
.dst-hero-label { color: var(--dst-dim); font: 600 0.7rem/1.2 var(--dst-text); letter-spacing: 0.16em; text-transform: uppercase; }
.dst-hero-ruler-block { display: grid; justify-items: start; gap: 12px; min-width: 0; }
.dst-hero-ruler-block .dst-night { width: 100%; }
.dst-hero-ruler-block .dst-night-gap span { display: none; } /* the pill above already says it */
.dst-badge { display: grid; place-items: center; flex: none; width: 42px; height: 42px; border-radius: 50%; background: color-mix(in oklab, var(--dst-rule) 75%, var(--dst-ground)); color: var(--dst-ink); }
.dst-badge .dst-icon { width: 22px; height: 22px; }
.dst-badge.is-small { width: 30px; height: 30px; }
.dst-badge.is-small .dst-icon { width: 17px; height: 17px; }
.dst-skip-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: color-mix(in oklab, var(--dst-warm) 14%, var(--dst-ground)); color: var(--dst-warm); font: 700 0.72rem/1 var(--dst-text); letter-spacing: 0.14em; text-transform: uppercase; }
.dst-skip-pill .dst-icon { width: 15px; height: 15px; }
.dst-hero-kicker { color: var(--dst-dim); font: 600 0.72rem/1.2 var(--dst-text); letter-spacing: 0.16em; text-transform: uppercase; }
.dst-hero-time { display: flex; align-items: baseline; gap: 8px; margin-top: 4px; font: 500 clamp(2.6rem, 9vw, 3.8rem)/0.95 var(--dst-display); font-variant-numeric: tabular-nums lining-nums; letter-spacing: -0.02em; }
.dst-hero-reading::after {
  counter-reset: dst-hour var(--dst-hour) dst-minute var(--dst-minute) dst-second var(--dst-second);
  content: counter(dst-hour) ":" counter(dst-minute, decimal-leading-zero) ":" counter(dst-second, decimal-leading-zero);
  animation: dst-reading 7s infinite;
}
.dst-hero-suffix { font-size: 0.32em; color: var(--dst-dim); letter-spacing: 0.04em; }
@keyframes dst-reading {
  0%, 13.9% { --dst-hour: 1; --dst-minute: 59; --dst-second: 57; color: var(--dst-ink); }
  14%, 27.9% { --dst-hour: 1; --dst-minute: 59; --dst-second: 58; }
  28%, 41.9% { --dst-hour: 1; --dst-minute: 59; --dst-second: 59; color: var(--dst-ink); }
  42% { --dst-hour: 3; --dst-minute: 0; --dst-second: 0; color: var(--dst-warm); }
  60%, 100% { --dst-hour: 3; --dst-minute: 0; --dst-second: 0; color: var(--dst-ink); }
}
.dst-hero-line { font-size: 1.15rem; line-height: 1.55; max-width: 38ch; }

.dst-night { --dst-night-ink: var(--dst-ink); --dst-night-dim: var(--dst-dim); --dst-night-warm: var(--dst-warm); }
.dst-night-track { position: relative; height: 34px; border-top: 1px solid var(--dst-night-dim); border-bottom: 1px solid var(--dst-night-dim); background: repeating-linear-gradient(90deg, var(--dst-night-dim) 0 1px, transparent 1px calc(100% / 6)); background-size: calc(100% + 1px) 6px; background-repeat: no-repeat; background-position: 0 100%; }
.dst-night-gap {
  position: absolute;
  top: -1px;
  bottom: -1px;
  left: calc(100% / 3);
  width: calc(100% / 6);
  display: grid;
  place-items: center;
  border-inline: 1px solid var(--dst-night-warm);
  background: repeating-linear-gradient(-45deg, color-mix(in oklab, var(--dst-night-warm) 55%, transparent) 0 1px, transparent 1px 6px);
  color: var(--dst-night-warm);
  font: 600 0.62rem/1 var(--dst-text);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.dst-night-gap span { padding: 2px 5px; background: var(--dst-ground); }
.dst-night-playhead { position: absolute; top: -6px; bottom: -6px; left: calc(100% / 6); width: 2px; margin-left: -1px; background: var(--dst-night-ink); animation: dst-playhead 7s infinite; }
@keyframes dst-playhead {
  0% { left: calc(100% / 6); }
  41.9% { left: calc(100% / 3); }
  42%, 100% { left: 50%; }
}
.dst-night-hours { display: flex; justify-content: space-between; margin-top: 6px; color: var(--dst-night-dim); font: 0.72rem/1 var(--dst-text); font-variant-numeric: tabular-nums; }
.dst-night-hours span { width: 0; display: flex; justify-content: center; white-space: nowrap; }
.dst-night-hours span:first-child { justify-content: flex-start; }
.dst-night-hours span:last-child { justify-content: flex-end; }

/* ---------- Your clock: the reader's own time, from their browser's time zone ---------- */
.dst-you { margin-bottom: 1.8rem; font-family: var(--dst-text); }
.dst-you-card { padding: 18px 22px 20px; }
.dst-you-kicker { display: flex; align-items: center; gap: 10px; color: var(--dst-dim); font: 600 0.72rem/1.2 var(--dst-text); letter-spacing: 0.16em; text-transform: uppercase; }
.dst-you-readings { display: none; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
.dst-you.is-live .dst-you-readings { display: grid; }
.dst-you.is-live:not(.is-saving) .dst-you-readings > div + div { display: none; }
.dst-you-readings > div + div { padding-left: 20px; border-left: 1px solid var(--dst-rule); }
.dst-you-label { color: var(--dst-dim); font-size: 0.78rem; }
.dst-you-time { margin-top: 4px; font: 400 clamp(2.2rem, 8vw, 3.2rem)/1 var(--dst-display); font-variant-numeric: tabular-nums lining-nums; letter-spacing: -0.01em; }
.dst-you-time.is-standard { color: var(--dst-accent); }
.dst-you-line { margin-top: 12px; font-size: 1.02rem; line-height: 1.55; max-width: 46ch; }
.dst-you-info { display: flex; align-items: flex-start; gap: 14px; margin-top: 12px; padding: 16px 20px; border: 1px solid color-mix(in oklab, var(--dst-accent) 18%, var(--dst-rule)); border-radius: 16px; background: color-mix(in oklab, var(--dst-accent) 7%, var(--dst-ground)); }
.dst-you-info > .dst-icon { width: 26px; height: 26px; margin-top: 1px; color: color-mix(in oklab, var(--dst-ink) 65%, var(--dst-ground)); }
.dst-you-info:has(.dst-you-facts:empty) { display: none; }
.dst-you-facts { flex: 1; min-width: 0; margin: 0; padding-left: 1.1em; list-style: disc; color: color-mix(in oklab, var(--dst-ink) 82%, var(--dst-ground)); font-size: 0.92rem; line-height: 1.5; }
.dst-you-facts li::marker { color: var(--dst-accent); }
.dst-you-facts li + li { margin-top: 6px; }
.dst-you-facts:empty { display: none; }
.dst-you .dst-share-links:empty { display: none; }

/* ---------- The bar: quick or full, the petition, and how far you have read ---------- */
.dst-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  margin-inline: -20px;
  padding: 10px 20px;
  background: color-mix(in oklab, var(--dst-ground) 88%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--dst-rule);
  font-family: var(--dst-text);
}
.dst-progress { display: none; }
@supports (animation-timeline: scroll()) {
  .dst-progress {
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background: var(--dst-accent);
    transform-origin: left;
    animation: dst-progress linear both;
    animation-timeline: scroll(nearest block);
  }
  @keyframes dst-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
}
.dst-switch {
  position: relative;
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--dst-rule);
  border-radius: 999px;
}
.dst-switch input, .dst-mood input, .dst-ballot input, .dst-cannon input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.dst-switch label {
  padding: 6px 14px;
  border-radius: 999px;
  color: var(--dst-dim);
  font-size: 0.9rem;
  line-height: 1.2;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: background 0.25s, color 0.25s;
}
.dst-switch label span { opacity: 0.7; font-variant-numeric: tabular-nums; }
.dst-switch input:checked + label { background: var(--dst-accent); color: var(--dst-ground); }
.dst-switch input:focus-visible + label,
.dst-mood input:focus-visible + label,
.dst-ballot input:focus-visible + label { outline: 2px solid var(--dst-accent); outline-offset: 2px; }
.dst:has(#dst-full:checked) .dst-short-only { display: none; }
.dst:has(#dst-short:checked) .dst-full-only { display: none; }
.dst-inline-switch { color: var(--dst-accent); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }

.dst-button {
  display: inline-block;
  padding: 9px 18px;
  border-radius: 999px;
  background: var(--dst-accent);
  --dst-button-text: var(--dst-ground);
  color: var(--dst-button-text);
  font: 600 0.9rem/1.2 var(--dst-text);
  text-decoration: none !important;
  white-space: nowrap;
  transition: transform 0.2s var(--dst-ease), filter 0.2s;
}
.dst-button:hover { transform: translateY(-1px); filter: brightness(1.08); }
.dst a.dst-button:hover, .dst a.dst-button:focus-visible { color: var(--dst-button-text); }
.dst-button.has-icons { display: inline-flex; align-items: center; gap: 10px; padding: 12px 22px; font-size: 0.98rem; }
.dst-button.has-icons .dst-icon { width: 18px; height: 18px; }
.dst-button.has-icons .dst-icon.is-arrow { transition: translate 0.2s var(--dst-ease); }
.dst-button.has-icons:hover .dst-icon.is-arrow { translate: 3px 0; }
.dst-button.is-waiting { background: none; --dst-button-text: var(--dst-dim); border: 1px dashed var(--dst-rule); cursor: default; transform: none; }
.dst-button.is-quiet { background: none; --dst-button-text: var(--dst-ink); border: 1px solid var(--dst-rule); }
.dst-button.is-light { background: var(--dst-cream); --dst-button-text: #1b1d22; }

/* ---------- The deck: one minute, played like a story ----------
  The next card peeks in from the right, so it is plain there is more. The deck nudges left twice when the page
  opens, and a hint says how to move it, until the reader first does. */
.dst-deck { margin-top: 1.4rem; font-family: var(--dst-text); }
.dst-deck-head { display: flex; align-items: center; gap: 12px; color: var(--dst-dim); }
.dst-deck-progress { flex: 1; display: flex; gap: 4px; }
.dst-deck-progress span { flex: 1; height: 3px; border-radius: 2px; background: color-mix(in oklab, var(--dst-ink) 16%, transparent); overflow: hidden; }
.dst-deck-progress i { display: block; height: 100%; width: var(--fill, 0%); background: var(--dst-accent); }
.dst-deck-progress span:first-child i { width: var(--fill, 100%); }
.dst-deck-count { min-width: 3.4em; text-align: right; font: 600 0.8rem/1 var(--dst-text); font-variant-numeric: tabular-nums; }
.dst-deck-pause { display: none; }
.is-enhanced .dst-deck-pause {
  display: block;
  padding: 5px 10px;
  border: 1px solid var(--dst-rule);
  border-radius: 999px;
  background: none;
  color: var(--dst-ink);
  font: 600 0.7rem/1 var(--dst-text);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.dst-deck-pause span { display: inline-flex; align-items: center; gap: 5px; }
.dst-deck-pause .dst-icon { width: 11px; height: 11px; }
.dst-deck-pause .is-play, .dst-deck.is-paused .dst-deck-pause .is-pause { display: none; }
.dst-deck.is-paused .dst-deck-pause .is-play { display: inline-flex; }
.dst-deck-stage { position: relative; margin-top: 12px; margin-right: -20px; color: var(--dst-cream); }
.dst-deck-track {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  padding-bottom: 22px;
  outline: none;
}
.dst-deck-track::-webkit-scrollbar { display: none; }
.dst-deck-track::after { content: ""; flex: 0 0 46px; }
.dst-deck-track:focus-visible .dst-card.is-current { outline: 2px solid var(--dst-accent); outline-offset: 3px; }
@media (hover: hover) and (pointer: fine) {
  .is-enhanced .dst-deck-track { cursor: grab; }
  .is-enhanced .dst-deck-track.is-dragging { cursor: grabbing; scroll-snap-type: none; user-select: none; }
}
.dst-card {
  background: var(--dst-waves) right bottom / 75% auto no-repeat, var(--dst-grain), var(--dst-card);
  border: 1px solid var(--dst-card-line);
  position: relative;
  flex: 0 0 calc(100% - 56px);
  scroll-snap-align: start;
  scroll-snap-stop: always;
  min-height: min(72vh, 600px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 30px 26px 26px;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 24px 50px -30px rgba(0, 0, 0, 0.7);
  transition: opacity 0.4s, transform 0.4s var(--dst-ease);
}
.is-enhanced .dst-card:not(.is-current) { opacity: 0.6; transform: scale(0.97); }
.dst-deck:not(.has-moved) .dst-card { animation: dst-nudge 1.5s 1.4s ease-in-out 2; }
@keyframes dst-nudge { 0%, 60%, 100% { translate: 0; } 30% { translate: -38px; } }
.dst-card-kicker { color: var(--dst-card-accent); font: 600 0.72rem/1.2 var(--dst-text); letter-spacing: 0.18em; text-transform: uppercase; }
.dst-card-art { flex: 1; display: grid; place-items: center; min-height: 150px; }
.dst-card-headline { padding-top: 14px; border-top: 1px solid var(--dst-card-line); font: 400 clamp(2.6rem, 9vw, 4.4rem)/1 var(--dst-display); letter-spacing: -0.02em; font-variant-numeric: lining-nums; text-wrap: balance; }
.dst-card-line { color: color-mix(in oklab, var(--dst-cream) 82%, var(--dst-card)); font-size: 1.05rem; line-height: 1.55; max-width: 34ch; }
.dst .dst-card-more { color: var(--dst-card-accent); font-size: 0.88rem; width: fit-content; text-decoration-color: color-mix(in oklab, var(--dst-card-accent) 40%, transparent); }
.dst-card-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
.dst-card.is-current .dst-card-kicker { animation: dst-rise 0.6s both; }
.dst-card.is-current .dst-card-art { animation: dst-pop 0.8s 0.1s var(--dst-ease) both; }
.dst-card.is-current .dst-card-headline { animation: dst-rise 0.7s 0.25s var(--dst-ease) both; }
.dst-card.is-current .dst-card-line { animation: dst-rise 0.7s 0.45s var(--dst-ease) both; }
.dst-swipe-hint {
  position: absolute;
  z-index: 3;
  top: 46%;
  right: 70px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid rgba(236, 230, 220, 0.55);
  background: rgba(20, 29, 41, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font: 600 0.8rem/1 var(--dst-text);
  pointer-events: none;
  transition: opacity 0.4s, transform 0.4s var(--dst-ease);
}
.dst-swipe-hint i { position: relative; width: 22px; height: 2px; background: currentColor; animation: dst-point 1.2s ease-in-out infinite; }
.dst-swipe-hint i::after { content: ""; position: absolute; right: -1px; top: -4px; width: 8px; height: 8px; border: solid currentColor; border-width: 2px 2px 0 0; transform: rotate(45deg); }
@keyframes dst-point { 0%, 100% { translate: -4px 0; } 50% { translate: 4px 0; } }
.dst-swipe-hint .is-mouse { display: none; }
@media (hover: hover) and (pointer: fine) {
  .dst-swipe-hint .is-touch { display: none; }
  .dst-swipe-hint .is-mouse { display: inline; }
}
.dst-deck.has-moved .dst-swipe-hint { opacity: 0; transform: translateX(14px); }
.dst-deck-step { display: none; }
.is-enhanced .dst-deck-step {
  display: grid;
  place-items: center;
  position: absolute;
  z-index: 3;
  top: calc(50% - 32px);
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  border: 1px solid rgba(236, 230, 220, 0.28);
  background: rgba(14, 20, 30, 0.6);
  color: var(--dst-cream);
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: opacity 0.3s, background 0.2s;
}
.dst-deck-step.is-back { left: 10px; }
.dst-deck-step.is-next { right: 8px; }
.dst-deck-step:hover { background: rgba(14, 20, 30, 0.85); }
.dst-deck-step .dst-icon { width: 20px; height: 20px; }
.dst-deck-step:disabled { opacity: 0; pointer-events: none; }
@media (hover: none) { .is-enhanced .dst-deck-step { display: none; } }
.dst-deck-hint { margin-top: 4px; color: var(--dst-dim); font-size: 0.95rem; text-align: center; }

/* The cards' pictures: small, exact drawings of each card's number, in hairlines. */
.dst-art { width: min(100%, 300px); color: var(--dst-cream); font-family: var(--dst-text); }
.dst-card .dst-night { width: min(100%, 300px); --dst-night-ink: var(--dst-cream); --dst-night-dim: var(--dst-card-dim); --dst-night-warm: var(--dst-card-warm); }
.dst-card .dst-night-gap span { background: var(--dst-card); }
.dst-art-bars { display: flex; align-items: flex-end; justify-content: center; gap: 36px; height: 170px; }
.dst-art-bar { display: grid; grid-template-rows: auto 1fr auto; justify-items: center; gap: 8px; height: 100%; width: 96px; }
.dst-art-bar b { font: 400 1.6rem/1 var(--dst-display); font-variant-numeric: lining-nums; }
.dst-art-bar i { align-self: end; width: 46px; border: 1px solid var(--dst-card-dim); border-bottom: 0; background: repeating-linear-gradient(-45deg, rgba(236, 230, 220, 0.14) 0 1px, transparent 1px 5px); transform-origin: bottom; }
.dst-art-bar.is-worse i { border-color: var(--dst-card-warm); background: color-mix(in oklab, var(--dst-card-warm) 85%, transparent); }
.dst-art-bar.is-better i { border-color: var(--dst-card-accent); background: color-mix(in oklab, var(--dst-card-accent) 85%, transparent); }
.dst-art-bar.is-worse b { color: var(--dst-card-warm); }
.dst-art-bar.is-better b { color: var(--dst-card-accent); }
.dst-art-bar small { color: var(--dst-card-dim); font-size: 0.72rem; text-align: center; line-height: 1.3; }
.dst-card.is-current .dst-art-bar i { animation: dst-grow 0.9s var(--dst-ease) both; }
.dst-card.is-current .dst-art-bar + .dst-art-bar i { animation-delay: 0.35s; }
@keyframes dst-grow { from { transform: scaleY(0); } to { transform: none; } }
.dst-art-years { list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); padding: 0; margin: 0; border-top: 1px solid var(--dst-card-dim); }
.dst-art-years li { position: relative; display: grid; gap: 6px; padding-top: 16px; }
.dst-art-years li::before { content: ""; position: absolute; top: -5px; left: 0; width: 9px; height: 9px; border-radius: 50%; background: var(--dst-card); border: 1px solid var(--dst-cream); }
.dst-art-years li:first-child::before { background: var(--dst-card-accent); border-color: var(--dst-card-accent); }
.dst-art-years b { font: 400 1.5rem/1 var(--dst-display); font-variant-numeric: lining-nums; }
.dst-art-years small { color: var(--dst-card-dim); font-size: 0.72rem; line-height: 1.3; }
.dst-card.is-current .dst-art-years li { animation: dst-rise 0.6s var(--dst-ease) both; }
.dst-card.is-current .dst-art-years li:nth-child(2) { animation-delay: 0.25s; }
.dst-card.is-current .dst-art-years li:nth-child(3) { animation-delay: 0.5s; }
.dst-art-tally { display: flex; justify-content: center; gap: 44px; }
.dst-art-tally > span { display: grid; justify-items: center; gap: 10px; }
.dst-tally-boxes { display: flex; gap: 6px; height: 44px; align-items: flex-end; }
.dst-art-tally i { width: 22px; height: 44px; border: 1px solid var(--dst-card-accent); background: color-mix(in oklab, var(--dst-card-accent) 80%, transparent); }
.dst-card.is-current .dst-art-tally i { animation: dst-grow 0.5s var(--dst-ease) both; }
.dst-art-tally .is-empty i { background: none; border: 1px dashed var(--dst-card-dim); }
.dst-art-tally small { color: var(--dst-card-dim); font-size: 0.72rem; }
.dst-art-error { width: min(100%, 300px); overflow: visible; }
.dst-art-error text { fill: var(--dst-card-dim); font: 11px var(--dst-text); }
.dst-art-zero { stroke: var(--dst-card-dim); stroke-dasharray: 2 3; }
.dst-art-whisker { stroke: var(--dst-cream); stroke-width: 1.5; }
.dst-art-point { fill: var(--dst-card-accent); }
.dst-card.is-current .dst-art-whisker { animation: dst-fade 0.8s 0.3s both; }
@keyframes dst-fade { from { opacity: 0; } to { opacity: 1; } }
.dst-art-noon { width: min(100%, 300px); }
.dst-noon-track { position: relative; height: 34px; border-bottom: 1px solid var(--dst-card-dim); background: repeating-linear-gradient(90deg, var(--dst-card-dim) 0 1px, transparent 1px 50%) 0 100% / calc(100% + 1px) 8px no-repeat; }
.dst-noon-sun { position: absolute; bottom: -9px; left: 53%; width: 18px; height: 18px; margin-left: -9px; border-radius: 50%; background: var(--dst-card-warm); box-shadow: 0 0 0 6px color-mix(in oklab, var(--dst-card-warm) 22%, transparent); }
.dst-card.is-current .dst-noon-sun { animation: dst-to-noon 1.4s 0.3s var(--dst-ease) both; }
@keyframes dst-to-noon { from { left: 3%; } to { left: 53%; } }
.dst-noon-hours { display: flex; justify-content: space-between; margin-top: 12px; color: var(--dst-card-dim); font-size: 0.72rem; }
.dst-art-share { width: 140px; transform: rotate(-90deg); }
.dst-share-track { fill: none; stroke: var(--dst-card-line); stroke-width: 2; }
.dst-share-fill { fill: none; stroke: var(--dst-card-accent); stroke-width: 2; stroke-dasharray: 100; stroke-dashoffset: 37; }
.dst-card.is-current .dst-share-fill { animation: dst-share 1.6s 0.3s var(--dst-ease) both; }
@keyframes dst-share { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 37; } }
.dst-art-sign { display: grid; place-items: center; }
.dst-sign-plate { display: grid; gap: 6px; padding: 16px 26px; border: 1px solid var(--dst-cream); border-radius: 4px; text-align: center; font: 600 0.95rem/1.2 var(--dst-text); letter-spacing: 0.04em; }
.dst-sign-plate small { color: var(--dst-card-dim); font-size: 0.64rem; letter-spacing: 0.16em; text-transform: uppercase; }
.dst-sign-plate b { display: block; font: 400 1.8rem/1 var(--dst-display); }
.dst-art-twice { position: relative; font: 400 4.4rem/1 var(--dst-display); font-variant-numeric: lining-nums; }
.dst-art-twice .is-gone { position: relative; color: var(--dst-card-dim); }
.dst-art-twice .is-gone::after { content: ""; position: absolute; left: -6px; right: -6px; top: 54%; height: 2px; background: var(--dst-card-warm); transform-origin: left; animation: dst-strike 2.6s ease-in-out infinite; }
.dst-art-twice .is-double { position: absolute; left: 0; top: 0; color: transparent; -webkit-text-stroke: 1px var(--dst-card-accent); animation: dst-echo 2.6s ease-in-out infinite; }
@keyframes dst-strike { 0%, 15% { transform: scaleX(0); } 45%, 100% { transform: scaleX(1); } }
@keyframes dst-echo { 0%, 50% { transform: none; opacity: 0; } 70%, 100% { transform: translate(16px, 12px); opacity: 1; } }
.dst-art-ballot { display: flex; gap: 26px; justify-content: center; font: 600 1rem var(--dst-text); }
.dst-art-ballot span { display: flex; align-items: center; gap: 10px; }
.dst-art-ballot i { width: 30px; height: 30px; border: 1px solid var(--dst-cream); }
.dst-card .dst-button { background: var(--dst-card-accent); --dst-button-text: var(--dst-card); }
.dst-card .dst-button.is-light { background: none; --dst-button-text: var(--dst-cream); border: 1px solid var(--dst-card-line); }
.dst-card .dst-button.is-waiting { background: none; --dst-button-text: var(--dst-cream); border-color: var(--dst-card-line); }

/* ---------- Sections ---------- */
.dst-section { margin-top: 4.5rem; scroll-margin-top: 72px; }
.dst-section-end { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 2.4rem; color: var(--dst-accent); }
.dst-section-end::before, .dst-section-end::after { content: ""; width: 90px; height: 1px; background: var(--dst-rule); }
.dst-section-end .dst-icon { width: 18px; height: 18px; opacity: 0.7; }
.dst-kicker { display: flex; align-items: center; gap: 16px; color: var(--dst-accent); font: 600 0.75rem/1 var(--dst-text); letter-spacing: 0.16em; text-transform: uppercase; }
.dst-kicker::after { content: ""; flex: 0 1 380px; height: 1px; background: var(--dst-rule); }
.dst .dst-section h2 { margin-top: 0.4em; max-width: 16ch; font: 600 clamp(2.4rem, 7vw, 3.5rem)/1.02 var(--dst-display); letter-spacing: -0.025em; text-wrap: balance; }
.dst .dst-section h2::after { content: ""; display: block; width: 56px; height: 3px; margin-top: 22px; border-radius: 2px; background: var(--dst-accent); }
.dst-lede { margin-top: 1.4rem; font: 400 1.17rem/1.7 var(--dst-display); }
.dst-lede-label { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; color: var(--dst-accent); font: 600 0.72rem/1 var(--dst-text); letter-spacing: 0.16em; text-transform: uppercase; }
.dst-lede-label::after { content: ""; width: 36px; height: 1px; background: var(--dst-rule); }
.dst-more { margin-top: 1.8rem; }
.dst-more > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 22px;
  border: 1px solid var(--dst-rule);
  border-radius: 14px;
  background: color-mix(in oklab, var(--dst-rule) 35%, var(--dst-ground));
  cursor: pointer;
  list-style: none;
  font: italic 400 1.2rem/1.3 var(--dst-display);
  transition: border-color 0.2s;
}
.dst-more > summary:hover { border-color: var(--dst-accent); }
.dst-more[open] > summary { margin-bottom: 1.2rem; }
.dst-more > summary::-webkit-details-marker { display: none; }
.dst-more > summary span { margin-left: auto; color: var(--dst-dim); font: 400 0.82rem/1 var(--dst-text); }
.dst-more > summary::after { content: "+"; font: 400 1.4rem/1 var(--dst-text); color: var(--dst-accent); transition: transform 0.3s var(--dst-ease); }
.dst-more[open] > summary::after { transform: rotate(45deg); }
.dst-more[open] > .dst-flow { animation: dst-rise 0.5s var(--dst-ease) both; }
.dst-flow { padding-bottom: 1.4rem; }
.dst-flow > * + * { margin-top: 1.1em; }
.dst-flow h3 { margin-top: 1.9em; }
.dst-flow ul, .dst-flow ol { padding-left: 1.4em; }
.dst-flow li + li { margin-top: 0.5em; }

.dst-cite { font-size: 0.68em; line-height: 0; vertical-align: super; margin-left: 1px; font-variant-numeric: tabular-nums; }
.dst .dst-cite a { color: var(--dst-dim); text-decoration: none; padding-inline: 1px; }
.dst .dst-cite a:hover { color: var(--dst-accent); }
.dst-sources { margin-top: 1.4rem; font: 0.85rem/1.55 var(--dst-text); color: var(--dst-dim); }
.dst-sources summary { cursor: pointer; width: fit-content; }
.dst-sources summary:hover { color: var(--dst-ink); }
.dst-sources ol { margin-top: 0.8rem; padding-left: 1.6em; list-style: decimal; }
.dst-sources li { overflow-wrap: anywhere; scroll-margin-top: 80px; }
.dst-sources li + li { margin-top: 0.45em; }
.dst-sources li:target { color: var(--dst-ink); }
.dst-sources a { color: inherit; }

/* Share card */
.dst-share { --dst-gold: #c99a52; position: relative; margin-top: 2.4rem; padding: 24px 0 18px 64px; border-top: 1px solid var(--dst-rule); }
.dst-share-line { padding-bottom: 16px; background: linear-gradient(var(--dst-gold), var(--dst-gold)) left bottom / 56px 2px no-repeat; font: italic 400 clamp(1.4rem, 4.2vw, 1.95rem)/1.3 var(--dst-display); text-wrap: balance; }
.dst-share-line::before { content: "\u201C"; position: absolute; left: 0; top: 18px; color: var(--dst-gold); font: 600 4.4rem/1 var(--dst-display); }
.dst-share-line::after { content: "\u201D"; }
.dst-share-links { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 12px; font: 0.85rem/1.4 var(--dst-text); color: var(--dst-dim); }
.dst .dst-share-links a { color: var(--dst-ink); text-decoration-color: var(--dst-rule); }
.dst .dst-share-links a:hover { color: var(--dst-accent); }

/* ---------- Figures ---------- */
.dst-figure { margin-top: 1.8rem; padding: 20px; border: 1px solid var(--dst-rule); border-radius: 12px; background: color-mix(in oklab, var(--dst-ground) 82%, transparent); font-family: var(--dst-text); }
.dst-figure-title { font: italic 500 clamp(1.5rem, 4.4vw, 2.1rem)/1.12 var(--dst-display); letter-spacing: -0.01em; }
.dst-figure-caption { margin-top: 4px; color: var(--dst-dim); font-size: 0.85rem; line-height: 1.5; }
.dst-figure-body { margin-top: 18px; font-size: 0.9rem; line-height: 1.35; font-variant-numeric: tabular-nums; }
.dst-figure-note { display: flex; align-items: flex-start; gap: 8px; margin-top: 16px; color: var(--dst-dim); font-size: 0.8rem; font-style: italic; line-height: 1.5; }
.dst-figure-note > .dst-icon { width: 16px; height: 16px; margin-top: 1px; color: var(--dst-accent); font-style: normal; }
.dst-figure.has-icon { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 20px; }
.dst-figure.has-icon > :not(.dst-figure-icon, figcaption) { grid-column: 1 / -1; }
.dst-figure-icon { align-self: start; padding-right: 20px; border-right: 1px solid var(--dst-rule); color: var(--dst-accent); }
.dst-figure-icon .dst-icon { box-sizing: content-box; width: 30px; height: 30px; padding: 12px; border-radius: 50%; background: color-mix(in oklab, var(--dst-accent) 12%, var(--dst-ground)); }
.dst-figure.is-solid-icon .dst-figure-icon .dst-icon { background: var(--dst-accent); color: var(--dst-ground); }
.dst-figure.is-captioned-small .dst-figure-caption { margin-top: 8px; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }

.dst-figure.is-last-vote { padding: 26px 24px 20px; border-radius: 18px; background: color-mix(in oklab, var(--dst-ground) 75%, white); box-shadow: 0 18px 40px -30px rgba(20, 40, 30, 0.35); }
:root[data-theme="dark"] .dst-figure.is-last-vote { background: color-mix(in oklab, var(--dst-ground) 92%, var(--dst-ink)); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .dst-figure.is-last-vote { background: color-mix(in oklab, var(--dst-ground) 92%, var(--dst-ink)); } }
.dst-warm { color: var(--dst-warm); }
.dst-small { font-size: 0.78rem; color: var(--dst-dim); }

.dst-tiles { display: grid; grid-template-columns: 1.3fr 1fr 1fr 0.8fr; grid-auto-rows: minmax(96px, auto); gap: 10px; }
.dst-tile { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; gap: 6px; padding: 14px 16px; border: 1px solid color-mix(in oklab, var(--dst-accent) 30%, var(--dst-rule)); border-radius: 12px; background: color-mix(in oklab, var(--dst-ground) 60%, white); }
:root[data-theme="dark"] .dst-tile { background: color-mix(in oklab, var(--dst-ground) 85%, var(--dst-ink)); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .dst-tile { background: color-mix(in oklab, var(--dst-ground) 85%, var(--dst-ink)); } }
.dst-tile.is-latest { border-color: transparent; background: #2d5a45; color: #f4f0e6; }
.dst-tile.is-latest .dst-tile-year { font-size: clamp(2.2rem, 7vw, 3.2rem); }
.dst-tile.is-latest .dst-small { color: rgba(244, 240, 230, 0.8); }
.dst-tile-leaf { position: absolute; right: -12px; bottom: -8px; width: 54%; color: rgba(244, 240, 230, 0.16); transform: rotate(-18deg); pointer-events: none; }
.dst-tile-leaf .dst-icon { width: 100%; height: auto; }
.dst-tile b { font: 600 0.82rem/1 var(--dst-text); letter-spacing: 0.12em; }
.dst-tile-year { font: 500 1.9rem/1 var(--dst-display); font-variant-numeric: lining-nums; }
.dst-tile.is-unasked { color: var(--dst-dim); }
.dst-tile.is-unasked .dst-tile-year { font-size: 1.05rem; font-style: italic; font-weight: 400; }

.dst-bars { display: grid; gap: 14px; }
.dst-bars-row { display: grid; gap: 5px; }
.dst-bars-label b { font-weight: 600; }
.dst-bars-track { display: flex; align-items: center; gap: 8px; }
.dst-bars-fill { height: 12px; min-width: 3px; background: var(--dst-accent); border-radius: 2px; transform-origin: left; }
.dst-bars-row.is-australian .dst-bars-fill { background: var(--dst-warm); }
.dst-bars-zero { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--dst-dim); }
.dst-bars-value { font-weight: 600; }

.dst-timeline { position: relative; list-style: none !important; padding: 0 !important; margin: 0; }
.dst-timeline::before { content: ""; position: absolute; left: 6px; top: 14px; bottom: 14px; width: 1.5px; background: color-mix(in oklab, var(--dst-accent) 40%, var(--dst-rule)); }
.dst-timeline li { position: relative; display: grid; grid-template-columns: 5.5rem 1fr; gap: 16px; padding: 9px 0 9px 32px; }
.dst-timeline li::before { content: ""; position: absolute; left: 0; top: 15px; width: 13px; height: 13px; border-radius: 50%; background: var(--dst-accent); box-shadow: 0 0 0 4px var(--dst-ground); }
.dst-timeline li.is-local::before { background: var(--dst-warm); }
.dst-timeline-year { font: 600 1.35rem/1.1 var(--dst-display); font-variant-numeric: lining-nums; }
.dst-timeline-event { display: grid; gap: 2px; font-size: 0.95rem; line-height: 1.4; }
.dst-timeline-event .dst-small { color: var(--dst-dim); font-size: 0.8rem; }
.dst-timeline li.is-gap { padding-block: 16px; color: var(--dst-dim); font-style: italic; font-size: 0.9rem; }
.dst-timeline li.is-gap::before { display: none; }
.dst-legend { display: flex; flex-wrap: wrap; gap: 6px 22px; margin-top: 14px; padding: 10px 16px; border-radius: 999px; background: color-mix(in oklab, var(--dst-rule) 45%, var(--dst-ground)); font-size: 0.78rem; color: var(--dst-dim); }
.dst-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }

.dst-split { display: grid; gap: 12px; }
.dst-split-bar { position: relative; display: flex; height: 26px; margin-top: 5px; border-radius: 4px; overflow: hidden; font-size: 0.78rem; font-weight: 600; }
.dst-split-bar::after { content: ""; position: absolute; left: 50%; top: -3px; bottom: -3px; border-left: 1px dashed var(--dst-ink); opacity: 0.6; }
.dst-split-yes, .dst-split-no { display: flex; align-items: center; padding-inline: 8px; white-space: nowrap; }
.dst-split-yes { background: var(--dst-accent); color: var(--dst-ground); transform-origin: left; }
.dst-split-no { justify-content: flex-end; background: color-mix(in oklab, var(--dst-warm) 70%, var(--dst-ground)); color: var(--dst-ground); transform-origin: right; }
.dst-unasked { margin-top: 16px; padding: 10px 12px; border: 1px dashed var(--dst-rule); border-radius: 8px; color: var(--dst-dim); }

.dst-diverge { display: grid; gap: 14px; }
.dst-diverge-track { position: relative; height: 14px; margin-top: 5px; background: linear-gradient(var(--dst-ink), var(--dst-ink)) 50% 0 / 1px 100% no-repeat; }
.dst-diverge-fill { position: absolute; top: 2px; height: 10px; border-radius: 2px; background: var(--dst-accent); transform-origin: left; }
.dst-diverge-fill.is-saving { transform-origin: right; }
.dst-diverge-fill.is-promised { background: repeating-linear-gradient(135deg, var(--dst-dim) 0 3px, transparent 3px 6px); border: 1px solid var(--dst-dim); }
.dst-diverge-whisker { position: absolute; top: 6px; height: 2px; background: var(--dst-ink); opacity: 0.55; }
.dst-diverge-axis { display: flex; justify-content: space-between; margin-top: 6px; color: var(--dst-dim); font-size: 0.75rem; }

.dst-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.dst-stat { display: grid; align-content: start; gap: 6px; padding: 18px 18px 16px; border: 1px solid var(--dst-rule); border-radius: 14px; background: color-mix(in oklab, var(--dst-ground) 65%, white); }
:root[data-theme="dark"] .dst-stat { background: color-mix(in oklab, var(--dst-ground) 88%, var(--dst-ink)); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .dst-stat { background: color-mix(in oklab, var(--dst-ground) 88%, var(--dst-ink)); } }
.dst-stat-icon { display: grid; place-items: center; width: 40px; height: 40px; margin-bottom: 6px; border-radius: 50%; background: color-mix(in oklab, var(--dst-accent) 16%, var(--dst-ground)); color: var(--dst-accent); }
.dst-stat-icon .dst-icon { width: 22px; height: 22px; }
.dst-stat.is-counter .dst-stat-icon { background: color-mix(in oklab, var(--dst-warm) 18%, var(--dst-ground)); color: var(--dst-warm); }
.dst-stat-value { font: 600 clamp(2.3rem, 6vw, 2.9rem)/1 var(--dst-display); letter-spacing: -0.02em; font-variant-numeric: lining-nums; color: var(--dst-ink); }
.dst-stat-label { font: 400 1.08rem/1.3 var(--dst-display); }
.dst-stat-setting { margin-top: 6px; color: var(--dst-dim); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.1em; line-height: 1.6; text-transform: uppercase; }
.dst-stat.is-counter { border-style: dashed; border-color: color-mix(in oklab, var(--dst-warm) 45%, var(--dst-rule)); }
.dst-stat.is-counter .dst-stat-value { color: var(--dst-warm); }

/* One sun, two clocks: the sun stays, the ruler slides. */
.dst-sunclock-sky { position: relative; height: 128px; overflow: hidden; border-radius: 14px 14px 0 0; background: linear-gradient(180deg, color-mix(in oklab, #9cc6e4 55%, var(--dst-ground)) 0%, color-mix(in oklab, #f3dcb2 45%, var(--dst-ground)) 72%); }
.dst-sunclock-sky > span { position: absolute; }
.dst-sunclock-hills { left: 0; right: 0; bottom: 26px; height: 34px; background: color-mix(in oklab, #7f9c96 55%, var(--dst-ground)); clip-path: polygon(0 70%, 8% 45%, 18% 60%, 30% 25%, 42% 55%, 55% 40%, 66% 62%, 78% 30%, 90% 52%, 100% 38%, 100% 100%, 0 100%); }
.dst-sunclock-water { left: 0; right: 0; bottom: 0; height: 26px; background: repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0 1px, transparent 1px 7px), color-mix(in oklab, #a9cfe0 50%, var(--dst-ground)); }
.dst-sunclock-beam { left: 50%; top: 66px; bottom: 0; border-left: 2px solid var(--dst-warm); }
.dst-sunclock-sun { left: 50%; top: 18px; width: 48px; height: 48px; margin-left: -24px; border-radius: 50%; background: radial-gradient(circle at 40% 38%, #ffe39a, #f5b443); box-shadow: 0 0 0 10px rgba(255, 196, 92, 0.22), 0 0 50px rgba(255, 186, 80, 0.85); }
.dst-sunclock-window { position: relative; height: 54px; overflow: hidden; border: 1px solid var(--dst-rule); border-top: 0; border-radius: 0 0 14px 14px; background: color-mix(in oklab, var(--dst-ground) 70%, white); }
:root[data-theme="dark"] .dst-sunclock-window { background: color-mix(in oklab, var(--dst-ground) 90%, var(--dst-ink)); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .dst-sunclock-window { background: color-mix(in oklab, var(--dst-ground) 90%, var(--dst-ink)); } }
.dst-sunclock-ruler { position: absolute; top: 0; bottom: 0; left: 0; width: var(--ruler-width); transform: translateX(var(--standard-shift)); animation: dst-ruler 7s var(--dst-ease) infinite; }
.dst-sunclock-ruler span {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 2px;
  padding-top: 24px;
  transform: translateX(-50%);
  color: var(--dst-ink);
  font: 600 0.85rem/1 var(--dst-text);
  text-align: center;
  white-space: nowrap;
  background: linear-gradient(var(--dst-dim), var(--dst-dim)) 50% 0 / 1px 12px no-repeat;
}
.dst-sunclock-ruler span.is-hour { background: linear-gradient(var(--dst-ink), var(--dst-ink)) 50% 0 / 2px 20px no-repeat; }
.dst-sunclock-pointer { position: absolute; left: 50%; top: 0; bottom: 0; border-left: 2px solid var(--dst-warm); }
@keyframes dst-ruler {
  0%, 30% { transform: translateX(var(--standard-shift)); }
  45%, 80% { transform: translateX(var(--saving-shift)); }
  95%, 100% { transform: translateX(var(--standard-shift)); }
}
.dst-sunclock-reading { display: grid; margin-top: 12px; font-size: 1rem; text-align: center; }
.dst-sunclock-reading span { grid-area: 1 / 1; }
.dst-sunclock-reading b { color: var(--dst-warm); font: 600 1.5rem/1 var(--dst-display); }
.dst-sunclock-reading .is-standard { animation: dst-show-first 7s infinite; }
.dst-sunclock-reading .is-saving { animation: dst-show-second 7s infinite; }
@keyframes dst-show-first { 0%, 33% { opacity: 1; } 40%, 88% { opacity: 0; } 95%, 100% { opacity: 1; } }
@keyframes dst-show-second { 0%, 38% { opacity: 0; } 45%, 82% { opacity: 1; } 88%, 100% { opacity: 0; } }

.dst-axis-group { margin-top: 30px; }
.dst-axis-group > b { font: 600 1.15rem/1.3 var(--dst-display); }
.dst-axis-row { display: grid; gap: 4px; margin-top: 12px; }
.dst-axis-row.has-place { grid-template-columns: 7.5rem minmax(0, 1fr); column-gap: 16px; margin-top: 18px; }
.dst-axis-row.has-place > :not(.dst-axis-place) { grid-column: 2; }
.dst-axis-place { grid-row: 1 / span 2; align-self: center; color: var(--dst-accent); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
.dst-axis-group:has(.has-place) .dst-axis-ticks { margin-left: calc(7.5rem + 16px); }
.dst-axis-track { position: relative; height: 22px; border-bottom: 1px solid var(--dst-rule); }
.dst-axis-mark { position: absolute; bottom: -7px; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%; background: var(--dst-accent); box-shadow: 0 0 0 3px var(--dst-ground); }
.dst-axis-mark.is-warm { background: var(--dst-warm); }
.dst-axis-ticks { position: relative; height: 18px; color: var(--dst-dim); font-size: 0.72rem; }
.dst-axis-ticks span { position: absolute; transform: translateX(-50%); top: 4px; white-space: nowrap; }
.dst-axis-ticks span:first-child { transform: none; }
.dst-axis-ticks span:last-child { transform: translateX(-100%); }
.dst-daylight { position: absolute; top: 4px; height: 14px; border-radius: 3px; background: color-mix(in oklab, var(--dst-warm) 75%, var(--dst-ground)); }
.dst-daylight.is-hypothetical { background: repeating-linear-gradient(135deg, var(--dst-accent) 0 4px, color-mix(in oklab, var(--dst-accent) 40%, var(--dst-ground)) 4px 8px); }

.dst-steps { display: block; width: 100%; height: auto; overflow: visible; }
.dst-steps text { fill: var(--dst-dim); font: 12px var(--dst-text); }
.dst-steps .dst-steps-grid { stroke: var(--dst-rule); stroke-width: 1; }
.dst-steps .dst-steps-london, .dst-steps .dst-steps-new-york { fill: none; stroke-width: 2.5; stroke-dasharray: 1; stroke-dashoffset: 0; }
.dst-steps .dst-steps-london { stroke: var(--dst-accent); }
.dst-steps .dst-steps-new-york { stroke: var(--dst-warm); }
.dst-steps-change circle { fill: var(--dst-ground); stroke: var(--dst-ink); stroke-width: 1.5; }
.dst-steps .dst-steps-label { font-weight: 600; font-size: 13px; }
.dst-steps .dst-steps-label.is-london { fill: var(--dst-accent); }
.dst-steps .dst-steps-label.is-new-york { fill: var(--dst-warm); }

.dst-status { display: grid; gap: 10px; }
.dst-status-card { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 12px; border: 1px solid var(--dst-rule); border-radius: 10px; }
.dst-status-card b { font-weight: 600; }
.dst-status-uses { font-size: 0.78rem; white-space: nowrap; }
.dst-status-uses::before { content: ""; display: inline-block; width: 8px; height: 8px; margin-right: 6px; border-radius: 50%; background: var(--dst-dim); }
.dst-status-uses.is-yes::before { background: var(--dst-accent); animation: dst-blink 2s ease-in-out infinite; }
.dst-status-detail { grid-column: 1 / -1; color: var(--dst-dim); font-size: 0.85rem; }

/* Noon in Sydney, with a slider */
.dst-noon-control { display: grid; gap: 8px; margin-top: 16px; font-size: 0.95rem; }
.dst-noon-control output { font: 400 1.3rem/1 var(--dst-display); color: var(--dst-accent); }
.dst-noon-control input, .dst-explorer input[type="range"] { width: 100%; accent-color: var(--dst-accent); }
.dst-noon:not(.is-live) .dst-noon-control { display: none; }
.dst-zones { display: grid; gap: 2px; margin-top: 14px; }
.dst-zone { display: grid; grid-template-columns: 6.4rem 1fr; gap: 12px; align-items: baseline; padding: 7px 0; border-bottom: 1px solid var(--dst-rule); transition: opacity 0.3s; }
.dst-zone:last-child { border-bottom: 0; }
.dst-zone-time { font: 400 1.35rem/1 var(--dst-display); }
.dst-zone.is-home .dst-zone-time { color: var(--dst-accent); }
.dst-zone.is-unofficial .dst-zone-time { color: var(--dst-warm); font-style: italic; }
.dst-zone.is-night { opacity: 0.45; }

/* The Nullarbor sign */
.dst-why { position: relative; margin-top: 1.8rem; padding: 28px 20px 18px; display: grid; justify-items: center; gap: 10px; }
.dst-why-plate { padding: 16px 30px; border: 4px solid #fff; outline: 2px solid #1f6e4a; border-radius: 12px; background: #1f6e4a; color: #fff; text-align: center; font: 600 1rem/1.3 var(--dst-text); box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.5); transform: rotate(-1.5deg); }
.dst-why-small { font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.85; }
.dst-why-big { font-size: 1.6rem; }
.dst-why-scrawl { margin-top: -6px; font: italic 400 3rem/1 var(--dst-display); color: var(--dst-ink); transform: rotate(-8deg); }
.is-enhanced .dst-why:not(.is-seen) .dst-why-scrawl { clip-path: inset(0 100% 0 0); }
.is-enhanced .dst-why.is-seen .dst-why-scrawl { animation: dst-scrawl 1.3s 0.5s steps(16) both; }

/* The mood check */
.dst-mood { margin-top: 1.8rem; padding: 20px; border: 1px solid var(--dst-rule); border-radius: 12px; font-family: var(--dst-text); }
.dst-mood-question { font: italic 400 1.35rem/1.3 var(--dst-display); }
.dst-mood-options { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.dst-mood-options label { display: inline-block; padding: 12px 22px; font-size: 1.02rem; border: 1px solid var(--dst-rule); border-radius: 999px; cursor: pointer; transition: background 0.2s, color 0.2s, transform 0.2s var(--dst-ease); }
.dst-mood-options label:hover { transform: translateY(-1px); }
.dst-mood-options input:checked + label { background: var(--dst-ink); color: var(--dst-ground); border-color: var(--dst-ink); }
.dst-mood-reply { display: none; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--dst-rule); }
${moodReplyRules}

/* The pretend ballot */
.dst-ballot { margin-top: 1.6rem; padding: 24px; background: #fbfaf6; color: #1b1d22; border-radius: 4px; box-shadow: 0 18px 40px -20px rgba(0, 0, 0, 0.45); transform: rotate(-0.6deg); font-family: var(--dst-text); }
.dst-ballot-label { font: 600 0.72rem/1 var(--dst-text); letter-spacing: 0.16em; text-transform: uppercase; color: #6a6a63; }
.dst-ballot-question { margin-top: 10px; font: 400 1.35rem/1.35 var(--dst-display); }
.dst-ballot-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 20px; }
.dst-ballot-boxes label { display: flex; align-items: center; gap: 18px; padding: 18px 22px; border: 1px solid #b9b9b0; border-radius: 10px; background: #fffdf8; font-weight: 600; font-size: 1.2rem; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
.dst-ballot-boxes label:hover { border-color: #1b1d22; }
.dst-ballot-boxes input:checked + label { border-color: #1d3fa8; box-shadow: 0 0 0 1px #1d3fa8; }
.dst-ballot-boxes i { position: relative; width: 38px; height: 38px; border: 2px solid #1b1d22; background: #fff; }
.dst-ballot-boxes input:checked + label i::after {
  content: "";
  position: absolute;
  left: 11px;
  top: 2px;
  width: 11px;
  height: 22px;
  border: solid #1d3fa8;
  border-width: 0 4px 4px 0;
  transform: rotate(40deg);
  animation: dst-tick 0.35s var(--dst-ease) both;
}
@keyframes dst-tick { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0 0 0 0); } }
.dst-ballot-result { display: none; margin-top: 18px; padding-top: 16px; border-top: 1px dashed #b9b9b0; }
.dst-ballot:has(input:checked) .dst-ballot-result { display: block; animation: dst-rise 0.5s both; }
.dst-ballot .dst-share-links { color: #6a6a63; }
.dst .dst-ballot .dst-share-links a { color: #1b1d22; }

/* Franklin's cannon */
.dst-cannon { --dst-gold: #c99a52; position: relative; margin-top: 2.2rem; padding: 26px 0 8px 64px; border-top: 1px solid var(--dst-rule); overflow: visible; font-family: var(--dst-text); }
.dst-cannon::before { content: "\u201C"; position: absolute; left: 0; top: 20px; color: var(--dst-gold); font: 600 4.4rem/1 var(--dst-display); }
.dst-cannon-setup { font: italic 400 clamp(1.35rem, 4vw, 1.8rem)/1.32 var(--dst-display); text-wrap: pretty; }
.dst-cannon-source { display: flex; align-items: center; gap: 12px; margin-top: 12px; color: var(--dst-dim); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
.dst-cannon-source::before { content: ""; width: 22px; height: 1px; background: currentColor; }
.dst-cannon-fire { display: none; margin-top: 18px; margin-left: -64px; padding: 13px 24px; border-radius: 999px; background: #1f4a3a; color: #f4f0e6; font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s; }
.dst-cannon-fire:hover { background: #173a2d; }
.dst-cannon-fire .dst-icon { width: 18px; height: 18px; margin-left: 10px; vertical-align: -3px; transition: translate 0.2s var(--dst-ease); }
.dst-cannon-fire:hover .dst-icon { translate: 3px 0; }
.dst-cannon:not(:has(input:checked)) .dst-cannon-fire.is-first,
#dst-cannon-first:checked ~ .dst-cannon-fire.is-second,
#dst-cannon-second:checked ~ .dst-cannon-fire.is-third { display: inline-flex; align-items: center; white-space: nowrap; }
.dst-cannon-boom { display: none; margin-top: 14px; margin-left: -64px; font-size: 1.05rem; }
.dst-cannon-boom b { font: italic 400 2rem/1 var(--dst-display); color: var(--dst-warm); margin-right: 6px; }
#dst-cannon-first:checked ~ .dst-cannon-boom { display: block; animation: dst-boom-first 0.8s var(--dst-ease) both; }
#dst-cannon-second:checked ~ .dst-cannon-boom { display: block; animation: dst-boom-second 0.8s var(--dst-ease) both; }
.dst-cannon:has(#dst-cannon-first:checked) { animation: dst-shake-first 0.5s; }
.dst-cannon:has(#dst-cannon-second:checked) { animation: dst-shake-second 0.5s; }
@keyframes dst-boom-first { from { opacity: 0; transform: scale(1.6); } to { opacity: 1; transform: none; } }
@keyframes dst-boom-second { from { opacity: 0; transform: scale(1.6); } to { opacity: 1; transform: none; } }
@keyframes dst-shake-first { 0%, 100% { transform: none; background: transparent; } 10% { transform: translate(-6px, 3px); background: color-mix(in oklab, #ffcf7a 40%, transparent); } 30% { transform: translate(5px, -4px); } 50% { transform: translate(-3px, 2px); } 70% { transform: translate(2px, -1px); } }
@keyframes dst-shake-second { 0%, 100% { transform: none; background: transparent; } 10% { transform: translate(-6px, 3px); background: color-mix(in oklab, #ffcf7a 40%, transparent); } 30% { transform: translate(5px, -4px); } 50% { transform: translate(-3px, 2px); } 70% { transform: translate(2px, -1px); } }

/* ---------- The sun explorer ----------
  A soft panel of its own, with its own warm palette in light and dark: navy ink, a teal, a yellow and a lavender
  for the three rules, and a cream ground with a little sky in the corner. */
.dst-explorer {
  --dst-explorer-ink: #1d2a4d;
  --dst-explorer-dim: #5d6680;
  --dst-explorer-ground: #fbf8f1;
  --dst-explorer-card: #ffffff;
  --dst-explorer-line: #e6e0d3;
  --dst-explorer-cloud: rgba(205, 228, 243, 0.9);
  --dst-explorer-glow: rgba(253, 226, 190, 0.8);
  --dst-rule-teal: #1f8a83;
  --dst-rule-teal-tint: #e3f3f0;
  --dst-rule-teal-line: #8ccdc4;
  --dst-rule-yellow: #e2a12a;
  --dst-rule-yellow-tint: #fdf4dc;
  --dst-rule-yellow-line: #efd38a;
  --dst-rule-lavender: #8f73c4;
  --dst-rule-lavender-tint: #f2ecfa;
  --dst-rule-lavender-line: #cdbbea;
  position: relative;
  margin-top: 1.8rem;
  padding: 28px 24px 22px;
  border: 1px solid var(--dst-explorer-line);
  border-radius: 22px;
  background:
    radial-gradient(140px 70px at 92% 6%, var(--dst-explorer-cloud), transparent 70%),
    radial-gradient(180px 80px at 80% 2%, var(--dst-explorer-glow), transparent 70%),
    var(--dst-explorer-ground);
  color: var(--dst-explorer-ink);
  font-family: var(--dst-text);
}
:root[data-theme="dark"] .dst-explorer {
  --dst-explorer-ink: #ece6dc;
  --dst-explorer-dim: #a29eb2;
  --dst-explorer-ground: #13152a;
  --dst-explorer-card: #0d0f20;
  --dst-explorer-line: #2a2d48;
  --dst-explorer-cloud: rgba(60, 72, 130, 0.45);
  --dst-explorer-glow: rgba(120, 90, 150, 0.25);
  --dst-rule-teal: #6fd3c8;
  --dst-rule-teal-tint: #11302e;
  --dst-rule-teal-line: #2f6f69;
  --dst-rule-yellow: #f2c35c;
  --dst-rule-yellow-tint: #2c2512;
  --dst-rule-yellow-line: #6b5620;
  --dst-rule-lavender: #b9a2ea;
  --dst-rule-lavender-tint: #231d35;
  --dst-rule-lavender-line: #5a4a82;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .dst-explorer {
    --dst-explorer-ink: #ece6dc;
    --dst-explorer-dim: #a29eb2;
    --dst-explorer-ground: #13152a;
    --dst-explorer-card: #0d0f20;
    --dst-explorer-line: #2a2d48;
    --dst-explorer-cloud: rgba(60, 72, 130, 0.45);
    --dst-explorer-glow: rgba(120, 90, 150, 0.25);
    --dst-rule-teal: #6fd3c8;
    --dst-rule-teal-tint: #11302e;
    --dst-rule-teal-line: #2f6f69;
    --dst-rule-yellow: #f2c35c;
    --dst-rule-yellow-tint: #2c2512;
    --dst-rule-yellow-line: #6b5620;
    --dst-rule-lavender: #b9a2ea;
    --dst-rule-lavender-tint: #231d35;
    --dst-rule-lavender-line: #5a4a82;
  }
}
.dst-icon { width: 1.25rem; height: 1.25rem; flex: none; }
.dst-explorer-title { display: flex; align-items: center; gap: 12px; font: 600 clamp(1.6rem, 5vw, 2.1rem)/1.15 var(--dst-display); letter-spacing: -0.01em; }
.dst-explorer-title .dst-icon { width: 2.1rem; height: 2.1rem; color: #f2b13a; }
.dst-explorer-caption { margin-top: 8px; color: var(--dst-explorer-dim); font-size: 0.98rem; line-height: 1.55; max-width: 48ch; }
.dst-explorer-live { display: none; }
.dst-explorer.is-live .dst-explorer-live { display: block; }
.dst-explorer.is-live .dst-explorer-fallback { display: none; }
.dst-explorer-fallback { margin-top: 12px; color: var(--dst-explorer-dim); font-size: 0.9rem; }

.dst-explorer-controls { display: grid; grid-template-columns: 1fr 1.25fr; gap: 16px 24px; margin-top: 20px; }
.dst-explorer-controls label { display: grid; gap: 8px; color: var(--dst-explorer-dim); font-size: 0.85rem; font-weight: 600; }
.dst-select { position: relative; display: block; }
.dst-select .dst-icon { position: absolute; left: 12px; top: 50%; translate: 0 -50%; color: var(--dst-explorer-ink); pointer-events: none; }
.dst-explorer select { width: 100%; height: 48px; padding: 0 14px 0 40px; border: 1px solid var(--dst-explorer-line); border-radius: 12px; background: var(--dst-explorer-card); color: var(--dst-explorer-ink); font: 600 1rem var(--dst-text); }
.dst-alarm-row { display: flex; align-items: center; gap: 10px; height: 48px; }
.dst-alarm-row .dst-icon { color: var(--dst-explorer-ink); }
.dst-alarm-row output { min-width: 4.6em; color: var(--dst-explorer-ink); font: 600 1rem var(--dst-text); font-variant-numeric: tabular-nums; }
.dst-alarm-row input { flex: 1; min-width: 0; accent-color: var(--dst-rule-teal); }

.dst-explorer-rules { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
.dst-explorer-rules button {
  --dst-rule-colour: var(--dst-rule-teal);
  --dst-rule-tint: var(--dst-rule-teal-tint);
  --dst-rule-line: var(--dst-rule-teal-line);
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 16px;
  border: 1.5px solid var(--dst-rule-line);
  border-radius: 16px;
  background: var(--dst-rule-tint);
  color: var(--dst-explorer-ink);
  text-align: left;
  font: 0.85rem/1.35 var(--dst-text);
  cursor: pointer;
  transition: transform 0.2s var(--dst-ease), box-shadow 0.2s, border-color 0.2s;
}
.dst-explorer-rules button.is-always { --dst-rule-colour: var(--dst-rule-yellow); --dst-rule-tint: var(--dst-rule-yellow-tint); --dst-rule-line: var(--dst-rule-yellow-line); }
.dst-explorer-rules button.is-never { --dst-rule-colour: var(--dst-rule-lavender); --dst-rule-tint: var(--dst-rule-lavender-tint); --dst-rule-line: var(--dst-rule-lavender-line); }
.dst-explorer-rules button:hover { transform: translateY(-2px); }
.dst-explorer-rules button[aria-pressed="true"] { border-color: var(--dst-rule-colour); box-shadow: 0 0 0 1.5px var(--dst-rule-colour), 0 12px 24px -16px var(--dst-rule-colour); }
.dst-explorer-rules button:focus-visible { outline: 2px solid var(--dst-rule-colour); outline-offset: 3px; }
.dst-rule-head { display: flex; align-items: flex-start; gap: 10px; }
.dst-rule-head .dst-icon { width: 1.9rem; height: 1.9rem; color: var(--dst-rule-colour); }
.dst-rule-head > span { display: grid; gap: 6px; }
.dst-rule-name { font-weight: 600; font-size: 0.9rem; }
.dst-rule-now { display: none; width: fit-content; padding: 2px 8px; border-radius: 999px; background: var(--dst-rule-teal); color: var(--dst-explorer-card); font-size: 0.66rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.dst-explorer-rules button.is-now .dst-rule-now { display: inline-block; }
.dst-rule-stats { display: grid; gap: 4px; color: var(--dst-explorer-dim); }
.dst-rule-stats span { display: flex; align-items: baseline; gap: 8px; }
.dst-rule-stats b { min-width: 2.2ch; color: var(--dst-explorer-ink); font: 600 1.7rem/1.05 var(--dst-display); font-variant-numeric: tabular-nums lining-nums; }
.dst-explorer-sentence { font: 400 1.15rem/1.45 var(--dst-display); }
.dst-explorer-sentence b { color: #e0861a; font-weight: 600; }

/* The explorer's calendar: twelve months, one square per day, in a card of its own. */
.dst-explorer { --dst-sky-dark: #27305f; --dst-sky-twilight: #f4bd92; --dst-sky-light: #fbe4a0; }
.dst-explorer-view { display: inline-flex; margin-top: 20px; padding: 4px; border: 1px solid var(--dst-explorer-line); border-radius: 999px; background: var(--dst-explorer-card); }
.dst-explorer-view button { padding: 8px 18px; border: 0; border-radius: 999px; background: none; color: var(--dst-explorer-dim); font: 600 0.9rem/1.2 var(--dst-text); cursor: pointer; transition: background 0.25s, color 0.25s; }
.dst-explorer-view button[aria-pressed="true"] { background: var(--dst-explorer-ink); color: var(--dst-explorer-card); }
.dst-explorer-view button:focus-visible { outline: 2px solid var(--dst-rule-teal); outline-offset: 2px; }
.dst-calendar-card { margin-top: 14px; padding: 20px 18px 16px; border: 1px solid var(--dst-explorer-line); border-radius: 18px; background: var(--dst-explorer-card); }
.dst-calendar-headline { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 14px; font: 500 1.4rem/1.2 var(--dst-display); }
.dst-calendar-headline b { font: 600 2.8rem/1 var(--dst-display); font-variant-numeric: tabular-nums lining-nums; }
.dst-headline-badge { width: 3rem; height: 3rem; border-radius: 50%; background-position: center; background-repeat: no-repeat; background-size: 56%; }
.dst-headline-badge.is-dark { background-color: var(--dst-sky-dark); background-image: ${moonIcon}; }
.dst-headline-badge.is-light { background-color: var(--dst-sky-light); background-image: ${sunIcon}; }
.dst-calendar { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px 18px; margin-top: 18px; }
.dst-month-name { margin-bottom: 8px; color: var(--dst-explorer-ink); font: 700 0.75rem/1 var(--dst-text); letter-spacing: 0.08em; text-transform: uppercase; }
.dst-month-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.dst-day {
  aspect-ratio: 1;
  border-radius: 6px;
  background: var(--dst-explorer-line);
  transition: background-color 0.45s ease;
  transition-delay: calc(var(--order, 0) * 1.6ms);
  cursor: pointer;
  position: relative;
}
.dst-day.is-empty { background: none; cursor: default; }
.dst-day[data-state], .dst-calendar-legend i[data-state] { background-position: center; background-repeat: no-repeat; background-size: 72%; }
.dst-day[data-state="dark"], .dst-calendar-legend i[data-state="dark"] { background-color: var(--dst-sky-dark); background-image: ${moonIcon}; }
.dst-day[data-state="twilight"], .dst-calendar-legend i[data-state="twilight"] { background-color: var(--dst-sky-twilight); background-image: ${horizonSunIcon}; }
.dst-day[data-state="light"], .dst-calendar-legend i[data-state="light"] { background-color: var(--dst-sky-light); background-image: ${sunIcon}; }
.dst-day.is-change::after, .dst-calendar-legend .is-change-key::after { content: ""; position: absolute; left: 50%; top: -6px; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%; background: var(--dst-explorer-ink); }
.dst-day.is-today { outline: 2px solid var(--dst-explorer-ink); outline-offset: 1px; }
.dst-day.is-picked { outline: 2px solid var(--dst-rule-teal); outline-offset: 1px; z-index: 1; }
.dst-calendar-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 22px; margin-top: 18px; padding: 10px 16px; border-radius: 14px; background: var(--dst-explorer-ground); color: var(--dst-explorer-ink); font-size: 0.85rem; }
.dst-calendar-legend span { display: inline-flex; align-items: center; gap: 8px; }
.dst-calendar-legend i { position: relative; display: inline-block; width: 22px; height: 22px; border-radius: 6px; }
.dst-calendar-legend .is-change-key { width: 10px; background: none; }
.dst-calendar-legend .is-change-key::after { top: 8px; }

/* One day up close: a little sky for that morning (or evening), and what it means. */
.dst-day-panel { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr); margin-top: 14px; border: 1px solid var(--dst-explorer-line); border-radius: 18px; background: var(--dst-explorer-card); overflow: hidden; }
.dst-day-scene { position: relative; min-height: 210px; overflow: hidden; }
.dst-day-scene > span { position: absolute; }
.dst-scene-sky { inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.dst-scene-sky.is-dark { background: linear-gradient(180deg, #121838, #2b3870 70%, #3a4885); }
.dst-scene-sky.is-twilight { background: linear-gradient(180deg, #57659e, #c48aa0 45%, #f5b689 72%, #fbd8a6); }
.dst-scene-sky.is-light { background: linear-gradient(180deg, #86c6ef, #cbe8f8 70%, #eaf6fb); }
.dst-day-scene[data-state="dark"] .dst-scene-sky.is-dark,
.dst-day-scene[data-state="twilight"] .dst-scene-sky.is-twilight,
.dst-day-scene[data-state="light"] .dst-scene-sky.is-light { opacity: 1; }
.dst-scene-stars { inset: 0 0 35% 0; opacity: 0; transition: opacity 0.7s; background-image: radial-gradient(1.5px 1.5px at 12% 20%, #fff, transparent), radial-gradient(1px 1px at 30% 45%, #fff, transparent), radial-gradient(1.5px 1.5px at 52% 15%, #fff, transparent), radial-gradient(1px 1px at 68% 38%, #fff, transparent), radial-gradient(1.5px 1.5px at 85% 22%, #fff, transparent), radial-gradient(1px 1px at 22% 62%, #fff, transparent), radial-gradient(1px 1px at 90% 55%, #fff, transparent); }
.dst-day-scene[data-state="dark"] .dst-scene-stars { opacity: 0.9; }
.dst-scene-moon { top: 16%; right: 18%; width: 46px; height: 46px; background: ${moonIcon} center / contain no-repeat; opacity: 0; transition: opacity 0.7s, translate 0.7s var(--dst-ease); translate: 0 12px; }
.dst-day-scene[data-state="dark"] .dst-scene-moon { opacity: 1; translate: 0 0; }
.dst-scene-sun { left: calc(50% - 26px); top: calc(66% + 30px); width: 52px; height: 52px; border-radius: 50%; background: radial-gradient(circle at 40% 40%, #ffe08a, #f6a33a); box-shadow: 0 0 0 10px rgba(255, 200, 110, 0.25), 0 0 40px rgba(255, 190, 90, 0.7); transition: top 0.9s var(--dst-ease), left 0.9s var(--dst-ease); }
.dst-day-scene[data-state="twilight"] .dst-scene-sun { top: calc(46% - 18px); }
.dst-day-scene[data-state="light"] .dst-scene-sun { top: 14%; left: 22%; }
.dst-scene-hills { left: 0; right: 0; top: 46%; height: 21%; clip-path: polygon(0 70%, 12% 35%, 26% 60%, 42% 20%, 58% 55%, 74% 28%, 88% 50%, 100% 30%, 100% 100%, 0 100%); background: #8fa6c4; transition: background 0.7s; }
.dst-day-scene[data-state="dark"] .dst-scene-hills { background: #1b2350; }
.dst-day-scene[data-state="twilight"] .dst-scene-hills { background: #8b6f93; }
.dst-scene-water { left: 0; right: 0; bottom: 0; height: 34%; background: repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0 1px, transparent 1px 9px), #9fd2ee; transition: background-color 0.7s; }
.dst-day-scene[data-state="dark"] .dst-scene-water { background-color: #1a2250; }
.dst-day-scene[data-state="twilight"] .dst-scene-water { background-color: #e8a98c; }
.dst-day-text { display: grid; align-content: center; gap: 10px; padding: 20px 22px; }
.dst-day-date { display: flex; align-items: center; gap: 8px; font: 700 0.8rem/1.2 var(--dst-text); letter-spacing: 0.1em; text-transform: uppercase; }
.dst-day-detail { padding-bottom: 12px; border-bottom: 1px solid var(--dst-explorer-line); color: var(--dst-explorer-dim); font-size: 0.9rem; line-height: 1.5; }

/* Share links with icons */
.dst-share-links.is-iconic { gap: 8px 18px; margin-top: 16px; color: var(--dst-explorer-dim, var(--dst-dim)); }
.dst-share-links.is-iconic > span:first-child { color: var(--dst-accent); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
.dst-share .dst-share-links.is-iconic { gap: 8px 0; margin-left: -64px; padding-top: 6px; }
.dst-share .dst-share-links.is-iconic > span:first-child { margin-right: 16px; }
.dst-share .dst-share-links.is-iconic a { padding-inline: 14px; border-left: 1px solid var(--dst-rule); }
.dst-share .dst-share-links.is-iconic > span + a { border-left: 0; padding-left: 0; }
.dst-share-links.is-iconic a { display: inline-flex; align-items: center; gap: 6px; color: var(--dst-explorer-ink, var(--dst-ink)); text-decoration: none; }
.dst .dst-share-links.is-iconic a:hover { color: var(--dst-rule-teal); }
.dst-share-icon { width: 16px; height: 16px; flex: none; }
@media (max-width: 560px) {
  .dst-explorer { padding: 22px 16px 18px; }
  .dst-explorer-controls { grid-template-columns: 1fr; }
  .dst-explorer-rules { grid-template-columns: 1fr; }
  .dst-calendar { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 10px; }
  .dst-month-days { gap: 2px; }
  .dst-day { border-radius: 4px; }
  .dst-calendar-headline b { font-size: 2.3rem; }
  .dst-day-panel { grid-template-columns: 1fr; }
  .dst-day-scene { min-height: 150px; }
}

/* Reading a date off the time-gap chart */
.dst-steps .dst-steps-guide { stroke: var(--dst-ink); stroke-width: 1; stroke-dasharray: 3 3; opacity: 0; transition: opacity 0.2s; }
.dst-steps.is-reading .dst-steps-guide { opacity: 0.7; }
.is-enhanced .dst-steps { cursor: ew-resize; touch-action: pan-y; }
.dst-gap-readout { display: none; }
.is-enhanced .dst-gap-readout { display: block; min-height: 2.9em; margin-top: 10px; font: 400 1.1rem/1.35 var(--dst-display); }
.dst-gap-readout b { font-weight: 400; color: var(--dst-accent); }
.dst-gap-readout b.is-warm { color: var(--dst-warm); }

/* Figures drawn with ECharts. Each container stays hidden until its chart is drawn; then the HTML version steps aside. */
.dst-echart { display: none; width: 100%; margin-top: 14px; }
.dst-figure.is-charted .dst-echart { display: block; }
.dst-figure.is-charted .dst-chart-fallback { display: none; }

/* The petition, always inside its disclaimer: a say, not an end. */
.dst-petition-note { margin-top: 12px; color: var(--dst-dim); font: 0.85rem/1.5 var(--dst-text); max-width: 46ch; }
.dst .dst-petition-note a { color: var(--dst-ink); }
.dst-card .dst-petition-note, .dst-call .dst-petition-note { color: var(--dst-card-dim); }
.dst .dst-card .dst-petition-note a { color: var(--dst-cream); }
.dst .dst-call .dst-petition-note a { color: #bfeeda; }
.dst-call .dst-petition-note { position: relative; margin-top: 18px; color: #a9b6c2; font-size: 0.95rem; max-width: 52ch; }
.dst-ballot .dst-petition-note { color: #6a6a63; }
.dst .dst-ballot .dst-petition-note a { color: #1b1d22; }

/* The calls to act and the letter */
.dst-your-turn { margin-top: 5rem; }
.dst-letter { margin-top: 1.4rem; padding: 20px 22px 18px; border: 1px solid var(--dst-rule); border-radius: 18px; background: color-mix(in oklab, var(--dst-ground) 88%, white); font: 1rem/1.7 var(--dst-text); scroll-margin-top: 80px; }
:root[data-theme="dark"] .dst-letter { background: color-mix(in oklab, var(--dst-ground) 92%, var(--dst-ink)); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .dst-letter { background: color-mix(in oklab, var(--dst-ground) 92%, var(--dst-ink)); } }
.dst-letter-body { padding: 22px 26px; border: 1px solid var(--dst-rule); border-radius: 14px; background: color-mix(in oklab, var(--dst-ground) 70%, white); }
:root[data-theme="dark"] .dst-letter-body { background: color-mix(in oklab, var(--dst-ground) 85%, var(--dst-ink)); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .dst-letter-body { background: color-mix(in oklab, var(--dst-ground) 85%, var(--dst-ink)); } }
.dst-letter-body p + p { margin-top: 0.9em; }
.dst-letter-for { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; color: var(--dst-dim); font-size: 0.92rem; }
.dst-letter-for .dst-icon { width: 20px; height: 20px; }
.dst-letter-for button { margin-left: 6px; padding: 0; border: 0; background: none; color: var(--dst-accent); font: inherit; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.dst-letter p { white-space: pre-line; }
.dst-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.dst-members { display: flex; align-items: flex-start; gap: 10px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--dst-rule); color: var(--dst-dim); font-size: 0.88rem; line-height: 1.7; }
.dst-members > .dst-icon { width: 18px; height: 18px; margin-top: 4px; }
.dst-dialog .dst-members { display: block; border-top: 0; padding-top: 0; margin-top: 12px; }
.dst .dst-members a { color: var(--dst-ink); }
.dst-call { position: relative; overflow: hidden; margin-top: 2rem; padding: 40px clamp(22px, 6vw, 56px) 34px; border-radius: 18px; color: #f1ede4; background: radial-gradient(420px 220px at 100% 0%, rgba(157, 230, 196, 0.08), transparent 70%), #12212c; }
.dst-call-leaf { position: absolute; top: 20px; right: 26px; width: clamp(90px, 18vw, 150px); color: rgba(157, 230, 196, 0.16); transform: rotate(12deg); pointer-events: none; }
.dst-call-leaf .dst-icon { width: 100%; height: auto; }
.dst-call > p:not(.dst-petition-note) { position: relative; max-width: 20ch; font: 600 clamp(1.8rem, 5vw, 2.5rem)/1.15 var(--dst-display); letter-spacing: -0.01em; text-wrap: balance; }
.dst-call .dst-actions { position: relative; justify-content: flex-start; margin-top: 22px; }
.dst-call .dst-button { background: #bfeeda; --dst-button-text: #12212c; }
.dst-call .dst-button.is-quiet, .dst-call .dst-button.is-waiting { background: none; --dst-button-text: var(--dst-cream); border: 1px solid var(--dst-card-line); }

/* The letter dialog: a name, then the finished email to copy or open. */
.dst-dialog {
  position: fixed;
  inset: 0;
  margin: auto; /* the site's reset zeroes dialog margins, which pins it to the corner */
  height: fit-content;
  width: min(680px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  padding: 28px 24px 24px;
  border: 1px solid var(--dst-rule);
  border-radius: 16px;
  background: var(--dst-ground);
  color: var(--dst-ink);
  font-family: var(--dst-text);
  box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.6);
}
.dst-dialog[open] { animation: dst-rise 0.35s var(--dst-ease) both; }
.dst-dialog::backdrop { background: rgba(7, 6, 11, 0.55); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
.dst-dialog-step { display: grid; gap: 12px; }
.dst-dialog-step[hidden] { display: none; }
.dst-dialog-title { font: 400 1.6rem/1.2 var(--dst-display); padding-right: 32px; }
.dst-dialog-text { color: var(--dst-dim); font-size: 0.95rem; line-height: 1.5; }
.dst-dialog-text b { color: var(--dst-ink); font-weight: 600; }
.dst-state-picker { margin: 0; padding: 0; border: 0; min-width: 0; }
.dst-state-picker legend { margin-bottom: 8px; padding: 0; font-weight: 600; font-size: 0.9rem; }
.dst-state-options { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.dst-state-options input { position: absolute; opacity: 0; pointer-events: none; }
.dst-state-options label { display: grid; gap: 3px; height: 100%; padding: 10px 12px; border: 1px solid var(--dst-rule); border-radius: 12px; background: var(--dst-panel); cursor: pointer; transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s; }
.dst-state-options label b { font: 600 1.05rem/1.1 var(--dst-display); letter-spacing: 0.02em; }
.dst-state-options label span { color: var(--dst-dim); font-size: 0.74rem; line-height: 1.3; }
.dst-state-options label:hover { border-color: color-mix(in oklab, var(--dst-accent) 50%, var(--dst-rule)); }
.dst-state-options input:checked + label { border-color: var(--dst-accent); background: color-mix(in oklab, var(--dst-accent) 10%, var(--dst-panel)); box-shadow: 0 0 0 1px var(--dst-accent); }
.dst-state-options input:checked + label b { color: var(--dst-accent); }
.dst-state-options input:focus-visible + label { outline: 2px solid var(--dst-accent); outline-offset: 2px; }
.dst-dialog-field { display: grid; gap: 6px; font-weight: 600; font-size: 0.9rem; }
.dst-dialog-field .dst-dim { color: var(--dst-dim); font-weight: 400; }
.dst-dialog-field input, .dst-dialog-field select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--dst-rule);
  border-radius: 10px;
  background: var(--dst-panel);
  color: var(--dst-ink);
  font: 1rem/1.55 var(--dst-text);
}
.dst-dialog-letter {
  padding: 14px 16px;
  border: 1px solid var(--dst-rule);
  border-radius: 10px;
  background: var(--dst-panel);
  color: var(--dst-ink);
  font: 0.95rem/1.6 var(--dst-text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  user-select: text;
}
.dst-dialog-field input:focus-visible, .dst-dialog-field select:focus-visible, .dst-dialog-letter:focus-visible { outline: 2px solid var(--dst-accent); outline-offset: 1px; }
.dst .dst-members-own { color: var(--dst-accent); font-weight: 600; }
.dst-dialog-status { min-height: 1.4em; color: var(--dst-accent); font-size: 0.9rem; font-weight: 600; }
.dst-dialog-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border: 1px solid var(--dst-rule);
  border-radius: 50%;
  background: none;
  color: var(--dst-ink);
  font: 400 1.3rem/1 var(--dst-text);
  cursor: pointer;
}
.dst-dialog button.dst-button { border: 0; cursor: pointer; }
.dst-dialog button.dst-button.is-quiet { border: 1px solid var(--dst-rule); }

/* ---------- Reveals: only when the script runs, and only once each ---------- */
.is-enhanced [data-reveal]:not(.is-seen) .dst-tile { opacity: 0.35; transform: scale(0.92); }
.is-enhanced .dst-tile { transition: opacity 0.5s, transform 0.6s var(--dst-ease); transition-delay: calc(var(--order, 0) * 90ms + 250ms); }
.is-enhanced [data-reveal]:not(.is-seen) .dst-bars-fill,
.is-enhanced [data-reveal]:not(.is-seen) .dst-split-yes,
.is-enhanced [data-reveal]:not(.is-seen) .dst-split-no,
.is-enhanced [data-reveal]:not(.is-seen) .dst-diverge-fill { transform: scaleX(0); }
.is-enhanced .dst-bars-fill, .is-enhanced .dst-split-yes, .is-enhanced .dst-split-no, .is-enhanced .dst-diverge-fill {
  transition: transform 1.1s var(--dst-ease);
  transition-delay: calc(var(--order, 0) * 110ms + 300ms);
}
.is-enhanced [data-reveal].is-seen .is-australian .dst-bars-fill { animation: dst-thump 0.7s calc(var(--order) * 110ms + 1.5s) 2; }
@keyframes dst-thump { 30% { transform: scaleY(2.2); } 60% { transform: scaleY(0.9); } }
.is-enhanced [data-reveal]:not(.is-seen) .dst-timeline li,
.is-enhanced [data-reveal]:not(.is-seen) .dst-stat,
.is-enhanced [data-reveal]:not(.is-seen) .dst-status-card,
.is-enhanced [data-reveal]:not(.is-seen) .dst-split > div,
.is-enhanced [data-reveal]:not(.is-seen) .dst-axis-row { opacity: 0.35; transform: translateX(-10px); }
.is-enhanced .dst-timeline li, .is-enhanced .dst-stat, .is-enhanced .dst-status-card, .is-enhanced .dst-split > div, .is-enhanced .dst-axis-row {
  transition: opacity 0.6s, transform 0.6s var(--dst-ease);
  transition-delay: calc(var(--order, 0) * 90ms + 200ms);
}
.is-enhanced [data-reveal]:not(.is-seen) .dst-steps-london,
.is-enhanced [data-reveal]:not(.is-seen) .dst-steps-new-york { stroke-dashoffset: 1; }
.is-enhanced .dst-steps-london, .is-enhanced .dst-steps-new-york { transition: stroke-dashoffset 2.2s var(--dst-ease) 0.3s; }
.is-enhanced [data-reveal]:not(.is-seen) .dst-steps-change { opacity: 0; }
.is-enhanced .dst-steps-change { transition: opacity 0.4s; transition-delay: calc(var(--order) * 160ms + 1.4s); }
.is-enhanced [data-reveal]:not(.is-seen) .is-moving { left: var(--from-left) !important; }
.is-enhanced .is-moving { transition: left 1.4s var(--dst-ease) calc(var(--order, 0) * 200ms + 900ms); }
.is-enhanced [data-reveal]:not(.is-seen) .dst-daylight.is-hypothetical { margin-left: var(--hour-back); opacity: 0.4; }
.is-enhanced .dst-daylight.is-hypothetical { transition: margin-left 1.4s var(--dst-ease), opacity 1.4s; transition-delay: calc(var(--order, 0) * 120ms + 700ms); }

@media (max-width: 560px) {
  .dst-hero-line { font-size: 1.05rem; }
  .dst-hero-card { grid-template-columns: 1fr; padding: 18px; }
  .dst-state-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dst-share { padding-left: 44px; }
  .dst-axis-row.has-place { grid-template-columns: 1fr; }
  .dst-axis-row.has-place > :not(.dst-axis-place) { grid-column: 1; }
  .dst-axis-place { grid-row: auto; }
  .dst-axis-group:has(.has-place) .dst-axis-ticks { margin-left: 0; }
  .dst-share .dst-share-links.is-iconic { margin-left: -44px; }
  .dst-share .dst-share-links.is-iconic a { padding-inline: 10px; }
  .dst-cannon { padding-left: 44px; }
  .dst-cannon::before { font-size: 3.4rem; }
  .dst-cannon-fire, .dst-cannon-boom { margin-left: -44px; }
  .dst-timeline li { grid-template-columns: 4.4rem 1fr; gap: 10px; padding-left: 26px; }
  .dst-share-line::before { font-size: 3.4rem; }
  .dst-figure-icon { padding-right: 14px; }
  .dst-figure-icon .dst-icon { width: 22px; height: 22px; padding: 9px; }
  .dst-figure.has-icon { column-gap: 14px; }
  .dst-you-card { padding: 16px 18px 18px; }
  .dst-you-info { padding: 14px 16px; }
  .dst-bar { gap: 8px; }
  .dst-switch label { padding: 6px 11px; font-size: 0.85rem; }
  .dst-switch label span { display: none; }
  .dst-bar .dst-button { padding: 7px 11px; font-size: 0.78rem; }
  .dst-card { padding: 54px 22px 26px; min-height: min(80vh, 600px); }
  .dst-tiles { grid-auto-rows: minmax(68px, auto); }
  .dst-tile { padding: 6px 7px; }
  .dst-tile-year { font-size: 1.2rem; }
  .dst-tile .dst-small { font-size: 0.68rem; }
  .dst-explorer-controls { grid-template-columns: 1fr; }
  .dst-explorer-rules { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .dst *, .dst *::before, .dst *::after { animation: none !important; transition: none !important; }
  .dst-night-playhead { left: 50%; }
  .dst-sunclock-reading .is-standard { opacity: 0; }
}
`;
