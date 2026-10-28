/*
  Sound, off unless the reader turns it on, made in the browser with Web Audio: no sound files, no requests. A soft
  blip for each word the python says, its hiss, a shutter for the selfie and a tick on each beat of the dance. The
  choice is remembered on this device, and nothing sounds before a gesture: a remembered "on" waits for the first
  touch, click or key.
*/
const REMEMBERED = "guide-sound";
const BLIP_LOUDNESS = 0.035;
const HISS_LOUDNESS = 0.08;

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
  private noise: AudioBuffer | null = null;
  private woken = false;

  /** A gesture happened: a remembered "on" may start now, never sooner. */
  wake() {
    this.woken = true;
    if (this.on) this.ready();
  }

  toggle() {
    this.on = !this.on;
    remember(this.on);
    this.woken = true;
    if (this.on) this.ready();
    return this.on;
  }

  private ready() {
    const Kind = audioContextKind();
    if (!Kind || !this.woken) return null;
    this.context ??= new Kind();
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  private live() {
    return this.on && this.woken ? this.ready() : null;
  }

  /** A short soft blip for a word, its pitch varied a little so a line does not sound like a ticking clock. */
  blip(word: string) {
    const context = this.live();
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.value = 520 + ((word.length * 37) % 160);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(BLIP_LOUDNESS, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  private noiseBuffer(context: AudioContext) {
    if (this.noise) return this.noise;
    const length = Math.round(context.sampleRate * 0.8);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < length; index++) samples[index] = Math.random() * 2 - 1;
    this.noise = buffer;
    return buffer;
  }

  /** Filtered noise, rising and falling: a hiss, or with a short time a shutter's click. */
  private noiseBurst(seconds: number, frequency: number, loudness: number) {
    const context = this.live();
    if (!context) return;
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer(context);
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(loudness, now + Math.min(0.06, seconds * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(now);
    source.stop(now + seconds + 0.05);
  }

  hiss() {
    this.noiseBurst(0.7, 3200, HISS_LOUDNESS);
  }

  shutter() {
    this.noiseBurst(0.06, 1800, 0.1);
  }

  /** A soft low tick, for a beat of the dance. */
  beat() {
    const context = this.live();
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(160, now);
    oscillator.frequency.exponentialRampToValueAtTime(70, now + 0.12);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.18);
  }
}
