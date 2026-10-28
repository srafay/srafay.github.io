/*
  Every way a hand handles the spacetime, read in one place. The stage takes each gesture itself. It has
  touch-action none, so a phone neither scrolls the page, pulls to refresh, nor zooms the page under it.

  One finger: once it has moved a little, the way it moved most decides the whole gesture. Up or down travels
  through time and carries on after it lifts. Sideways turns the spacetime around the moment in view.

  A mouse: a drag turns, any way. The wheel travels. With Ctrl, which is also how a trackpad's pinch arrives, the
  wheel zooms. A trackpad's sideways scroll turns.

  Two fingers: a pinch zooms. Safari's own pinch on a Mac trackpad zooms too.

  A tap opens what it lands on. A second tap soon after and close by flies there and zooms in.

  Keys: up and down travel, left and right turn, plus and minus zoom.
*/
import type { ScrollReader } from "@/lib/about-cv/scene/scroll";

export type GestureHandlers = {
  travel: ScrollReader;
  turnBy(across: number, up: number): void;
  /** Negative nearer the moment, positive out toward the whole life. */
  zoomBy(amount: number): void;
  tap(clientX: number, clientY: number): void;
  doubleTap(clientX: number, clientY: number): void;
  /** A mouse over the stage with no button down. */
  hover(clientX: number, clientY: number): void;
  /** A finger or a button has come down on the stage. */
  press(clientX: number, clientY: number, pointerType: string): void;
  leave(): void;
  /** Any gesture at all has begun: the hint goes, and the turntable stops. */
  began(): void;
};

/** How far a finger may move and still be a tap, and how far it moves before its gesture is decided, in pixels. */
const TAP_SLOP = 8;
const TAP_LONGEST_MILLISECONDS = 600;
/** A second tap this soon and this near the first is a double tap. */
const DOUBLE_TAP_MILLISECONDS = 320;
const DOUBLE_TAP_REACH = 28;
/** How far a pixel of drag turns the spacetime, in radians: a phone's width turns it about a hundred degrees. */
const TURN_PER_PIXEL = 0.0045;
/** A trackpad's sideways scroll turns more gently than a drag. */
const TURN_PER_SCROLLED_PIXEL = 0.003;
/** How much a pinch zooms: spreading the fingers twice as far apart zooms in by about 0.8 of the travel-to-whole. */
const ZOOM_PER_PINCH = 1.2;
/** How much Ctrl and the wheel zoom per pixel, and the most one wheel step may zoom. */
const ZOOM_PER_WHEEL_PIXEL = 0.004;
const LARGEST_WHEEL_ZOOM = 0.3;
/** One press of plus or minus, or of the buttons. */
export const ZOOM_STEP = 0.25;
/** One press of left or right, in radians, and of up or down, in pixels of travel. */
const TURN_STEP = 0.15;
const TRAVEL_STEP_SHARE_OF_SCREEN = 0.5;
/** How far back in time a swipe's speed is read from, so the carrying on matches the finger's last movement. */
const SPEED_WINDOW_MILLISECONDS = 100;
/** A line or a page of wheel, in pixels, for wheels that count in lines or pages. */
const WHEEL_LINE_PIXELS = 40;

/**
  What each version tells the recogniser about its own page. ownPointers: elements on the stage that take their own
  pointers, so a press on them is never a gesture on the scene. scrollsItself: the panels among them that the wheel
  scrolls (a card, a sheet). keysStayInside: where the keys belong to the element, not the scene.
*/
export type GestureOptions = {
  ownPointers: string;
  scrollsItself: string;
  keysStayInside: string;
};

type Way = "undecided" | "travel" | "turn" | "pinch";

