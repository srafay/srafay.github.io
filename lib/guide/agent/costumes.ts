/*
  What the agent can wear, each from a part of the owner's life, fitted to its router. Each costume is built from plain
  shapes on the router's turning frame, in its own units (1 is the router's radius; x to its side, y up, z to its front,
  the way it faces), and drawn in grey like the rest, so the dither turns it 1-bit with the graph. The router has no
  face, so the reading glasses sit where its front is, which is the joke.
*/
import * as THREE from "three";
import type { PaintKey } from "./inks";
import { toneMaterial } from "./tone-material";

export type CostumeKey = "cricketCap" | "headset" | "graduationCap" | "readingGlasses" | "hardHat";

const shape = (geometry: THREE.BufferGeometry, tone: number, paint: PaintKey, shading = 1) =>
  new THREE.Mesh(geometry, toneMaterial({ baseTone: tone, shading, paint }));

/** The top half of a sphere, the way a cap's crown sits. */
const dome = (radius: number) => new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);

/**
 * A cricket cap: a white crown with a long dark peak to the side it faces, a dark band round its base where it meets
 * the router, and a button on top. White, as cricket whites are; the dark band and the peak breaking the router's outline
 * make it read as a cap, not a light patch on a ball.
 */
function cricketCap() {
  const cap = new THREE.Group();
  const crown = shape(dome(0.86), 1, "costumeWhite");
  crown.scale.set(1, 0.78, 1);
  crown.position.set(0, 0.52, -0.04);
  const band = shape(new THREE.TorusGeometry(0.86, 0.08, 8, 32), 0.04, "costumeBlack", 0);
  band.rotation.x = Math.PI / 2;
  band.position.set(0, 0.52, -0.04);
  // The peak dark, as the band is, so where it reaches past the router's edge it reads against the field.
  const peak = shape(new THREE.CylinderGeometry(1, 1, 0.09, 28, 1, false, -Math.PI / 2, Math.PI), 0.12, "costumeBlack", 0.3);
  peak.scale.set(1, 1, 1.6);
  peak.position.set(0, 0.5, 0.28);
  peak.rotation.x = 0.12;
  const button = shape(new THREE.SphereGeometry(0.09, 8, 6), 0.2, "costumeBlack");
  button.position.set(0, 0.52 + 0.86 * 0.78, -0.04);
  cap.add(crown, band, peak, button);
  return cap;
}

/** A gamer's headset: a band over the top, a cup on each side, and a microphone reaching round to the front. */
function headset() {
  const set = new THREE.Group();
  // The torus's half lies from one side over the top to the other, as a headband does.
  const band = shape(new THREE.TorusGeometry(1.06, 0.09, 8, 28, Math.PI), 0.95, "costumeWhite");
  const cups = [-1, 1].map((side) => {
    const cup = shape(new THREE.CylinderGeometry(0.4, 0.4, 0.26, 20), 0.9, "costumeWhite");
    cup.rotation.z = Math.PI / 2;
    cup.position.set(side * 1.04, 0, 0);
    return cup;
  });
  const boom = rod(new THREE.Vector3(1.0, -0.2, 0.2), new THREE.Vector3(0.52, -0.38, 0.86), 0.05, 0.9, "costumeWhite");
  const mic = shape(new THREE.SphereGeometry(0.13, 8, 6), 0.95, "costumeWhite");
  mic.position.set(0.52, -0.38, 0.86);
  set.add(band, ...cups, boom, mic);
  return set;
}

/** A thin rod from one point to another. */
function rod(from: THREE.Vector3, to: THREE.Vector3, radius: number, tone: number, paint: PaintKey) {
  const length = from.distanceTo(to);
  const piece = shape(new THREE.CylinderGeometry(radius, radius, length, 6), tone, paint);
  piece.position.copy(from).add(to).multiplyScalar(0.5);
  piece.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return piece;
}

/** A graduation cap: a flat square board on a skull cap, and a tassel hanging off one corner. */
function graduationCap() {
  const cap = new THREE.Group();
  const skull = shape(dome(0.74), 0.16, "costumeBlack");
  skull.scale.set(1, 0.55, 1);
  skull.position.set(0, 0.62, 0);
  const board = shape(new THREE.BoxGeometry(1.6, 0.08, 1.6), 0.22, "costumeBlack");
  board.position.set(0, 1.04, 0);
  board.rotation.y = Math.PI / 4;
  const cord = shape(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 5), 0.85, "tassel", 0.3);
  cord.position.set(0.8, 0.82, 0.3);
  const tassel = shape(new THREE.SphereGeometry(0.09, 8, 6), 0.9, "tassel", 0.3);
  tassel.position.set(0.8, 0.55, 0.3);
  cap.add(skull, board, cord, tassel);
  return cap;
}

/** Reading glasses on the router's front, where a face would be: two round rims, a bridge, and arms back to its sides. */
function readingGlasses() {
  const glasses = new THREE.Group();
  for (const side of [-1, 1]) {
    const rim = shape(new THREE.TorusGeometry(0.27, 0.05, 8, 24), 0.06, "costumeBlack", 0.2);
    rim.position.set(side * 0.34, 0.12, 0.98);
    rim.rotation.y = side * 0.28;
    glasses.add(rim);
    glasses.add(rod(new THREE.Vector3(side * 0.6, 0.14, 0.9), new THREE.Vector3(side * 1.0, 0.18, 0.05), 0.03, 0.06, "costumeBlack"));
  }
  const bridge = shape(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 5), 0.06, "costumeBlack", 0.2);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.2, 1.04);
  glasses.add(bridge);
  return glasses;
}

/** A tiny hard hat with nothing written on it: a dome, a ridge along the top and a brim all round. */
function hardHat() {
  const hat = new THREE.Group();
  const shell = shape(dome(0.8), 0.95, "hardHat");
  shell.scale.set(1, 0.8, 1.05);
  shell.position.set(0, 0.52, 0);
  const ridge = shape(new THREE.BoxGeometry(0.14, 0.09, 1.2), 0.75, "hardHat");
  ridge.position.set(0, 0.52 + 0.8 * 0.8, 0);
  const brim = shape(new THREE.CylinderGeometry(1.08, 1.08, 0.05, 32), 0.85, "hardHat");
  brim.scale.set(0.95, 1, 1.12);
  brim.position.set(0, 0.52, 0.06);
  hat.add(shell, ridge, brim);
  return hat;
}

const BUILDERS: Record<CostumeKey, () => THREE.Group> = {
  cricketCap,
  headset,
  graduationCap,
  readingGlasses,
  hardHat,
};

/** Every costume, built once and kept, so putting one on is only a visibility change. */
export class Wardrobe {
  private readonly built = new Map<CostumeKey, THREE.Group>();
  worn: CostumeKey | null = null;

  constructor(private readonly holder: THREE.Object3D) {}

  /** The costume being worn, as a group in the scene, or null. */
  get wornGroup() {
    return this.worn ? (this.built.get(this.worn) ?? null) : null;
  }

  wear(key: CostumeKey | null) {
    for (const group of this.built.values()) group.visible = false;
    this.worn = key;
    if (!key) return;
    let group = this.built.get(key);
    if (!group) {
      group = BUILDERS[key]();
      this.built.set(key, group);
      this.holder.add(group);
    }
    group.visible = true;
  }
}
