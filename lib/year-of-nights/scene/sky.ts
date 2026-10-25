/*
  The sky's conductor. It keeps the story's numbers, follows the scroll, the pointer and taps, and draws a frame only
  when something changed: the intro, a flight, a tap's bloom, a count, or a step of the slow drift. It stops drawing
  while the sky is off screen or the page is hidden.
*/
import {
  cameraForFrame,
  cut,
  flight,
  project,
  type Camera,
  type Frame,
  type Stage,
} from "./camera";
import {
  advanceCounts,
  collectCountUps,
  startCountsOf,
  type CountUp,
} from "./count-up";
import { DayCard, dayAfterKey, nearestDay } from "./day-reader";
import {
  canvasPixelRatio,
  driftFramesPerSecond,
  isTouchScreen,
  prefersReducedMotion,
  tickUnderFinger,
} from "./environment";
import {
  collectLabels,
  keepOnScreen,
  measureLabels,
  placeLabel,
  type AnchoredLabel,
} from "./labels";
import { clamp, follow, heldSteps, mix, smoothstep } from "./motion";
import {
  Painter,
  type Bloom,
  type SkyColours,
  type TextLine,
  type TextStar,
} from "./painter";
import {
  measureStory,
  panelOpacity,
  panelTop,
  stageTop,
  storyFlow,
  storyPosition,
  type StoryLayout,
  type StoryPosition,
} from "./story";
import { measureWordStars, wordStarPairs, type WordStar } from "./text-stars";
import {
  anchors,
  busiestIndex,
  firstIndexOfMonth,
  galaxyDays,
  sceneFrames,
  SCENES,
  starRegion,
  stepCountOf,
  type SceneName,
} from "./world";

/** The intro: the days arrive in about 1.5 s, the name settles by about 2 s. */
const INTRO_SECONDS = 2.4;
const CAMERA_TIME_CONSTANT = 0.16;
const POINTER_TIME_CONSTANT = 0.5;
const POINTER_REACH = { x: 70, y: 46 };
const NAME_POINTER_SHIFT = { x: 12, y: 8 };
const YEAR_SCENE = SCENES.indexOf("year");
const CAREER_SCENE = SCENES.indexOf("career");
const CODE_SCENE = SCENES.indexOf("code");
const TOOLS_SCENE = SCENES.indexOf("tools");
/** Taps and hovers read the galaxy only while it is the scene. */
const GALAXY_READABLE_UNTIL = 1.4;

type Elements = {
  root: HTMLElement;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  sections: HTMLElement[];
  panels: HTMLElement[];
  name: HTMLElement | null;
  reader: HTMLElement | null;
  yearSteps: HTMLElement[];
  card: DayCard;
};

function findElements(root: HTMLElement): Elements {
  const sections = [...root.querySelectorAll<HTMLElement>("[data-sky-scene]")];
  return {
    root,
    stage: root.querySelector<HTMLElement>("[data-sky-stage]")!,
    canvas: root.querySelector<HTMLCanvasElement>("[data-sky-canvas]")!,
    sections,
    panels: sections.map((section) =>
      section.querySelector<HTMLElement>("[data-sky-panel]")!,
    ),
    name: root.querySelector<HTMLElement>("[data-sky-name]"),
    reader: root.querySelector<HTMLElement>("[data-sky-reader]"),
    yearSteps: [...root.querySelectorAll<HTMLElement>("[data-sky-step]")],
    card: new DayCard(
      root.querySelector<HTMLElement>("[data-sky-day-card]")!,
      root.querySelector<HTMLElement>("[data-sky-day-date]")!,
      root.querySelector<HTMLElement>("[data-sky-day-count]")!,
    ),
  };
}

/** The sky's colours, as the page's stylesheet sets them for the theme in use. */
function readColours(root: HTMLElement): SkyColours {
  const style = getComputedStyle(root);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    ground: read("--sky-ground"),
    starlight: read("--sky-starlight"),
    gold: read("--sky-gold"),
    dim: read("--sky-dim"),
  };
}

const mixCameras = (from: Camera, to: Camera, amount: number): Camera => ({
  x: mix(from.x, to.x, amount),
  y: mix(from.y, to.y, amount),
  z: mix(from.z, to.z, amount),
});

