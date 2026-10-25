/*
  The flight: one WebGL scene on a canvas pinned behind the words, driven by how far down the page the reader is.
  Nothing is drawn unless something changed (the scroll, the size, a drag) or something is moving on its own (the
  intro's lights, a map fading in, a city's swell, the slow turn of the planet at the start and the end). It stops
  while the stage is off the screen or the page is hidden, and if the graphics context is lost the page falls back
  to the plain column of words it was before the script ran.
*/
import {
  Color,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  type Vector3,
} from "three";
import { makeBeacons, type Beacons } from "./beacons";
import {
  applyPose,
  blendPoses,
  discRadiusAt,
  withPlanetTurned,
  type CameraPose,
} from "./camera-rig";
import { Chapters } from "./chapters";
import { surfacePoint, turnedEast } from "./geography";
import { mixGrades, type Grade } from "./grades";
import { loadNightMap, loadSurfaceMap } from "./maps";
import { MoreOverlays } from "./more";
import { clamp, easeInOut, smoothstep } from "./motion";
import { makePlanet, type Planet } from "./planet";
import { makeRoute, type Route } from "./route";
import { Spin } from "./spin";
import { makeStars } from "./stars";
import {
  ROUTE,
  SYDNEY_PLACE,
  stopsFor,
  type Disc,
  type Frame,
  type Stop,
} from "./stops";
import { sunDirection } from "./sun";
import {
  LAST_STOP,
  positionAfter,
  screensBefore,
  trackScreens,
} from "./timeline";

/** The accent: the amber of sodium city light, for the three cities and the route. */
const CITY_LIGHT = new Color("#ffbf73");

/** A stop's words show while the camera is this close to it (in stops), and fade once it sets off. */
const WORDS_NEAR_STOP = 0.06;
const INTRO_MILLISECONDS = 2600;
const MAP_FADE_MILLISECONDS = 700;
const SWELL_MILLISECONDS = 1800;
const SWELL_STAGGER_MILLISECONDS = 260;

/* The planet's own slow turn at the start and the end: it eases to a stop at this many degrees, so the three cities
   never drift out of a phone's frame, settling over about this many seconds. */
const TURN_LIMIT_DEGREES = 8;
const TURN_SETTLE_SECONDS = 34;
/** Close to a city a drag walks the camera round it, this many degrees per pixel of drag. */
const HEADING_DEGREES_PER_PIXEL = 0.12;
/** The slow turn alone needs no more than this many frames a second on a phone. */
const TURNING_FRAMES_PER_SECOND_ON_TOUCH = 30;

type Elements = {
  root: HTMLElement;
  track: HTMLElement;
  stage: HTMLElement;
  standIn: HTMLElement;
  canvas: HTMLCanvasElement;
};

const isTouchScreen = () =>
  matchMedia("(hover: none) and (pointer: coarse)").matches;

/** Phones draw at up to 1.5 pixels per CSS pixel: sharp enough at arm's length, and far fewer pixels to fill. */
const pixelRatioFor = () =>
  Math.min(window.devicePixelRatio || 1, isTouchScreen() ? 1.5 : 2);

/** The stylesheet decides which layout the stage has (--flight-layout), so the words and the camera always agree. */
const isTallLayout = (stage: HTMLElement) =>
  getComputedStyle(stage).getPropertyValue("--flight-layout").trim() === "tall";

/** How far along a fade that began at a moment is, from 0 to 1; 0 if it has not begun. */
const fadeSince = (start: number | null, now: number, length: number) =>
  start === null ? 0 : clamp((now - start) / length, 0, 1);

/** A city's swell: up and back down once. */
const swellAt = (sinceStart: number) =>
  sinceStart < 0 || sinceStart > SWELL_MILLISECONDS
    ? 0
    : Math.sin((Math.PI * sinceStart) / SWELL_MILLISECONDS);

/** The planet's own turn after some seconds of turning, easing to its limit. */
const turnAfter = (seconds: number) =>
  TURN_LIMIT_DEGREES * (1 - Math.exp(-seconds / TURN_SETTLE_SECONDS));

/** How much of the far view's behaviour (the turn, the spin of the planet) applies at a place in the flight. */
const farViewWeight = (position: number) =>
  Math.max(
    1 - easeInOut(clamp(position, 0, 1)),
    easeInOut(clamp(position - (LAST_STOP - 1), 0, 1)),
  );

/** The stop whose words show at a place in the flight, or none mid-flight. */
function chapterAt(position: number, reducedMotion: boolean) {
  const nearest = Math.round(position);
  if (reducedMotion) return nearest;
  return Math.abs(position - nearest) <= WORDS_NEAR_STOP ? nearest : null;
}

