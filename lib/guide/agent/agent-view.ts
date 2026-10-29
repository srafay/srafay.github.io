/*
  The agent on the page: where it rests, how it floats between homes, where it attends, what it wears, how it is
  held, the tricks it plays, and how it is drawn. One frame loop, which runs only while something moves: at the
  screen's rate during a grab, a trick or a move, and at 30 frames a second when it only breathes. Nothing is drawn
  while the page is hidden.
*/
import * as THREE from "three";
import { Follower } from "@/lib/about-cv/scene/follower";
import { Attention, gazedOffset, routerFrame, type Gaze } from "./attention";
import { tallestOf, type YearBar } from "./chart";
import { Wardrobe, type CostumeKey } from "./costumes";
import type { FieldsBehind } from "./dither";
import { DitherRenderer } from "./dither";
import { HitArea } from "./hit-area";
import { conePlace, denRoomLeft, depthBelow, fanExtent, fanOffsets, largestRadius, opennessOf, placeOf, type Home, type Place, type Stage } from "./homes";
import { Messenger } from "./messages";
import { AgentModel, flatBoxOf, type FlatBox, type LinkLay } from "./model";
import { Mobile } from "./mobile";
import { canvasSideFor, messageSizeInCells, openWidthShare, shape } from "./proportions";
import { NODE_COUNT, ROUTER, nodeOfTool, toolOfNode, type ToolKey } from "./topology";
import { momentAt, timeline, tricks, type ChartPlan, type Part, type TrickContext, type TrickKey, type TrickPose } from "./tricks";
import { add, alongCurve, boundsOf, copyPoint, distance, lerpPoint, normalise, point, scale, subtract, turnedInPlane, type Bounds, type Point } from "./vectors";

export type { Home } from "./homes";

/** Drawn at most this often when the agent only breathes: 30 frames a second. */
const IDLE_FRAME_SECONDS = 1 / 30 - 0.003;
/** How quickly it floats home: a soft spring, settled within about 1.4 seconds. */
const FLOAT_STIFFNESS = 26;
/** A press becomes a grab after this much movement (CSS pixels) or this long held (seconds). */
const GRAB_AFTER_PIXELS = 6;
const GRAB_AFTER_SECONDS = 0.18;
/** How far from home, in CSS pixels, the agent counts as flying, its discs letting presses through. */
const FLYING_DISTANCE = 8;
/** How long a pointer or a finger holds the agent's attention after it last moved, in seconds. */
const POINTER_HOLDS_FOR = 2.5;
/** How much the den's strip grows to hold the chart, in CSS pixels, and how tall its tallest bar stands there. */
export const DEN_CHART_ROOM = 110;
const DEN_CHART_TALLEST = 56;

/** Where the chart's labels go: under the first, last and tallest bars, and the count over the tallest. */
export type ChartLabels = {
  baseline: number;
  first: { x: number; year: number };
  last: { x: number; year: number };
  tallest: { x: number; top: number; year: number; count: number };
  inDen: boolean;
};

export type AgentViewOptions = {
  reducedMotion: boolean;
  /** The fields behind the canvas, from its bottom and top in stage space (y up from the screen's bottom). */
  fieldsBehind(bottom: number, top: number): FieldsBehind;
  /** Called when the agent is tapped, not dragged. */
  onTap(): void;
  onPickedUp(): void;
  onDropped(): void;
  /**
   * Called each drawn frame with the router's centre, how far round it a bubble keeps clear (where the cone may swing),
   * and the bounds of everything else drawn, in stage space.
   */
  onMoved(router: Point, reach: number, bounds: Bounds): void;
  /** Called when the chart's labels move, or with null when the chart is gone. */
  onChart(labels: ChartLabels | null): void;
  /** The bottom strip, measured by the page: how tall it is and where its floor is, up from the screen's bottom. */
  den(): { top: number; floor: number };
  /** The CV by year, for the chart. */
  bars: YearBar[];
  /** The middle of its own bubble while it speaks, in stage space, or null. */
  bubble(): Point | null;
  label: string;
};

type Press = { pointerId: number; x: number; y: number; at: number; node: number };
type PlayingTrick = { key: TrickKey; started: number; parts: Part[]; seconds: number; context: TrickContext };

