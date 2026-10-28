/*
  Version 5 of the About page, "Hypercube": the script (public/about/v5/hypercube.js, built by
  scripts/build-hypercube-page.ts). It reads the CV from content/about/profile.ts, bundled in, through lib/about-cv/.
  mountHypercube takes the root and the data and assumes nothing else about the document, so a React component can
  later mount the scene as it is.

  window.hypercube is for the checks that drive the page in a test browser. It says how far the unfold has come, how
  the object is turned and what is lit, where a bead or a word sits, where a ride stands and what a search found, and
  it can set the unfold to a share, jump a ride to a stop and rest the object, so a crop lands on a set moment.
*/
import { allEvents } from "@/lib/about-cv/events";
import { createScrollReader, type ScrollReader } from "@/lib/about-cv/scene/scroll";
import { listenForGestures, type GestureHandlers, type GestureOptions } from "@/lib/about-cv/scene/gestures";
import { skillWords } from "@/lib/about-cv/skills";
import { presentTime } from "@/lib/about-cv/time";
import type { HypercubeData } from "@/lib/hypercube/shape";
import { Controls } from "./controls";
import { timeAtTravel } from "./focus";
import { listenForHolds, type Holds } from "./hold";
import { HypercubeScene, type HypercubeElements } from "./hypercube-scene";
import { Interaction } from "./interaction";
import { addKeyLayer, listenForKeys } from "./keys";
import { Idle } from "./rest";
import { RideControls } from "./ride-controls";
import { cityAt, RidePlayer } from "./ride-player";
import { Search, startsASearch } from "./search";
import { Sound } from "./sound";
import { Tilt } from "./tilt";

declare global {
  interface Window {
    hypercube?: {
      state(): {
        ready: boolean;
        labelsReady: boolean;
        unfold: number;
        angleThroughW: number;
        spin: number;
        frames: number;
        year: number | null;
        lit: number;
        litSkill: string | null;
        openEvent: string | null;
        isolated: string | null;
        flown: boolean;
        travel: number;
        words: string[];
        dots: { structure: number; dust: number; beads: number; thread: number };
        view: { xw: number; yw: number; zw: number; zoom: number };
        sound: boolean;
        /** How far a lit skill's dust has flown to its events, from 0 to 1. */
        gather: number;
        ride: ReturnType<RidePlayer["report"]>;
        search: ReturnType<Search["report"]>;
        rest: { resting: boolean; share: number };
      };
      /** Sets the unfold to a share from 0 to 1, for crops of the opening at a set moment. */
      setUnfold(share: number): void;
      /** Moves the travel to a place from 0 (all years) to 1 (2014). */
      goTo(progress: number): void;
      /** Where an event's bead (by id), a word drawn just now (by its key, such as "skill:Python") or the ride's point ("ride") sits, in CSS pixels. */
      whereIs(name: string): { x: number; y: number } | null;
      /** Every word drawn now, with the rectangle of its letters on the stage, for the edge checks. */
      wordRectangles(): { key: string; left: number; top: number; right: number; bottom: number }[];
      /** The places no word may cover now: the title, the controls, the big year, the present's light. */
      blocked(): { left: number; top: number; right: number; bottom: number }[];
      /** Starts a ride if none is on and jumps it to a stop, by its place in the ride. */
      rideTo(stop: number): void;
      /** Runs the ride's clock this many times quicker, for the checks. */
      ridePace(times: number): void;
      /** The ride's stops, in order, by event id. */
      rideStops(): string[];
      /** Where the resting cube's corners land on the stage, in CSS pixels. */
      cubeCorners(): { x: number; y: number }[];
      /** Rests the object now, or wakes it. */
      rest(resting: boolean, atOnce?: boolean): void;
    };
  }
}

export function hypercubeData(today = new Date()): HypercubeData {
  const present = presentTime(today);
  const events = allEvents(present);
  return { events, skills: skillWords(events), present };
}

function elementsUnder(root: HTMLElement): HypercubeElements | null {
  const find = <Kind extends HTMLElement>(name: string) => root.querySelector<Kind>(`[data-cube-${name}]`);
  const stage = find("stage");
  const canvas = find<HTMLCanvasElement>("canvas");
  const title = find("title");
  return stage && canvas && title ? { root, stage, canvas, title } : null;
}

/** Without graphics there is no object to hold: one plain line points to the page that reads without them. */
function sayTheSceneCannotShow(root: HTMLElement) {
  const line = document.createElement("p");
  line.className = "cube-plain";
  line.append("This version needs graphics this browser cannot give it. ");
  const link = document.createElement("a");
  link.href = "/about/";
  link.textContent = "The About page";
  line.append(link, " reads without them.");
  root.querySelector("[data-cube-stage]")?.append(line);
}

/** How long the travel through time is, in screens of finger or wheel, from All years back to 2014. */
const TRAVEL_SCREENS = 8;

