/*
  The site's menu, opened by a right click (start-script.ts takes the click and adds this script to the page). Built
  into public/site-menu.js by scripts/build-site-menu.ts.

  Its panels are made when it opens and removed when it closes: the homepage's script moves the page's own elements
  into orbit, so nothing of the menu is in the page's HTML. They sit in a shadow root, out of reach of the page's rules,
  and in the browser's top layer, above everything a page draws (the homepage's canvases, Earth's stage, sheets and
  bars). Where a browser has no top layer they sit above the page by z-index instead.

  It opens at the pointer; a submenu opens on hover or a click, or from the keys. Arrow keys move, Enter and Space
  choose, Escape closes a submenu and then the menu. A click or a right click anywhere else closes it, and so do the
  wheel, a scroll the page did not start before the menu opened, a resize and leaving the window. Focus goes back to
  where it was. Choosing a page is a plain page load.
*/
import {
  isItem,
  isThePageShown,
  menuEntries,
  type MenuEntry,
  type MenuItem,
} from "./menu-items";
import {
  placeAtPoint,
  placeBeside,
  windowSize,
  type Place,
  type Size,
} from "./menu-placement";
import { CHEVRON, MENU_STYLES } from "./menu-styles";
import type { MenuLook, MenuRequest, MenuStart } from "./shared";

type ShownItem = { entry: MenuItem; element: HTMLElement };
type Panel = {
  element: HTMLElement;
  items: ShownItem[];
  /** The item in the panel before this one that opened it; none for the menu itself. */
  openedBy?: HTMLElement;
};

// A submenu opens, or another one closes, once the pointer has rested on an item this long, so a pointer crossing
// an item on its way into a submenu leaves the submenu open.
const HOVER_ACTS_AFTER_MILLISECONDS = 120;
// A scroll this soon after the one before it is the page still gliding, from a wheel turned before the menu opened.
const GLIDE_GAP_MILLISECONDS = 150;

/* ---------- The menu's host: one element on the page, its panels in a shadow root ---------- */

function makeHost(look: MenuLook) {
  const host = document.createElement("div");
  host.setAttribute("data-site-menu", "");
  // Lenis, which eases the wheel on Earth's post, leaves a wheel over the menu to the menu.
  host.setAttribute("data-lenis-prevent", "");
  host.style.cssText =
    "position: fixed; inset: 0 auto auto 0; width: 0; height: 0; margin: 0; padding: 0; border: 0; " +
    "overflow: visible; background: none; z-index: 2147483647;";
  for (const [name, value] of Object.entries(look))
    host.style.setProperty(`--menu-${name}`, value);
  const shadow = host.attachShadow({ mode: "open" });
  const styles = document.createElement("style");
  styles.textContent = MENU_STYLES;
  shadow.append(styles);
  return { host, shadow };
}

const hasTopLayer = (element: HTMLElement) =>
  typeof element.showPopover === "function";

function showHost(host: HTMLElement) {
  document.body.append(host);
  if (!hasTopLayer(host)) return;
  host.popover = "manual";
  host.showPopover();
}

function removeHost(host: HTMLElement) {
  if (hasTopLayer(host) && host.matches(":popover-open")) host.hidePopover();
  host.remove();
}

/* ---------- Panels ---------- */

function makeItemElement(entry: MenuItem) {
  const element = document.createElement(
    entry.kind === "link" ? "a" : "button",
  );
  element.className = "item";
  element.setAttribute("role", "menuitem");
  element.tabIndex = -1;
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = entry.label;
  element.append(label);
  if (entry.kind === "link") {
    const link = element as HTMLAnchorElement;
    link.href = entry.address;
    link.draggable = false;
    if (isThePageShown(entry.address))
      link.setAttribute("aria-current", "page");
  } else {
    (element as HTMLButtonElement).type = "button";
  }
  if (entry.kind === "parent") {
    element.setAttribute("aria-haspopup", "menu");
    element.setAttribute("aria-expanded", "false");
    element.insertAdjacentHTML("beforeend", CHEVRON);
  }
  return element;
}

