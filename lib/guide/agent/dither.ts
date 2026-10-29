/*
  The agent in 1-bit. The first pass draws it in grey into a small target whose every pixel is one dither cell. The
  second pass reads each cell exactly (no filtering) and compares it with a 4 x 4 Bayer threshold: darker becomes the
  field's deep shade, lighter becomes near white, nothing stays clear. A lit cell is one flat colour, with no dither:
  near white on a dark field, the deep shade on a light one, where near white would vanish. Every cell is a whole
  block of device pixels, and the canvas is drawn at the device's own pixels and never scaled by CSS, so nothing is
  resampled into moire.
*/
import * as THREE from "three";
import { AGENT_LIGHT, rgbOf, type FieldColours } from "@/lib/guide/palette";

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
  uniform float cell;
  uniform vec3 deepBelow;
  uniform vec3 deepAbove;
  uniform vec3 light;
  uniform float ceilingBelow;
  uniform float ceilingAbove;
  uniform float lineFromBottom;
  in vec2 unused;
  out vec4 colour;
  const int BAYER[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  void main() {
    ivec2 cellIndex = ivec2(floor(gl_FragCoord.xy / cell));
    vec4 sampled = texelFetch(toneMap, cellIndex, 0);
    if (sampled.a < 0.5) discard;
    bool above = gl_FragCoord.y >= lineFromBottom;
    float tone = min(sampled.r, above ? ceilingAbove : ceilingBelow);
    tone = floor(tone * 4.0 + 0.5) / 4.0;
    int bayerIndex = (cellIndex.y % 4) * 4 + (cellIndex.x % 4);
    float threshold = (float(BAYER[bayerIndex]) + 0.5) / 16.0;
    // Something faint (a copy, a phantom) keeps only its share of cells, so it shows and fades in dither, never grey.
    if (sampled.g < threshold) discard;
    vec3 dark = above ? deepAbove : deepBelow;
    float ceiling = above ? ceilingAbove : ceilingBelow;
    if (sampled.b > 0.5) {
      colour = vec4(ceiling < 1.0 ? dark : light, 1.0);
      return;
    }
    colour = vec4(tone > threshold ? light : dark, 1.0);
  }
`;

export class DitherRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private target: THREE.WebGLRenderTarget;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: THREE.ShaderMaterial;
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
        cell: { value: 1 },
        deepBelow: { value: new THREE.Vector3() },
        deepAbove: { value: new THREE.Vector3() },
        light: { value: new THREE.Vector3(...rgbOf(AGENT_LIGHT)) },
        ceilingBelow: { value: 1 },
        ceilingAbove: { value: 1 },
        lineFromBottom: { value: 0 },
      },
    });
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
    uniforms.ceilingBelow.value = fields.below.toneCeiling;
    uniforms.ceilingAbove.value = fields.above.toneCeiling;
    uniforms.lineFromBottom.value = fields.lineFromBottom * this.devicePixelRatio;
    this.renderer.setRenderTarget(this.target);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  dispose() {
    this.target.dispose();
    this.renderer.dispose();
  }
}
