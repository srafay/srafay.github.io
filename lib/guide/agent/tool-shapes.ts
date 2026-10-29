/*
  Each tool node's shape says its tool, in plain solids drawn in grey like the rest, so the dither turns them 1-bit.
  Each is built in its own units, fitting a ball of radius 1, with one material for the whole node so a node lights as
  one. Its y axis runs along its link, away from the router; its z axis faces the reader.
*/
import * as THREE from "three";
import type { ToolKey } from "./topology";
import { toneMaterial, type ToneMaterial } from "./tone-material";

/** How light the tool nodes are before the light falls on them. */
const TOOL_TONE = 0.74;

const mesh = (geometry: THREE.BufferGeometry, material: ToneMaterial) => new THREE.Mesh(geometry, material);

/** Web search: a ring, a lens with nothing in it, turned a little so it reads as a ring from the front. */
function searchShape(material: ToneMaterial) {
  const group = new THREE.Group();
  const ring = mesh(new THREE.TorusGeometry(0.66, 0.24, 12, 28), material);
  ring.rotation.set(0.2, -0.3, 0);
  group.add(ring);
  return group;
}

/** Deep research: three stacked discs, a pile of sources, each a little off the one under it. */
function researchShape(material: ToneMaterial) {
  const group = new THREE.Group();
  for (const index of [0, 1, 2]) {
    const disc = mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.26, 28), material);
    disc.position.set(0, -0.56 + index * 0.52, 0);
    disc.rotation.x = 0.42;
    group.add(disc);
  }
  return group;
}

/** Make a chart: three bars of rising height on a thin base. */
function chartShape(material: ToneMaterial) {
  const group = new THREE.Group();
  const base = mesh(new THREE.BoxGeometry(1.8, 0.14, 0.5), material);
  base.position.y = -0.82;
  group.add(base);
  for (const [index, height] of [0.6, 1.05, 1.55].entries()) {
    const bar = mesh(new THREE.BoxGeometry(0.4, height, 0.4), material);
    bar.position.set(-0.6 + index * 0.6, -0.75 + height / 2, 0);
    group.add(bar);
  }
  group.rotation.y = -0.25;
  return group;
}

/** Find similar images: three small cubes in a row, alike, each turned a little. */
function similarShape(material: ToneMaterial) {
  const group = new THREE.Group();
  for (const index of [0, 1, 2]) {
    const cube = mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), material);
    cube.position.set(-0.68 + index * 0.68, 0, 0);
    cube.rotation.set(0.45, 0.62, 0);
    group.add(cube);
  }
  return group;
}

/** Focus group: three small spheres in a triangle, a panel of three. */
function focusGroupShape(material: ToneMaterial) {
  const group = new THREE.Group();
  const places: [number, number][] = [
    [-0.52, -0.34],
    [0.52, -0.34],
    [0, 0.52],
  ];
  for (const [across, up] of places) {
    const sphere = mesh(new THREE.SphereGeometry(0.4, 16, 12), material);
    sphere.position.set(across, up, 0);
    group.add(sphere);
  }
  return group;
}

/** Route: a cone, pointing out along its link, away from the router. */
function routeShape(material: ToneMaterial) {
  const group = new THREE.Group();
  const cone = mesh(new THREE.ConeGeometry(0.62, 1.4, 24), material);
  cone.position.y = 0.1;
  group.add(cone);
  return group;
}

const BUILDERS: Record<ToolKey, (material: ToneMaterial) => THREE.Group> = {
  search: searchShape,
  research: researchShape,
  chart: chartShape,
  similar: similarShape,
  focusGroup: focusGroupShape,
  route: routeShape,
};

/** A tool's node, with the one material it lights by. */
export function buildToolNode(tool: ToolKey) {
  const material = toneMaterial({ baseTone: TOOL_TONE, shading: 0.8, paint: tool });
  const group = BUILDERS[tool](material);
  group.userData.tool = tool;
  const holder = new THREE.Group();
  holder.add(group);
  return { holder, material };
}

/** Whether a tool's shape points along its link (the cone does; the rest stay upright). */
export const pointsAlongLink = (tool: ToolKey) => tool === "route";
