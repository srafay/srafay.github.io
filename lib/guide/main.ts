/*
  Version 6 of the About page, "Guide": the script (public/about/v6/guide.js, built by scripts/build-guide-page.ts). It
  reads the CV from content/about/profile.ts, bundled in, through lib/about-cv/. mountGuide takes the root and the data
  and assumes nothing else about the document, so a React component can later mount it as it is.

  window.guide is for the checks that drive the page in a test browser: what the python is doing, where its head is,
  what it said last, which line the tour is saying, where its bubble sits.
*/
import { skillAnswer } from "@/lib/about-cv/answers";
import { allEvents, type WorldEvent } from "@/lib/about-cv/events";
import { skillWords, type SkillWord } from "@/lib/about-cv/skills";
import { presentTime } from "@/lib/about-cv/time";
import { fieldColours, type SectionKey } from "@/lib/guide/palette";
import type { CostumeKey } from "@/lib/guide/python/costumes";
import { PythonView, type Home } from "@/lib/guide/python/python-view";
import type { TrickKey } from "@/lib/guide/python/tricks";
import { asides, costumeLines, narration, skillAnswerLine, tapLines, trickLines } from "@/lib/guide/script/lines";
import { Sound } from "@/lib/guide/sound";
import { PERCH_SIDE } from "@/lib/guide/tour";
import { AnswerPanel } from "@/lib/guide/ui/answer-panel";
import { Bars } from "@/lib/guide/ui/bars";
import { Camera } from "@/lib/guide/ui/camera";
import { CardDialog } from "@/lib/guide/ui/card-dialog";
import { mockupsBlock, playgroundBlock, skillsBlock, linksBlock, type ArtAddresses } from "@/lib/guide/ui/extras";
import { KeepClear } from "@/lib/guide/ui/keep-clear";
import { Narrator } from "@/lib/guide/ui/narrator";
import { Panels } from "@/lib/guide/ui/panels";
import { Say } from "@/lib/guide/ui/say";
import { Sections } from "@/lib/guide/ui/sections";
import { buildTour } from "@/lib/guide/ui/tour-view";

export type GuideData = { events: WorldEvent[]; skills: SkillWord[]; present: number };

declare global {
  interface Window {
    guide?: {
      state(): {
        ready: boolean;
        frames: number;
        home: string;
        held: boolean;
        trick: string | null;
        worn: string | null;
        said: string;
        saying: string | null;
        bubbleCovers: number;
        openEvent: string | null;
        litSkill: string | null;
        section: string;
        head: { x: number; y: number } | null;
        cell: { devicePixels: number; devicePixelRatio: number };
        canvas: { left: number; bottom: number; side: number };
        sound: boolean;
        /** In the den on a phone: the strip's top and the highest the python reaches, up from the bottom. */
        den: { inDen: boolean; top: number; highest: number };
      };
      /** The share of a rectangle of the screen the python's targets cover (y up from the bottom). */
      hitCoverage(left: number, bottom: number, width: number, height: number): number;
      /** Where a spine point sits in the viewport (y down), for a test finger. */
      spinePoint(index: number): { x: number; y: number };
      /** Redraws at another cell size, for the comparison crop. */
      setCell(devicePixels: number): void;
    };
  }
}

