/*
  The agent in dithered inks. The first pass draws it in grey into a small target whose every pixel is one dither
  cell, with the ink each cell prints in. The second pass reads each cell exactly (no filtering) and compares it with a
  4 x 4 Bayer threshold: darker becomes the field's deep shade, lighter becomes the cell's ink, nothing stays clear.
  A lit cell is one flat colour, with no dither. The inks for the fields behind the agent sit in a small table (a
  texture, one column per ink), made again only when those fields change. Every cell is a whole block of device
  pixels, and the canvas is drawn at the device's own pixels and never scaled by CSS, so nothing is resampled into moire.
*/
import * as THREE from "three";
import { rgbOf, type FieldColours } from "@/lib/guide/palette";
import { inkTableFor, PAINTS } from "./inks";

/**
 * How many device pixels across one dither cell is: about 1.5 to 2 CSS pixels, always whole device pixels. One cell
 * per device pixel would be a third of a CSS pixel on a phone at 3x, too fine to see, and the agent would read as
 * smooth grey instead of 1-bit.
 */
export function ditherCellInDevicePixels(devicePixelRatio: number) {
  return Math.max(1, Math.round(devicePixelRatio * 1.6));
}

/** Where two fields meet behind the agent: the field below a line on the canvas and the field above it. */
export type FieldsBehind = {
  below: FieldColours;
  above: FieldColours;
  /** The line, in CSS pixels up from the canvas's bottom edge. Above the canvas means one field fills it. */
  lineFromBottom: number;
};

const ditherVertex = /* glsl */ `
  out vec2 unused;
  void main() {
    unused = position.xy;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const ditherFragment = /* glsl */ `
  precision highp float;
  precision highp int;
  uniform sampler2D toneMap;
  uniform sampler2D inks;
  uniform float cell;
  uniform vec3 deepBelow;
  uniform vec3 deepAbove;
  uniform float lineFromBottom;
  in vec2 unused;
  out vec4 colour;
  const int BAYER[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  void main() {
    ivec2 cellIndex = ivec2(floor(gl_FragCoord.xy / cell));
    vec4 sampled = texelFetch(toneMap, cellIndex, 0);
    if (sampled.a < 0.5) discard;
    bool above = gl_FragCoord.y >= lineFromBottom;
    // The blue holds the cell's ink and whether it is lit as one whole number: ink times two, plus one if lit.
    int code = int(floor(sampled.b * 255.0 + 0.5));
    int ink = code >> 1;
    bool lit = (code & 1) == 1;
    int row = above ? 2 : 0;
    vec4 inkLight = texelFetch(inks, ivec2(ink, row), 0);
    vec3 inkLit = texelFetch(inks, ivec2(ink, row + 1), 0).rgb;
    float tone = min(sampled.r, inkLight.a);
    tone = floor(tone * 4.0 + 0.5) / 4.0;
    int bayerIndex = (cellIndex.y % 4) * 4 + (cellIndex.x % 4);
    float threshold = (float(BAYER[bayerIndex]) + 0.5) / 16.0;
    // Something faint (a copy, a phantom) keeps only its share of cells, so it shows and fades in dither, never grey.
    if (sampled.g < threshold) discard;
    if (lit) {
      colour = vec4(inkLit, 1.0);
      return;
    }
    colour = vec4(tone > threshold ? inkLight.rgb : (above ? deepAbove : deepBelow), 1.0);
  }
`;

export class DitherRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private target: THREE.WebGLRenderTarget;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: THREE.ShaderMaterial;
  /** The inks on the fields behind the agent: four rows (light and lit, below then above), a column per ink. */
  private readonly inkTable = new THREE.DataTexture(new Uint8Array(PAINTS.length * 4 * 4), PAINTS.length, 4, THREE.RGBAFormat, THREE.UnsignedByteType);
  /** Which fields the ink table was made for. */
  private inksMadeFor = "";
  /** The canvas's side in CSS pixels, its device pixel ratio and its cell, as last sized. */
  cssSide = 0;
  devicePixelRatio = 1;
  cell = 1;
  /** The canvas's side in device pixels: a whole number of cells. */
  deviceSide = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = true;
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    this.quad = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: ditherVertex,
      fragmentShader: ditherFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        toneMap: { value: this.target.texture },
        inks: { value: this.inkTable },
        cell: { value: 1 },
        deepBelow: { value: new THREE.Vector3() },
        deepAbove: { value: new THREE.Vector3() },
        lineFromBottom: { value: 0 },
      },
    });
    this.inkTable.minFilter = THREE.NearestFilter;
    this.inkTable.magFilter = THREE.NearestFilter;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.quad);
    plane.frustumCulled = false;
    this.quadScene.add(plane);
  }

  /** Sizes the canvas to a square of about this many CSS pixels, in whole cells of whole device pixels. */
  resize(cssSide: number, devicePixelRatio: number, cell = ditherCellInDevicePixels(devicePixelRatio)) {
    this.devicePixelRatio = devicePixelRatio;
    this.cell = cell;
    const cells = Math.ceil((cssSide * devicePixelRatio) / cell);
    this.deviceSide = cells * cell;
    this.cssSide = this.deviceSide / devicePixelRatio;
    this.renderer.setSize(this.deviceSide, this.deviceSide, false);
    this.canvas.style.width = `${this.cssSide}px`;
    this.canvas.style.height = `${this.cssSide}px`;
    this.target.setSize(cells, cells);
    this.quad.uniforms.cell.value = cell;
  }

  /** Draws the scene in grey into the cells, then the cells in the colours of the fields behind them. */
  render(scene: THREE.Scene, camera: THREE.Camera, fields: FieldsBehind) {
    const uniforms = this.quad.uniforms;
    (uniforms.deepBelow.value as THREE.Vector3).set(...rgbOf(fields.below.deep));
    (uniforms.deepAbove.value as THREE.Vector3).set(...rgbOf(fields.above.deep));
    this.makeInksFor(fields.below, fields.above);
    uniforms.lineFromBottom.value = fields.lineFromBottom * this.devicePixelRatio;
    this.renderer.setRenderTarget(this.target);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  /** Fills the ink table for the two fields behind the agent, when they are not the ones it was made for. */
  private makeInksFor(below: FieldColours, above: FieldColours) {
    const key = `${below.field} ${above.field}`;
    if (key === this.inksMadeFor) return;
    this.inksMadeFor = key;
    const data = this.inkTable.image.data as Uint8Array;
    const byte = (share: number) => Math.round(share * 255);
    const write = (row: number, column: number, colour: string, alpha: number) => {
      const at = (row * PAINTS.length + column) * 4;
      const [red, green, blue] = rgbOf(colour);
      data.set([byte(red), byte(green), byte(blue), byte(alpha)], at);
    };
    [below, above].forEach((field, side) =>
      inkTableFor(field).forEach((ink, column) => {
        write(side * 2, column, ink.light, ink.ceiling);
        write(side * 2 + 1, column, ink.lit, 1);
      }),
    );
    this.inkTable.needsUpdate = true;
  }

  dispose() {
    this.inkTable.dispose();
    this.target.dispose();
    this.renderer.dispose();
  }
}