export class AgentView {
  readonly reducedMotion: boolean;
  stage: Stage;
  private readonly model: AgentModel;
  private readonly dither: DitherRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(0, 1, 1, 0, -5000, 5000);
  private readonly wardrobe: Wardrobe;
  readonly hits: HitArea;
  private home: Home = "hello";
  private readonly routerX = new Follower(0, FLOAT_STIFFNESS);
  private readonly routerY = new Follower(0, FLOAT_STIFFNESS);
  private readonly routerZ = new Follower(0, FLOAT_STIFFNESS);
  private readonly size = new Follower(1, FLOAT_STIFFNESS);
  private readonly fold = new Follower(0, FLOAT_STIFFNESS);
  private readonly turn = new Follower(0, FLOAT_STIFFNESS);
  /** How far the cone is moved out along its link to keep clear of what the router wears. */
  private readonly conePush = new Follower(0, 60);
  /** Whether the cone's box and the worn costume's box are apart, as last drawn, for checks. */
  coneClearOfCostume = true;
  private readonly attention = new Attention();
  private readonly mobile: Mobile;
  private readonly messenger = new Messenger();
  private press: Press | null = null;
  private trick: PlayingTrick | null = null;
  private lookAt: Point | null = null;
  private frameRequested = false;
  private lastDrawn = 0;
  private hidden = false;
  private nudgedUntil = 0;
  private gaze: Gaze = { leanX: 0, leanY: 0, swing: 0, across: 0, up: 0, aim: 0 };
  /** The last place a pointer moved or a finger touched, and when. */
  private pointer: { place: Point; at: number } | null = null;
  /** What it attends to now, and where the cone points from, for checks and the cone. */
  attending: Point = { x: 0, y: 0, z: 0 };
  cone: { place: Point; aim: Point; angle: number } = { place: { x: 0, y: 0, z: 0 }, aim: { x: 0, y: 1, z: 0 }, angle: 0 };
  frames = 0;
  /** As last drawn, for checks, the bubble and the den. */
  nodes: Point[] = [];
  radius = 0;
  drawnBounds: Bounds = { left: 0, right: 0, bottom: 0, top: 0 };
  /** The graph's own bounds as last drawn (the router, tools and personas), without the chart or the copies. */
  graphBounds: Bounds = { left: 0, right: 0, bottom: 0, top: 0 };
  lit: ToolKey | null = null;
  message: Point | null = null;
  shown = { bars: [] as number[], copies: 0, personas: [] as boolean[], phantoms: 0 };
  canvasBox = { left: 0, bottom: 0, side: 0 };

  constructor(
    private readonly layer: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly options: AgentViewOptions,
  ) {
    this.reducedMotion = options.reducedMotion;
    this.stage = this.measureStage();
    this.dither = new DitherRenderer(canvas);
    this.model = new AgentModel(this.stage.narrow ? 6 : 8);
    this.scene.add(this.model.group);
    this.wardrobe = new Wardrobe(this.model.costumeHolder);
    this.hits = new HitArea(layer, options.label);
    const start = this.placeNow();
    this.jumpTo(start);
    this.mobile = new Mobile(this.restNodes(start.router, start.radius, start.folded, start.turn, 0));
    this.sizeCanvas();
    this.listen();
  }

  /** The screen as the homes see it. The height is taken on width changes only, so a phone's sliding bars move nothing. */
  private measureStage(): Stage {
    const width = window.innerWidth;
    const den = this.options.den();
    return { width, height: window.innerHeight, narrow: width < 700, den: width < 900, denTop: den.top, denFloor: den.floor };
  }

  private sizeCanvas() {
    this.dither.resize(canvasSideFor(largestRadius(this.stage)), window.devicePixelRatio || 1);
  }

  private placeNow(): Place {
    return placeOf(this.stage, this.home);
  }

  private jumpTo(place: Place) {
    this.routerX.jump(place.router.x);
    this.routerY.jump(place.router.y);
    this.routerZ.jump(place.router.z);
    this.size.jump(place.radius);
    this.fold.jump(place.folded);
    this.turn.jump(place.turn);
  }

  /** The screen's width changed: everything is laid out again for it. */
  resize() {
    if (window.innerWidth === this.stage.width && (window.devicePixelRatio || 1) === this.dither.devicePixelRatio) return;
    this.stage = this.measureStage();
    this.sizeCanvas();
    this.mobile.letGo();
    delete this.layer.dataset.held;
    const place = this.placeNow();
    this.jumpTo(place);
    this.mobile.place(this.restNodes(place.router, place.radius, place.folded, place.turn, this.clock()));
    this.requestFrame();
  }

  private clock = () => performance.now() / 1000;

  /** The bottom strip was measured again (its height changed): the den follows it. */
  denChanged() {
    const den = this.options.den();
    if (den.top === this.stage.denTop && den.floor === this.stage.denFloor) return;
    this.stage = { ...this.stage, denTop: den.top, denFloor: den.floor };
    if (!this.trick && !this.held) this.jumpTo(this.placeNow());
    this.requestFrame();
  }

  /** Resting in the den and not moving or held. */
  get inDen() {
    if (this.home !== "den" || this.held) return false;
    const place = this.placeNow();
    return Math.abs(this.routerX.value - place.router.x) < 2 && Math.abs(this.routerY.value - place.router.y) < 2 && Math.abs(this.size.value - place.radius) < 0.5;
  }

  goHome(home: Home) {
    if (home === this.home) return;
    this.home = home;
    if (this.reducedMotion) this.jumpTo(this.placeNow());
    this.requestFrame();
  }

  get currentHome() {
    return this.home;
  }

  wear(costume: CostumeKey | null) {
    this.wardrobe.wear(costume);
    this.requestFrame();
  }

  get worn() {
    return this.wardrobe.worn;
  }

