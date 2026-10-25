import { addressWithContentHash } from "@/lib/content-hash";
import type { Post } from "@/lib/posts";
import type { MenuLook, MenuStart } from "@/lib/site-menu/shared";

/*
  The site's menu: a right click on any page opens Navigate (Home, and Posts with every post) and Change theme. The sky
  behind a post never has it (lib/home.ts leaves it out there). Computers only: on a phone or a tablet a long press
  keeps the browser's own menu, and so does a right click in a text field, such as the letter on Earth's post.

  Nothing may slow a page for it. This inline script is all a page carries before it has loaded. It remembers which
  kind of pointer pressed last, takes the right click, and adds the menu's script (public/site-menu.js, built from
  menu.ts by scripts/build-site-menu.ts) after the page has loaded, at a quiet moment. A right click that comes sooner
  adds the script at once, and the script opens the menu where the reader clicked as soon as it arrives.
*/
export const MENU_SCRIPT = "site-menu.js";

const WAIT_AFTER_LOAD_MILLISECONDS = 2000;
const LONGEST_IDLE_WAIT_MILLISECONDS = 3000;
// A right click's own event names its pointer in Chromium and Firefox. Elsewhere the press before it does, if it came
// this recently: a long press on a touch screen lasts about half a second, and a mouse's right button is let go sooner.
const PRESS_ANSWERS_FOR_MILLISECONDS = 2000;
const RIGHT_BUTTON = 2;
// Where a right click keeps the browser's own menu, with its spelling, cut, copy and paste.
const TEXT_FIELDS = [
  "textarea",
  '[contenteditable]:not([contenteditable="false"])',
  'input:not([type="button"], [type="checkbox"], [type="color"], [type="file"], [type="hidden"], [type="image"], [type="radio"], [type="range"], [type="reset"], [type="submit"])',
].join(", ");

/** The homepage's tokens, and the 404 page's (the cosmos repo's cosmos.css). */
export const cosmosPageLook: MenuLook = {
  panel: "var(--ground)",
  ink: "var(--ink)",
  muted: "var(--dim)",
  rule: "var(--rule)",
  face: "var(--text)",
};

/** The tokens of the pages Next renders (app/globals.css). */
export const nextPageLook: MenuLook = {
  panel: "var(--background)",
  ink: "var(--foreground)",
  muted: "var(--muted-foreground)",
  rule: "var(--border)",
  face: "var(--face-text)",
};

/** A post's own page, built by the cosmos repo (Earth's styles.css), which sets its controls in its display face. */
export const ownPageLook: MenuLook = {
  panel: "var(--paper)",
  ink: "var(--ink)",
  muted: "var(--ink-3)",
  rule: "var(--rule)",
  face: "var(--font-display)",
};

const menuPost = (post: Post) => ({
  title: post.title,
  address: `/posts/${post.slug}/`,
});

/** JSON that can sit inside a <script> element. */
const inlineJson = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\u003c");

/** The inline script that starts the menu on a page. */
export function menuStartScript({
  posts,
  look,
}: {
  posts: Post[];
  look: MenuLook;
}) {
  const start: MenuStart = { posts: posts.map(menuPost), look };
  return `(() => {
  const menu = (window.siteMenu = ${inlineJson(start)});
  let lastPress = { pointerType: "", at: -Infinity };
  addEventListener("pointerdown", (event) => {
    lastPress = { pointerType: event.pointerType, at: performance.now() };
  }, { capture: true, passive: true });

  const touchIsTheMainPointer = () => matchMedia("(hover: none) and (pointer: coarse)").matches;
  function pointerTypeOf(event) {
    if (event.pointerType) return event.pointerType;
    const pressIsRecent = performance.now() - lastPress.at < ${PRESS_ANSWERS_FOR_MILLISECONDS};
    return pressIsRecent ? lastPress.pointerType : "";
  }
  const isInATextField = (event) =>
    event.target instanceof Element && !!event.target.closest(${JSON.stringify(TEXT_FIELDS)});

  let scriptAdded = false, scriptFailed = false;
  function addTheMenuScript(priority) {
    if (scriptAdded) return;
    scriptAdded = true;
    const script = document.createElement("script");
    script.src = ${JSON.stringify(addressWithContentHash(MENU_SCRIPT))};
    script.async = true;
    script.fetchPriority = priority;
    script.onerror = () => (scriptFailed = true);
    document.head.append(script);
  }

  // No pointer named and no press just before is the keyboard's menu key, which opens the menu on a computer.
  function isForTheMenu(event) {
    if (event.defaultPrevented || scriptFailed || isInATextField(event)) return false;
    const pointerType = pointerTypeOf(event);
    return pointerType ? pointerType === "mouse" : !touchIsTheMainPointer();
  }
  // A right click names the right button. The menu key names none: Chromium sends it as a mouse with button -1, at
  // the focused element.
  const cameFromTheKeyboard = (event) => event.button !== ${RIGHT_BUTTON};
  addEventListener("contextmenu", (event) => {
    if (!isForTheMenu(event)) return;
    event.preventDefault();
    const request = {
      pointX: event.clientX,
      pointY: event.clientY,
      byKeyboard: cameFromTheKeyboard(event),
      target: event.target,
    };
    if (menu.open) return menu.open(request);
    menu.waiting = request;
    addTheMenuScript("high");
  });

  // Phones and tablets never open the menu, so they never fetch it ahead of time.
  if (touchIsTheMainPointer()) return;
  const atAQuietMoment = () =>
    window.requestIdleCallback
      ? requestIdleCallback(() => addTheMenuScript("low"), { timeout: ${LONGEST_IDLE_WAIT_MILLISECONDS} })
      : addTheMenuScript("low");
  const afterLoad = () => setTimeout(atAQuietMoment, ${WAIT_AFTER_LOAD_MILLISECONDS});
  if (document.readyState === "complete") afterLoad();
  else addEventListener("load", afterLoad, { once: true });
})();`;
}
