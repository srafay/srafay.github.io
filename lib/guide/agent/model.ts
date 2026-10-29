/*
  The agent as three.js meshes: the router, a sphere on its own turning frame with the costumes on it; the tool nodes,
  each its own shape; and the links, tubes laid along a bowed curve from the router to each tool, rebuilt each drawn
  frame. Besides the graph it holds what the tricks show: a message cell, the chart's bars, faint copies, the focus
  group's personas and the phantom tools. All of it is drawn in grey and turned 1-bit by the dither.
*/
import * as THREE from "three";
import { shape } from "./proportions";
import { buildToolNode, pointsAlongLink } from "./tool-shapes";
import { NODE_COUNT, ROUTER, TOOL_ORDER, nodeOfTool, type ToolKey } from "./topology";
import { paintOf, setLit, setPaint, setPresence, toneMaterial, type ToneMaterial } from "./tone-material";
import { add, alongCurve, cross, normalise, scale, subtract, type Point } from "./vectors";

/** The router's frame: which ways its front, top and side face. */
export type Frame = { forward: Point; up: Point; side: Point };

/** How many pieces a link's curve is laid in. */
const LINK_SEGMENTS = 9;

const vector = (each: Point) => new THREE.Vector3(each.x, each.y, each.z);

/** A tube along a bowed curve, its vertices rewritten whenever the curve moves. */
class Tube {
  readonly mesh: THREE.Mesh;
  private readonly sides: number;

  constructor(sides: number, material: ToneMaterial) {
    this.sides = sides;
    const geometry = new THREE.BufferGeometry();
    const vertices = (LINK_SEGMENTS + 1) * sides;
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
    const indices: number[] = [];
    for (let ring = 0; ring < LINK_SEGMENTS; ring++)
      for (let around = 0; around < sides; around++) {
        const next = (around + 1) % sides;
        const here = ring * sides;
        const ahead = (ring + 1) * sides;
        indices.push(here + around, ahead + around, here + next, here + next, ahead + around, ahead + next);
      }
    geometry.setIndex(indices);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
  }

  lay(from: Point, control: Point, to: Point, radius: number) {
    const positions = this.mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    const normals = this.mesh.geometry.getAttribute("normal") as THREE.BufferAttribute;
    for (let ring = 0; ring <= LINK_SEGMENTS; ring++) {
      const share = ring / LINK_SEGMENTS;
      const centre = alongCurve(from, control, to, share);
      const ahead = alongCurve(from, control, to, Math.min(1, share + 0.02));
      const behind = alongCurve(from, control, to, Math.max(0, share - 0.02));
      const tangent = normalise(subtract(ahead, behind));
      let across = cross(tangent, { x: 0, y: 0, z: 1 });
      if (Math.hypot(across.x, across.y, across.z) < 0.2) across = cross(tangent, { x: 0, y: 1, z: 0 });
      across = normalise(across);
      const other = normalise(cross(tangent, across));
      for (let around = 0; around < this.sides; around++) {
        const turn = (around / this.sides) * Math.PI * 2;
        const outward = add(scale(across, Math.cos(turn)), scale(other, Math.sin(turn)));
        const index = ring * this.sides + around;
        positions.setXYZ(index, centre.x + outward.x * radius, centre.y + outward.y * radius, centre.z + outward.z * radius);
        normals.setXYZ(index, outward.x, outward.y, outward.z);
      }
    }
    positions.needsUpdate = true;
    normals.needsUpdate = true;
  }
}

/** A link from one node to another: where it leaves, where it arrives, and how far its middle bows aside. */
export type LinkLay = { from: Point; to: Point; fromRadius: number; toRadius: number; bow: Point };

/** The control point that bows a link: its middle, moved aside. */
const bowedMiddle = (from: Point, to: Point, bow: Point) => add(scale(add(from, to), 0.5), bow);

/** A faint copy of some meshes, drawn again with a transform of its own, each part in its source's ink. */
class FaintCopy {
  readonly group = new THREE.Group();
  private readonly pairs: { source: THREE.Mesh; copy: THREE.Mesh }[] = [];
  /** One material for each ink among the sources. */
  private readonly materials = new Map<number, ToneMaterial>();

  constructor(sources: THREE.Mesh[]) {
    for (const source of sources) {
      const copy = new THREE.Mesh(source.geometry, this.materialLike(source.material as ToneMaterial));
      copy.matrixAutoUpdate = false;
      copy.frustumCulled = false;
      this.pairs.push({ source, copy });
      this.group.add(copy);
    }
    this.group.visible = false;
  }