  /** Where the chart stands for a trick begun now: in the den's grown strip on a phone, under the graph elsewhere. */
  private chartPlan(router: Point, radius: number): ChartPlan {
    const bars = this.options.bars;
    const count = bars.length;
    if (this.home === "den") {
      const left = denRoomLeft(this.stage);
      const step = (this.stage.width - 16 - left) / count;
      return { left, baseline: this.stage.denTop + 22, step, barWidth: step * 0.68, tallest: DEN_CHART_TALLEST, bars };
    }
    const step = radius * 0.5;
    const width = step * count;
    const left = Math.min(Math.max(12, router.x - width / 2), this.stage.width - 12 - width);
    const baseline = router.y - depthBelow(radius, 0);
    return { left, baseline, step, barWidth: step * 0.68, tallest: radius * 2, bars };
  }

  /**
   * Plays a trick with its lines. Answers its parts in time, so the page can say each line when its part begins, or
   * null when it cannot play now (held).
   */
  play(key: TrickKey, lines: string[], secondsToSay: (line: string) => number, routeUp = false) {
    if (this.held) return null;
    this.stopTrick();
    const router = point(this.routerX.value, this.routerY.value, this.routerZ.value);
    const radius = this.size.value;
    const context: TrickContext = {
      router,
      radius,
      folded: this.fold.value,
      turn: this.turn.value,
      towardRoom: this.home === "den" ? 1 : router.x > this.stage.width / 2 ? -1 : 1,
      chart: key === "chart" ? this.chartPlan(router, radius) : null,
      routeUp,
    };
    const { parts, seconds } = timeline(tricks[key], lines, secondsToSay, this.reducedMotion);
    this.trick = { key, started: this.clock(), parts, seconds, context };
    this.requestFrame();
    return { parts, seconds };
  }

  /** Ends a trick now: everything it showed goes. */
  stopTrick() {
    if (!this.trick) return;
    this.trick = null;
    this.clearExtras();
    this.requestFrame();
  }

  private clearExtras() {
    this.model.setBars(null);
    this.model.setCopies(null);
    this.model.setPersonas(null, point(), 0);
    this.model.setPhantoms(null, 0, point(), 0);
    this.options.onChart(null);
    this.shown = { bars: [], copies: 0, personas: [], phantoms: 0 };
  }

  get playing() {
    return this.trick?.key ?? null;
  }

  /** The part of the trick playing now, for checks. */
  get part() {
    if (!this.trick) return null;
    return momentAt(this.trick.parts, this.clock() - this.trick.started).part;
  }

  get held() {
    return this.mobile?.held !== null && this.mobile?.held !== undefined;
  }

  /** Attends to a place in stage space, or to the reader when null. */
  look(place: Point | null) {
    this.lookAt = place;
    this.requestFrame();
  }

  /** Sends an idle message soon, for checks and crops. */
  sendMessageSoon() {
    this.messenger.soon(this.clock());
    this.requestFrame();
  }

