/*
  The Blender art of version 4, for the page's build. It copies each file from lib/world-lines/art/ into the page's
  folder and gives each one an address with a hash of its contents. Then it writes the markup that shows it. That is the still
  over the scene while it loads, the haze under it at the first screen, and the share image's meta tags.
*/
import path from "node:path";
import {
  artFiles,
  hazePlates,
  PLATE_ASPECTS,
  PLATE_SHAPES,
  presentGlowSprite,
  shareImage,
  stillPlates,
  type PlateFile,
  type PlateShape,
} from "@/lib/world-lines/art/manifest";
import { overviewPose } from "@/lib/world-lines/scene/camera";
import { vaultFor } from "@/lib/world-lines/scene/layout";
import { copyArt as copyArtFiles, shareMeta as shareMetaTags, type ArtAddresses } from "./standalone-page";

const ART_SOURCE = path.join("lib", "world-lines", "art");
const PAGE_ADDRESS = "/about/v4/";

type Addresses = ArtAddresses;

/** Copies every art file into the page's folder. The answer is each file's address, with a hash of its contents. */
export const copyArt = (output: string): Addresses => copyArtFiles(ART_SOURCE, artFiles(), output, PAGE_ADDRESS);

/**
  Where a plate's picture centre sits across the screen, as a share of its width. The page's computer camera shifts
  its picture right by a share of half its width, its lens shift. So the vanishing point sits right of the middle.
  The plate was rendered with the same shift. Placing the plate's centre there keeps the two together at any width.
*/
export function plateCentre(shape: PlateShape) {
  const aspect = PLATE_ASPECTS[shape];
  const shift = overviewPose(aspect, vaultFor(aspect)).shiftAcross;
  return `${((1 + shift) / 2) * 100}%`;
}

/** How wide a plate shows when it fills the screen's height, for the browser to pick a file by density. */
const shownWidth = (shape: PlateShape) => `${Math.ceil(PLATE_ASPECTS[shape] * 100)}vh`;

const sourceFor = (shape: PlateShape, files: PlateFile[], addresses: Addresses) => {
  const sources = files.map((plate) => `${addresses.get(plate.file)} ${plate.width}w`).join(", ");
  return `<source media="${PLATE_SHAPES[shape]}" type="image/webp" srcset="${sources}" sizes="${shownWidth(shape)}">`;
};

/**
  A plate as a picture: one source for each screen shape it is true for. The image itself has no address, so on a
  screen of any other shape nothing is fetched and nothing shows.
*/
function plateMarkup(
  className: string,
  dataName: string,
  plates: Record<PlateShape, PlateFile[]>,
  addresses: Addresses,
) {
  const shapes = Object.keys(plates) as PlateShape[];
  return [
    `<picture class="lines-plate ${className}" data-lines-${dataName} aria-hidden="true">`,
    ...shapes.map((shape) => `  ${sourceFor(shape, plates[shape], addresses)}`),
    `  <img alt="" decoding="async">`,
    `</picture>`,
  ].join("\n");
}

export const stillMarkup = (addresses: Addresses) =>
  plateMarkup("lines-still", "still", stillPlates, addresses);

export const hazeMarkup = (addresses: Addresses) =>
  plateMarkup("lines-haze", "haze", hazePlates, addresses);

/** The plates' centres and the present's glow, handed to the stylesheet and the script on the stage. */
export const stageArtAttributes = (addresses: Addresses) =>
  `style="--lines-desktop-plate-centre: ${plateCentre("desktop")}" data-lines-present-glow="${addresses.get(presentGlowSprite)}"`;

/** What a link to the page shows when it is posted: the share image, at its size, with words for it. */
export const shareMeta = (addresses: Addresses, title: string, description: string) =>
  shareMetaTags(addresses, shareImage, PAGE_ADDRESS, title, description);
