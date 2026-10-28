/*
  The phone's tilt leans the object through w: tipping it sideways leans in the xw plane, forward and back in the yw
  plane, from however the phone was held when Tilt was tapped. iOS asks the reader for motion first, and only from a
  tap, so the page asks only when Tilt is tapped and never on load. Android needs no asking. Where the browser has no
  motion at all, the control is not shown.
*/
import type { HypercubeScene } from "./hypercube-scene";

/** How far the phone tips, in degrees, for the fullest lean. */
const FULLEST_TIP = 35;

type AskingOrientation = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

export class Tilt {
  readonly available: boolean;
  on = false;
  private start: { sideways: number; forward: number } | null = null;
  private readonly listener = (event: DeviceOrientationEvent) => this.read(event);

  constructor(private readonly scene: HypercubeScene) {
    this.available = scene.touch && typeof DeviceOrientationEvent !== "undefined";
  }

  /** Turns the tilt on or off. Says whether it is on afterwards. */
  async toggle() {
    if (this.on) {
      this.stop();
      return false;
    }
    const asking = DeviceOrientationEvent as AskingOrientation;
    if (typeof asking.requestPermission === "function") {
      try {
        if ((await asking.requestPermission()) !== "granted") return false;
      } catch {
        return false;
      }
    }
    this.on = true;
    this.start = null;
    window.addEventListener("deviceorientation", this.listener);
    return true;
  }

  stop() {
    this.on = false;
    window.removeEventListener("deviceorientation", this.listener);
    this.scene.turn.leanTo(0, 0);
    this.scene.requestFrame();
  }

  private read(event: DeviceOrientationEvent) {
    if (event.gamma === null || event.beta === null) return;
    this.start ??= { sideways: event.gamma, forward: event.beta };
    this.scene.turn.leanTo(
      (event.gamma - this.start.sideways) / FULLEST_TIP,
      (event.beta - this.start.forward) / FULLEST_TIP,
    );
    this.scene.requestFrame();
  }
}
