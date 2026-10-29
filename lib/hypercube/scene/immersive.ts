/*
  The ride's own small chrome, for while every bar, name and control has stepped away. Skip sits at the top right from
  the first frame of the unfold until the ride ends, on its own, never fading (while the top bar still shows, its right
  group steps aside for it). A small player control, Pause or Play and Sound, shows as the ride starts and fades out
  2.5 s after the last touch, pointer move or key, coming back at any of them; while paused it stays. With it, a thin
  rail down the right edge shows where the ride is in the whole.

  The page says which state it is in on the stage, for the stylesheet: data-cube-autoplay (Skip shows),
  data-cube-immersive (the chrome steps away) and data-cube-player-shown (the control and the thin rail show).
*/
import { glyphElement, type Glyph } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import { hypercubeGlyphs } from "@/lib/hypercube/icons";
import type { Sound } from "./sound";

/** How long the player control stays after the last touch, pointer move or key, in milliseconds. */
const PLAYER_STAYS_MILLISECONDS = 2500;

function iconButton(glyph: Glyph, label: string, className: string) {
  const button = element("button", className);
  button.type = "button";
  button.dataset.cubeControl = "";
  button.setAttribute("aria-label", label);
  button.append(glyphElement(glyph, "cube-icon"));
  return button;
}

export class Immersive {
  readonly skip = element("button", "cube-control cube-skip");
  readonly player = element("div", "cube-player");
  readonly playButton = iconButton(hypercubeGlyphs.pause, "Pause", "cube-player-button");
  readonly soundButton = iconButton(hypercubeGlyphs.sound, "Sound", "cube-player-button");
  readonly thinRail = element("div", "cube-thin-rail");
  private readonly thinPoint = element("span", "cube-thin-point");
  private fadeTimer = 0;
  private playing = false;
  private railHeight = 1;
  private pointAt = -1;
  /** Set once the ride is over: nothing brings the control back while the camera pulls back. */
  private over = false;
  /** Called when the reader presses Pause or Play, and Skip. */
  onToggle: () => void = () => {};
  onSkip: () => void = () => {};

  constructor(
    private readonly stage: HTMLElement,
    private readonly sound: Sound,
  ) {
    this.skip.type = "button";
    this.skip.dataset.cubeControl = "";
    this.skip.setAttribute("aria-label", "Skip to the end");
    this.skip.append(glyphElement(hypercubeGlyphs.skip, "cube-icon"), element("span", undefined, "Skip"));
    this.skip.addEventListener("click", () => this.onSkip());
    this.player.dataset.cubeControl = "";
    this.player.setAttribute("role", "group");
    this.player.setAttribute("aria-label", "The ride");
    this.playButton.addEventListener("click", () => {
      this.onToggle();
      this.poke();
    });
    this.soundButton.hidden = !sound.available;
    this.soundButton.setAttribute("aria-pressed", String(sound.on));
    this.soundButton.addEventListener("click", () => {
      this.soundButton.setAttribute("aria-pressed", String(sound.toggle()));
      this.poke();
    });
    this.player.append(this.playButton, this.soundButton);
    this.thinRail.setAttribute("aria-hidden", "true");
    this.thinRail.append(this.thinPoint);
    stage.append(this.skip, this.player, this.thinRail);
    // Any touch, pointer move or key brings the control back while the ride holds the screen.
    for (const type of ["pointerdown", "keydown"]) document.addEventListener(type, () => this.poke(), { passive: true });
    stage.addEventListener("pointermove", (event) => event.pointerType === "mouse" && this.poke(), { passive: true });
    window.addEventListener("resize", () => this.measure());
  }

  isImmersive() {
    return this.stage.hasAttribute("data-cube-immersive");
  }

  /** Skip shows from the start of the autoplay until the ride ends, and the top bar's right group steps aside for it. */
  setAutoplay(on: boolean) {
    this.stage.toggleAttribute("data-cube-autoplay", on);
  }

  /** The ride holds the screen, or gives it back. */
  setImmersive(on: boolean) {
    if (on === this.isImmersive()) return;
    this.stage.toggleAttribute("data-cube-immersive", on);
    if (on) {
      this.poke();
      requestAnimationFrame(() => this.measure());
    } else {
      window.clearTimeout(this.fadeTimer);
      this.stage.removeAttribute("data-cube-player-shown");
    }
  }

  /** The ride plays or waits: the control says which, and stays while it waits. */
  setPlaying(playing: boolean) {
    this.playing = playing;
    this.over = false;
    const glyph = playing ? hypercubeGlyphs.pause : hypercubeGlyphs.play;
    this.playButton.replaceChildren(glyphElement(glyph, "cube-icon"));
    this.playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
    this.poke();
  }

  /** Brings the control and the thin rail back, and lets them fade again after a while unless the ride waits. */
  poke() {
    if (!this.isImmersive() || this.over) return;
    this.stage.setAttribute("data-cube-player-shown", "");
    window.clearTimeout(this.fadeTimer);
    if (!this.playing) return;
    this.fadeTimer = window.setTimeout(() => {
      // A control with the focus never fades from under the keyboard.
      if (this.player.contains(document.activeElement)) return this.poke();
      this.stage.removeAttribute("data-cube-player-shown");
    }, PLAYER_STAYS_MILLISECONDS);
  }

  /** The ride is over: the control and the thin rail go, while the camera pulls back. */
  hidePlayer() {
    this.playing = false;
    this.over = true;
    window.clearTimeout(this.fadeTimer);
    this.stage.removeAttribute("data-cube-player-shown");
  }

  /** Whether the control shows now. */
  playerShown() {
    return this.stage.hasAttribute("data-cube-player-shown");
  }

  /**
    The thin rail's moving point follows the ride's place in the whole, written only when it moves a pixel. As on the
    year rail, now is at the top and 2014 at the foot, so the point climbs as the ride comes forward.
  */
  follow(progress: number) {
    const at = Math.round((1 - progress) * this.railHeight);
    if (at === this.pointAt) return;
    this.pointAt = at;
    this.thinPoint.style.transform = `translateY(${at}px)`;
  }

  /** The thin rail's length, read when the screen changes, never per frame. */
  private measure() {
    this.railHeight = Math.max(1, this.thinRail.getBoundingClientRect().height);
    this.pointAt = -1;
  }

  /** Keeps the control's Sound in step with the top bar's. */
  showSound(on: boolean) {
    this.soundButton.setAttribute("aria-pressed", String(on));
  }
}