  /** The copy's material for a source's ink. */
  private materialLike(source: ToneMaterial) {
    const paint = paintOf(source);
    let material = this.materials.get(paint);
    if (!material) {
      material = toneMaterial({ baseTone: 0.92, presence: 0.5 });
      material.uniforms.paint.value = paint;
      this.materials.set(paint, material);
    }
    return material;
  }

  /** How much of the copy is there. */
  setPresence(presence: number) {
    for (const material of this.materials.values()) setPresence(material, presence);
  }

  /** Puts the copy where its sources are, moved by a transform. Their world matrices must be current. */
  follow(transform: THREE.Matrix4) {
    for (const { source, copy } of this.pairs) {
      copy.visible = source.visible && isShown(source);
      copy.matrix.multiplyMatrices(transform, source.matrixWorld);
    }
  }
}

/** Whether a mesh and every group above it is visible. */
function isShown(object: THREE.Object3D) {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}

export type PersonaLay = { place: Point; radius: number; lit: boolean };

export class AgentModel {
  readonly group = new THREE.Group();
  /** The router's frame, in its own units (1 is its radius): the costumes hang here. */
  readonly routerFrame = new THREE.Group();
  readonly costumeHolder = new THREE.Group();
  private readonly router: THREE.Mesh;
  /** The router: shaded softly, so its lit side is dense dots and never one white patch, which would read as an eye. */
  private readonly routerMaterial = toneMaterial({ baseTone: 0.74, shading: 0.7 });
  private readonly tools: { tool: ToolKey; holder: THREE.Group; material: ToneMaterial }[] = [];
  private readonly linkMaterial = toneMaterial({ baseTone: 0.78, shading: 0.85, paint: "link" });
  private readonly messageMaterial = toneMaterial({ baseTone: 1, shading: 0 });
  private readonly links: Tube[] = [];
  private readonly message: THREE.Mesh;
  private readonly bars: THREE.Mesh[] = [];
  private readonly barMaterial = toneMaterial({ baseTone: 0.9, paint: "bars" });
  private readonly tallestBarMaterial = toneMaterial({ baseTone: 0.9, paint: "bars" });
  private readonly copies: FaintCopy[] = [];
  /** The cord a carried name hangs from, from the router's bottom down to its hook. */
  private readonly cord: Tube;
  /** A tool lent out (the cone, writing as a pen): its link stays, to an empty socket where it sat. */
  lent: ToolKey | null = null;
  private readonly socket: THREE.Mesh;
  private readonly personas: { mesh: THREE.Mesh; material: ToneMaterial; link: Tube }[] = [];
  private readonly phantoms: { holder: THREE.Group; link: Tube; material: ToneMaterial }[] = [];
  private readonly sides: number;