export class Sky {
  private readonly elements: Elements;
  private readonly painter: Painter;
  private readonly still = prefersReducedMotion();
  private readonly finger = isTouchScreen();
  private readonly anchorPlaces = anchors();
  private readonly labels: AnchoredLabel[];
  private readonly countUps: CountUp[];
  private stage: Stage = { width: 1, height: 1 };
  private layout!: StoryLayout;
  private frames!: Record<SceneName, Frame[]>;
  private cameras!: Record<SceneName, Camera[]>;
  private wordStars: WordStar[] = [];
  private camera: Camera | null = null;
  private scrollY = window.scrollY;
  private pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  private introStartedAt = NaN;
  private introOver = false;
  private loopFrame = 0;
  private lastFrameAt = 0;
  private lastDrawnAt = 0;
  private needsDraw = true;
  private onScreen = true;
  private selectedDay = -1;
  private bloom: Bloom | null = null;
  private written = new Map<HTMLElement, Record<string, string>>();

  constructor(root: HTMLElement) {
    this.elements = findElements(root);
    this.painter = new Painter(
      this.elements.canvas,
      Array.from({ length: 12 }, (_, index) => firstIndexOfMonth(index + 1)),
    );
    this.labels = collectLabels(
      root,
      this.anchorPlaces,
      this.elements.sections,
    );
    this.countUps = this.still ? [] : collectCountUps(this.elements.sections);
  }

  start() {
    const { root } = this.elements;
    root.dataset.skyMotion = this.still ? "still" : "full";
    this.painter.setColours(readColours(root));
    root.dataset.skyState = this.still ? "live" : "intro";
    this.measure();
    this.listen();
    this.introStartedAt = performance.now() / 1000;
    if (this.still) this.introOver = true;
    else
      setTimeout(() => {
        this.introOver = true;
        root.dataset.skyState = "live";
        this.requestFrame();
      }, INTRO_SECONDS * 1000);
    this.requestFrame();
  }

  /** Everything read from the page's layout: on start, on resize and when the fonts arrive. Never in a frame. */
  private measure() {
    const { stage, canvas, root, sections } = this.elements;
    this.stage = { width: stage.clientWidth, height: stage.clientHeight };
    this.painter.resize(this.stage, canvasPixelRatio());
    this.painter.forgetPreviousFrame();
    canvas.style.width = `${this.stage.width}px`;
    canvas.style.height = `${this.stage.height}px`;
    this.layout = measureStory(root, stage, sections);
    this.frames = sceneFrames(this.stage);
    this.cameras = Object.fromEntries(
      SCENES.map((scene) => [
        scene,
        this.frames[scene].map((frame) =>
          cameraForFrame(frame, starRegion(scene, this.stage), this.stage),
        ),
      ]),
    ) as Record<SceneName, Camera[]>;
    this.wordStars = measureWordStars(sections);
    measureLabels(this.labels);
    this.camera = null;
    this.needsDraw = true;
  }

