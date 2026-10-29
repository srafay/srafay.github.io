/*
  The way from the object to the site's posts. The posts are not drawn in the scene, so on the homepage this is where
  a reader finds them: one more place under Find me, after the profiles. It is a page of this site, so unlike the
  profiles it is not a rel="me" link.
*/
import { glyphElement } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import { hypercubeGlyphs } from "@/lib/hypercube/icons";

const POSTS_ADDRESS = "/posts/";
const POSTS_LABEL = "Posts";

/** A list item built as the profiles are (lib/about-cv/ui/skills-sheet.ts), so it is styled and read like them. */
export function postsPlace() {
  const item = element("li");
  const anchor = element("a", "cube-find-link");
  anchor.href = POSTS_ADDRESS;
  anchor.append(glyphElement(hypercubeGlyphs.posts, "cube-icon"), element("span", undefined, POSTS_LABEL));
  item.append(anchor);
  return item;
}
