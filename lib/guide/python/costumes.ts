/*
  What the python can wear, each from a part of the owner's life. Each costume is built from plain shapes on the
  head's frame, in the head's own units (1 is half the head's length; x to the head's side, y up, z toward the snout),
  and drawn in grey like the rest, so the dither turns it 1-bit with the python.
*/
import * as THREE from "three";
import { toneMaterial, withPlainSkin } from "./tone-material";

export type CostumeKey = "cricketCap" | "headset" | "graduationCap" | "readingGlasses" | "hardHat";

const shape = (geometry: THREE.BufferGeometry, tone: number, shading = 1) =>
  new THREE.Mesh(withPlainSkin(geometry), toneMaterial({ baseTone: tone, shading }));

/** The top half of a sphere, the way a cap's crown sits. */
const dome = (radius: number) => new THREE.SphereGeometry(radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);

/**
 * A cricket cap: a white crown and a short peak over the eyes, with a button on top. White, as cricket whites are,
 * so it stands out from the python's dark crown in 1-bit; a dark cap would vanish into it.
 */
function cricketCap() {
  const cap = new THREE.Group();
  const crown = shape(dome(0.86), 1);
  crown.scale.set(1, 0.95, 1.1);
  crown.position.set(0, 0.34, -0.12);
  const peak = shape(new THREE.CylinderGeometry(0.78, 0.78, 0.08, 24, 1, false, -Math.PI / 2, Math.PI), 0.62);
  peak.scale.set(1, 1, 1.05);
  peak.position.set(0, 0.38, 0.42);
  peak.rotation.x = 0.1;
  const button = shape(new THREE.SphereGeometry(0.09, 8, 6), 0.2);
  button.position.set(0, 1.16, -0.12);
  cap.add(crown, peak, button);
  return cap;
}

/** A gamer's headset: a band over the head, a cup on each side, and a microphone toward the mouth. */
function headset() {
  const set = new THREE.Group();
  const band = shape(new THREE.TorusGeometry(0.8, 0.09, 8, 24, Math.PI), 0.95);
  band.rotation.y = Math.PI / 2;
  band.rotation.z = 0;
  band.position.set(0, 0.02, -0.2);
  band.rotation.order = "YXZ";
  const cups = [-1, 1].map((side) => {
    const cup = shape(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 18), 0.9);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(side * 0.78, 0, -0.2);
    return cup;
  });
  const boom = shape(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), 0.9);
  boom.rotation.x = Math.PI / 2;
  boom.rotation.y = -0.35;
  boom.position.set(0.66, -0.18, 0.18);
  const mic = shape(new THREE.SphereGeometry(0.11, 8, 6), 0.95);
  mic.position.set(0.52, -0.2, 0.52);
  set.add(band, ...cups, boom, mic);
  return set;
}

/** A graduation cap: a flat square board on a skull cap, and a tassel hanging off one corner. */
function graduationCap() {
  const cap = new THREE.Group();
  const skull = shape(dome(0.56), 0.16);
  skull.scale.set(1, 0.5, 1);
  skull.position.set(0, 0.46, -0.15);
  const board = shape(new THREE.BoxGeometry(1.4, 0.08, 1.4), 0.22);
  board.position.set(0, 0.78, -0.15);
  board.rotation.y = Math.PI / 4;
  const cord = shape(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 5), 0.85, 0.3);
  cord.position.set(0.68, 0.55, -0.15);
  const tassel = shape(new THREE.SphereGeometry(0.08, 8, 6), 0.9, 0.3);
  tassel.position.set(0.68, 0.28, -0.15);
  cap.add(skull, board, cord, tassel);
  return cap;
}

/** Reading glasses: two round rims in front of the eyes and a bridge between them. */
function readingGlasses() {
  const glasses = new THREE.Group();
  for (const side of [-1, 1]) {
    const rim = shape(new THREE.TorusGeometry(0.22, 0.04, 8, 22), 0.06, 0.2);
    rim.position.set(side * 0.3, 0.34, 0.5);
    rim.rotation.y = side * 0.25;
    glasses.add(rim);
    const arm = shape(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 5), 0.06, 0.2);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(side * 0.55, 0.36, 0.2);
    glasses.add(arm);
  }
  const bridge = shape(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 5), 0.06, 0.2);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.4, 0.55);
  glasses.add(bridge);
  return glasses;
}

/** A tiny hard hat with nothing written on it: a dome, a ridge along the top and a brim all round. */
function hardHat() {
  const hat = new THREE.Group();
  const shell = shape(dome(0.6), 0.95);
  shell.scale.set(1, 0.8, 1.05);
  shell.position.set(0, 0.44, -0.12);
  const ridge = shape(new THREE.BoxGeometry(0.12, 0.08, 1.05), 0.75);
  ridge.position.set(0, 0.92, -0.12);
  const brim = shape(new THREE.CylinderGeometry(0.82, 0.82, 0.05, 28), 0.85);
  brim.scale.set(0.95, 1, 1.12);
  brim.position.set(0, 0.44, -0.06);
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
