/*
  The python as three.js meshes: a tube along the spine, rebuilt from the spine each drawn frame, and a head on its
  own frame with two eyes and a forked tongue. The costumes hang on the same frame (costumes.ts).
*/
import * as THREE from "three";
import { head as headShape, radiusShareAt } from "./proportions";
import {
  add,
  cross,
  dot,
  normalise,
  scale,
  subtract,
  tangentAt,
  type Point,
  type Spine,
  SPINE_POINTS,
} from "./spine";
import { toneMaterial, withPlainSkin } from "./tone-material";

/** Which way the python's back faces when nothing turns it: up, and a little toward the reader. */
const BACK_FACES = normalise({ x: 0, y: 0.82, z: 0.57 });

/** The head's frame: where it is and which ways are forward, up and to its left. */
export type HeadFrame = { centre: Point; forward: Point; up: Point; side: Point };

function bodyGeometry(sides: number) {
  const geometry = new THREE.BufferGeometry();
  const vertices = SPINE_POINTS * sides;
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
  const skin = new Float32Array(vertices * 2);
  for (let ring = 0; ring < SPINE_POINTS; ring++)
    for (let around = 0; around < sides; around++) {
      skin[(ring * sides + around) * 2] = ring / (SPINE_POINTS - 1);
      skin[(ring * sides + around) * 2 + 1] = around / sides;
    }
  geometry.setAttribute("skin", new THREE.BufferAttribute(skin, 2));
  const indices: number[] = [];
  for (let ring = 0; ring < SPINE_POINTS - 1; ring++)
    for (let around = 0; around < sides; around++) {
      const next = (around + 1) % sides;
      const here = ring * sides;
      const ahead = (ring + 1) * sides;
      indices.push(here + around, ahead + around, here + next, here + next, ahead + around, ahead + next);
    }
  geometry.setIndex(indices);
  return geometry;
}

/** How wide the skull is at a place along it (-1 the back, 1 the snout): widest at the jaw, a blunt wedge forward. */
export const skullWidthAt = (forward: number) => (forward < -0.35 ? 1 : 1 - ((forward + 0.35) / 1.35) * 0.52);

/** How tall the skull is along it: lower toward the snout. */
export const skullHeightAt = (forward: number) => 0.95 - Math.max(0, forward) * 0.35;

/** The skull: a sphere stretched long, wedge-shaped from above, flatter underneath, as a python's head is. */
function skullGeometry() {
  const geometry = new THREE.SphereGeometry(1, 24, 18);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index++) {
    const forward = position.getZ(index);
    const up = position.getY(index);
    position.setX(index, position.getX(index) * skullWidthAt(forward));
    position.setY(index, up * skullHeightAt(forward) * (up < 0 ? 0.7 : 1));
  }
  geometry.computeVertexNormals();
  return withPlainSkin(geometry);
}

export class PythonModel {
  readonly group = new THREE.Group();
  readonly headGroup = new THREE.Group();
  /** Where the costumes hang: the head's frame, in the head's own units (1 is half its length). */
  readonly costumeHolder = new THREE.Group();
  private readonly body: THREE.Mesh;
  private readonly sides: number;
  private readonly eyes: THREE.Mesh[] = [];
  private readonly tongue = new THREE.Group();
  private lastBack: Point = BACK_FACES;
  private shedSkin: THREE.Mesh | null = null;
  private shedSkinLaid: Spine | null = null;
  private readonly spray = new THREE.Group();
  private readonly bug = new THREE.Group();
  readonly frame: HeadFrame = {
    centre: { x: 0, y: 0, z: 0 },
    forward: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    side: { x: 0, y: 0, z: 1 },
  };

  constructor(
    public bodyLength: number,
    sides: number,
  ) {
    this.sides = sides;
    this.body = new THREE.Mesh(bodyGeometry(sides), toneMaterial({ baseTone: 0.86, blotched: true }));
    this.body.frustumCulled = false;
    this.group.add(this.body);
    this.buildHead();
    this.group.add(this.headGroup);
    this.headGroup.matrixAutoUpdate = false;
    this.spray.visible = false;
    this.bug.visible = false;
    this.group.add(this.spray, this.bug);
  }

