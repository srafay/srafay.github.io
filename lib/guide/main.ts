/*
  Version 6 of the About page, "Guide": the script (public/about/v6/guide.js, built by scripts/build-guide-page.ts). It
  reads the CV from content/about/profile.ts, bundled in, through lib/about-cv/. mountGuide takes the root and the data
  and assumes nothing else about the document, so a React component can later mount it as it is.

  window.guide is for the checks that drive the page in a test browser: what the agent is doing, where its router is,
  what it said last, which line the tour is saying, where its bubble sits.
*/
import { skillAnswer } from "@/lib/about-cv/answers";
import { allEvents, type WorldEvent } from "@/lib/about-cv/events";
import { skillWords, type SkillWord } from "@/lib/about-cv/skills";
import { presentTime } from "@/lib/about-cv/time";
import { AgentView, DEN_CHART_ROOM, type Home } from "@/lib/guide/agent/agent-view";
import { cvByYear } from "@/lib/guide/agent/chart";
import { sideMargin } from "@/lib/guide/agent/proportions";
import type { CostumeKey } from "@/lib/guide/agent/costumes";
import { NODE_COUNT } from "@/lib/guide/agent/topology";
import type { Part, TrickKey } from "@/lib/guide/agent/tricks";
import { fieldColours, type SectionKey } from "@/lib/guide/palette";
import { asides, costumeLines, narration, routeLine, skillAnswerLine, tapLines, trickLines } from "@/lib/guide/script/lines";
import { Sound } from "@/lib/guide/sound";
import { PERCH_SIDE, SECTION_TITLES, TOUR_ORDER } from "@/lib/guide/tour";
import { AnswerPanel } from "@/lib/guide/ui/answer-panel";
import { Bars } from "@/lib/guide/ui/bars";
import { CardDialog } from "@/lib/guide/ui/card-dialog";
import { ChartLabels } from "@/lib/guide/ui/chart-labels";
import { mockupsBlock, playgroundBlock, skillsBlock, linksBlock, type ArtAddresses } from "@/lib/guide/ui/extras";
import { KeepClear } from "@/lib/guide/ui/keep-clear";
import { Narrator } from "@/lib/guide/ui/narrator";
import { Panels } from "@/lib/guide/ui/panels";
import { Say } from "@/lib/guide/ui/say";
import { Sections } from "@/lib/guide/ui/sections";
import { buildTour } from "@/lib/guide/ui/tour-view";
import { secondsToSay } from "@/lib/guide/ui/typing";

export type GuideData = { events: WorldEvent[]; skills: SkillWord[]; present: number };

type Box = { left: number; right: number; bottom: number; top: number };