export class Flight {
  private readonly renderer: WebGLRenderer;
  private readonly camera = new PerspectiveCamera();
  private readonly scene = new Scene();
  private readonly planet: Planet;
  private readonly stars = makeStars();
  private readonly route: Route;
  private readonly beacons: Beacons;
  private readonly chapters: Chapters;
  private readonly more: MoreOverlays;
  private readonly spin: Spin;
  private readonly sun: Vector3 = sunDirection(SYDNEY_PLACE);
  private readonly reducedMotion = matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  private readonly canvas: HTMLCanvasElement;

  private frame!: Frame;
  private stops!: Stop[];
  private trackTop = 0;
  private screenHeight = 1;
  private pixelRatio = 1;

  private frameRequested = false;
  private onScreen = true;
  private failed = false;
  private drawnOnce = false;
  private lastFrameTime = 0;
  private lastDrawTime = 0;
  private lastScreens = 0;
  private onlyTurning = false;
  private wasTurning = false;
  private turningSeconds = 0;
  private nightArrivedAt: number | null = null;
  private surfaceArrivedAt: number | null = null;
  private swellStarts = ROUTE.map(() => -Infinity);
  private arrivedAt: number | null = null;
  private position = 0;

  constructor(private readonly elements: Elements) {
    this.canvas = elements.canvas;
    // Throws where WebGL 2 is missing; the caller keeps the page as words.
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.planet = makePlanet();
    this.route = makeRoute(ROUTE, CITY_LIGHT);
    this.beacons = makeBeacons(ROUTE, CITY_LIGHT);
    this.scene.add(
      this.planet.globe,
      this.stars.stars,
      this.route.ribbon,
      this.beacons.points,
      this.planet.shell,
    );
    this.chapters = new Chapters(elements.stage, (chapter) =>
      this.goTo(chapter),
    );
    this.more = new MoreOverlays(elements.root, elements.stage, () =>
      this.requestFrame(),
    );
    this.spin = new Spin(this.canvas, () => this.requestFrame());
  }

  start() {
    const { root, stage } = this.elements;
    root.style.setProperty("--flight-track-screens", String(trackScreens()));
    root.dataset.flightState = "live";
    this.measure();
    // The chapter in view shows from the same moment, so the name never blinks as the page becomes the stage.
    this.chapters.show(
      chapterAt(
        positionAfter(this.scrolledScreens()),
        this.reducedMotion.matches,
      ),
    );

    this.canvas.addEventListener("webglcontextlost", () =>
      this.fallBackToWords(),
    );
    addEventListener("scroll", () => this.requestFrame(), { passive: true });
    new ResizeObserver(() => {
      this.measure();
      this.requestFrame();
    }).observe(stage);
    new IntersectionObserver(([entry]) => {
      this.onScreen = entry.isIntersecting;
      this.requestFrame();
    }).observe(this.elements.track);
    document.addEventListener("visibilitychange", () => this.requestFrame());
    this.reducedMotion.addEventListener("change", () => this.requestFrame());

    this.requestFrame();
    void this.loadMaps();
  }

  /** Scrolls the page to a place in the flight: a whole number is a stop, with its words showing. */
  goTo(position: number) {
    scrollTo({
      top: this.trackTop + screensBefore(position) * this.screenHeight,
      behavior: "instant",
    });
  }

  state() {
    return {
      position: this.position,
      chapter: this.chapters.current,
      nightMap: this.nightArrivedAt !== null,
      surfaceMap: this.surfaceArrivedAt !== null,
      drawn: this.drawnOnce,
      portrait: this.frame.portrait,
      pixelRatio: this.pixelRatio,
    };
  }

  /** Where each city is on the stage, in CSS pixels, and whether it faces the camera: for the framing checks. */
  cityPlaces() {
    const { width, height } = this.frame.stage;
    return ROUTE.map((place, index) => {
      const point = surfacePoint(place);
      const onScreen = point.clone().project(this.camera);
      const towardCamera = this.camera.position.clone().sub(point);
      return {
        name: ["Karachi", "Darwin", "Sydney"][index],
        x: Math.round(((onScreen.x + 1) / 2) * width),
        y: Math.round(((1 - onScreen.y) / 2) * height),
        facing: towardCamera.dot(point) > 0,
      };
    });
  }