export function guideData(today = new Date()): GuideData {
  const present = presentTime(today);
  const events = allEvents(present);
  return { events, skills: skillWords(events), present };
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The mockups' images, named with their hashes by the build in the body's data. */
function artAddresses(root: HTMLElement): ArtAddresses {
  try {
    return JSON.parse(root.dataset.guideArt ?? "{}") as ArtAddresses;
  } catch {
    return { homepage: "", earthPost: "" };
  }
}

type Parts = {
  root: HTMLElement;
  layer: HTMLElement;
  canvas: HTMLCanvasElement;
  top: HTMLElement;
  topControls: HTMLElement;
  bottom: HTMLElement;
  tour: HTMLElement;
};

function partsOf(root: HTMLElement): Parts | null {
  const find = <Kind extends HTMLElement>(selector: string) => root.querySelector<Kind>(selector);
  const layer = find("[data-guide-python]");
  const canvas = find<HTMLCanvasElement>("[data-guide-canvas]");
  const top = find("[data-guide-top]");
  const topControls = find("[data-guide-top-controls]");
  const bottom = find("[data-guide-bottom]");
  const tour = find("[data-guide-tour]");
  if (!layer || !canvas || !top || !topControls || !bottom || !tour) return null;
  return { root, layer, canvas, top, topControls, bottom, tour };
}

export function mountGuide(root: HTMLElement, data: GuideData) {
  const parts = partsOf(root);
  if (!parts) return null;
  const reducedMotion = prefersReducedMotion();
  const eventsById = new Map(data.events.map((event) => [event.id, event]));
  const sound = new Sound();
  const keepClear = new KeepClear(
    () => [...root.querySelectorAll<HTMLElement>(".guide-name span, .guide-bio")],
    () => [
      ...parts.top.querySelectorAll<HTMLElement>(".guide-home, .guide-versions p, .guide-control"),
      ...root.querySelectorAll<HTMLElement>(".guide-panel:not([hidden]), .guide-dialog:not([hidden])"),
    ],
    () => [...parts.bottom.querySelectorAll<HTMLElement>(".guide-control"), ...root.querySelectorAll<HTMLElement>(".guide-tray")],
    () => [...parts.tour.querySelectorAll<HTMLElement>("button, a, input")],
  );
  const say = new Say(
    root,
    () => reducedMotion,
    (height) => keepClear.boxes(window.scrollY, height),
    () => keepClear.measureControlsInView(),
    () => denSpace(),
  );
  say.onWord = (word) => sound.blip(word);

  // The tour: every section after the first screen, with its lines and cards.
  const lines = buildTour(parts.tour, narration(), data.events, {
    openEvent: (event, from) => dialog.open(event, from),
    extra: (kind) => {
      if (kind === "skills") return skillsBlock(data.skills, (skill) => answerSkill(skill));
      if (kind === "links") return linksBlock();
      if (kind === "playground") return playgroundBlock(playTrick, wear);
      return mockupsBlock(artAddresses(root));
    },
  });
  const sections = new Sections(parts.tour);

  let python: PythonView;

  /** The bottom strip's own height (without a line's growth) and its floor above any safe area, up from the bottom. */
  const denSize = () => {
    const style = getComputedStyle(parts.bottom);
    const floor = parseFloat(style.paddingBottom) || 10;
    const height = parseFloat(getComputedStyle(root).getPropertyValue("--guide-den-height")) || 56;
    return { top: height + floor, floor: floor + 4 };
  };

  /** On a phone, while the python rests in the den, an aside is said in the den beside its head. */
  const denSpace = () => {
    if (!python?.stage.den || !python.inDen || !python.headFrame) return null;
    const head = python.headFrame.centre;
    return {
      left: head.x + python.headLength * 0.7,
      right: window.innerWidth - 12,
      floor: python.stage.denFloor,
      top: python.stage.denTop,
    };
  };
  let tapCount = 0;
  let pickedCount = 0;
  let droppedCount = 0;
  try {
    python = new PythonView(parts.layer, parts.canvas, {
      reducedMotion,
      label: "The python. Drag it to pick it up. Press Enter for a word from it, Space to lift it.",
      // In the den the python lies on the strip, which is one flat field: the one under the bottom of the screen.
      fieldsBehind: (bottomEdge, topEdge) =>
        python?.inDen
          ? { below: fieldColours[sections.at(window.scrollY + window.innerHeight - 30)], above: fieldColours[sections.at(window.scrollY + window.innerHeight - 30)], lineFromBottom: 1e6 }
          : sections.fieldsBehind(bottomEdge, topEdge, window.scrollY, window.innerHeight),
      onTap: () => say.say(tapLines[tapCount++ % tapLines.length]),
      onPickedUp: () => say.say(asides.pickedUp[pickedCount++ % asides.pickedUp.length]),
      onDropped: () => say.say(asides.dropped[droppedCount++ % asides.dropped.length]),
      onHeadMoved: (head, headLength) => say.follow(head, headLength),
      den: denSize,
    });
  } catch {
    return null;
  }

  const camera = new Camera(root);
  const answerPanel = new AnswerPanel(root, (event, from) => dialog.open(event, from));
  const dialog = new CardDialog(root, data.events, data.skills, (skill) => answerSkill(skill), () => python.look(null));

  /** A trick: the python plays it, says its line, and the page does its part (a flash, a beat, a bubble to hide in). */
  function playTrick(key: TrickKey) {
    if (!python.play(key)) return;
    say.say(trickLines[key]);
    bars.closeTrays();
    const head = python.headFrame?.centre;
    const headLength = python.headLength;
    if (key === "hiss") sound.hiss();
    if (key === "peekaboo") say.cover(reducedMotion ? 1.5 : 2.3);
    if (key === "dance") for (let beat = 0; beat < 8; beat++) window.setTimeout(() => sound.beat(), (beat * 60000) / 112);
    if (key === "selfie" && head) {
      sound.shutter();
      camera.take(head.x, head.y, headLength * 2.6, !reducedMotion);
    }
  }

  function wear(key: CostumeKey | null) {
    python.wear(key);
    bars.showWorn(key);
    say.say(key ? costumeLines[key] : costumeLines.none);
  }

  /**
   * Where a skill was used: the python says it short beside its head and turns to the panel, which names every role,
   * project and course behind it, each a button that opens its entry.
   */
  function answerSkill(skill: SkillWord) {
    const answer = skillAnswer(skill, eventsById);
    dialog.close(false);
    panels.close(false);
    answerPanel.open(skill, answer.events);
    keepClear.measure();
    say.say(skillAnswerLine(skill.word, answer.events, answer.sentence));
    const box = answerPanel.element.getBoundingClientRect();
    python.look({ x: box.left + box.width / 2, y: window.innerHeight - (box.top + box.height / 2), z: 0 });
  }

  const bars = new Bars(
    parts.topControls,
    parts.bottom,
    {
      onTrick: playTrick,
      onCostume: wear,
      onSound: () => {
        const on = sound.toggle();
        if (on) say.say(asides.soundOn);
        return on;
      },
      onSkills: () => panels.toggleSheet(bars.skills),
      onFindMe: () => panels.toggleFindMe(bars.findMe),
    },
    sound.available,
    sound.on,
  );
  const panels = new Panels(root, data.skills, (skill) => answerSkill(skill), () => keepClear.measure());
  // The bars are built: the den's strip has its real size now.
  python.denChanged();

  // The lines of the tour, said in turn as they come into view, the python turning to each.
  let lookingAtLine: { documentY: number; x: number } | null = null;
  const narrator = new Narrator(lines, {
    instant: reducedMotion,
    onWord: (word) => sound.blip(word),
    onLineStarted: (line) => {
      const box = line.getBoundingClientRect();
      lookingAtLine = { documentY: box.top + box.height / 2 + window.scrollY, x: box.left + box.width / 2 };
      followLine();
    },
  });
  const followLine = () => {
    if (!lookingAtLine) return;
    python.look({ x: lookingAtLine.x, y: window.innerHeight - (lookingAtLine.documentY - window.scrollY), z: 0 });
  };

  // Which field is where: under the bars, behind the python, and which perch the python takes.
  let current: SectionKey = "hello";
  const onScroll = () => {
    const scrolled = window.scrollY;
    const height = window.innerHeight;
    const underTop = sections.at(scrolled + 40);
    const underBottom = sections.at(scrolled + height - 30);
    const head = python.headFrame?.centre;
    const underPython = head ? sections.at(scrolled + height - head.y) : underBottom;
    if (root.dataset.underTop !== underTop) root.dataset.underTop = underTop;
    if (root.dataset.underBottom !== underBottom) root.dataset.underBottom = underBottom;
    if (root.dataset.underPython !== underPython) root.dataset.underPython = underPython;
    const middle = sections.at(scrolled + height * 0.5);
    if (middle !== current) {
      current = middle;
      const home: Home = middle === "hello" ? "hello" : python.stage.den ? "den" : PERCH_SIDE[middle];
      python.goHome(home);
      if (middle !== "hello" && !say.isHolding) say.hide();
    }
    followLine();
    python.nudge();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  sections.onMeasured = () => {
    keepClear.measure();
    onScroll();
  };
  keepClear.measure();

  for (const kind of ["pointerdown", "keydown"]) document.addEventListener(kind, () => sound.wake(), { once: true });
  let lastWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    python.resize();
    python.denChanged();
    keepClear.measure();
  });

  // The python from the keyboard: Enter for a word, Space to lift and set down, arrows to move it while held.
  const head = python.hits.headButton;
  head.addEventListener("click", (event) => {
    if (event.detail === 0) say.say(tapLines[tapCount++ % tapLines.length]);
  });
  head.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
      if (python.held) python.letGo();
      else python.liftByKeys();
      return;
    }
    const steps: Record<string, [number, number]> = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, 24], ArrowDown: [0, -24] };
    const step = steps[event.key];
    if (step && python.held) {
      event.preventDefault();
      python.nudgeHeld(step[0], step[1]);
    }
  });

  // Escape closes the top thing: a tray, an answer, the card, a panel, then sets a held python down.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (bars.closeTrays()) return;
    if (dialog.close()) return;
    if (answerPanel.close()) return;
    if (panels.close()) return;
    if (python.held) python.letGo();
  });

  // The first words: who it is, then the hint about being picked up, then the way on.
  const hello = narration().hello;
  const firstWords = [hello[0].line, asides.pickMeUp, hello[1].line];
  let spoken = 0;
  const sayNext = () => {
    // Never over another line: a tap's or a trick's aside finishes first, and the next first word waits for it.
    if (spoken >= firstWords.length || current !== "hello" || python.held || say.shown) return;
    say.say(firstWords[spoken++]);
  };
  const helloHidden = say.onHidden;
  say.onHidden = () => {
    helloHidden();
    window.setTimeout(sayNext, 900);
  };
  window.setTimeout(sayNext, reducedMotion ? 0 : 500);

  window.guide = {
    state: () => ({
      ready: true,
      frames: python.frames,
      home: python.currentHome,
      held: python.held,
      trick: python.playing,
      worn: python.worn,
      said: say.line,
      saying: narrator.saying,
      bubbleCovers: say.shown ? say.overlapping : 0,
      openEvent: dialog.event?.id ?? null,
      litSkill: answerPanel.skill?.word ?? null,
      section: current,
      head: python.headFrame ? { x: python.headFrame.centre.x, y: python.headFrame.centre.y } : null,
      cell: python.cell,
      canvas: python.canvasBox,
      sound: sound.on,
      den: {
        inDen: python.inDen,
        top: python.stage.denTop,
        highest: Math.max(...python.currentSpine.map((each) => each.y + python.headLength * 0.12), (python.headFrame?.centre.y ?? 0) + python.headLength * 0.42),
      },
    }),
    hitCoverage: (left, bottomEdge, width, height) => python.hits.coverage(left, bottomEdge, width, height),
    spinePoint: (index) => {
      const each = python.currentSpine[index];
      return { x: each.x, y: window.innerHeight - each.y };
    },
    setCell: (devicePixels) => python.setCell(devicePixels),
  };
  onScroll();
  python.requestFrame();
  return python;
}

mountGuide(document.body, guideData());
