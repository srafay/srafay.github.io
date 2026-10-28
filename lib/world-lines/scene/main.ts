/*
  Version 4 of the About page, "World lines": the script (public/about/v4/world-lines.js, built by
  scripts/build-world-lines-page.ts). It reads the CV from content/about/profile.ts, bundled in. It mounts the scene
  on the page's root. mountWorldLines takes the root and the data and assumes nothing else about the document. So a
  React component can later mount the scene as it is.

  window.worldLines is for the checks that drive the page in a test browser. It says where the camera is, and it can
  scroll to a point of the travel.
*/
import { allEvents } from "@/lib/world-lines/events";
import { skillWords } from "@/lib/world-lines/skills";
import { presentTime } from "@/lib/world-lines/time";
import { addEnd } from "./end";
import { Interaction } from "./interaction";
import { playIntro } from "./intro";
import { addKeys } from "./keys";
import { Lighting } from "./lighting";
import { WorldLinesScene, type SceneData, type SceneElements } from "./mount";
import { addYear, followTitle } from "./overlay";
import { renderRecord } from "./record";

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
      };
      goTo(progress: number): void;
      /** Where an event's bead (by id) or a skill (by word) sits on the stage now, in pixels. */
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
  const scroller = find("scroller");
  const track = find("track");
  const stage = find("stage");
  const canvas = find<HTMLCanvasElement>("canvas");
  const title = find("title");
  return scroller && track && stage && canvas && title
    ? { root, scroller, track, stage, canvas, title }
    : null;
}

/** A lost graphics context hides the scene, so the name and the lists carry on. A restored one brings it back. */
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

export async function mountWorldLines(root: HTMLElement, data: SceneData) {
  const elements = elementsUnder(root);
  if (!elements) return null;
  // The lists come first and need no graphics, so the whole CV is on the page whatever happens to the scene.
  const record = root.querySelector<HTMLElement>("[data-lines-record]");
  if (record) renderRecord(record, data.events);
  let scene: WorldLinesScene;
  try {
    scene = new WorldLinesScene(elements, data);
  } catch {
    // No WebGL here: the name, the line under it and the lists stay as they are.
    return null;
  }
  watchContext(scene);
  followTitle(scene, elements.title);
  addYear(scene, elements.stage);
  addEnd(scene);
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
  window.worldLines.whereIs = (name) => {
    const index = data.events.findIndex((event) => event.id === name);
    if (index >= 0)
      return interaction.stagePositionOf(scene.beads.points[index]);
    const skill = data.skills.find((candidate) => candidate.word === name);
    return skill
      ? interaction.stagePositionOf(scene.skillPointOf(skill))
      : null;
  };
  introTime = playIntro(scene, elements.title);
  elements.stage.dataset.linesState = "drawing";
  scene.requestFrame();
  ready = true;
  return scene;
}

mountWorldLines(document.body, worldLinesData());