  /** Sizes, read only when the stage's own box changes: never while flying. */
  private measure() {
    const { stage, standIn, track } = this.elements;
    const stageBox = stage.getBoundingClientRect();
    const discBox = standIn.getBoundingClientRect();
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    const heroDisc: Disc = {
      centreX: discBox.left + discBox.width / 2 - stageBox.left,
      centreY: discBox.top + discBox.height / 2 - stageBox.top,
      radius: discBox.width / 2,
    };
    this.frame = {
      stage: { width, height },
      portrait: isTallLayout(stage),
      heroDisc,
    };
    this.stops = stopsFor(this.frame);
    this.trackTop = track.getBoundingClientRect().top + scrollY;
    this.screenHeight = height;
    this.pixelRatio = pixelRatioFor();
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(width, height, false);
    this.stars.setPixelRatio(this.pixelRatio);
    this.route.setDrawingSize(
      width * this.pixelRatio,
      height * this.pixelRatio,
      this.pixelRatio,
    );
  }

  private async loadMaps() {
    const anisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    try {
      const night = await loadNightMap(anisotropy);
      if (this.failed) return;
      this.renderer.initTexture(night);
      this.planet.showNightMap(night);
      this.nightArrivedAt = performance.now();
      this.requestFrame();
    } catch {
      // Without the night map the planet stays a dark sphere with its rim, and the words carry the page.
      return;
    }
    await this.quietMoment();
    try {
      const surface = await loadSurfaceMap(anisotropy);
      if (this.failed) return;
      await this.quietMoment();
      this.renderer.initTexture(surface);
      this.planet.showSurfaceMap(surface);
      this.surfaceArrivedAt = performance.now();
      this.requestFrame();
    } catch {
      // The surface only adds clouds to the dawn edge; the night is whole without it.
    }
  }

  /** Waits until the intro's lights have come on and the browser has a spare moment. */
  private quietMoment() {
    return new Promise<void>((resolve) => {
      const introEnds =
        (this.nightArrivedAt ?? performance.now()) + INTRO_MILLISECONDS;
      setTimeout(
        () => {
          if ("requestIdleCallback" in window)
            requestIdleCallback(() => resolve(), { timeout: 1500 });
          else resolve();
        },
        Math.max(0, introEnds - performance.now()),
      );
    });
  }

  private requestFrame() {
    if (this.frameRequested || this.failed) return;
    if (!this.onScreen || document.hidden) return;
    this.frameRequested = true;
    requestAnimationFrame((now) => this.drawFrame(now));
  }

  private scrolledScreens() {
    return (scrollY - this.trackTop) / this.screenHeight;
  }

  /** The camera's pose and the light at a place in the flight. */
  private viewAt(position: number): { pose: CameraPose; grade: Grade } {
    const stopIndex = Math.min(Math.floor(position), LAST_STOP);
    const fraction = position - stopIndex;
    const from = this.stops[stopIndex];
    if (fraction <= 0 || stopIndex === LAST_STOP)
      return { pose: from.pose, grade: from.grade };
    const to = this.stops[stopIndex + 1];
    const eased = easeInOut(fraction);
    return {
      pose: blendPoses(from.pose, to.pose, eased, to.riseOnTheWay),
      grade: mixGrades(from.grade, to.grade, eased),
    };
  }

  /** The route's progress at a place in the flight: it grows on the two legs between the cities. */
  private routeProgressAt(position: number) {
    if (position <= 1) return 0;
    if (position >= 3) return 1;
    const leg = Math.floor(position) - 1;
    const eased = easeInOut(position - Math.floor(position));
    const { stopProgress } = this.route;
    return (
      stopProgress[leg] + (stopProgress[leg + 1] - stopProgress[leg]) * eased
    );
  }

  /** Notes the camera arriving at a city, which swells that city's light once. */
  private noteArrival(position: number, now: number) {
    const atStop = Number.isInteger(position) ? position : null;
    const city =
      atStop !== null && atStop >= 1 && atStop <= ROUTE.length
        ? atStop - 1
        : null;
    if (
      city !== null &&
      this.arrivedAt !== atStop &&
      !this.reducedMotion.matches
    )
      this.swellStarts[city] = now;
    this.arrivedAt = atStop;
  }

