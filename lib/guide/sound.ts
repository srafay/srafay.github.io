/*
  Sound, off unless the reader turns it on, made in the browser with Web Audio: no sound files, no requests. A soft
  blip for each word the agent says, a soft sweep for a web search, a tick as a message lands, a rising blip for each
  bar of a chart, a two-note fall for a route and a wobbling blip for a hallucination. The choice is remembered on
  this device, and nothing sounds before a gesture: a remembered "on" waits for the first touch, click or key.
*/
const REMEMBERED = "guide-sound";
const BLIP_LOUDNESS = 0.035;
const SWEEP_LOUDNESS = 0.05;

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
    this.tone(520 + ((word.length * 37) % 160), 0, 0.09, BLIP_LOUDNESS);
  }

  /** A soft tone at a pitch, after a delay, for a length, in seconds; a wobble bends it up and down. */
  private tone(frequency: number, delay: number, seconds: number, loudness: number, wobble = 0) {
    const context = this.live();
    if (!context) return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    if (wobble) {
      for (let step = 1; step <= 6; step++)
        oscillator.frequency.linearRampToValueAtTime(frequency * (1 + (step % 2 ? wobble : -wobble)), now + (seconds * step) / 6);
    }
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(loudness, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + seconds + 0.02);
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

  /** Filtered noise, rising and falling: a sweep. */
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

  /** A web search: a soft sweep of noise. */
  sweep() {
    this.noiseBurst(0.75, 2400, SWEEP_LOUDNESS);
  }

  /** A message landing at a tool: a small high tick. */
  tick() {
    this.tone(1180, 0, 0.05, BLIP_LOUDNESS);
  }

  /** A chart: one rising blip for each bar, as the bars grow. */
  bars(count: number, overSeconds: number) {
    for (let index = 0; index < count; index++) this.tone(380 + index * 34, (overSeconds * index) / count, 0.08, BLIP_LOUDNESS);
  }

  /** Similar images: three blips, alike. */
  copies() {
    for (let index = 0; index < 3; index++) this.tone(660, 0.12 + index * 0.16, 0.08, BLIP_LOUDNESS);
  }

  /** A route: two notes falling, as a door chime does. */
  route() {
    this.tone(784, 0, 0.18, BLIP_LOUDNESS * 1.4);
    this.tone(523, 0.16, 0.26, BLIP_LOUDNESS * 1.4);
  }

  /** A hallucination: a blip that cannot hold its pitch. */
  wobble() {
    this.tone(600, 0, 0.6, BLIP_LOUDNESS, 0.08);
  }
}
