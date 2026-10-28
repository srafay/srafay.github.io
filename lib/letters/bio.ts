/*
  The bio line from content/about/profile.ts, with a few of its words set on solid electric-blue blocks. Which words
  is one constant, so a better choice is a one-line change. A phrase the bio no longer holds fails the build.
*/
const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export const BLOCK_PHRASES = ["cloud backends", "AI tools", "screens"];

export function bioWithBlocks(bio: string) {
  let html = escapeHtml(bio);
  for (const phrase of BLOCK_PHRASES) {
    if (!html.includes(phrase)) throw new Error(`Version 7: the bio no longer says "${phrase}"`);
    html = html.replace(phrase, `<mark class="letters-block">${phrase}</mark>`);
  }
  return html;
}