  private listen() {
    const { root, stage, reader } = this.elements;
    addEventListener(
      "scroll",
      () => {
        this.scrollY = window.scrollY;
        this.requestFrame();
      },
      { passive: true },
    );
    let lastWidth = this.stage.width;
    let lastHeight = this.stage.height;
    new ResizeObserver(() => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const rootChanged =
        this.layout &&
        root.getBoundingClientRect().height !== this.layout.rootHeight;
      if (width === lastWidth && height === lastHeight && !rootChanged) return;
      lastWidth = width;
      lastHeight = height;
      this.measure();
      this.requestFrame();
    }).observe(root);
    document.fonts?.addEventListener?.("loadingdone", () => {
      this.measure();
      this.requestFrame();
    });
    new MutationObserver(() => {
      this.painter.setColours(readColours(root));
      this.needsDraw = true;
      this.requestFrame();
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    new IntersectionObserver(([entry]) => {
      this.onScreen = entry.isIntersecting;
      if (this.onScreen) this.requestFrame();
    }).observe(root);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.lastFrameAt = 0;
        this.requestFrame();
      }
    });
    addEventListener("pageshow", () => this.requestFrame());
    if (!this.finger && !this.still)
      addEventListener(
        "pointermove",
        (event) => {
          if (event.pointerType !== "mouse") return;
          this.pointer.targetX = (event.clientX / this.stage.width) * 2 - 1;
          this.pointer.targetY = (event.clientY / this.stage.height) * 2 - 1;
          this.hoverAt(event.clientX, event.clientY);
          this.requestFrame();
        },
        { passive: true },
      );
    root.addEventListener("click", (event) => this.tapAt(event));
    if (reader) {
      reader.tabIndex = 0;
      reader.addEventListener("keydown", (event) => this.readByKey(event));
      reader.addEventListener("focus", () => this.select(busiestIndex, 0.6));
      reader.addEventListener("blur", () => this.select(-1, 0));
    }
  }

  private requestFrame() {
    if (this.loopFrame || !this.onScreen || document.hidden) return;
    this.loopFrame = requestAnimationFrame(this.frame);
  }

  private flowNow() {
    return storyFlow(storyPosition(this.layout, this.scrollY));
  }

  /* Reading the galaxy's days. */

  private stagePoint(clientX: number, clientY: number) {
    return { x: clientX, y: clientY - stageTop(this.layout, this.scrollY) };
  }

  private hoverAt(clientX: number, clientY: number) {
    if (this.flowNow() > GALAXY_READABLE_UNTIL) return;
    const point = this.stagePoint(clientX, clientY);
    const day = nearestDay(this.painter.drawnDays, point.x, point.y, false);
    if (day >= 0 && day !== this.selectedDay) this.select(day, 0.55);
  }

  private tapAt(event: MouseEvent) {
    const target = event.target as Element;
    if (target.closest("a, button, summary, input, [data-sky-day-card]"))
      return;
    if (this.flowNow() > GALAXY_READABLE_UNTIL) return;
    const isFinger =
      (event as PointerEvent).pointerType === "touch" || this.finger;
    const point = this.stagePoint(event.clientX, event.clientY);
    const day = nearestDay(this.painter.drawnDays, point.x, point.y, isFinger);
    if (day < 0) {
      this.select(-1, 0);
      return;
    }
    this.select(day, 1);
    tickUnderFinger();
  }

  private readByKey(event: KeyboardEvent) {
    if (event.key === "Escape") {
      this.select(-1, 0);
      return;
    }
    const next = dayAfterKey(event.key, this.selectedDay, busiestIndex);
    if (next === this.selectedDay) return;
    event.preventDefault();
    this.select(next, 0.6);
  }

  private select(dayIndex: number, strength: number) {
    this.selectedDay = dayIndex;
    this.elements.card.show(dayIndex);
    this.bloom =
      dayIndex >= 0 && !this.still
        ? { dayIndex, startedAt: performance.now() / 1000, strength }
        : null;
    this.needsDraw = true;
    this.requestFrame();
  }

  /* The camera. */

  private restingCamera(scene: SceneName, hold: number) {
    const steps = this.cameras[scene];
    const step = this.still
      ? Math.round(hold * (steps.length - 1))
      : heldSteps(hold, steps.length);
    const lower = Math.floor(step);
    const upper = Math.min(steps.length - 1, lower + 1);
    const camera = mixCameras(steps[lower], steps[upper], step - lower);
    if (this.still) return camera;
    // The scroll moves the camera a little closer while a scene holds, so the sky answers every scroll.
    const frame = this.frames[scene][Math.round(step)];
    return { ...camera, z: camera.z + (frame.z - camera.z) * 0.06 * hold };
  }

  private storyCamera(position: StoryPosition): Camera {
    const scene = SCENES[position.sceneIndex];
    if (position.slide <= 0 || position.sceneIndex >= SCENES.length - 1)
      return this.restingCamera(scene, position.hold);
    const steps = this.cameras[scene];
    const from = steps[steps.length - 1];
    const to = this.cameras[SCENES[position.sceneIndex + 1]][0];
    return this.still
      ? cut(from, to, position.slide)
      : flight(from, to, position.slide);
  }

  /** The pointer's parallax, on top of where the story puts the camera. */
  private withPointer(camera: Camera): Camera {
    if (this.still) return camera;
    return {
      x: camera.x + this.pointer.x * POINTER_REACH.x,
      y: camera.y + this.pointer.y * POINTER_REACH.y,
      z: camera.z,
    };
  }

  /**
   * The slow drift, added to the camera as it is drawn. It is kept apart from the camera the story moves, so a sky
   * that only drifts is known to be still otherwise and can be drawn at the drift's own slower pace.
   */
  private withDrift(camera: Camera, seconds: number): Camera {
    if (this.still) return camera;
    return {
      x: camera.x + 16 * Math.sin(seconds * 0.11),
      y: camera.y + 11 * Math.sin(seconds * 0.083 + 1.3),
      z: camera.z,
    };
  }

  /** Moves the drawn camera toward its target. Returns how far it moved, so a still sky stops drawing. */
  private followCamera(target: Camera, elapsed: number) {
    if (!this.camera || this.still) {
      const moved = this.camera
        ? Math.abs(this.camera.z - target.z) +
          Math.abs(this.camera.x - target.x)
        : 1;
      this.camera = target;
      return moved;
    }
    const previous = this.camera;
    this.camera = {
      x: follow(previous.x, target.x, elapsed, CAMERA_TIME_CONSTANT),
      y: follow(previous.y, target.y, elapsed, CAMERA_TIME_CONSTANT),
      z: follow(previous.z, target.z, elapsed, CAMERA_TIME_CONSTANT),
    };
    return (
      Math.abs(this.camera.x - previous.x) +
      Math.abs(this.camera.y - previous.y) +
      Math.abs(this.camera.z - previous.z)
    );
  }

  /* The frame. */

  private readonly frame = (now: number) => {
    this.loopFrame = 0;
    const seconds = now / 1000;
    const elapsed = this.lastFrameAt
      ? Math.min(0.1, seconds - this.lastFrameAt)
      : 1 / 60;
    this.lastFrameAt = seconds;
    this.pointer.x = follow(
      this.pointer.x,
      this.pointer.targetX,
      elapsed,
      POINTER_TIME_CONSTANT,
    );
    this.pointer.y = follow(
      this.pointer.y,
      this.pointer.targetY,
      elapsed,
      POINTER_TIME_CONSTANT,
    );
    const position = storyPosition(this.layout, this.scrollY);
    const moved = this.followCamera(
      this.withPointer(this.storyCamera(position)),
      elapsed,
    );
    const introRunning = !this.introOver;
    const bloomRunning = !!this.bloom && seconds - this.bloom.startedAt < 1.2;
    const pointerSettling =
      Math.abs(this.pointer.x - this.pointer.targetX) +
        Math.abs(this.pointer.y - this.pointer.targetY) >
      0.002;
    const counting = advanceCounts(this.countUps, seconds);
    const busy =
      introRunning ||
      bloomRunning ||
      counting ||
      pointerSettling ||
      moved > 0.02 ||
      this.needsDraw;
    const drifting = !this.still;
    const driftStepDue =
      seconds - this.lastDrawnAt >= 1 / driftFramesPerSecond() - 0.004;
    if (busy || (drifting && driftStepDue)) {
      this.draw(position, seconds);
      this.lastDrawnAt = seconds;
      this.needsDraw = false;
    }
    if (busy || drifting) this.requestFrame();
  };

  private draw(position: StoryPosition, seconds: number) {
    const flow = storyFlow(position);
    const camera = this.withDrift(this.camera!, seconds);
    const yearStep = this.stepOf(position, YEAR_SCENE);
    const yearLight =
      smoothstep(0.55, 0.95, flow) * (1 - smoothstep(1.3, 1.6, flow));
    const careerStep = this.stepOf(position, CAREER_SCENE);
    const careerLight =
      smoothstep(1.55, 1.95, flow) * (1 - smoothstep(2.4, 2.7, flow));
    const introSeconds = this.introOver
      ? Infinity
      : seconds - this.introStartedAt;
    const { textStars, textLines } = this.textStarsFor(position);
    this.painter.draw({
      camera,
      stage: this.stage,
      seconds,
      introSeconds,
      galaxyTurn: this.still ? 0 : 0.014 * Math.sin(seconds * 0.07),
      twinkles: !this.still,
      streaks: !this.still,
      yearHighlights: [0, 1, 2].map(
        (part) => yearLight * clamp(1 - Math.abs(yearStep - part) * 1.6),
      ) as [number, number, number],
      careerStep,
      careerLight,
      codeLight: smoothstep(2.6, 2.95, flow) * (1 - smoothstep(3.4, 3.7, flow)),
      monthNameLight: 1 - smoothstep(1.2, 1.55, flow),
      worldLight:
        1 - 0.5 * smoothstep(TOOLS_SCENE - 0.6, TOOLS_SCENE - 0.1, flow),
      selectedDay: this.selectedDay,
      bloom: this.bloom,
      textStars,
      textLines,
    });
    this.placeLabels(flow, careerStep, yearStep, camera);
    this.placeCard(flow);
    this.writePanels(position, yearStep);
    this.moveName(position);
    for (let scene = 0; scene < SCENES.length; scene++)
      if (flow >= scene - 0.3) startCountsOf(this.countUps, scene, seconds);
  }

  /** The part of a scene the story is on: its held step while it holds, its first before it, its last after it. */
  private stepOf(position: StoryPosition, sceneIndex: number) {
    const steps = stepCountOf(SCENES[sceneIndex]);
    if (position.sceneIndex < sceneIndex) return 0;
    if (position.sceneIndex > sceneIndex) return steps - 1;
    return this.still
      ? Math.round(position.hold * (steps - 1))
      : heldSteps(position.hold, steps);
  }

  private textStarsFor(position: StoryPosition): {
    textStars: TextStar[];
    textLines: TextLine[];
  } {
    const top = stageTop(this.layout, this.scrollY);
    const placeOf = (star: WordStar) => ({
      x: star.x,
      y: star.y + panelTop(this.layout, star.sceneIndex, this.scrollY) - top,
    });
    const textStars = this.wordStars.map((star) => ({
      ...placeOf(star),
      coreRadius: star.coreRadius,
      alpha: panelOpacity(position, star.sceneIndex),
      colour: star.colour,
    }));
    const textLines = wordStarPairs(this.wordStars).map((pair) => ({
      from: placeOf(pair.from),
      to: placeOf(pair.to),
      alpha: 0.4 * panelOpacity(position, pair.from.sceneIndex),
    }));
    return { textStars, textLines };
  }

  /** How much a label shows, by its name and where the story is. */
  private labelOpacity(
    name: string,
    flow: number,
    careerStep: number,
    yearStep: number,
  ) {
    const kind = name.split(":")[0];
    if (kind === "busiest") {
      if (this.selectedDay === busiestIndex || !this.introOver) return 0;
      // The busiest day keeps its name on the first screen and while the year scene is on it, not after.
      return (
        (1 - smoothstep(0.3, 0.6, yearStep)) * (1 - smoothstep(1.1, 1.3, flow))
      );
    }
    if (kind === "repository")
      return smoothstep(2.6, 2.92, flow) * (1 - smoothstep(3.3, 3.55, flow));
    const careerShown =
      smoothstep(1.62, 1.95, flow) * (1 - smoothstep(2.3, 2.55, flow));
    const stopIndex = this.cachedStopIndex(name);
    if (kind === "city")
      return (
        careerShown * smoothstep(stopIndex - 0.75, stopIndex - 0.35, careerStep)
      );
    if (kind === "degree")
      return (
        careerShown * (1 - smoothstep(0.55, 0.8, Math.abs(careerStep - 0.5)))
      );
    if (kind === "role")
      return (
        careerShown *
        (1 - smoothstep(0.42, 0.72, Math.abs(careerStep - stopIndex)))
      );
    return 0;
  }

  /** Which of the career's stops a city or role label belongs to, from the page's own grouping. */
  private stopIndexOf(kind: string, key: string) {
    const stops =
      this.elements.root.querySelectorAll<HTMLElement>("[data-sky-stop]");
    for (const [index, stop] of [...stops].entries()) {
      if (kind === "city" && stop.dataset.skyStop === key) return index;
      if (
        kind === "role" &&
        stop.querySelector(`[data-sky-anchor="role:${key}"]`)
      )
        return index;
    }
    return 0;
  }

  private stopIndexes = new Map<string, number>();

  private cachedStopIndex(name: string) {
    let index = this.stopIndexes.get(name);
    if (index === undefined) {
      const [kind, key] = name.split(":");
      index = this.stopIndexOf(kind, key);
      this.stopIndexes.set(name, index);
    }
    return index;
  }

  private placeLabels(
    flow: number,
    careerStep: number,
    yearStep: number,
    camera: Camera,
  ) {
    const top = stageTop(this.layout, this.scrollY);
    for (const label of this.labels) {
      const opacity = this.labelOpacity(label.name, flow, careerStep, yearStep);
      if (opacity <= 0 && label.written.opacity === 0) continue;
      const projected = project(label.anchor.point, camera, this.stage);
      if (!projected) {
        placeLabel(label, label.written.x || 0, label.written.y || 0, 0);
        continue;
      }
      const containerTop =
        label.sceneIndex >= 0
          ? panelTop(this.layout, label.sceneIndex, this.scrollY)
          : top;
      const isDay = label.name === "busiest";
      const point = isDay
        ? this.drawnDayPoint(busiestIndex, projected)
        : projected;
      placeLabel(
        label,
        keepOnScreen(label, point.x, this.stage.width),
        point.y + top - containerTop,
        opacity,
      );
    }
  }

  /** A day's label follows the star as drawn, which turns with the galaxy and ripples under a tap. */
  private drawnDayPoint(dayIndex: number, fallback: { x: number; y: number }) {
    const drawn = this.painter.drawnDays;
    return drawn.shown[dayIndex]
      ? { x: drawn.x[dayIndex], y: drawn.y[dayIndex] }
      : fallback;
  }

  private placeCard(flow: number) {
    const { card } = this.elements;
    if (card.day < 0) return;
    if (flow > GALAXY_READABLE_UNTIL + 0.1) {
      this.select(-1, 0);
      return;
    }
    const drawn = this.painter.drawnDays;
    card.follow(
      drawn.x[card.day],
      drawn.y[card.day],
      drawn.radius[card.day],
      this.stage.width,
    );
  }

  /** Writes a style only when its value changes, so a still frame touches nothing. */
  private writeStyle(element: HTMLElement, property: string, value: string) {
    const written = this.written.get(element) ?? {};
    if (written[property] === value) return;
    written[property] = value;
    this.written.set(element, written);
    element.style.setProperty(property, value);
  }

  private writePanels(position: StoryPosition, yearStep: number) {
    if (this.still) return;
    this.elements.panels.forEach((panel, index) =>
      this.writeStyle(
        panel,
        "opacity",
        panelOpacity(position, index).toFixed(2),
      ),
    );
    const activeStep = Math.round(yearStep);
    this.elements.yearSteps.forEach((step, index) => {
      const isActive = String(index === activeStep);
      if (step.dataset.active !== isActive) step.dataset.active = isActive;
    });
  }

  /** The name parts as the reader leaves the first screen, and leans against the pointer. */
  private moveName(position: StoryPosition) {
    const { name } = this.elements;
    if (!name || this.still) return;
    const leaving =
      position.sceneIndex === 0
        ? position.hold * 0.35 + position.slide * 0.65
        : 1;
    const dive = smoothstep(0, 1, leaving).toFixed(3);
    if (name.style.getPropertyValue("--dive") !== dive)
      name.style.setProperty("--dive", dive);
    const shift = `${(-this.pointer.x * NAME_POINTER_SHIFT.x).toFixed(1)}px ${(-this.pointer.y * NAME_POINTER_SHIFT.y).toFixed(1)}px`;
    if (name.style.translate !== shift) name.style.translate = shift;
  }

  /** For checking the drawing against the data: each day's count, its size in the galaxy and as last drawn. */
  inspect() {
    const drawn = this.painter.drawnDays;
    return galaxyDays.map((day, index) => ({
      date: day.date,
      count: day.count,
      coreRadius: day.coreRadius,
      brightness: day.brightness,
      drawnRadius: drawn.radius[index],
      drawnX: drawn.x[index],
      drawnY: drawn.y[index],
      shown: drawn.shown[index] === 1,
    }));
  }

  /** Where the story is, for the same checks. */
  where() {
    const position = storyPosition(this.layout, this.scrollY);
    return {
      ...position,
      flow: storyFlow(position),
      selectedDay: this.selectedDay,
      codeScene: CODE_SCENE,
    };
  }
}
