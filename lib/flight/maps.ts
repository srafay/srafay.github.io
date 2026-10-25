/*
  The two maps Earth's post already serves, used as they are: the night (NASA's Black Marble, the city lights) and the
  packed surface (relief, land and clouds in its three channels). Each is fetched and decoded into a bitmap off the
  page's thread; an <img> handed to WebGL is decoded again on the page's thread, which on a phone is a long frame.
*/
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  SRGBColorSpace,
  Texture,
  type ColorSpace,
} from "three";

export const NIGHT_MAP = "/textures/earth/night-2048.jpg";
export const SURFACE_MAP = "/textures/earth/surface-2048.jpg";

const BITMAP_OPTIONS: ImageBitmapOptions = {
  premultiplyAlpha: "none",
  colorSpaceConversion: "none",
};

/** The slower way, for a browser without bitmaps or one that refuses the options: an image element. */
async function decodedAsImage(blob: Blob) {
  const image = new Image();
  image.src = URL.createObjectURL(blob);
  await image.decode();
  return image;
}

async function decodedImage(address: string, priority: RequestPriority) {
  const response = await fetch(address, { priority });
  if (!response.ok) throw new Error(`Could not load ${address}`);
  const blob = await response.blob();
  if (typeof createImageBitmap !== "function") return decodedAsImage(blob);
  try {
    return await createImageBitmap(blob, BITMAP_OPTIONS);
  } catch {
    return decodedAsImage(blob);
  }
}

/** Decodes already asked for, by address, so a map started early is not fetched twice. */
const decodes = new Map<string, ReturnType<typeof decodedImage>>();

function decodeOnce(address: string, priority: RequestPriority) {
  const started = decodes.get(address);
  if (started) return started;
  const decode = decodedImage(address, priority);
  decodes.set(address, decode);
  return decode;
}

/** Starts fetching and decoding the night map before the scene exists, so the first screen's lights come sooner. */
export function startNightMapDownload() {
  decodeOnce(NIGHT_MAP, "high").catch(() => decodes.delete(NIGHT_MAP));
}

async function loadMap(
  address: string,
  colourSpace: ColorSpace,
  priority: RequestPriority,
  anisotropy: number,
) {
  const texture = new Texture(await decodeOnce(address, priority));
  // A bitmap is stored top row first and is never flipped on its way in; the shader reads it the same way.
  texture.flipY = false;
  texture.colorSpace = colourSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** The night map is colour (sRGB), and the first screen waits on it, so it goes first and first in line. */
export const loadNightMap = (anisotropy: number) =>
  loadMap(NIGHT_MAP, SRGBColorSpace, "high", anisotropy);

/** The surface map is data, not colour, and only feeds the dawn edge and the clouds, so it comes after. */
export const loadSurfaceMap = (anisotropy: number) =>
  loadMap(SURFACE_MAP, NoColorSpace, "low", anisotropy);
