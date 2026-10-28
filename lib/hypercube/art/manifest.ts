/*
  The Blender art version 5 uses. Its one piece is the share image: the object at its rest pose, path-traced in Cycles
  from the page's own dots and camera (every dot a small emissive point, the present a warm light with real bloom), with
  the name and the bio set over it in the site's own faces. It stays a PNG, since some link previews still refuse WebP.
*/

/** The image a link to the page shows when it is posted. */
export const shareImage = {
  file: "share-1200x630.png",
  width: 1200,
  height: 630,
  alt: "Syed Rafay's name beside his life drawn as dotted orbits of light in five colours, unfolding from one warm point.",
};

/** Every art file the page needs, for the build to copy. */
export const artFiles = () => [shareImage.file];
