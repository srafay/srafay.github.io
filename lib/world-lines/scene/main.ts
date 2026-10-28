/*
  Version 4 of the About page, "World lines": the script (public/about/v4/world-lines.js, built by
  scripts/build-world-lines-page.ts). It reads the CV from content/about/profile.ts, bundled in. It mounts the scene
  on the page's root. mountWorldLines takes the root and the data and assumes nothing else about the document. So a
  React component can later mount the scene as it is.

  window.worldLines is for the checks that drive the page in a test browser. It says where the camera is and how the
  view is turned and zoomed, and it can go to a point of the travel.
*/
import { allEvents } from "@/lib/about-cv/events";
import { skillWords } from "@/lib/about-cv/skills";
import { presentTime } from "@/lib/about-cv/time";
import { addArt } from "./art";
import { Controls } from "./controls";
import {
  listenForGestures,
  listenForKeys,
  type GestureHandlers,
  type GestureOptions,
} from "@/lib/about-cv/scene/gestures";
import { Interaction } from "./interaction";
import { LIGHT_RUN_ENDS_SECONDS, playIntro } from "./intro";
import { addKeys } from "./keys";
import { Lighting } from "./lighting";
import { WorldLinesScene, type SceneData, type SceneElements } from "./mount";
import { addYear, followTitle } from "./overlay";

declare global {
  interface Window {
    worldLines?: {
      state(): {
        progress: number;
        year: number | null;
        words: number;
        ready: boolean;
        intro: number;
        /** The skills drawn as words just now. */
        readable: string[];
        /** The world isolated by its switch, if any. */
        isolated: string | null;
        /** The reader's own view: its turn across and up in radians, and its zoom from -1 (nearest) to 1 (the whole). */
        view: { across: number; up: number; zoom: number };
      };
      goTo(progress: number): void;
      /** Where an event's bead (by id), a skill (by word) or a city drawn just now (by name) sits on the stage, in pixels. */
      whereIs?(name: string): { x: number; y: number } | null;
    };
  }
}

export function worldLinesData(today = new Date()): SceneData {
  const present = presentTime(today);
  const events = allEvents(present);
  return { events, skills: skillWords(events), present };
}

function elementsUnder(root: HTMLElement): SceneElements | null {
  const find = <Kind extends HTMLElement>(name: string) =>
    root.querySelector<Kind>(`[data-lines-${name}]`);
  const stage = find("stage");
  const canvas = find<HTMLCanvasElement>("canvas");
  const title = find("title");
  return stage && canvas && title ? { root, stage, canvas, title } : null;
}

/** A lost graphics context hides the scene, so the name carries on. A restored one brings it back. */
function watchContext(scene: WorldLinesScene) {
  const { canvas, stage } = scene.elements;
  canvas.addEventListener(
    "webglcontextlost",
    () => delete stage.dataset.linesState,
  );
  canvas.addEventListener("webglcontextrestored", () => {
    stage.dataset.linesState = "drawing";
    scene.requestFrame();
  });
}

/** The hint waits for the intro to finish. */
const HINT_AFTER_MILLISECONDS = 2000;

/**
  Escape closes the top thing. First Find me or the skills sheet, then a card or a lit skill, then an isolated world.
  Last it takes a turned or zoomed view back to the travel's own.
*/
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

/** What the gestures leave alone: the panels and controls take their own pointers, the card and sheet their wheel and keys. */
const GESTURE_OPTIONS: GestureOptions = {
  ownPointers: ".lines-card, .lines-answer, .lines-sheet, a, button, input, [data-lines-control]",
  scrollsItself: ".lines-sheet, .lines-card",
  keysStayInside: ".lines-card, .lines-sheet",
};

/** Every hand on the spacetime: the gestures, the keys, and what each one moves. */
function handleTheSpacetime(
  scene: WorldLinesScene,
  interaction: Interaction,
  controls: Controls,
) {
  const handlers: GestureHandlers = {
    travel: scene.scroll,
    turnBy: (across, up) => scene.turnBy(across, up),
    zoomBy: (amount) => scene.zoomBy(amount),
    tap: (x, y) => interaction.tap(x, y),
    doubleTap: (x, y) => interaction.doubleTap(x, y),
    hover: (x, y) => interaction.hover(x, y),
    press: (x, y, pointerType) => interaction.press(x, y, pointerType),
    leave: () => interaction.leave(),
    began: () => {
      controls.dismissHint();
      scene.touched();
    },
  };
  listenForGestures(scene.elements.stage, handlers, GESTURE_OPTIONS);
  listenForKeys(handlers, () => scene.stageSize().height, GESTURE_OPTIONS);
}

/** Without graphics there is no scene to handle: one plain line points to the page that reads without them. */
function sayTheSceneCannotShow(root: HTMLElement) {
  const line = document.createElement("p");
  line.className = "lines-plain";
  line.append("This version needs graphics this browser cannot give it. ");
  const link = document.createElement("a");
  link.href = "/about/";
  link.textContent = "The About page";
  line.append(link, " reads without them.");
  root.querySelector("[data-lines-stage]")?.append(line);
}

export async function mountWorldLines(root: HTMLElement, data: SceneData) {
  const elements = elementsUnder(root);
  if (!elements) return null;
  let scene: WorldLinesScene;
  try {
    scene = new WorldLinesScene(elements, data);
  } catch {
    // No WebGL here: the name and the line under it stay, with a pointer to the page that needs no graphics.
    sayTheSceneCannotShow(root);
    return null;
  }
  watchContext(scene);
  followTitle(scene, elements.title);
  addYear(scene, elements.stage);
  let ready = false;
  let introTime = () => 0;
  window.worldLines = {
    state: () => ({
      progress: scene.shownProgress(),
      year: scene.yearNow(),
      words: scene.words?.words.length ?? 0,
      ready,
      intro: introTime(),
      readable: scene.drawnSkillRectangles().map((placed) => placed.word),
      isolated: scene.isolatedWorld(),
      view: scene.viewNow(),
    }),
    goTo: (progress) => scene.scroll.scrollToProgress(progress),
  };
  // The words are drawn first, so the intro plays whole: until then the stage is the night with the name over it.
  await scene.addWords();
  const lighting = new Lighting(scene, data.events, data.skills, scene.colours);
  const interaction = new Interaction(
    scene,
    lighting,
    data.events,
    data.skills,
  );
  addKeys(scene, interaction, data.events, data.skills);
  const controls = new Controls(scene, interaction, data.events, data.skills);
  listenForEscape(controls, interaction);
  handleTheSpacetime(scene, interaction, controls);
  window.worldLines.whereIs = (name) => {
    const index = data.events.findIndex((event) => event.id === name);
    if (index >= 0)
      return interaction.stagePositionOf(scene.beads.points[index]);
    const skill = data.skills.find((candidate) => candidate.word === name);
    if (skill) return interaction.stagePositionOf(scene.skillPointOf(skill));
    const city = scene.drawnCityRectangles().find((placed) => placed.city === name);
    if (!city) return null;
    const { left, right, top, bottom } = city.rectangle;
    return { x: (left + right) / 2, y: (top + bottom) / 2 };
  };
  introTime = playIntro(scene, elements.title);
  addArt(scene, () => introTime() >= LIGHT_RUN_ENDS_SECONDS);
  window.setTimeout(() => controls.showHintOnce(), scene.reducedMotion ? 0 : HINT_AFTER_MILLISECONDS);
  elements.stage.dataset.linesState = "drawing";
  scene.requestFrame();
  ready = true;
  return scene;
}

mountWorldLines(document.body, worldLinesData());