  private drawFrame(now: number) {
    this.frameRequested = false;
    if (this.failed) return;
    const reducedMotion = this.reducedMotion.matches;
    const sinceLastFrame = this.lastFrameTime
      ? Math.min(100, now - this.lastFrameTime)
      : 16;
    this.lastFrameTime = now;
    if (this.wasTurning) this.turningSeconds += sinceLastFrame / 1000;

    // The slow turn alone is drawn at a calmer rate on a phone.
    if (
      this.onlyTurning &&
      isTouchScreen() &&
      now - this.lastDrawTime < 1000 / TURNING_FRAMES_PER_SECOND_ON_TOUCH - 4
    ) {
      this.requestFrame();
      return;
    }

    const screens = this.scrolledScreens();
    this.spin.settle(screens - this.lastScreens);
    this.lastScreens = screens;
    const spinCoasting = this.spin.coast(sinceLastFrame);
    const position = positionAfter(screens);
    this.position = position;
    const cameraPosition = reducedMotion ? Math.round(position) : position;

    if (
      this.chapters.show(chapterAt(position, reducedMotion)) &&
      this.more.isOpen
    )
      this.more.close(false);
    this.noteArrival(cameraPosition, now);

    const atAnEnd = position < 0.02 || position > LAST_STOP - 0.02;
    const turning =
      !reducedMotion &&
      atAnEnd &&
      !this.more.isOpen &&
      turnAfter(this.turningSeconds) < TURN_LIMIT_DEGREES - 0.02;
    const farWeight = farViewWeight(cameraPosition);
    const { pose, grade } = this.viewAt(cameraPosition);

    const degreesPerPixel =
      57.3 /
      discRadiusAt(pose.distance, this.frame.stage.height, pose.fieldOfView);
    const planetTurn =
      turnAfter(this.turningSeconds) * farWeight +
      this.spin.pixels * degreesPerPixel * farWeight;
    const headingTurn =
      (-this.spin.pixels *
        HEADING_DEGREES_PER_PIXEL *
        (1 - farWeight) *
        Math.PI) /
      180;
    const shownPose = withPlanetTurned(
      { ...pose, heading: pose.heading + headingTurn },
      planetTurn,
    );
    applyPose(this.camera, shownPose, this.frame.stage);
    const sun = turnedEast(this.sun, -planetTurn);

    const nightShown = fadeSince(
      this.nightArrivedAt,
      now,
      MAP_FADE_MILLISECONDS,
    );
    const surfaceShown = fadeSince(
      this.surfaceArrivedAt,
      now,
      MAP_FADE_MILLISECONDS * 1.5,
    );
    const introProgress = reducedMotion
      ? this.nightArrivedAt === null
        ? 0
        : 1
      : fadeSince(this.nightArrivedAt, now, INTRO_MILLISECONDS);
    const lightsReveal = easeInOut(introProgress);
    if (
      introProgress >= 1 &&
      this.swellStarts.every((start) => start === -Infinity) &&
      !reducedMotion
    )
      this.swellStarts = ROUTE.map(
        (_, city) => now + city * SWELL_STAGGER_MILLISECONDS,
      );

    this.planet.setReveal(nightShown, surfaceShown, lightsReveal);
    this.planet.setLight(sun, grade);
    this.stars.setBrightness(grade.starBrightness);
    this.renderer.setClearColor(grade.space);

    const routeProgress = this.routeProgressAt(cameraPosition);
    this.route.setProgress(routeProgress);
    const swells = this.swellStarts.map((start) => swellAt(now - start));
    this.beacons.setCities(smoothstep(0.7, 1, lightsReveal), swells);
    this.beacons.setLens(
      this.frame.stage.height * this.pixelRatio,
      shownPose.fieldOfView,
      this.pixelRatio,
    );

    this.renderer.render(this.scene, this.camera);
    this.lastDrawTime = now;
    this.markDrawn();

    const introRunning = this.nightArrivedAt !== null && introProgress < 1;
    const mapsFading =
      (this.nightArrivedAt !== null && nightShown < 1) ||
      (this.surfaceArrivedAt !== null && surfaceShown < 1);
    const swelling =
      swells.some((swell) => swell > 0) ||
      this.swellStarts.some((start) => start > now);
    const somethingElseMoves =
      introRunning || mapsFading || swelling || spinCoasting;
    this.wasTurning = turning;
    this.onlyTurning = turning && !somethingElseMoves;
    if (somethingElseMoves || turning) this.requestFrame();
  }

  /** After the first frame the canvas fades in over the page's own stand-in planet. */
  private markDrawn() {
    if (this.drawnOnce) return;
    this.drawnOnce = true;
    requestAnimationFrame(() => (this.elements.root.dataset.flightDrawn = ""));
  }

  /** A lost graphics context: the page goes back to its plain column of words, at the chapter that was showing. */
  private fallBackToWords() {
    if (this.failed) return;
    this.failed = true;
    const chapter = this.chapters.current ?? 0;
    this.more.close(false);
    this.elements.root.dataset.flightState = "words";
    delete this.elements.root.dataset.flightDrawn;
    this.chapters.show(null);
    this.chapters.element(chapter)?.scrollIntoView({ block: "start" });
  }
}