declare global {
  interface Window {
    guide?: {
      state(): {
        ready: boolean;
        frames: number;
        home: string;
        held: boolean;
        trick: string | null;
        part: string | null;
        lit: string | null;
        worn: string | null;
        said: string;
        saying: string | null;
        bubbleCovers: number;
        openEvent: string | null;
        litSkill: string | null;
        section: string;
        seen: string[];
        head: { x: number; y: number } | null;
        radius: number;
        nodes: { x: number; y: number; z: number }[];
        bounds: Box;
        awayFromHome: number;
        message: { x: number; y: number; cells: number } | null;
        /** What it attends to, and the cone: where it sits and where it points, in stage space. */
        attending: { x: number; y: number };
        cone: { x: number; y: number; aimX: number; aimY: number; angle: number };
        /** Its own bubble on the screen (y down), when shown. */
        bubbleBox: { left: number; top: number; right: number; bottom: number } | null;
        /** Each tool's box and the cord to it, in stage space, for the mobile's checks. */
        toolBoxes: { left: number; right: number; bottom: number; top: number }[];
        cords: { from: { x: number; y: number }; to: { x: number; y: number } }[];
        toolScales: number[];
        shown: { bars: number[]; copies: number; personas: boolean[]; phantoms: number };
        chartLabels: string[] | null;
        cell: { devicePixels: number; devicePixelRatio: number };
        canvas: { left: number; bottom: number; side: number };
        sound: boolean;
        hits: number;
        /** The cone's box apart from the worn costume's box. */
        coneClearOfCostume: boolean;
        /** In the den on a phone: the strip's top and the highest the agent reaches, up from the bottom. */
        den: { inDen: boolean; top: number; highest: number; stripTop: number };
      };
      /** The share of a rectangle of the screen the agent's targets cover (y up from the bottom). */
      hitCoverage(left: number, bottom: number, width: number, height: number): number;
      /** Where a node sits in the viewport (y down), for a test finger: 0 is the router, 1 to 6 the tools. */
      nodePoint(index: number): { x: number; y: number };
      /** Where the middle of a tool's link sits in the viewport (y down). */
      linkPoint(index: number): { x: number; y: number };
      /** Sends an idle message along a link soon, for crops. */
      sendMessage(): void;
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
  const layer = find("[data-guide-agent]");
  const canvas = find<HTMLCanvasElement>("[data-guide-canvas]");
  const top = find("[data-guide-top]");
  const topControls = find("[data-guide-top-controls]");
  const bottom = find("[data-guide-bottom]");
  const tour = find("[data-guide-tour]");
  if (!layer || !canvas || !top || !topControls || !bottom || !tour) return null;
  return { root, layer, canvas, top, topControls, bottom, tour };
}

/**
 * Without graphics there is no agent: the tour's lines show whole, since nobody is there to say them, and one plain
 * line points to the page that reads without graphics.
 */
function sayTheAgentCannotShow(root: HTMLElement, lines: HTMLElement[]) {
  for (const line of lines) delete line.dataset.waiting;
  const note = document.createElement("p");
  note.className = "guide-plain";
  note.append("This version needs graphics this browser cannot give it. ");
  const link = document.createElement("a");
  link.href = "/about/";
  link.textContent = "The About page";
  note.append(link, " reads without them.");
  root.querySelector("[data-guide-tour]")?.prepend(note);
}

/**
 * Where a route goes: the first section after the one in view that the reader has not seen, then the first unseen
 * before it, then simply the next; from the last section, back to the start. Null means the start.
 */
export function routeTarget(current: SectionKey, seen: Set<SectionKey>): SectionKey | null {
  const place = TOUR_ORDER.indexOf(current);
  if (place === TOUR_ORDER.length - 1) return null;
  const after = TOUR_ORDER.slice(place + 1).find((key) => !seen.has(key));
  if (after) return after;
  const before = TOUR_ORDER.slice(0, place).find((key) => !seen.has(key));
  if (before) return before === "hello" ? null : before;
  return TOUR_ORDER[place + 1];
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
    // The whole bottom strip, not only its buttons: on a phone it is the agent's den, never a place for a bubble.
    () => [parts.bottom, ...root.querySelectorAll<HTMLElement>(".guide-tray")],
    // The tour's own lines and cards too: the agent's bubble never lies over the narration or an item.
    () => [...parts.tour.querySelectorAll<HTMLElement>("button, a, input, .guide-line, .guide-card")],
  );
  const say = new Say(
    root,
    () => reducedMotion,
    (height) => keepClear.boxes(window.scrollY, height),
    () => {
      keepClear.measure();
      keepClear.measureControlsInView();
    },
    () => denSpace(),
    // In a computer's side margin, a bubble as wide as the margin, so it stays out of the tour's column.
    () => (agent && !agent.stage.den && agent.currentHome !== "hello" ? Math.max(220, sideMargin(window.innerWidth) - 24) : null),
  );
  say.onWord = (word) => sound.blip(word);
  say.openTrays = () => [...root.querySelectorAll<HTMLElement>(".guide-tray:not([hidden])")].map((tray) => tray.getBoundingClientRect());

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
  const chartLabels = new ChartLabels(root);
  const yearBars = cvByYear(data.events, data.present);

  let agent: AgentView;

  /** The bottom strip's own height (without a line's growth) and its floor above any safe area, up from the bottom. */
  const denSize = () => {
    const style = getComputedStyle(parts.bottom);
    const floor = parseFloat(style.paddingBottom) || 10;
    const height = parseFloat(getComputedStyle(root).getPropertyValue("--guide-den-height")) || 56;
    return { top: height + floor, floor: floor + 4 };
  };

  /**
   * On a phone, while the den is the agent's home (resting there, on its way there, or picked up out of it), an aside is
   * said in the den, right of where the agent rests: a section full of narration and cards has no clear place for it.
   */
  const denSpace = () => {
    if (!agent?.stage.den || agent.currentHome !== "den") return null;
    return {
      left: agent.inDen ? agent.graphBounds.right + 10 : agent.denRoomLeft,
      right: window.innerWidth - 12,
      floor: agent.stage.denFloor,
      top: agent.stage.denTop,
    };
  };
  let tapCount = 0;
  let pickedCount = 0;
  let droppedCount = 0;
  const fieldUnderTheDen = () => fieldColours[sections.at(window.scrollY + window.innerHeight - 30)];
  try {
    agent = new AgentView(parts.layer, parts.canvas, {
      reducedMotion,
      label: "The agent. Drag it to pick it up. Press Enter for a word from it, Space to lift it.",
      // In the den the agent rests on the strip, which is one flat field: the one under the bottom of the screen.
      fieldsBehind: (bottomEdge, topEdge) =>
        agent?.inDen
          ? { below: fieldUnderTheDen(), above: fieldUnderTheDen(), lineFromBottom: 1e6 }
          : sections.fieldsBehind(bottomEdge, topEdge, window.scrollY, window.innerHeight),
      onTap: () => say.say(tapLines[tapCount++ % tapLines.length]),
      onPickedUp: () => say.say(asides.pickedUp[pickedCount++ % asides.pickedUp.length]),
      onDropped: () => say.say(asides.dropped[droppedCount++ % asides.dropped.length]),
      // The bubble keeps clear of everything near the router, where the cone may swing to aim at it.
      onMoved: (router, reach, bounds) => say.follow(router, reach, bounds),
      onChart: (places) => chartLabels.show(places),
      den: denSize,
      bars: yearBars,
      bubble: () => say.centre,
    });
  } catch {
    sayTheAgentCannotShow(root, lines);
    return null;
  }

  const answerPanel = new AnswerPanel(root, (event, from) => dialog.open(event, from));
  const dialog = new CardDialog(root, data.events, data.skills, (skill) => answerSkill(skill), () => agent.look(null));

  // Which field is where: under the bars, behind the agent, and which home it takes. A section is seen once it has
  // been the one in the middle of the screen.
  let current: SectionKey = "hello";
  const seen = new Set<SectionKey>(["hello"]);

  /** The lines a trick says, its timers, and the den room it keeps: all of it ends with the trick. */
  let trickTimers: number[] = [];
  const endTrickTimers = () => {
    for (const timer of trickTimers) window.clearTimeout(timer);
    trickTimers = [];
    say.releaseDenRoom();
  };

  /** The page's part in a trick: a sound, a scroll. */
  function trickExtras(key: TrickKey, timeline: { parts: Part[]; seconds: number }, routeTo: SectionKey | null) {
    if (key === "search") sound.sweep();
    if (key === "similar") sound.copies();
    if (key === "hallucinate") sound.wobble();
    if (key === "chart") sound.bars(yearBars.length, 1.2);
    if (key === "research" || key === "focusGroup") sound.tick();
    if (key === "route") {
      sound.route();
      say.keepThroughScroll(timeline.seconds + 1);
      trickTimers.push(
        window.setTimeout(() => {
          const top = routeTo ? sections.topOf(routeTo) : 0;
          window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
        }, reducedMotion ? 0 : 700),
      );
    }
  }

  /** A trick: the agent plays it, says each line as its part begins, and the page does its part. */
  function playTrick(key: TrickKey) {
    const routeTo = key === "route" ? routeTarget(current, seen) : null;
    const words = key === "route" ? [routeLine(routeTo ? SECTION_TITLES[routeTo] : null)] : [...trickLines[key]];
    endTrickTimers();
    const goesUp = key === "route" && (!routeTo || TOUR_ORDER.indexOf(routeTo) < TOUR_ORDER.indexOf(current));
    const timeline = agent.play(key, words, secondsToSay, goesUp);
    if (!timeline) return;
    bars.closeTrays();
    if (key === "chart" && agent.currentHome === "den") say.reserveDenRoom(DEN_CHART_ROOM);
    for (const part of timeline.parts) {
      if (!part.say) continue;
      const line = part.say;
      if (part.start === 0) say.say(line);
      else trickTimers.push(window.setTimeout(() => agent.playing === key && say.say(line), part.start * 1000));
    }
    trickTimers.push(window.setTimeout(endTrickTimers, timeline.seconds * 1000 + 50));
    trickExtras(key, timeline, routeTo);
  }

  // A tap that sends a trick's line away ends the trick: what it was going to say next is not said.
  say.onDismissed = () => {
    if (!agent.playing) return;
    endTrickTimers();
    agent.stopTrick();
  };

  /** A costume: the agent wears it and says its line; the tray closes, as it does after a trick, so it can be seen. */
  function wear(key: CostumeKey | null) {
    agent.wear(key);
    bars.showWorn(key);
    bars.closeTrays();
    say.say(key ? costumeLines[key] : costumeLines.none);
  }

  /**
   * Where a skill was used: the agent says it short beside its router and turns to the panel, which names every role,
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
    agent.look({ x: box.left + box.width / 2, y: window.innerHeight - (box.top + box.height / 2), z: 0 });
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
      // A tray opened or closed: a line shown looks again at what to keep clear of.
      onTraysChanged: () => say.relook(),
    },
    sound.available,
    sound.on,
  );
  const panels = new Panels(root, data.skills, (skill) => answerSkill(skill), () => keepClear.measure());
  // The bars are built: the den's strip has its real size now.
  agent.denChanged();

  // The lines of the tour, said in turn as they come into view, the agent turning to each.
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
    agent.look({ x: lookingAtLine.x, y: window.innerHeight - (lookingAtLine.documentY - window.scrollY), z: 0 });
  };

  const onScroll = () => {
    const scrolled = window.scrollY;
    const height = window.innerHeight;
    const underTop = sections.at(scrolled + 40);
    const underBottom = sections.at(scrolled + height - 30);
    const router = agent.nodes[0];
    const underAgent = router ? sections.at(scrolled + height - router.y) : underBottom;
    if (root.dataset.underTop !== underTop) root.dataset.underTop = underTop;
    if (root.dataset.underBottom !== underBottom) root.dataset.underBottom = underBottom;
    if (root.dataset.underAgent !== underAgent) root.dataset.underAgent = underAgent;
    const middle = sections.at(scrolled + height * 0.5);
    if (middle !== current) {
      current = middle;
      seen.add(middle);
      const home: Home = middle === "hello" ? "hello" : agent.stage.den ? "den" : PERCH_SIDE[middle];
      agent.goHome(home);
      if (middle !== "hello" && !say.isHolding) say.hide();
      else say.relook();
    }
    followLine();
    agent.nudge();
    // A line still shown when a scroll comes to rest looks again at what is now on screen.
    window.clearTimeout(scrollRest);
    scrollRest = window.setTimeout(() => say.relook(), 160);
  };
  let scrollRest = 0;
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
    agent.resize();
    agent.denChanged();
    keepClear.measure();
  });

  // The agent from the keyboard: Enter for a word, Space to lift and set down, arrows to move it while held.
  const head = agent.hits.headButton;
  head.addEventListener("click", (event) => {
    if (event.detail === 0) say.say(tapLines[tapCount++ % tapLines.length]);
  });
  head.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
      if (agent.held) agent.letGo();
      else agent.liftByKeys();
      return;
    }
    const steps: Record<string, [number, number]> = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, 24], ArrowDown: [0, -24] };
    const step = steps[event.key];
    if (step && agent.held) {
      event.preventDefault();
      agent.nudgeHeld(step[0], step[1]);
    }
  });

  // Escape closes the top thing: a tray, an answer, the card, a panel, then sets a held agent down.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (bars.closeTrays()) return;
    if (dialog.close()) return;
    if (answerPanel.close()) return;
    if (panels.close()) return;
    if (agent.held) agent.letGo();
  });

  // The first words: who it is, then the hint about being picked up, then the way on.
  const hello = narration().hello;
  const firstWords = [hello[0].line, asides.pickMeUp, hello[1].line];
  let spoken = 0;
  const sayNext = () => {
    // Never over another line: a tap's or a trick's aside finishes first, and the next first word waits for it.
    if (spoken >= firstWords.length || current !== "hello" || agent.held || agent.playing || say.shown) return;
    say.say(firstWords[spoken++]);
  };
  const helloHidden = say.onHidden;
  say.onHidden = () => {
    helloHidden();
    window.setTimeout(sayNext, 900);
  };
  window.setTimeout(sayNext, reducedMotion ? 0 : 500);

  const toViewport = (place: { x: number; y: number }) => ({ x: place.x, y: window.innerHeight - place.y });
  window.guide = {
    state: () => {
      const router = agent.nodes[0] ?? null;
      const stripTop = parts.bottom.getBoundingClientRect().top;
      return {
        ready: true,
        frames: agent.frames,
        home: agent.currentHome,
        held: agent.held,
        trick: agent.playing,
        part: agent.part,
        lit: agent.lit,
        worn: agent.worn,
        said: say.line,
        saying: narrator.saying,
        bubbleCovers: say.shown ? say.overlapping : 0,
        openEvent: dialog.event?.id ?? null,
        litSkill: answerPanel.skill?.word ?? null,
        section: current,
        seen: [...seen],
        head: router ? { x: router.x, y: router.y } : null,
        radius: agent.radius,
        nodes: agent.nodes.map((each) => ({ ...each })),
        bounds: { ...agent.drawnBounds },
        awayFromHome: agent.awayFromHome,
        message: agent.message ? { x: agent.message.x, y: agent.message.y, cells: agent.messageCells } : null,
        attending: { x: agent.attending.x, y: agent.attending.y },
        cone: { x: agent.cone.place.x, y: agent.cone.place.y, aimX: agent.cone.aim.x, aimY: agent.cone.aim.y, angle: agent.cone.angle },
        bubbleBox: say.shown ? { ...say.box } : null,
        toolBoxes: agent.toolBoxes(),
        toolScales: agent.shownScales(),
        cords: agent.cords(),
        shown: { ...agent.shown },
        chartLabels: chartLabels.shown ? chartLabels.words : null,
        cell: agent.cell,
        canvas: agent.canvasBox,
        sound: sound.on,
        hits: agent.hits.count,
        coneClearOfCostume: agent.coneClearOfCostume,
        den: {
          inDen: agent.inDen,
          top: agent.stage.denTop,
          highest: agent.graphBounds.top,
          stripTop: window.innerHeight - stripTop,
        },
      };
    },
    hitCoverage: (left, bottomEdge, width, height) => agent.hits.coverage(left, bottomEdge, width, height),
    nodePoint: (index) => toViewport(agent.nodes[Math.min(NODE_COUNT - 1, Math.max(0, index))]),
    linkPoint: (index) => {
      const router = agent.nodes[0];
      const tool = agent.nodes[Math.min(NODE_COUNT - 1, Math.max(1, index))];
      return toViewport({ x: (router.x + tool.x) / 2, y: (router.y + tool.y) / 2 });
    },
    sendMessage: () => agent.sendMessageSoon(),
    setCell: (devicePixels) => agent.setCell(devicePixels),
  };
  onScroll();
  agent.requestFrame();
  return agent;
}

mountGuide(document.body, guideData());