/** What the gestures leave alone: the panels and controls take their own pointers, the card and sheet their wheel. */
const GESTURE_OPTIONS: GestureOptions = {
  ownPointers: ".cube-card, .cube-answer, .cube-sheet, .cube-search, .cube-peek, a, button, input, [data-cube-control]",
  scrollsItself: ".cube-sheet, .cube-card",
  keysStayInside: ".cube-card, .cube-sheet, .cube-search",
};

/**
  Every hand on the object: the gestures, and what each one moves. A hold is not a gesture that sends the hint away,
  and it hurries a ride rather than pausing it. Any other gesture pauses a ride where it is.
*/
function handleTheObject(
  scene: HypercubeScene,
  travel: ScrollReader,
  holds: Holds,
  interaction: Interaction,
  controls: Controls,
  sound: Sound,
  ride: RidePlayer,
) {
  const moved = () => {
    holds.cancel();
    controls.dismissHint();
    ride.handled();
    scene.requestFrame();
  };
  const handlers: GestureHandlers = {
    travel: {
      ...travel,
      moveBy(pixels) {
        moved();
        travel.moveBy(pixels);
      },
      release(speed) {
        travel.release(speed);
        scene.requestFrame();
      },
    },
    turnBy: (across, up) => {
      // One finger has no yw turn: a vertical swipe moves through time. A mouse turns in both planes.
      scene.turn.turnBy(across, holds.lastPointerWasMouse() ? up : 0);
      moved();
    },
    zoomBy: (amount) => {
      scene.zoom.zoomBy(amount);
      moved();
    },
    tap: (x, y) => {
      const held = holds.wasHolding();
      holds.end();
      if (held) return;
      controls.dismissHint();
      ride.handled();
      interaction.tap(x, y);
    },
    doubleTap: (x, y) => {
      holds.end();
      ride.handled();
      interaction.doubleTap(x, y);
    },
    hover: (x, y) => interaction.hover(x, y),
    press: (_x, _y, pointerType) => {
      sound.wake();
      holds.begin(pointerType);
    },
    leave: () => {
      holds.end();
      interaction.leave();
    },
    began: () => {},
  };
  listenForGestures(scene.elements.stage, handlers, GESTURE_OPTIONS);
  listenForKeys(handlers, scene);
  document.addEventListener("keydown", () => sound.wake());
}

/**
  Escape closes the top thing: the search, Find me, the sheet, the card, the ride, the lit skill, the isolated world,
  then the view.
*/
function listenForEscape(search: Search, controls: Controls, interaction: Interaction, ride: RidePlayer) {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (search.close()) return;
    if (controls.closeFindMe()) return;
    if (controls.closeSheet()) return;
    if (!interaction.card.hidden) return void interaction.stepBack();
    if (ride.end()) return;
    if (interaction.stepBack()) return;
    if (controls.clearIsolation()) return;
    controls.resetView();
  });
}

/** A letter or a digit typed anywhere starts a search, unless a field has the focus or a panel is open. */
function typingStartsASearch(search: Search, controls: Controls) {
  document.addEventListener("keydown", (event) => {
    if (!startsASearch(event)) return;
    const target = event.target as Element | null;
    if (target?.closest("input, textarea, select, [contenteditable]")) return;
    if (search.isOpen() || controls.panelIsOpen()) return;
    event.preventDefault();
    search.open(event.key);
  });
}

/** Comma and full stop step the ride back and on, while the ride is the top thing. */
function listenForRideKeys(ride: RidePlayer, rideIsTop: () => boolean) {
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || !rideIsTop()) return;
    if ((event.target as Element | null)?.closest("input, textarea")) return;
    const direction = event.key === "," ? -1 : event.key === "." ? 1 : 0;
    if (!direction) return;
    event.preventDefault();
    ride.stepBy(direction);
  });
}

