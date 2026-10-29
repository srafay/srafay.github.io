/*
  What some of the tour's lines come with besides a card: the skills in the CV's groups with a filter, the links,
  every trick and costume as buttons, and this site in a laptop and a phone. The skills and the links are built by the
  shared builders (lib/about-cv/ui/skills-sheet.ts), the same ones the top bar's panels use.
*/
import { glyphElement } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import type { SkillWord } from "@/lib/about-cv/skills";
import { buildSkillsSheet, findMeList } from "@/lib/about-cv/ui/skills-sheet";
import { costumeGlyphs, guideGlyphs, trickGlyphs } from "@/lib/guide/icons";
import type { CostumeKey } from "@/lib/guide/agent/costumes";
import type { TrickKey } from "@/lib/guide/agent/tricks";
import { COSTUME_NAMES, controlButton, namedTricks } from "./bars";

/** Where the homepage is: the cosmos, entered as if coming back from a post. */
export const BACK_TO_THE_SYSTEM = "/?from=post";

/** Every skill in the CV's groups, with marks and a filter, laid in the page rather than in a panel. */
export function skillsBlock(skills: SkillWord[], onPick: (skill: SkillWord) => void) {
  const block = element("div", "guide-skills");
  const filter = element("input", "guide-filter");
  buildSkillsSheet(block, filter, { prefix: "guide", skills, onPick, onClose: () => {} });
  // The shared builder makes a dialog; here it is part of the page, under the section's own heading.
  block.hidden = false;
  block.removeAttribute("role");
  block.removeAttribute("aria-label");
  block.removeAttribute("tabindex");
  block.removeAttribute("data-guide-control");
  block.querySelector(":scope > .guide-close")?.remove();
  block.querySelector(":scope > h2")?.remove();
  filter.id = "guide-skills-filter";
  return block;
}

/** The profiles, each by name with its mark, and the way back to the homepage. */
export function linksBlock() {
  const block = element("div", "guide-links");
  const list = findMeList("guide");
  const item = element("li");
  const back = element("a", "guide-find-link guide-back");
  back.href = BACK_TO_THE_SYSTEM;
  back.append(glyphElement(guideGlyphs.backToSystem, "guide-icon"), element("span", undefined, "Back to the system"));
  item.append(back);
  list.append(item);
  block.append(list);
  return block;
}

/** Every trick and costume as a button, for a last play at the end. */
export function playgroundBlock(onTrick: (key: TrickKey) => void, onCostume: (key: CostumeKey | null) => void) {
  const block = element("div", "guide-playground");
  const tricks = element("div", "guide-play-group");
  tricks.setAttribute("role", "group");
  tricks.setAttribute("aria-label", "Tricks");
  for (const [key, name] of namedTricks()) {
    const button = controlButton(name, trickGlyphs[key], "guide-tray-button guide-play-button");
    button.dataset.trick = key;
    button.addEventListener("click", () => onTrick(key));
    tricks.append(button);
  }
  const costumes = element("div", "guide-play-group");
  costumes.setAttribute("role", "group");
  costumes.setAttribute("aria-label", "Dress me up");
  for (const [key, name] of Object.entries(COSTUME_NAMES) as [CostumeKey, string][]) {
    const button = controlButton(name, costumeGlyphs[key], "guide-tray-button guide-play-button");
    button.dataset.costume = key;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => onCostume(key));
    costumes.append(button);
  }
  block.append(tricks, costumes);
  return block;
}

export type ArtAddresses = { homepage: string; earthPost: string };

/**
 * This site in two devices drawn in CSS: the homepage on a laptop and Earth's post on a phone, both captured from the
 * owner's own pages. Each is a link to the real page.
 */
export function mockupsBlock(art: ArtAddresses) {
  const block = element("div", "guide-mockups");
  const laptop = element("a", "guide-laptop");
  laptop.href = BACK_TO_THE_SYSTEM;
  const laptopScreen = element("span", "guide-laptop-screen");
  const homepage = element("img");
  homepage.src = art.homepage;
  homepage.alt = "The homepage: the sky of planets, on a computer.";
  homepage.width = 1200;
  homepage.height = 750;
  homepage.loading = "lazy";
  homepage.decoding = "async";
  laptopScreen.append(homepage);
  laptop.append(laptopScreen, element("span", "guide-laptop-base"));
  const laptopCaption = element("span", "guide-device-caption");
  laptopCaption.append(glyphElement(guideGlyphs.laptop, "guide-icon"), element("span", undefined, "The homepage"));
  laptop.append(laptopCaption);
  const phone = element("a", "guide-phone");
  phone.href = "/posts/daylight-saving/";
  const phoneScreen = element("span", "guide-phone-screen");
  const post = element("img");
  post.src = art.earthPost;
  post.alt = "Earth's post about daylight saving, on a phone.";
  post.width = 585;
  post.height = 1266;
  post.loading = "lazy";
  post.decoding = "async";
  phoneScreen.append(post);
  phone.append(phoneScreen);
  const phoneCaption = element("span", "guide-device-caption");
  phoneCaption.append(glyphElement(guideGlyphs.phone, "guide-icon"), element("span", undefined, "Earth's post"));
  phone.append(phoneCaption);
  block.append(laptop, phone);
  return block;
}
