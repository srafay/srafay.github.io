/*
  Sound, off unless the reader turns it on, made in the browser with Web Audio: no sound files. A low drone whose pitch
  follows how far time has turned through w: A at 55 hertz with time straight along w, rising as time turns into
  space, to the A above once it has turned right round. A soft tone of its world's own note when an event is tapped. The choice is remembered on
  this device. Nothing sounds before a gesture: a remembered "on" waits for the first touch, click or key.
*/
import type { WorldKey } from "@/lib/about-cv/worlds";

const REMEMBERED = "hypercube-sound";
/** The drone's lowest pitch, in hertz, and its loudness. */
const DRONE_ROOT = 55;
const DRONE_LOUDNESS = 0.06;
/** Each world's note: the A minor pentatonic from A4, so any two sound well together. */
const WORLD_NOTES: Record<WorldKey, number> = {
  work: 440,
  study: 523.25,
  projects: 587.33,
  courses: 659.25,
  offTheClock: 783.99,
};
const TONE_LOUDNESS = 0.07;

type Drone = { low: OscillatorNode; fifth: OscillatorNode; filter: BiquadFilterNode; gain: GainNode };

const audioContextKind = () =>
  (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
  (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

function remembered() {
  try {
    return localStorage.getItem(REMEMBERED) === "on";
  } catch {
    return false;
  }
}

function remember(on: boolean) {
  try {
    localStorage.setItem(REMEMBERED, on ? "on" : "off");
  } catch {
    // Storage refused: the choice lasts this visit only.
  }
}

export class Sound {
  /** Whether this browser can make sound at all. Without Web Audio the control is not shown. */
  readonly available = Boolean(audioContextKind());
  on = this.available && remembered();
  private context: AudioContext | null = null;
  private drone: Drone | null = null;

  /** A gesture happened: a remembered "on" may start now, never sooner. */
  wake() {
    if (this.on && !this.drone) this.start();
  }

  toggle() {
    this.on = !this.on;
    remember(this.on);
    if (this.on) this.start();
    else this.stop();
    return this.on;
  }

  private start() {
    const Kind = audioContextKind();
    if (!Kind) return;
    this.context ??= new Kind();
    void this.context.resume();
    if (!this.drone) this.drone = this.makeDrone(this.context);
    this.drone.gain.gain.setTargetAtTime(DRONE_LOUDNESS, this.context.currentTime, 0.6);
  }

  private stop() {
    if (!this.context || !this.drone) return;
    this.drone.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.15);
  }

  private makeDrone(context: AudioContext): Drone {
    const gain = context.createGain();
    gain.gain.value = 0;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 280;
    filter.Q.value = 0.7;
    const low = context.createOscillator();
    low.type = "sine";
    low.frequency.value = DRONE_ROOT;
    const fifth = context.createOscillator();
    fifth.type = "triangle";
    fifth.frequency.value = DRONE_ROOT * 1.5;
    const fifthGain = context.createGain();
    fifthGain.gain.value = 0.35;
    low.connect(filter);
    fifth.connect(fifthGain).connect(filter);
    filter.connect(gain).connect(context.destination);
    low.start();
    fifth.start();
    return { low, fifth, filter, gain };
  }

  /** The drone follows the turn through w: its pitch by the angle, its brightness by how fast it turns. */
  follow(angleDegrees: number, spinPace: number) {
    if (!this.context || !this.drone || !this.on) return;
    const now = this.context.currentTime;
    const root = DRONE_ROOT * Math.pow(2, Math.min(180, angleDegrees) / 90 / 2);
    this.drone.low.frequency.setTargetAtTime(root, now, 0.25);
    this.drone.fifth.frequency.setTargetAtTime(root * 1.5, now, 0.25);
    this.drone.filter.frequency.setTargetAtTime(260 + Math.min(900, spinPace * 2200), now, 0.3);
  }

  /** A soft tone in a world's note, for a tapped event. */
  tone(world: WorldKey) {
    if (!this.on || !this.context) return;
    const context = this.context;
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(TONE_LOUDNESS, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    gain.connect(context.destination);
    for (const [ratio, share] of [
      [1, 1],
      [2, 0.18],
    ]) {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = WORLD_NOTES[world] * ratio;
      const partial = context.createGain();
      partial.gain.value = share;
      oscillator.connect(partial).connect(gain);
      oscillator.start(now);
      oscillator.stop(now + 1.5);
    }
  }
}