  private buildHead() {
    const skull = new THREE.Mesh(skullGeometry(), toneMaterial({ baseTone: 0.9, crowned: true }));
    this.headGroup.add(skull);
    const eyeGeometry = withPlainSkin(new THREE.SphereGeometry(1, 12, 10));
    const eyeMaterial = toneMaterial({ baseTone: 0.04, shading: 0 });
    // A glint high on each eye, toward the light: one or two light cells that make the eye read as wet and alive.
    const glintMaterial = toneMaterial({ baseTone: 1, shading: 0 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      this.eyes.push(eye);
      skull.add(eye);
      eye.userData.side = side;
      const glint = new THREE.Mesh(eyeGeometry, glintMaterial);
      glint.scale.setScalar(0.34);
      glint.position.set(-0.3, 0.42, 0.75);
      eye.add(glint);
    }
    const tongueMaterial = toneMaterial({ baseTone: 0.04, shading: 0 });
    for (const side of [-1, 1]) {
      const fork = new THREE.Mesh(withPlainSkin(new THREE.BoxGeometry(1, 1, 1)), tongueMaterial);
      fork.userData.side = side;
      this.tongue.add(fork);
    }
    skull.add(this.tongue);
    skull.add(this.costumeHolder);
    this.layOutHead();
  }

  /** The skull, eyes and tongue at their sizes for this body length. The skull's own units are set on its scale. */
  private layOutHead() {
    const length = this.bodyLength;
    const skull = this.headGroup.children[0] as THREE.Mesh;
    const halfLength = (headShape.lengthShare * length) / 2;
    const halfWidth = (headShape.widthShare * length) / 2;
    const halfHeight = (headShape.heightShare * length) / 2;
    skull.scale.set(halfWidth, halfHeight, halfLength);
    // Children of the skull live in its stretched units, so their sizes are undone per axis.
    const eyeRadius = headShape.eyeRadiusShare * length;
    for (const eye of this.eyes) {
      const side = eye.userData.side as number;
      // On the skull's surface, a little proud of it, so the eye shows from the front and the side.
      const where = new THREE.Vector3(side * headShape.eyeAcross, headShape.eyeUp, headShape.eyeForward).normalize();
      eye.position.set(where.x * skullWidthAt(where.z), where.y * skullHeightAt(where.z), where.z);
      eye.scale.set(eyeRadius / halfWidth, eyeRadius / halfHeight, eyeRadius / halfLength);
      eye.userData.openHeight = eye.scale.y;
    }
    this.tongue.position.set(0, -0.15, 0.98);
    const tongueLength = headShape.tongueLengthShare * length;
    const tongueWidth = headShape.tongueWidthShare * length;
    for (const fork of this.tongue.children) {
      const side = fork.userData.side as number;
      fork.scale.set(tongueWidth / halfWidth, tongueWidth / halfHeight, tongueLength / halfLength);
      fork.position.set((side * 0.09 * tongueLength) / halfWidth, 0, (0.5 * tongueLength) / halfLength);
      fork.rotation.y = side * 0.16;
    }
    this.costumeHolder.scale.set(halfLength / halfWidth, halfLength / halfHeight, 1);
  }

  setBodyLength(length: number) {
    this.bodyLength = length;
    this.layOutHead();
  }

  /** The tongue out by a share (0 in, 1 out at full length). */
  setTongue(out: number) {
    this.tongue.visible = out > 0.02;
    this.tongue.scale.set(1, 1, Math.max(0.02, out));
  }

  /** The eyes open by a share (1 open, 0 shut to a slit). */
  setEyesOpen(open: number) {
    for (const eye of this.eyes) eye.scale.y = (eye.userData.openHeight as number) * (0.15 + 0.85 * open);
  }

  /** Lays the tube along the spine. Breath swells the body a little; a bulge is something swallowed on its way down. */
  updateBody(spine: Spine, breath: number, bulge?: { at: number; size: number } | null) {
    this.layTube(this.body.geometry, spine, breath, bulge ?? undefined);
  }

  /** The old skin left behind by a shed: the body as it was, fading cell by cell. Null takes it away. */
  setShedSkin(spine: Spine | null, presence = 1) {
    if (!spine) {
      if (this.shedSkin) this.shedSkin.visible = false;
      return;
    }
    if (!this.shedSkin) {
      this.shedSkin = new THREE.Mesh(bodyGeometry(this.sides), toneMaterial({ baseTone: 0.95, shading: 0.5 }));
      this.shedSkin.frustumCulled = false;
      this.group.add(this.shedSkin);
    }
    if (!this.shedSkin.visible || this.shedSkinLaid !== spine) {
      this.layTube(this.shedSkin.geometry, spine, 1.04);
      this.shedSkinLaid = spine;
    }
    this.shedSkin.visible = true;
    (this.shedSkin.material as THREE.ShaderMaterial).uniforms.presence.value = presence;
  }

  /** A sneeze: light cells sprayed from the snout, flying out and shrinking as they go. Null when there is none. */
  setSneeze(progress: number | null) {
    if (progress === null || progress <= 0 || progress >= 1) {
      this.spray.visible = false;
      return;
    }
    if (!this.spray.children.length) this.buildSpray();
    this.spray.visible = true;
    const { centre, forward, up, side } = this.frame;
    const snout = add(centre, scale(forward, (headShape.lengthShare * this.bodyLength) / 2));
    const reach = this.bodyLength * 0.32 * Math.sqrt(progress);
    for (const drop of this.spray.children) {
      const direction = drop.userData.direction as Point;
      const out = add(add(scale(forward, direction.z), scale(up, direction.y)), scale(side, direction.x));
      const place = add(snout, scale(out, reach * (drop.userData.speed as number)));
      drop.position.set(place.x, place.y, place.z);
      drop.scale.setScalar(this.bodyLength * 0.012 * (1 - progress));
    }
  }

  private buildSpray() {
    const geometry = withPlainSkin(new THREE.SphereGeometry(1, 6, 5));
    const material = toneMaterial({ baseTone: 1, shading: 0 });
    for (let index = 0; index < 16; index++) {
      const drop = new THREE.Mesh(geometry, material);
      // A cone forward from the snout, spread a little up and to each side.
      const turn = (index / 16) * Math.PI * 2;
      drop.userData.direction = normalise({ x: Math.cos(turn) * 0.55, y: Math.sin(turn) * 0.45, z: 1 });
      drop.userData.speed = 0.6 + ((index * 7) % 5) * 0.12;
      this.spray.add(drop);
    }
  }

  /** A bug on the ground, facing along a direction. Null takes it away. */
  setBug(place: Point | null, heading = 0) {
    if (!place) {
      this.bug.visible = false;
      return;
    }
    if (!this.bug.children.length) this.buildBug();
    this.bug.visible = true;
    this.bug.position.set(place.x, place.y, place.z);
    this.bug.rotation.set(0, 0, heading);
    this.bug.scale.setScalar(this.bodyLength * 0.022);
  }

  private buildBug() {
    const dark = toneMaterial({ baseTone: 0.06, shading: 0.4 });
    const body = new THREE.Mesh(withPlainSkin(new THREE.SphereGeometry(1, 10, 8)), dark);
    body.scale.set(1.3, 0.8, 0.8);
    this.bug.add(body);
    for (const side of [-1, 1])
      for (const along of [-0.7, 0, 0.7]) {
        const leg = new THREE.Mesh(withPlainSkin(new THREE.BoxGeometry(0.16, 1.4, 0.16)), dark);
        leg.position.set(along, side * 1.0, 0);
        leg.rotation.z = side * 0.4 * along;
        this.bug.add(leg);
      }
  }

  /** Lays a tube along a spine into a geometry. */
  private layTube(geometry: THREE.BufferGeometry, spine: Spine, breath: number, bulge?: { at: number; size: number }) {
    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
    const sides = this.sides;
    let back = this.lastBack;
    for (let ring = 0; ring < SPINE_POINTS; ring++) {
      const centre = spine[ring];
      const tangent = tangentAt(spine, ring);
      // The back faces up and toward the reader, unless the body runs that way, then the last ring's back carries on.
      let candidate = subtract(BACK_FACES, scale(tangent, dot(BACK_FACES, tangent)));
      if (Math.hypot(candidate.x, candidate.y, candidate.z) < 0.35)
        candidate = subtract(back, scale(tangent, dot(back, tangent)));
      back = normalise(candidate);
      const across = normalise(cross(tangent, back));
      const share = ring / (SPINE_POINTS - 1);
      let radius = radiusShareAt(share) * this.bodyLength * breath;
      if (bulge) radius *= 1 + bulge.size * Math.exp(-Math.pow((share - bulge.at) / 0.05, 2));
      for (let around = 0; around < sides; around++) {
        const turn = (around / sides) * Math.PI * 2;
        const outward = add(scale(back, Math.cos(turn)), scale(across, Math.sin(turn)));
        const index = ring * sides + around;
        positions.setXYZ(index, centre.x + outward.x * radius, centre.y + outward.y * radius, centre.z + outward.z * radius);
        normals.setXYZ(index, outward.x, outward.y, outward.z);
      }
      if (ring === 0) this.lastBack = back;
    }
    positions.needsUpdate = true;
    normals.needsUpdate = true;
  }

  /** Puts the head on its frame. */
  updateHead(frame: HeadFrame) {
    Object.assign(this.frame, frame);
    const { centre, forward, up, side } = frame;
    this.headGroup.matrix.set(
      side.x, up.x, forward.x, centre.x,
      side.y, up.y, forward.y, centre.y,
      side.z, up.z, forward.z, centre.z,
      0, 0, 0, 1,
    );
    this.headGroup.matrixWorldNeedsUpdate = true;
  }
}
