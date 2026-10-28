/*
  Version 5 of the About page, "Hypercube": the script (public/about/v5/hypercube.js, built by
  scripts/build-hypercube-page.ts). It reads the CV from content/about/profile.ts, bundled in, through lib/about-cv/.
  mountHypercube takes the root and the data and assumes nothing else about the document, so a React component can
  later mount the scene as it is.

  window.hypercube is for the checks that drive the page in a test browser. It says how far the unfold has come, how
  the object is turned and what is lit, where a bead or a word sits, and it can set the unfold to a share so a crop
  lands on a set moment.
*/
import { allEvents } from "@/lib/about-cv/events";
import { createScrollReader, type ScrollReader } from "@/lib/about-cv/scene/scroll";
import { listenForGestures, type GestureHandlers, type GestureOptions } from "@/lib/about-cv/scene/gestures";
import { skillWords } from "@/lib/about-cv/skills";
import { presentTime } from "@/lib/about-cv/time";
import type { HypercubeData } from "@/lib/hypercube/shape";
import { Controls } from "./controls";
import { listenForHolds, type Holds } from "./hold";
import { HypercubeScene, type HypercubeElements } from "./hypercube-scene";
import { Interaction } from "./interaction";
import { addKeyLayer, listenForKeys } from "./keys";
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
        dots: { structure: number; dust: number; beads: number };
        view: { xw: number; yw: number; zw: number; zoom: number };
        sound: boolean;
        /** How far a lit skill's dust has flown to its events, from 0 to 1. */
        gather: number;
      };
      /** Sets the unfold to a share from 0 to 1, for crops of the opening at a set moment. */
      setUnfold(share: number): void;
      /** Moves the travel to a place from 0 (all years) to 1 (2014). */
      goTo(progress: number): void;
      /** Where an event's bead (by id) or a word drawn just now (by its key, such as "skill:Python") sits, in CSS pixels. */
      whereIs(name: string): { x: number; y: number } | null;
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
  ownPointers: ".cube-card, .cube-answer, .cube-sheet, a, button, input, [data-cube-control]",
  scrollsItself: ".cube-sheet, .cube-card",
  keysStayInside: ".cube-card, .cube-sheet",
};

/** Every hand on the object: the gestures, and what each one moves. A hold is not a gesture that sends the hint away. */
function handleTheObject(
  scene: HypercubeScene,
  travel: ScrollReader,
  holds: Holds,
  interaction: Interaction,
  controls: Controls,
  sound: Sound,
) {
  const moved = () => {
    holds.cancel();
    controls.dismissHint();
    scene.requestFrame();
  };
  const handlers: GestureHandlers = {
    travel: {
      ...travel,
      moveBy(pixels) {
        travel.moveBy(pixels);
        moved();
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
      interaction.tap(x, y);
    },
    doubleTap: (x, y) => {
      holds.end();
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

/** Escape closes the top thing: Find me, the sheet, the card, the lit skill, the isolated world, then the view. */
function listenForEscape(controls: Controls, interaction: Interaction) {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (controls.closeFindMe()) return;
    if (controls.closeSheet()) return;
    if (interaction.stepBack()) return;
    if (controls.clearIsolation()) return;
    controls.resetView();
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
  const holds = listenForHolds(scene);
  const interaction = new Interaction(scene, sound);
  const controls = new Controls(scene, interaction, travel, sound, tilt);
  interaction.onEmptyDoubleTap = () => controls.toggleTimeline();
  interaction.goToYear = (year) => controls.goToYear(year);
  // An answer or a card that opens or closes changes where the words may go: measured then, never mid-gesture.
  interaction.onChange = () => requestAnimationFrame(() => controls.measure());
  addKeyLayer(scene, interaction, controls);
  handleTheObject(scene, travel, holds, interaction, controls, sound);
  listenForEscape(controls, interaction);
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
  void scene.addLabels();
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
        dots: { structure: scene.structureCount, dust: scene.dustCount, beads: data.events.length },
        view: { xw: angles.xw, yw: angles.yw, zw: angles.zw, zoom: scene.zoom.now() },
        sound: sound.on,
        gather: scene.focus.gather(),
      };
    },
    setUnfold: (share) => {
      scene.unfold.setShare(share);
      scene.requestFrame();
    },
    goTo: (progress) => travel.scrollToProgress(progress),
    whereIs: (name) => {
      const event = data.events.find((candidate) => candidate.id === name);
      if (event) return scene.beadOnStage(event);
      const index = scene.labels?.labels.findIndex((label) => label.key === name) ?? -1;
      if (index < 0 || !scene.labels?.shown.includes(name)) return null;
      return scene.labels.centreOf(index);
    },
  };
  scene.requestFrame();
  return scene;
}

mountHypercube(document.body, hypercubeData());