/** A label too long for the panel is cut short with an ellipsis, and its whole text shows on hover. */
function explainCutLabels(panel: Panel) {
  for (const { entry, element } of panel.items) {
    const label = element.querySelector(".label");
    if (label && label.scrollWidth > label.clientWidth)
      element.title = entry.label;
  }
}

function makeSeparator() {
  const separator = document.createElement("div");
  separator.className = "separator";
  separator.setAttribute("role", "separator");
  return separator;
}

function makePanel(entries: MenuEntry[], name: string): Panel {
  const element = document.createElement("div");
  element.className = "panel";
  element.setAttribute("role", "menu");
  element.setAttribute("aria-label", name);
  element.tabIndex = -1;
  const items: ShownItem[] = [];
  for (const entry of entries) {
    if (!isItem(entry)) {
      element.append(makeSeparator());
      continue;
    }
    const itemElement = makeItemElement(entry);
    items.push({ entry, element: itemElement });
    element.append(itemElement);
  }
  return { element, items };
}

/** Puts a panel on screen where `place` says, from the size it has once laid out. */
function showPanel(
  shadow: ShadowRoot,
  panel: Panel,
  place: (size: Size, firstItemInset: number) => Place,
) {
  const { element } = panel;
  element.style.visibility = "hidden";
  element.style.left = "0px";
  element.style.top = "0px";
  shadow.append(element);
  const box = element.getBoundingClientRect();
  const firstItem = panel.items[0]?.element.getBoundingClientRect();
  const firstItemInset = firstItem ? firstItem.top - box.top : 0;
  const { left, top } = place(
    { width: box.width, height: box.height },
    firstItemInset,
  );
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.visibility = "";
  explainCutLabels(panel);
}

/* ---------- The open menu ---------- */

