/*
  Version 7 of the About page, "Letters": the script (public/about/v7/letters.js, built by
  scripts/build-letters-page.ts). It reads the CV from content/about/profile.ts, bundled in, through lib/about-cv/,
  builds the land from it (lib/letters/land/) and draws it. mountLetters takes the root and the data and assumes
  nothing else about the document, so a React component can later mount the scene as it is.

  window.letters is for the checks that drive the page in a test browser: what is open, lit or found, where an event
  or a word sits, and ways to set the travel, the zoom and the turn.
*/
import { allEvents } from "@/lib/about-cv/events";
import { createScrollReader, type ScrollReader } from "@/lib/about-cv/scene/scroll";
import { listenForGestures, listenForKeys, type GestureHandlers, type GestureOptions } from "@/lib/about-cv/scene/gestures";
import { skillWords } from "@/lib/about-cv/skills";
import { presentTime } from "@/lib/about-cv/time";
import { buildLand } from "@/lib/letters/land/land";
import { Controls } from "./controls";
import { Idle } from "./idle";
import { Interaction } from "./interaction";
import { addKeyLayer } from "./keys";
import { LettersScene, type LettersData, type SceneElements } from "./letters-scene";
import { Search } from "./search";

/** How long the travel through time is, in screens of finger or wheel, from now back to 2014. */
const TRAVEL_SCREENS = 9;

export function lettersData(today = new Date()): LettersData {
  const present = presentTime(today);
  const events = allEvents(present);
  return { events, skills: skillWords(events), present, land: buildLand(events, present) };
}

function elementsUnder(root: HTMLElement): SceneElements | null {
  const stage = root.querySelector<HTMLElement>("[data-letters-stage]");
  const canvas = root.querySelector<HTMLCanvasElement>("[data-letters-canvas]");
  return stage && canvas ? { root, stage, canvas } : null;
}

/** Without graphics there is no land to hold: one plain line points to the page that reads without them. */
function sayTheSceneCannotShow(root: HTMLElement) {
  const line = document.createElement("p");
  line.className = "letters-plain";
  line.append("This version needs graphics this browser cannot give it. ");
  const link = document.createElement("a");
  link.href = "/about/";
  link.textContent = "The About page";
  line.append(link, " reads without them.");
  root.querySelector("[data-letters-stage]")?.append(line);
}

/** What the gestures leave alone: the panels and controls take their own pointers, the card and sheet their wheel. */
export const GESTURE_OPTIONS: GestureOptions = {
  ownPointers: ".letters-panel, .letters-search, a, button, input, [data-letters-control]",
  scrollsItself: ".letters-sheet, .letters-card",
  keysStayInside: ".letters-card, .letters-sheet, .letters-find, .letters-search",
};

export function mountLetters(root: HTMLElement, data: LettersData) {
  const elements = elementsUnder(root);
  if (!elements) return null;
  let scene: LettersScene;
  try {
    scene = new LettersScene(elements, data);
  } catch {
    sayTheSceneCannotShow(root);
    return null;
  }
  const travel = createScrollReader(elements.stage, TRAVEL_SCREENS, !scene.reducedMotion);
  travel.onScroll(() => {
    scene.travelRow = scene.view.rowAtTravel(travel.progress());
    scene.requestFrame();
  });
  scene.onFrame((seconds) => travel.step(seconds));
  const interaction = new Interaction(scene, travel);
  const controls = new Controls(scene, interaction, travel);
  const search = new Search(scene, interaction);
  const idle = new Idle(scene);
  addKeyLayer(scene, interaction);
  controls.onSearch = () => (search.isOpen() ? search.close() : search.open());
  interaction.onChange = () => requestAnimationFrame(() => controls.measure());
  search.onChange = interaction.onChange;
  stepTheTitleAside(scene, travel, controls);
  handleTheLand(scene, travel, interaction, controls);
  listenForEscape(search, controls, interaction);
  typingStartsASearch(search, controls);
  let pressed = false;
  elements.stage.addEventListener("pointerdown", () => (pressed = true));
  document.addEventListener("pointerup", () => (pressed = false));
  document.addEventListener("pointercancel", () => (pressed = false));
  // Reading is not idle, and neither is a hand on the land.
  idle.mayStart = () => !pressed && !controls.panelIsOpen() && !search.isOpen() && !interaction.flight.isFlying();
  showTheHintOnceTyped(scene, controls);
  exposeForChecks(scene, travel, interaction, controls, search, idle);
  scene.requestFrame();
  return scene;
}

/** The hint shows once the letters have typed themselves in. */
function showTheHintOnceTyped(scene: LettersScene, controls: Controls) {
  let shown = false;
  scene.onFrame(() => {
    if (shown || scene.reveal() < 1) return false;
    shown = true;
    controls.showHintOnce();
    return false;
  });
}

