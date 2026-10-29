/*
  The way from the object to the site's posts. The posts are not drawn in the scene, so this is where a reader finds
  them: the first control of the top row, before Find me, Skills and Sound. It is a link to a page of this site, not a
  button, and it is built the way the buttons beside it are (controls.ts), so the same rules style and size it.
*/
import { glyphElement } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import { hypercubeGlyphs } from "@/lib/hypercube/icons";

const POSTS_ADDRESS = "/posts/";
const POSTS_LABEL = "Posts";

/** The Posts link at the head of the top row: the posts glyph and its label. */
export function postsLink() {
  const anchor = element("a", "cube-control cube-posts");
  anchor.href = POSTS_ADDRESS;
  anchor.dataset.cubeControl = "";
  anchor.append(glyphElement(hypercubeGlyphs.posts, "cube-icon"), element("span", undefined, POSTS_LABEL));
  return anchor;
}