function startMenu(start: MenuStart) {
  const { host, shadow } = makeHost(start.look);
  let panels: Panel[] = [];
  let focusBefore: Element | null = null;
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  let hovered: HTMLElement | null = null;
  let stopWatching: (() => void) | null = null;

  const isOpen = () => panels.length > 0;
  const isInsideTheMenu = (event: Event) => event.composedPath().includes(host);

  function itemAt(element: Element | null) {
    for (const [level, panel] of panels.entries()) {
      const index = panel.items.findIndex((item) => item.element === element);
      if (index >= 0) return { level, index, item: panel.items[index] };
    }
    return null;
  }
  const focusedItem = () => itemAt(shadow.activeElement);
  const focus = (element: HTMLElement) =>
    element.focus({ preventScroll: true });

  /** The panel the keys act on: the one holding the focused item, or the menu itself. */
  function panelInUse() {
    const focused = focusedItem();
    if (focused) return { level: focused.level, index: focused.index };
    const level = panels.findIndex(
      (panel) => panel.element === shadow.activeElement,
    );
    return { level: Math.max(0, level), index: -1 };
  }

  function closePanelsAfter(level: number) {
    for (const panel of panels.splice(level + 1)) {
      panel.openedBy?.setAttribute("aria-expanded", "false");
      panel.element.remove();
    }
  }

  function openSubmenu(level: number, index: number, focusFirst: boolean) {
    const parentPanel = panels[level];
    const { entry, element } = parentPanel.items[index];
    if (entry.kind !== "parent") return;
    const alreadyOpen = panels[level + 1]?.openedBy === element;
    if (!alreadyOpen) {
      closePanelsAfter(level);
      const submenu = {
        ...makePanel(entry.items, entry.label),
        openedBy: element,
      };
      element.setAttribute("aria-expanded", "true");
      panels.push(submenu);
      const parentBox = parentPanel.element.getBoundingClientRect();
      const itemBox = element.getBoundingClientRect();
      showPanel(shadow, submenu, (size, firstItemInset) =>
        placeBeside(parentBox, itemBox, size, firstItemInset, windowSize()),
      );
    }
    const first = panels[level + 1].items[0];
    if (focusFirst && first) focus(first.element);
  }

  function close({ restoreFocus }: { restoreFocus: boolean }) {
    if (!isOpen()) return;
    clearTimeout(hoverTimer);
    stopWatching?.();
    stopWatching = null;
    closePanelsAfter(-1);
    hovered = null;
    removeHost(host);
    const returnTo = focusBefore;
    focusBefore = null;
    if (
      restoreFocus &&
      returnTo instanceof HTMLElement &&
      returnTo !== document.body &&
      returnTo.isConnected
    )
      focus(returnTo);
  }

  function choose(level: number, index: number, byKeyboard: boolean) {
    const { entry } = panels[level].items[index];
    if (entry.kind === "parent") return openSubmenu(level, index, byKeyboard);
    if (entry.kind === "link") {
      close({ restoreFocus: false });
      location.assign(entry.address);
      return;
    }
    close({ restoreFocus: true });
    entry.run();
  }

  /* ---------- Keys ---------- */

  function moveFocus(level: number, index: number, step: number) {
    const { items } = panels[level];
    if (!items.length) return;
    const from = index < 0 ? (step > 0 ? -1 : 0) : index;
    const next = (from + step + items.length) % items.length;
    focus(items[next].element);
  }

  function backToTheParent(level: number) {
    const openedBy = panels[level].openedBy;
    closePanelsAfter(level - 1);
    if (openedBy) focus(openedBy);
  }

  const hasModifier = (event: KeyboardEvent) =>
    event.ctrlKey || event.metaKey || event.altKey;

  // Every key belongs to the menu while it is open, so a page's own keys (Earth's arrows turn its pages, the
  // homepage's Escape closes a post) wait. The browser's own shortcuts still work.
  function onKey(event: KeyboardEvent) {
    event.stopPropagation();
    if (hasModifier(event) || event.isComposing) return;
    // The keys take over from the pointer: a submenu the pointer was about to open waits for it to move again.
    clearTimeout(hoverTimer);
    hovered = null;
    const { level, index } = panelInUse();
    const focused = index >= 0 ? panels[level].items[index] : null;
    switch (event.key) {
      case "ArrowDown":
        moveFocus(level, index, 1);
        break;
      case "ArrowUp":
        moveFocus(level, index, -1);
        break;
      case "Home":
        moveFocus(level, -1, 1);
        break;
      case "End":
        moveFocus(level, 0, -1);
        break;
      case "ArrowRight":
        if (focused?.entry.kind === "parent") openSubmenu(level, index, true);
        break;
      case "ArrowLeft":
        if (level > 0) backToTheParent(level);
        break;
      case "Enter":
      case " ":
        if (focused) choose(level, index, true);
        break;
      case "Escape":
        if (level > 0) backToTheParent(level);
        else close({ restoreFocus: true });
        break;
      case "Tab":
        close({ restoreFocus: true });
        return;
      default:
        return;
    }
    event.preventDefault();
  }

  /* ---------- The pointer ---------- */

  function onPointerMove(event: PointerEvent) {
    const found = itemAt((event.target as Element).closest?.(".item") ?? null);
    if (!found || found.item.element === hovered) return;
    const { level, index, item } = found;
    hovered = item.element;
    focus(item.element);
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      if (panels[level]?.items[index] !== item) return;
      if (item.entry.kind === "parent") openSubmenu(level, index, false);
      else closePanelsAfter(level);
    }, HOVER_ACTS_AFTER_MILLISECONDS);
  }

  // A click with Ctrl, Shift or the Command key opens a page in a new tab or window, as on any link.
  const opensElsewhere = (event: MouseEvent) =>
    event.ctrlKey || event.shiftKey || event.metaKey || event.button !== 0;

  function onClick(event: MouseEvent) {
    const found = itemAt((event.target as Element).closest?.(".item") ?? null);
    if (!found) return;
    const isLink = found.item.entry.kind === "link";
    // The middle button only ever opens a link elsewhere.
    if (event.type === "auxclick" && !isLink) return;
    if (isLink && opensElsewhere(event)) {
      close({ restoreFocus: false });
      return;
    }
    event.preventDefault();
    clearTimeout(hoverTimer);
    choose(found.level, found.index, event.detail === 0);
  }

  shadow.addEventListener("pointermove", (event) =>
    onPointerMove(event as PointerEvent),
  );
  shadow.addEventListener("click", (event) => onClick(event as MouseEvent));
  shadow.addEventListener("auxclick", (event) => onClick(event as MouseEvent));
  // A press in the menu is the menu's: the homepage would throw an asteroid from it.
  host.addEventListener("pointerdown", (event) => event.stopPropagation());

  /* ---------- Ways out ---------- */

  function closesOnANewScroll() {
    let lastScrollAt = performance.now();
    let pageWasStill = false;
    return (event: Event) => {
      if (isInsideTheMenu(event)) return;
      const now = performance.now();
      if (now - lastScrollAt > GLIDE_GAP_MILLISECONDS) pageWasStill = true;
      lastScrollAt = now;
      if (pageWasStill) close({ restoreFocus: true });
    };
  }

  /** A wheel turned over a panel that scrolls (a long list of posts) scrolls it; anywhere else it closes the menu. */
  function scrollsAPanel(event: WheelEvent) {
    if (!isInsideTheMenu(event)) return false;
    const panel = panels.find((shown) =>
      event.composedPath().includes(shown.element),
    );
    return !!panel && panel.element.scrollHeight > panel.element.clientHeight;
  }

  function watchTheWayOut() {
    const closeAndReturn = () => close({ restoreFocus: true });
    const pressedElsewhere = (event: PointerEvent) => {
      if (!isInsideTheMenu(event)) closeAndReturn();
    };
    const wheelTurned = (event: WheelEvent) => {
      if (!scrollsAPanel(event)) closeAndReturn();
    };
    const scrolled = closesOnANewScroll();
    const listeners: [string, EventListener, AddEventListenerOptions][] = [
      ["keydown", onKey as EventListener, { capture: true }],
      ["pointerdown", pressedElsewhere as EventListener, { capture: true }],
      ["wheel", wheelTurned as EventListener, { capture: true, passive: true }],
      ["scroll", scrolled, { capture: true, passive: true }],
      ["resize", closeAndReturn, {}],
      ["blur", closeAndReturn, {}],
    ];
    for (const [type, listener, options] of listeners)
      addEventListener(type, listener, options);
    return () => {
      for (const [type, listener, options] of listeners)
        removeEventListener(type, listener, options);
    };
  }

  /* ---------- Opening ---------- */

  function open(request: MenuRequest) {
    // A right click on the menu itself leaves it as it is.
    if (isOpen() && request.target === host) return;
    const returnTo = isOpen() ? focusBefore : document.activeElement;
    close({ restoreFocus: false });
    focusBefore = returnTo;
    showHost(host);
    const menu = makePanel(menuEntries(start.posts), "Site menu");
    panels = [menu];
    showPanel(shadow, menu, (size) =>
      placeAtPoint(
        { x: request.pointX, y: request.pointY },
        size,
        windowSize(),
      ),
    );
    const first = menu.items[0];
    focus(request.byKeyboard && first ? first.element : menu.element);
    stopWatching = watchTheWayOut();
  }

  return open;
}

const start = window.siteMenu;
if (start && !start.open) {
  start.open = startMenu(start);
  const waiting = start.waiting;
  start.waiting = undefined;
  if (waiting) start.open(waiting);
}