export function listenForGestures(stage: HTMLElement, handlers: GestureHandlers, options: GestureOptions) {
  const ownsItsPointer = (target: EventTarget | null) =>
    target instanceof Element && target.closest(options.ownPointers) !== null;
  const pointers = new Map<number, { x: number; y: number; type: string }>();
  let way: Way = "undecided";
  let start = { x: 0, y: 0, time: 0 };
  let pinchDistance = 0;
  let samples: { time: number; y: number }[] = [];
  let lastTap = { x: 0, y: 0, time: -Infinity };

  const currentPinch = () => {
    const [first, second] = [...pointers.values()];
    return first && second ? Math.hypot(first.x - second.x, first.y - second.y) : 0;
  };

  stage.addEventListener("pointerdown", (event) => {
    if (ownsItsPointer(event.target)) return;
    handlers.began();
    handlers.travel.stop();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, type: event.pointerType });
    try {
      // The gesture keeps its pointer even when it leaves the stage, over a control or off the window.
      stage.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer knows (a synthetic one) cannot be captured, and needs not be.
    }
    if (pointers.size === 1) {
      way = "undecided";
      start = { x: event.clientX, y: event.clientY, time: performance.now() };
      samples = [{ time: start.time, y: event.clientY }];
      handlers.press(event.clientX, event.clientY, event.pointerType);
    } else {
      way = "pinch";
      pinchDistance = currentPinch();
    }
  });

  stage.addEventListener("pointermove", (event) => {
    const last = pointers.get(event.pointerId);
    if (!last) {
      if (event.pointerType === "mouse" && !event.buttons) handlers.hover(event.clientX, event.clientY);
      return;
    }
    const moved = { x: event.clientX - last.x, y: event.clientY - last.y };
    last.x = event.clientX;
    last.y = event.clientY;
    if (way === "pinch") {
      const distance = currentPinch();
      if (pinchDistance > 0 && distance > 0) handlers.zoomBy(-Math.log(distance / pinchDistance) * ZOOM_PER_PINCH);
      pinchDistance = distance;
      return;
    }
    if (way === "undecided") {
      const across = event.clientX - start.x;
      const down = event.clientY - start.y;
      if (Math.hypot(across, down) < TAP_SLOP) return;
      // A mouse drag always turns. A finger travels when it moved more up or down than sideways.
      way = last.type === "mouse" || Math.abs(across) > Math.abs(down) ? "turn" : "travel";
    }
    if (way === "turn") handlers.turnBy(-moved.x * TURN_PER_PIXEL, moved.y * TURN_PER_PIXEL);
    else {
      // A finger moving up goes back in time, as scrolling down the page did.
      handlers.travel.moveBy(-moved.y);
      const now = performance.now();
      samples.push({ time: now, y: event.clientY });
      samples = samples.filter((sample) => now - sample.time <= SPEED_WINDOW_MILLISECONDS);
    }
  });

  const finish = (event: PointerEvent, cancelled: boolean) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size > 0) {
      // One finger of a pinch lifted: what is left is not a new gesture.
      pinchDistance = currentPinch();
      return;
    }
    const now = performance.now();
    if (way === "travel" && !cancelled) {
      const first = samples[0];
      const span = (now - first.time) / 1000;
      if (span > 0.008) handlers.travel.release(-(event.clientY - first.y) / span);
    }
    const isTap =
      way === "undecided" &&
      !cancelled &&
      now - start.time < TAP_LONGEST_MILLISECONDS &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) < TAP_SLOP;
    way = "undecided";
    if (!isTap) return handlers.leave();
    const isDouble =
      now - lastTap.time < DOUBLE_TAP_MILLISECONDS &&
      Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < DOUBLE_TAP_REACH;
    if (isDouble) {
      lastTap = { x: 0, y: 0, time: -Infinity };
      handlers.doubleTap(event.clientX, event.clientY);
    } else {
      lastTap = { x: event.clientX, y: event.clientY, time: now };
      handlers.tap(event.clientX, event.clientY);
    }
  };
  stage.addEventListener("pointerup", (event) => finish(event, false));
  stage.addEventListener("pointercancel", (event) => finish(event, true));
  stage.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse" && !pointers.size) handlers.leave();
  });

  stage.addEventListener(
    "wheel",
    (event) => {
      if (ownsItsPointer(event.target) && (event.target as Element).closest(options.scrollsItself)) return;
      event.preventDefault();
      handlers.began();
      const unit = event.deltaMode === 1 ? WHEEL_LINE_PIXELS : event.deltaMode === 2 ? stage.clientHeight : 1;
      const down = event.deltaY * unit;
      const across = event.deltaX * unit;
      if (event.ctrlKey) {
        const amount = down * ZOOM_PER_WHEEL_PIXEL;
        handlers.zoomBy(Math.max(-LARGEST_WHEEL_ZOOM, Math.min(LARGEST_WHEEL_ZOOM, amount)));
      } else if (Math.abs(across) > Math.abs(down)) handlers.turnBy(-across * TURN_PER_SCROLLED_PIXEL, 0);
      else handlers.travel.moveBy(down);
    },
    { passive: false },
  );

  // Safari: a Mac trackpad's pinch arrives as its own gesture events. On a phone the fingers' pointers zoom instead,
  // so these only stop the page from zooming there.
  let gestureScale = 1;
  const fromSafari = (event: Event) => {
    event.preventDefault();
    const scale = (event as Event & { scale?: number }).scale ?? 1;
    if (event.type === "gesturestart") gestureScale = scale;
    else if (event.type === "gesturechange" && !pointers.size) {
      handlers.began();
      handlers.zoomBy(-Math.log(scale / gestureScale) * ZOOM_PER_PINCH);
      gestureScale = scale;
    }
  };
  for (const type of ["gesturestart", "gesturechange", "gestureend"])
    stage.addEventListener(type, fromSafari, { passive: false });
}

/** Keys anywhere on the page, unless typing, on the year rail (it has its own arrows) or in a card or the sheet. */
export function listenForKeys(handlers: GestureHandlers, stageHeight: () => number, options: GestureOptions) {
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as Element | null;
    if (target?.closest(`input, textarea, [role=slider], ${options.keysStayInside}`)) return;
    const travelStep = stageHeight() * TRAVEL_STEP_SHARE_OF_SCREEN;
    const actions: Record<string, () => void> = {
      ArrowDown: () => handlers.travel.moveBy(travelStep),
      ArrowUp: () => handlers.travel.moveBy(-travelStep),
      PageDown: () => handlers.travel.moveBy(travelStep * 2),
      PageUp: () => handlers.travel.moveBy(-travelStep * 2),
      ArrowLeft: () => handlers.turnBy(TURN_STEP, 0),
      ArrowRight: () => handlers.turnBy(-TURN_STEP, 0),
      "+": () => handlers.zoomBy(-ZOOM_STEP),
      "=": () => handlers.zoomBy(-ZOOM_STEP),
      "-": () => handlers.zoomBy(ZOOM_STEP),
      _: () => handlers.zoomBy(ZOOM_STEP),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    handlers.began();
    action();
  });
}