  private listen() {
    const toStage = (event: PointerEvent): Point => ({ x: event.clientX, y: window.innerHeight - event.clientY, z: 0 });
    this.hits.element.addEventListener("pointerdown", (event) => {
      if (!this.hits.owns(event.target) || event.button > 0) return;
      const place = toStage(event);
      this.press = { pointerId: event.pointerId, ...place, at: this.clock(), node: this.nodeToHold(event.target as HTMLElement, place) };
      try {
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
      } catch {
        // A pointer the browser no longer counts as down cannot be captured: the window still hears it move.
      }
      event.preventDefault();
      this.requestFrame();
    });
    // A touch that began on the agent never scrolls the page, even where touch-action is not honoured.
    this.hits.element.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
    window.addEventListener("pointermove", (event) => {
      const place = toStage(event);
      if (event.pointerType === "mouse") this.notePointer(place);
      if (!this.press || event.pointerId !== this.press.pointerId) return;
      const moved = Math.hypot(place.x - this.press.x, place.y - this.press.y);
      if (!this.held && moved > GRAB_AFTER_PIXELS) this.pickUp(place);
      if (this.held) this.mobile.moveHand(place);
      this.requestFrame();
    });
    const release = (event: PointerEvent) => {
      if (!this.press || event.pointerId !== this.press.pointerId) return;
      const wasHeld = this.held;
      this.press = null;
      if (wasHeld) this.letGo();
      else this.options.onTap();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("pointerdown", (event) => this.notePointer(toStage(event)));
    document.addEventListener("visibilitychange", () => {
      this.hidden = document.visibilityState === "hidden";
      if (!this.hidden) this.requestFrame();
    });
  }

  private notePointer(place: Point) {
    this.pointer = { place, at: this.clock() };
    this.requestFrame();
  }

  /**
   * What it attends to, first that applies: a trick's own focus (the way a route goes, the chart, a persona); a pointer or
   * finger that moved in the last 2.5 seconds; its own bubble while it speaks; what the page asks it to watch (the line
   * being said, an open answer); and otherwise a little toward the roomier side.
   */
  private attentionTarget(pose: TrickPose | null, router: Point, radius: number, now: number): Point {
    if (pose?.look) return pose.look;
    if (this.pointer && now - this.pointer.at < POINTER_HOLDS_FOR && !this.held) return this.pointer.place;
    return this.options.bubble() ?? this.lookAt ?? this.restingGaze(router, radius);
  }

  /** Which node a press takes hold of: the router or a tool for their own targets; for a link, whichever end is nearer. */
  private nodeToHold(target: HTMLElement, place: Point) {
    const node = Number(target.dataset.node ?? ROUTER);
    if (!target.classList.contains("guide-hit-link")) return node;
    const nodes = this.nodes.length ? this.nodes : this.mobile.points;
    return distance(place, nodes[ROUTER]) < distance(place, nodes[node]) ? ROUTER : node;
  }

  /** Takes hold of the agent at the pressed node, from where the hand is now. */
  private pickUp(hand: Point) {
    if (!this.press) return;
    this.stopTrick();
    this.mobile.place(this.nodes.length ? this.nodes : this.mobile.points);
    this.mobile.hold(this.press.node, hand);
    this.layer.dataset.held = "";
    this.options.onPickedUp();
    this.requestFrame();
  }

  /** Lets go: it floats home from where it is. */
  letGo() {
    if (!this.held) return;
    this.options.onDropped();
    const router = this.mobile.points[ROUTER];
    this.routerX.jump(router.x);
    this.routerY.jump(router.y);
    this.routerZ.jump(router.z);
    this.mobile.letGo();
    delete this.layer.dataset.held;
    this.requestFrame();
  }

  /** Lifts it from the keyboard: held by the router, raised a little. */
  liftByKeys() {
    const router = this.nodes[ROUTER] ?? point(this.routerX.value, this.routerY.value, 0);
    this.press = { pointerId: -1, x: router.x, y: router.y, at: this.clock(), node: ROUTER };
    this.pickUp({ x: router.x, y: router.y + this.size.value * 1.2, z: 0 });
    this.press = null;
  }

  /** Moves an agent held from the keyboard. */
  nudgeHeld(across: number, up: number) {
    if (!this.held || this.mobile.held === null) return;
    const held = this.mobile.points[this.mobile.held];
    this.mobile.moveHand({ x: held.x + across, y: held.y + up, z: 0 });
    this.requestFrame();
  }

  /** The page scrolled: draw at the screen's rate for a moment, so a field's edge passing behind keeps up. */
  nudge() {
    this.nudgedUntil = this.clock() + 0.25;
    this.requestFrame();
  }

  /** At most one frame is asked for at a time. */
  requestFrame() {
    if (this.frameRequested || this.hidden) return;
    this.frameRequested = true;
    requestAnimationFrame(() => this.frame());
  }

  /**
   * Whether the agent is visibly flying between homes: its router more than a few pixels from home. The last stretch
   * of a float, under a few pixels, is not flying: the agent can be taken hold of again.
   */
  private get flying() {
    return this.awayFromHome > FLYING_DISTANCE;
  }

  /** Whether the agent is on its way somewhere: floating home, growing or folding. */
  private get travelling() {
    const place = this.placeNow();
    return (
      Math.abs(this.routerX.value - place.router.x) > 0.3 ||
      Math.abs(this.routerY.value - place.router.y) > 0.3 ||
      Math.abs(this.size.value - place.radius) > 0.05 ||
      Math.abs(this.fold.value - place.folded) > 0.003 ||
      Math.abs(this.turn.value - place.turn) > 0.003
    );
  }

  private frame() {
    this.frameRequested = false;
    const now = this.clock();
    // The time since the last frame drawn, not the last frame asked for: at 30 frames a second half are skipped.
    const seconds = Math.min(0.1, this.lastDrawn ? now - this.lastDrawn : 1 / 60);
    const busy = Boolean(this.held || this.trick || this.press) || this.travelling || now < this.nudgedUntil;
    const idle = !this.reducedMotion;
    if (!busy && idle && now - this.lastDrawn < IDLE_FRAME_SECONDS) {
      this.requestFrame();
      return;
    }
    this.draw(now, seconds);
    this.lastDrawn = now;
    if (busy || idle) this.requestFrame();
  }

  /**
   * The tools' places round a router at rest, turned by the gaze, swaying unless motion is reduced. The route's cone
   * sits over the router where it can aim at what the agent attends to; no other tool rises past the router's top.
   */
  private restNodes(router: Point, radius: number, folded: number, turn: number, now: number): Point[] {
    const offsets = fanOffsets(radius, folded, turn);
    const openness = opennessOf(turn);
    const route = nodeOfTool("route");
    const nodes = [copyPoint(router)];
    offsets.forEach((offset, index) => {
      const node = index + 1;
      const sway = this.reducedMotion ? point() : point(Math.sin(now * 0.7 + index * 1.3) * radius * 0.07, Math.sin(now * 0.9 + index * 2.1) * radius * 0.05, 0);
      const turned = node === route ? lerpPoint(gazedOffset(offset, this.gaze), conePlace(radius, this.gaze.aim), openness) : keptUnderTheTop(gazedOffset(offset, this.gaze), radius, turn);
      nodes.push(add(add(router, turned), sway));
    });
    return nodes;
  }

  /**
   * Where it attends with nothing to follow: a little toward the roomier side and up, near enough that it only half
   * leans, so a pointer or a touch elsewhere is seen to take its attention.
   */
  private restingGaze(router: Point, radius: number): Point {
    // In the den it rests facing the reader, so its fan lies even along the strip; a line or a touch still turns it.
    if (this.home === "den") return { ...router };
    const toward = router.x > this.stage.width / 2 ? -1 : 1;
    return { x: router.x + toward * radius * 1.5, y: router.y + radius * 0.6, z: 0 };
  }

  private draw(now: number, seconds: number) {
    // A press held still becomes a grab too: the agent lifts from where the hand rests.
    if (this.press && !this.held && now - this.press.at > GRAB_AFTER_SECONDS) this.pickUp({ x: this.press.x, y: this.press.y, z: 0 });
    const step = this.reducedMotion ? 0 : seconds;
    const place = this.placeNow();
    const radius = this.held ? this.size.value : this.follow(this.size, place.radius, step);
    const folded = this.held ? this.fold.value : this.follow(this.fold, place.folded, step);
    const turn = this.held ? this.turn.value : this.follow(this.turn, place.turn, step);
    // Floating: a slow rise and fall, so it never looks pinned.
    const bob = this.reducedMotion ? 0 : Math.sin(now * 0.9) * radius * 0.05;
    let router: Point = this.held
      ? this.mobile.points[ROUTER]
      : point(this.follow(this.routerX, place.router.x, step), this.follow(this.routerY, place.router.y, step) + bob, this.follow(this.routerZ, place.router.z, step));

    const trick = this.trick;
    let pose: TrickPose | null = null;
    if (trick) {
      const into = now - trick.started;
      const play = tricks[trick.key];
      const moment = momentAt(trick.parts, into);
      const still = this.reducedMotion ? { part: play.still.part, share: play.still.share, seconds: into } : null;
      pose = play.pose(still ?? moment, trick.context);
      // Under reduced motion the pose holds still, but who speaks follows the lines.
      if (still && trick.key === "focusGroup") pose = play.pose({ ...moment, share: 0.5 }, trick.context);
      if (into >= trick.seconds) {
        this.trick = null;
        this.clearExtras();
        pose = null;
      }
    }

    const target = this.attentionTarget(pose, router, radius, now);
    this.attending = target;
    this.gaze = this.attention.step(router, target, radius, this.held ? step * 0.5 : step);
    if (!this.held) router = add(router, point(this.gaze.leanX, this.gaze.leanY, 0));
    const rest = this.restNodes(router, radius, folded, turn, now);
    this.mobile.step(seconds, router, rest, radius);

    const nodes = this.mobile.points.map((each, node) => {
      const wanted = pose?.places[node];
      return wanted ? lerpPoint(each, wanted, pose?.weight ?? 0) : copyPoint(each);
    });
    const foldScale = 1 + (shape.foldedToolScale - 1) * folded;
    const toolScales = (pose?.toolScales ?? Array.from({ length: NODE_COUNT }, () => 1)).map((each, node) => (node === ROUTER ? each : each * foldScale));
    this.keepOnScreen(nodes, radius);
    this.keepTheRingLow(nodes, radius, toolScales);
    const message = this.messageNow(now, nodes, pose);
    const breath = nodes.map((_, node) => this.breathAt(now, node, message));
    const links = this.linksFor(nodes, radius, now, toolScales);
    const frame = routerFrame(this.gaze);
    const route = nodeOfTool("route");
    const unpushedCone = nodes[route];
    const outward = normalise(point(unpushedCone.x - nodes[ROUTER].x, unpushedCone.y - nodes[ROUTER].y, 0));
    const layTheGraph = () => {
      nodes[route] = add(unpushedCone, scale(outward, this.conePush.value));
      links[route - 1] = { ...links[route - 1], to: nodes[route] };
      const conePoint = nodes[route];
      const coneAim = this.held ? normalise(subtract(conePoint, nodes[ROUTER])) : normalise(point(target.x - conePoint.x, target.y - conePoint.y, 0));
      this.cone = { place: conePoint, aim: coneAim, angle: this.gaze.aim };
      this.model.layOut(nodes, radius, frame, breath, links, toolScales, coneAim);
    };
    layTheGraph();
    // Laid again at once when the cone has to move out further, so it never shows on a costume even for a frame.
    if (this.keepTheConeClearOfTheCostume(outward, step)) layTheGraph();
    this.lit = pose ? pose.lit : message?.atTool ? message.tool : null;
    this.model.setLit(this.lit);
    this.messageCells = messageSizeInCells(radius / largestRadius(this.stage));
    const cell = (this.dither.cell / this.dither.devicePixelRatio) * this.messageCells;
    this.message = message?.place ?? null;
    this.model.setMessage(this.message, cell);
    const extras = this.drawExtras(pose, nodes[ROUTER], radius, trick?.context ?? null);

    this.nodes = nodes;
    this.radius = radius;
    this.toolScales = toolScales;
    this.graphBounds = this.boundsOfGraph(nodes, radius, toolScales, pose);
    this.drawnBounds = mergeBounds(this.graphBounds, extras);
    this.placeCanvasAndDraw(this.drawnBounds);
    this.hits.place(nodes, radius, toolScales, this.held);
    this.hits.letPressesThrough(this.flying && !this.held && !this.press);
    // The bubble keeps clear of everything but the cone, which turns to aim at it and stays within the router's reach.
    const withoutCone = nodes.map((node, index) => (index === nodeOfTool("route") && !this.held ? nodes[ROUTER] : node));
    const reach = radius * 1.65 + this.conePush.value;
    this.options.onMoved(nodes[ROUTER], reach, mergeBounds(this.boundsOfGraph(withoutCone, radius, toolScales, pose), extras));
    this.frames++;
  }

  /**
   * The cone never sits on what the router wears (a cap's peak, a mortarboard's corner): it moves out along its link
   * until its box and the costume's are apart, smoothly, and back in when the costume comes off.
   */
  private keepTheConeClearOfTheCostume(outward: Point, seconds: number) {
    const worn = this.wardrobe.wornGroup;
    if (!worn) {
      this.coneClearOfCostume = true;
      this.follow(this.conePush, 0, seconds);
      return false;
    }
    const cone = this.model.coneBox();
    const costume = flatBoxOf(worn);
    // How far the cone would have to move from where it would be with no push: boxes move with what they hold.
    const unpushed = shiftedBox(cone, scale(outward, -this.conePush.value));
    const needed = separationAlong(unpushed, costume, outward, 4);
    // Out at once, back in smoothly: the cone is never seen on the costume, and never snaps back toward it.
    if (needed > this.conePush.value) {
      this.conePush.jump(needed);
      this.coneClearOfCostume = !boxesOverlap(shiftedBox(unpushed, scale(outward, needed)), costume, 0);
      return true;
    }
    this.follow(this.conePush, needed, seconds);
    this.coneClearOfCostume = !boxesOverlap(shiftedBox(unpushed, scale(outward, this.conePush.value)), costume, 0);
    return false;
  }

  /**
   * The ring never hangs over the router's top, where a ring on a short link reads as an ornament's loop: whatever the
   * fan, a trick or the den does, it stays under the top on the screen, unless it is the node in the hand.
   */
  private keepTheRingLow(nodes: Point[], radius: number, toolScales: number[]) {
    const ring = nodeOfTool("search");
    if (this.mobile.held === ring || toolScales[ring] < 0.2) return;
    const offset = subtract(nodes[ring], nodes[ROUTER]);
    if (offset.y <= HIGHEST_TOOL * radius) return;
    nodes[ring] = add(nodes[ROUTER], loweredOnItsCircle(offset, HIGHEST_TOOL * radius));
  }

  /** A trick never takes a tool off the screen's sides or under its bottom. */
  private keepOnScreen(nodes: Point[], radius: number) {
    if (!this.trick) return;
    const margin = shape.toolSize * radius + 6;
    for (const node of nodes) {
      node.x = Math.min(Math.max(margin, node.x), this.stage.width - margin);
      node.y = Math.max(margin * 0.8, node.y);
    }
  }

  /** A follower's step toward a target, or a jump there under reduced motion. */
  private follow(follower: Follower, target: number, seconds: number) {
    if (seconds > 0) follower.step(target, seconds);
    else follower.jump(target);
    return follower.value;
  }

  /** Breathing: each node swells and settles about every 3.6 seconds, a little out of step; a tool pulses on a message. */
  private breathAt(now: number, node: number, message: { node: number; atTool: boolean } | null) {
    if (this.reducedMotion) return 1;
    const pulse = message?.atTool && message.node === node ? 0.12 : 0;
    return 1 + 0.03 * Math.sin(((now + node * 0.45) / 3.6) * Math.PI * 2) + pulse;
  }

  /** Each link from the router to its tool, bowing a little as it sways. */
  private linksFor(nodes: Point[], radius: number, now: number, toolScales: number[]): LinkLay[] {
    const links: LinkLay[] = [];
    for (let node = 1; node < NODE_COUNT; node++) {
      const along = subtract(nodes[node], nodes[ROUTER]);
      const length = Math.hypot(along.x, along.y) || 1;
      const sideways = point(-along.y / length, along.x / length, 0);
      // Held, the links are cords pulled straight by what hangs on them.
      const bow = this.reducedMotion || this.held ? 0 : Math.sin(now * 0.8 + node * 1.7) * length * 0.05;
      links.push({ from: nodes[ROUTER], to: nodes[node], fromRadius: radius, toRadius: shape.toolSize * radius * toolScales[node], bow: scale(sideways, bow) });
    }
    return links;
  }

  /** The message cell now: a trick's own, or an idle one between the router and a tool. */
  private messageNow(now: number, nodes: Point[], pose: TrickPose | null) {
    if (pose?.message) {
      const { from, to, share } = pose.message;
      return { place: lerpPoint(from, to, share), node: -1, atTool: false, tool: null };
    }
    if (this.reducedMotion || pose) return null;
    const state = this.messenger.at(now, this.held || this.travelling);
    if (!state) return null;
    const from = nodes[ROUTER];
    const to = nodes[state.node];
    const middle = add(lerpPoint(from, to, 0.5), point(0, 0, 0));
    return { place: alongCurve(from, middle, to, state.along), node: state.node, atTool: state.atTool, tool: toolOfNode(state.node) };
  }

  /** What the trick shows besides the graph: answers their bounds. */
  private drawExtras(pose: TrickPose | null, router: Point, radius: number, context: TrickContext | null): Point[] {
    const extents: Point[] = [];
    if (!pose) return extents;
    if (pose.bars) {
      this.model.setBars(pose.bars);
      this.shown.bars = pose.bars.map((bar) => bar.height);
      for (const bar of pose.bars) {
        extents.push(point(bar.centre.x - bar.width, bar.centre.y - 22), point(bar.centre.x + bar.width, bar.centre.y + bar.height + 22));
      }
      this.reportChart(pose.bars, context);
    }
    if (pose.copiesOut !== undefined && context) {
      const out = pose.copiesOut;
      const copies = [0, 1, 2].map((index) => {
        const { centre, size } = this.copyPlace(router, radius, context, index);
        const shrink = 1 + (size - 1) * out;
        const at = lerpPoint(router, centre, out);
        const transform = new THREE.Matrix4()
          .makeTranslation(at.x, at.y, at.z)
          .multiply(new THREE.Matrix4().makeRotationY(context.towardRoom * 0.18 * (index + 1) * out))
          .multiply(new THREE.Matrix4().makeScale(shrink, shrink, shrink))
          .multiply(new THREE.Matrix4().makeTranslation(-router.x, -router.y, -router.z));
        const reach = fanExtent(radius, context.folded, context.turn);
        extents.push(point(at.x + reach.left * shrink, at.y + reach.bottom * shrink), point(at.x + reach.right * shrink, at.y + reach.top * shrink));
        return { transform, presence: (0.86 - 0.14 * index) * out };
      });
      this.model.setCopies(copies);
      this.shown.copies = copies.filter((copy) => copy.presence > 0.05).length;
    }
    if (pose.personas) {
      this.model.setPersonas(pose.personas, router, radius);
      this.shown.personas = pose.personas.map((persona) => persona.lit);
      for (const persona of pose.personas) extents.push(add(persona.place, point(-persona.radius, -persona.radius)), add(persona.place, point(persona.radius, persona.radius)));
    }
    if (pose.phantoms) {
      this.model.setPhantoms(pose.phantoms, pose.phantomPresence ?? 0, router, radius);
      this.shown.phantoms = (pose.phantomPresence ?? 0) > 0.05 ? pose.phantoms.filter((phantom) => phantom.size > 1).length : 0;
      for (const phantom of pose.phantoms) extents.push(add(phantom.place, point(-phantom.size, -phantom.size)), add(phantom.place, point(phantom.size, phantom.size)));
    }
    return extents;
  }

  /**
   * Where each faint copy goes, like a row of image results: in a phone's den to its right, small; elsewhere in a row
   * over it, smaller still.
   */
  private copyPlace(router: Point, radius: number, context: TrickContext, index: number) {
    if (this.home === "den") {
      const size = 0.5;
      const extent = fanExtent(radius, 1, context.turn);
      const step = (extent.right - extent.left) * size + 8;
      return { centre: add(router, point(extent.right + step * (index + 0.5) - extent.left * size, 0, -radius)), size };
    }
    const size = 0.3;
    const step = openWidthShare() * radius * size + 10;
    return { centre: add(router, point((index - 1) * step, radius * 2.4, -radius)), size };
  }

  /** Tells the page where the chart's labels go once its bars stand, and that they are gone as the bars fold. */
  private reportChart(bars: { centre: Point; height: number }[], context: TrickContext | null) {
    const plan = context?.chart;
    const tallestHeight = Math.max(...bars.map((bar) => bar.height));
    if (!plan || tallestHeight < plan.tallest * 0.7) return this.options.onChart(null);
    const tallest = tallestOf(plan.bars);
    const index = plan.bars.indexOf(tallest);
    this.options.onChart({
      baseline: plan.baseline,
      first: { x: bars[0].centre.x, year: plan.bars[0].year },
      last: { x: bars[bars.length - 1].centre.x, year: plan.bars[plan.bars.length - 1].year },
      tallest: { x: bars[index].centre.x, top: plan.baseline + bars[index].height, year: tallest.year, count: tallest.count },
      inDen: this.home === "den",
    });
  }

  /** The bounds of the graph itself: the router with room for a hat, each shown tool and the personas. */
  private boundsOfGraph(nodes: Point[], radius: number, toolScales: number[], pose: TrickPose | null): Bounds {
    const hat = this.wardrobe.worn ? 0.35 : 0;
    const points: Point[] = [add(nodes[ROUTER], point(-radius * 1.1, -radius * 1.1)), add(nodes[ROUTER], point(radius * 1.1, radius * (1.1 + hat)))];
    for (let node = 1; node < NODE_COUNT; node++) {
      if (toolScales[node] < 0.05) continue;
      const reach = shape.toolSize * radius * toolScales[node] * 1.3;
      points.push(add(nodes[node], point(-reach, -reach)), add(nodes[node], point(reach, reach)));
    }
    for (const persona of pose?.personas ?? []) points.push(add(persona.place, point(-persona.radius, -persona.radius)), add(persona.place, point(persona.radius, persona.radius)));
    return boundsOf(points);
  }

  /** The canvas follows what is drawn, whole cells at a time, and the camera with it. Then it is drawn. */
  private placeCanvasAndDraw(bounds: Bounds) {
    const side = this.dither.cssSide;
    const unit = this.dither.cell / this.dither.devicePixelRatio;
    const left = Math.round(((bounds.left + bounds.right) / 2 - side / 2) / unit) * unit;
    const bottom = Math.round(((bounds.bottom + bounds.top) / 2 - side / 2) / unit) * unit;
    this.canvas.style.transform = `translate3d(${left}px, ${-bottom}px, 0)`;
    this.camera.left = left;
    this.camera.right = left + side;
    this.camera.bottom = bottom;
    this.camera.top = bottom + side;
    this.camera.updateProjectionMatrix();
    this.dither.render(this.scene, this.camera, this.options.fieldsBehind(bottom, bottom + side));
    this.canvasBox = { left, bottom, side };
  }

  get cell() {
    return { devicePixels: this.dither.cell, devicePixelRatio: this.dither.devicePixelRatio };
  }

  /** Redraws at a different cell size, for comparison crops only. */
  setCell(devicePixels: number) {
    this.dither.resize(canvasSideFor(largestRadius(this.stage)), this.dither.devicePixelRatio, devicePixels);
    this.requestFrame();
  }

  private toolScales: number[] = [];
  /** How many dither cells across a message is now, for checks. */
  messageCells = 4;

  /** Each shown tool's box as last drawn, in stage space, for checks: its place and its size either way. */
  toolBoxes() {
    return this.nodes.slice(1).map((node, index) => {
      const reach = shape.toolSize * this.radius * (this.toolScales[index + 1] ?? 1);
      return { left: node.x - reach, right: node.x + reach, bottom: node.y - reach, top: node.y + reach };
    });
  }

  /** How big each node is drawn, as a share, for checks (the router first). */
  shownScales() {
    return [...this.toolScales];
  }

  /** Each link as last drawn, from the router's edge to its tool, in stage space, for checks. */
  cords() {
    const router = this.nodes[ROUTER];
    if (!router) return [];
    return this.nodes.slice(1).map((node) => {
      const toward = normalise(subtract(node, router));
      return { from: { x: router.x + toward.x * this.radius * 0.85, y: router.y + toward.y * this.radius * 0.85 }, to: { x: node.x, y: node.y } };
    });
  }

  /** Where the den's room right of the resting agent starts, from the screen's left edge. */
  get denRoomLeft() {
    return denRoomLeft(this.stage);
  }

  /** How far the router floats from its home now, for checks. */
  get awayFromHome() {
    const place = this.placeNow();
    return Math.hypot(this.routerX.value - place.router.x, this.routerY.value - place.router.y);
  }
}

/** How high a tool may sit over the router's centre, in its radii: under its top edge, so nothing hangs from the top. */
const HIGHEST_TOOL = 0.15;

/** A tool's place round the router kept under the router's top, in the fan's own frame (turned with the fan in the den). */
function keptUnderTheTop(offset: Point, radius: number, turn: number) {
  const level = turnedInPlane(offset, -turn);
  if (level.y <= HIGHEST_TOOL * radius) return offset;
  return turnedInPlane(loweredOnItsCircle(level, HIGHEST_TOOL * radius), turn);
}

/** A place round the router brought down to a height, at the same distance from it, so its link keeps its length. */
function loweredOnItsCircle(offset: Point, height: number): Point {
  const reach = Math.hypot(offset.x, offset.y);
  const across = Math.sqrt(Math.max(0, reach * reach - height * height));
  return { x: offset.x < 0 ? -across : across, y: height, z: offset.z };
}

/** Whether two boxes on the screen overlap, with a margin. */
function boxesOverlap(first: FlatBox, second: FlatBox, margin: number) {
  return first.left < second.right + margin && second.left - margin < first.right && first.bottom < second.top + margin && second.bottom - margin < first.top;
}

const shiftedBox = (box: FlatBox, by: Point): FlatBox => ({ left: box.left + by.x, right: box.right + by.x, bottom: box.bottom + by.y, top: box.top + by.y });

/** How far a box must move along a direction to stop overlapping another, with a margin: 0 when they are apart. */
function separationAlong(moving: FlatBox, fixed: FlatBox, direction: Point, margin: number) {
  if (!boxesOverlap(moving, fixed, margin)) return 0;
  const distances: number[] = [];
  if (direction.x > 0.05) distances.push((fixed.right + margin - moving.left) / direction.x);
  if (direction.x < -0.05) distances.push((fixed.left - margin - moving.right) / direction.x);
  if (direction.y > 0.05) distances.push((fixed.top + margin - moving.bottom) / direction.y);
  if (direction.y < -0.05) distances.push((fixed.bottom - margin - moving.top) / direction.y);
  return distances.length ? Math.max(0, Math.min(...distances)) : 0;
}

/** One box round a box and some more points. */
function mergeBounds(bounds: Bounds, extra: Point[]): Bounds {
  if (!extra.length) return bounds;
  const more = boundsOf(extra);
  return {
    left: Math.min(bounds.left, more.left),
    right: Math.max(bounds.right, more.right),
    bottom: Math.min(bounds.bottom, more.bottom),
    top: Math.max(bounds.top, more.top),
  };
}