export function mountHypercube(root: HTMLElement, data: HypercubeData) {
  const elements = elementsUnder(root);
  if (!elements) return null;
  let scene: HypercubeScene;
  try {
    scene = new HypercubeScene(elements, data);
  } catch {
    sayTheSceneCannotShow(root);
    return null;
  }
  const travel = createScrollReader(elements.stage, TRAVEL_SCREENS, !scene.reducedMotion);
  // The travel carries on after a swipe: the scene steps it each frame, and keeps drawing while it moves.
  scene.onFrame((_scene, _moving, seconds) => {
    if (travel.step(seconds)) scene.requestFrame();
  });
  travel.onScroll(() => scene.requestFrame());
  const sound = new Sound();
  const tilt = new Tilt(scene);
  const ride = new RidePlayer(scene, travel, sound);
  const rideControls = new RideControls(ride);
  const interaction = new Interaction(scene, sound);
  const controls = new Controls(scene, interaction, travel, sound, tilt, rideControls);
  const search = new Search(scene, interaction);
  const idle = new Idle(scene);
  const panelOrSearchOpen = () => controls.panelIsOpen() || search.isOpen();
  const rideIsTop = () => ride.isOn() && !panelOrSearchOpen();
  const holds = listenForHolds(scene, {
    isTop: rideIsTop,
    isPlaying: () => ride.state === "playing",
    hurry: (on) => ride.hurry(on),
    toggle: () => ride.toggle(),
  });
  interaction.onEmptyDoubleTap = () => controls.toggleTimeline();
  interaction.goToYear = (year) => controls.goToYear(year);
  // An answer or a card that opens or closes changes where the words may go: measured then, never mid-gesture.
  interaction.onChange = () => requestAnimationFrame(() => controls.measure());
  rideControls.onPeekShown = interaction.onChange;
  rideControls.onOpen = (event) => {
    ride.pause();
    interaction.openEvent(event);
  };
  search.onChange = () => {
    if (search.isOpen()) ride.handled();
    interaction.onChange();
  };
  controls.onSearch = () => (search.isOpen() ? search.close() : search.open());
  controls.onRailScrub = (progress, holding) => ride.scrubTo(timeAtTravel(progress, data.present), holding);
  controls.onRailLetGo = () => ride.release();
  // Every control but the ride's own and Sound is a hand on the object: a ride pauses for it. Reset view ends it.
  for (const control of [controls.top, controls.switches, controls.view])
    control.addEventListener("click", (event) => {
      const target = event.target as Element;
      if (target.closest(".cube-ride-row") || controls.soundButton.contains(target)) return;
      if (controls.resetButton.contains(target)) return void ride.end();
      ride.handled();
    });
  // Reading is not idle, and neither is a hand on the object or a ride.
  let pressed = false;
  elements.stage.addEventListener("pointerdown", () => (pressed = true));
  document.addEventListener("pointerup", () => (pressed = false));
  document.addEventListener("pointercancel", () => (pressed = false));
  idle.mayRest = () => !pressed && !panelOrSearchOpen() && !ride.isOn();
  idle.onRest = (resting) => {
    if (resting) ride.handled();
  };
  addKeyLayer(scene, interaction, controls);
  handleTheObject(scene, travel, holds, interaction, controls, sound, ride);
  listenForEscape(search, controls, interaction, ride);
  typingStartsASearch(search, controls);
  listenForRideKeys(ride, rideIsTop);
  // iOS answers a long press with the text loupe, the callout and a menu. The stage takes the press itself.
  elements.stage.addEventListener("contextmenu", (event) => event.preventDefault());
  let unfoldedSeen = false;
  scene.onFrame(() => {
    sound.follow(scene.angleThroughW(), scene.turn.spinPace());
    if (unfoldedSeen || !scene.unfold.isDone()) return;
    unfoldedSeen = true;
    elements.stage.dataset.cubeUnfolded = "";
    controls.showHintOnce();
  });
  void scene.addLabels(cityAt);
  window.hypercube = {
    state: () => {
      const angles = scene.turn.angles();
      return {
        ready: true,
        labelsReady: scene.labels !== null,
        unfold: scene.unfold.share,
        angleThroughW: scene.angleThroughW(),
        spin: scene.turn.spinPace(),
        frames: scene.frameCount(),
        year: scene.focus.year,
        lit: scene.litCount(),
        litSkill: scene.focus.litSkill?.word ?? null,
        openEvent: scene.focus.openEvent?.id ?? null,
        isolated: scene.focus.isolated,
        flown: scene.isFlown(),
        travel: travel.progress(),
        words: scene.labels?.shown ?? [],
        dots: { structure: scene.structureCount, dust: scene.dustCount, beads: data.events.length, thread: scene.threadCount },
        view: { xw: angles.xw, yw: angles.yw, zw: angles.zw, zoom: scene.zoom.now() },
        sound: sound.on,
        gather: scene.focus.gather(),
        ride: ride.report(),
        search: search.report(),
        rest: { resting: idle.isResting(), share: scene.rest.share },
      };
    },
    setUnfold: (share) => {
      scene.unfold.setShare(share);
      scene.requestFrame();
    },
    goTo: (progress) => travel.scrollToProgress(progress),
    whereIs: (name) => {
      if (name === "ride") return scene.pointOnStage(ride.headPoint());
      const event = data.events.find((candidate) => candidate.id === name);
      if (event) return scene.beadOnStage(event);
      const index = scene.labels?.labels.findIndex((label) => label.key === name) ?? -1;
      if (index < 0 || !scene.labels?.shown.includes(name)) return null;
      return scene.labels.centreOf(index);
    },
    wordRectangles: () => scene.labels?.shownRectangles() ?? [],
    blocked: () => scene.blockedForChecks(),
    rideTo: (stop) => ride.jumpTo(stop),
    ridePace: (times) => ride.runQuicker(times),
    rideStops: () => scene.stops.map((stop) => stop.event.id),
    cubeCorners: () => scene.cubeCornersOnStage(),
    rest: (resting, atOnce = false) => (resting ? idle.rest(atOnce) : idle.wake()),
  };
  scene.requestFrame();
  return scene;
}

mountHypercube(document.body, hypercubeData());