/** The name and the bio belong to the first screen: they step aside once the reader travels, zooms in or turns. */
function stepTheTitleAside(scene: LettersScene, travel: ScrollReader, controls: Controls) {
  const stage = scene.elements.stage;
  scene.onFrame(() => {
    const away = travel.progress() > 0.03 || scene.view.zoomTarget < -0.2 || Math.abs(scene.view.turnTarget) > 0.2;
    if (away === stage.hasAttribute("data-letters-away")) return false;
    stage.toggleAttribute("data-letters-away", away);
    requestAnimationFrame(() => controls.measure());
    return false;
  });
}

/** Every hand on the land: the shared gestures, and what each one moves here. */
function handleTheLand(scene: LettersScene, travel: ScrollReader, interaction: Interaction, controls: Controls) {
  const handlers: GestureHandlers = {
    travel,
    turnBy: (across) => {
      scene.view.turnBy(across);
      scene.requestFrame();
    },
    zoomBy: (amount) => {
      scene.view.zoomBy(amount);
      scene.requestFrame();
    },
    tap: (x, y) => interaction.tap(x, y),
    doubleTap: (x, y) => interaction.doubleTap(x, y),
    hover: (x, y) => interaction.hover(x, y),
    press: () => {},
    leave: () => interaction.leave(),
    began: () => controls.dismissHint(),
  };
  listenForGestures(scene.elements.stage, handlers, GESTURE_OPTIONS);
  listenForKeys(handlers, () => scene.elements.stage.clientHeight, GESTURE_OPTIONS);
  // iOS answers a long press with the text loupe, the callout and a menu. The stage takes the press itself.
  scene.elements.stage.addEventListener("contextmenu", (event) => event.preventDefault());
}

/** Escape closes the top thing: the search, Find me, the sheet, the card, the lit skill, the isolated world, then the view. */
function listenForEscape(search: Search, controls: Controls, interaction: Interaction) {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (search.close()) return;
    if (controls.closeFindMe()) return;
    if (controls.closeSheet()) return;
    if (interaction.stepBack()) return;
    if (controls.clearIsolation()) return;
    controls.resetView();
  });
}

/** A letter or a digit typed anywhere starts a search, unless a field has the focus or a panel is open. */
function typingStartsASearch(search: Search, controls: Controls) {
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1 || !/[a-z0-9]/i.test(event.key)) return;
    const target = event.target as Element | null;
    if (target?.closest("input, textarea, select, [contenteditable]")) return;
    if (search.isOpen() || controls.panelIsOpen()) return;
    event.preventDefault();
    search.open(event.key);
  });
}

/** For the checks that drive the page in a test browser. */
function exposeForChecks(
  scene: LettersScene,
  travel: ScrollReader,
  interaction: Interaction,
  controls: Controls,
  search: Search,
  idle: Idle,
) {
  const { data } = scene;
  window.letters = {
    state: () => ({
      ready: true,
      atlasReady: scene.isAtlasReady(),
      frames: scene.frameCount(),
      travel: travel.progress(),
      zoom: scene.view.zoom.value,
      turn: scene.view.turn.value,
      letters: data.land.letterCount,
      dots: data.land.dotCount,
      skillWords: scene.sky.placed.map((word) => data.skills[word.index].word),
      openCard:
        interaction.card.showing?.kind === "event" ? interaction.card.showing.event.id : (interaction.card.showing?.city.name ?? null),
      flying: interaction.flight.isFlying(),
      litSkill: interaction.litSkill?.word ?? null,
      litSkillWords: [...scene.litWords].map((index) => data.skills[index].word),
      isolated: interaction.isolated,
      searchOpen: search.isOpen(),
      searchLine: search.line.textContent,
      searchEvents: search.matchedIds ? [...search.matchedIds] : [],
      away: idle.active,
      awayShare: scene.landLayer.away,
      sheetOpen: !controls.sheet.hidden,
      findMeOpen: !controls.findMePanel.hidden,
      resetShown: !controls.resetButton.hidden,
      labels: scene.labels.shownIds(),
    }),
    whereIsEvent: (id: string) => {
      const item = data.land.events.find((candidate) => candidate.event.id === id);
      return item ? scene.view.toScreen(scene.crestPoint(item)) : null;
    },
    whereIsSkill: (word: string) => {
      const placed = scene.sky.placed.find((candidate) => data.skills[candidate.index].word === word);
      return placed ? placed.target : null;
    },
    goTo: (progress: number) => travel.scrollToProgress(progress),
    zoomBy: (amount: number) => {
      scene.view.zoomBy(amount);
      scene.requestFrame();
    },
    turnBy: (radians: number) => {
      scene.view.turnBy(radians);
      scene.requestFrame();
    },
    goAway: () => idle.start(false),
    overlaps: () => scene.overlaps(),
  };
}

declare global {
  interface Window {
    letters?: {
      state(): Record<string, unknown>;
      whereIsEvent(id: string): { x: number; y: number } | null;
      whereIsSkill(word: string): { left: number; top: number; right: number; bottom: number } | null;
      goTo(progress: number): void;
      zoomBy(amount: number): void;
      turnBy(radians: number): void;
      goAway(): void;
      overlaps(): { letters: number; overlapping: number };
    };
  }
}

mountLetters(document.body, lettersData());