  constructor(sides: number) {
    this.sides = sides;
    this.router = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), this.routerMaterial);
    this.routerFrame.matrixAutoUpdate = false;
    this.routerFrame.add(this.router, this.costumeHolder);
    this.group.add(this.routerFrame);
    for (const tool of TOOL_ORDER) {
      const { holder, material } = buildToolNode(tool);
      this.tools.push({ tool, holder, material });
      this.group.add(holder);
      const link = new Tube(sides, this.linkMaterial);
      this.links.push(link);
      this.group.add(link.mesh);
    }
    setLit(this.messageMaterial, true);
    this.message = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.messageMaterial);
    this.message.visible = false;
    this.group.add(this.message);
    setLit(this.tallestBarMaterial, true);
    this.cord = new Tube(sides, this.linkMaterial);
    this.cord.mesh.visible = false;
    this.group.add(this.cord.mesh);
    this.socket = new THREE.Mesh(new THREE.TorusGeometry(1, 0.32, 8, 20), this.linkMaterial);
    this.socket.visible = false;
    this.group.add(this.socket);
  }

  /** The cord from a point down to a hook, thinner than a link, straight; null takes it away. */
  setCord(from: Point | null, to: Point, radius: number) {
    this.cord.mesh.visible = Boolean(from);
    if (!from) return;
    this.cord.lay(from, scale(add(from, to), 0.5), to, (shape.linkThickness / 2) * radius * 0.7);
  }

  /** Lays the graph: the router on its frame, each tool at its node, each link from the router to its tool. */
  layOut(nodes: Point[], radius: number, frame: Frame, breath: number[], links: LinkLay[], toolScales: number[], coneAim: Point) {
    const { forward, up, side } = frame;
    const routerAt = nodes[ROUTER];
    const size = radius * breath[ROUTER];
    this.routerFrame.matrix.set(
      side.x * size, up.x * size, forward.x * size, routerAt.x,
      side.y * size, up.y * size, forward.y * size, routerAt.y,
      side.z * size, up.z * size, forward.z * size, routerAt.z,
      0, 0, 0, 1,
    );
    this.routerFrame.matrixWorldNeedsUpdate = true;
    for (let node = 1; node < NODE_COUNT; node++) {
      const { tool, holder } = this.tools[node - 1];
      const place = nodes[node];
      // Tools turn only a little with the graph, so each shape stays in view and reads. The cone points where it aims.
      orient(holder, pointsAlongLink(tool) ? coneAim : lerpVector({ x: 0, y: 1, z: 0 }, up, 0.3), lerpVector({ x: 0, y: 0, z: 1 }, forward, 0.3));
      holder.position.set(place.x, place.y, place.z);
      holder.scale.setScalar(shape.toolSize * radius * breath[node] * toolScales[node]);
      holder.visible = toolScales[node] > 0.02;
      const link = links[node - 1];
      this.layLink(this.links[node - 1], link, radius);
      const lentOut = tool === this.lent;
      this.links[node - 1].mesh.visible = holder.visible || lentOut;
      if (lentOut) {
        this.socket.position.set(place.x, place.y, place.z);
        this.socket.scale.setScalar(shape.toolSize * radius * 0.42);
      }
    }
  }

  /** Shows the empty socket while a tool is lent out. */
  showSocket() {
    this.socket.visible = this.lent !== null;
  }

  private layLink(tube: Tube, link: LinkLay, radius: number) {
    const along = normalise(subtract(link.to, link.from));
    const from = add(link.from, scale(along, link.fromRadius * 0.85));
    const to = subtract(link.to, scale(along, link.toRadius * 0.7));
    tube.lay(from, bowedMiddle(from, to, link.bow), to, (shape.linkThickness / 2) * radius);
  }

  /** Lights tools (one flat colour each) and puts the rest back. */
  setLit(lit: ToolKey | null) {
    for (const { tool, material } of this.tools) setLit(material, tool === lit);
  }

  /** The message cell at a place, a square this many CSS pixels across, in the ink of the tool it runs to, or none. */
  setMessage(place: Point | null, size: number, tool: ToolKey | null) {
    this.message.visible = Boolean(place);
    if (!place) return;
    setPaint(this.messageMaterial, tool ?? "link");
    this.message.position.set(place.x, place.y, place.z + size);
    this.message.scale.setScalar(size);
  }

  /** The chart's bars, standing on their baseline, the tallest lit; null takes them away. */
  setBars(bars: { centre: Point; width: number; height: number; tallest: boolean }[] | null) {
    for (const bar of this.bars) bar.visible = false;
    if (!bars) return;
    bars.forEach((each, index) => {
      let mesh = this.bars[index];
      if (!mesh) {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.barMaterial);
        this.bars.push(mesh);
        this.group.add(mesh);
      }
      mesh.material = each.tallest ? this.tallestBarMaterial : this.barMaterial;
      mesh.visible = each.height > 0.5;
      mesh.position.set(each.centre.x, each.centre.y + each.height / 2, each.centre.z);
      mesh.scale.set(each.width, Math.max(0.5, each.height), each.width * 0.7);
      mesh.rotation.set(0, -0.35, 0);
    });
  }

  /** Faint copies of the whole graph, each moved by its own transform, its share of cells shown; null hides them. */
  setCopies(copies: { transform: THREE.Matrix4; presence: number }[] | null) {
    if (!copies) {
      for (const copy of this.copies) copy.group.visible = false;
      return;
    }
    if (!this.copies.length) {
      const sources: THREE.Mesh[] = [];
      this.group.traverse((object) => {
        if (object instanceof THREE.Mesh && (object === this.router || this.isGraphPart(object))) sources.push(object);
      });
      for (let index = 0; index < 3; index++) {
        const copy = new FaintCopy(sources);
        this.copies.push(copy);
        this.group.add(copy.group);
      }
    }
    this.group.updateMatrixWorld(true);
    copies.forEach((each, index) => {
      const copy = this.copies[index];
      if (!copy) return;
      copy.group.visible = each.presence > 0.02;
      copy.setPresence(each.presence);
      copy.follow(each.transform);
    });
  }

  /** Whether a mesh is part of the graph itself (a tool or a link), not a costume or something a trick shows. */
  private isGraphPart(object: THREE.Mesh) {
    if (this.links.some((link) => link.mesh === object)) return true;
    for (let node: THREE.Object3D | null = object; node; node = node.parent)
      if (this.tools.some((tool) => tool.holder === node)) return true;
    return false;
  }

  /** The focus group's personas, each a node on its own link from the router; null takes them away. */
  setPersonas(personas: PersonaLay[] | null, router: Point, radius: number) {
    for (const persona of this.personas) {
      persona.mesh.visible = false;
      persona.link.mesh.visible = false;
    }
    if (!personas) return;
    personas.forEach((each, index) => {
      let persona = this.personas[index];
      if (!persona) {
        const material = toneMaterial({ baseTone: 0.9, paint: "personas" });
        persona = { mesh: new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), material), material, link: new Tube(this.sides, this.linkMaterial) };
        this.personas.push(persona);
        this.group.add(persona.mesh, persona.link.mesh);
      }
      persona.mesh.visible = each.radius > 0.5;
      persona.link.mesh.visible = persona.mesh.visible;
      persona.mesh.position.set(each.place.x, each.place.y, each.place.z);
      persona.mesh.scale.setScalar(Math.max(0.5, each.radius));
      setLit(persona.material, each.lit);
      this.layLink(persona.link, { from: router, to: each.place, fromRadius: radius, toRadius: each.radius, bow: { x: 0, y: -radius * 0.1, z: 0 } }, radius);
    });
  }

  /** Tools that are not there: faint nodes on wobbling links, their share of cells shown; null takes them away. */
  setPhantoms(phantoms: { place: Point; size: number; bow: Point }[] | null, presence: number, router: Point, radius: number) {
    for (const phantom of this.phantoms) {
      phantom.holder.visible = false;
      phantom.link.mesh.visible = false;
    }
    if (!phantoms) return;
    phantoms.forEach((each, index) => {
      let phantom = this.phantoms[index];
      if (!phantom) {
        const { holder, material } = buildToolNode(TOOL_ORDER[(index * 2 + 1) % TOOL_ORDER.length]);
        const link = new Tube(this.sides, material);
        phantom = { holder, link, material };
        this.phantoms.push(phantom);
        this.group.add(holder, link.mesh);
      }
      setPresence(phantom.material, presence);
      phantom.holder.visible = presence > 0.02 && each.size > 0.5;
      phantom.link.mesh.visible = phantom.holder.visible;
      phantom.holder.position.set(each.place.x, each.place.y, each.place.z);
      phantom.holder.scale.setScalar(each.size);
      phantom.holder.rotation.set(0.3 * index, 0.7 * index, 0);
      this.layLink(phantom.link, { from: router, to: each.place, fromRadius: radius, toRadius: each.size, bow: each.bow }, radius);
    });
  }

  /** The box round the cone as drawn, flat on the screen, in stage space. */
  coneBox(): FlatBox {
    this.group.updateMatrixWorld(true);
    return flatBoxOf(this.tools[nodeOfTool("route") - 1].holder);
  }
}

/** A box on the screen, in stage space (y up). */
export type FlatBox = { left: number; right: number; bottom: number; top: number };

/** The box round an object and everything in it, flat on the screen. Its world matrices must be current. */
export function flatBoxOf(object: THREE.Object3D): FlatBox {
  const box = new THREE.Box3().setFromObject(object);
  return { left: box.min.x, right: box.max.x, bottom: box.min.y, top: box.max.y };
}

const lerpVector = (from: Point, to: Point, share: number) => normalise(add(scale(from, 1 - share), scale(to, share)));

/** Turns a node so its y axis runs along a direction and its z axis faces as near the front as it can. */
function orient(holder: THREE.Object3D, upward: Point, front: Point) {
  const up = normalise(upward);
  let side = cross(up, front);
  if (Math.hypot(side.x, side.y, side.z) < 0.1) side = cross(up, { x: 0, y: 0, z: 1 });
  side = normalise(side);
  const forward = normalise(cross(side, up));
  const basis = new THREE.Matrix4().makeBasis(vector(side), vector(up), vector(forward));
  holder.quaternion.setFromRotationMatrix(basis);
}
