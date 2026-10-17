import { site } from "@/lib/site";

/** The post's address, as people will share it. */
export const postUrl = `${site.url}/posts/daylight-saving/`;

/**
 * A petition to abolish daylight saving in NSW, started on change.org on 6 October 2024. It asks for more than this
 * post does (a vote either way), so the post offers it to readers who want daylight saving gone, never as its own ask.
 * Leave it empty to hide every petition button.
 */
export const petitionUrl =
  "https://www.change.org/p/abolish-daylight-saving-time-in-new-south-wales";

/** The address of one section, so a shared line brings people straight to it. */
export const sectionUrl = (sectionId: string) => `${postUrl}#${sectionId}`;

export type ShareTarget = { name: string; href: string };

/** Share links that need no script: each opens the network's own share page, filled in. */
export function shareTargets(text: string, url: string): ShareTarget[] {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  return [
    {
      name: "X",
      href: `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    },
    {
      name: "Bluesky",
      href: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text} ${url}`)}`,
    },
    {
      name: "Email",
      href: `mailto:?subject=${encodeURIComponent("Nobody asked us about daylight saving")}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
    },
  ];
}

/**
 * The letter readers can send their state MP, as it stands in the HTML. It names no state, because it is what search
 * engines and readers without the script see; the post's script rewrites it with the reader's own state's figures.
 */
export const letterToMember = {
  subject: "A vote on daylight saving",
  paragraphs: [
    "Dear Member of Parliament,",
    "I live in your electorate. Every October the clocks go forward, and my household loses an hour of sleep.",
    "I am not asking you to keep daylight saving or to scrap it. I am asking for a say. Please support one question on daylight saving at each state election, with the majority deciding for the next term.",
    `If you would like the research behind this, for and against, it is collected here: ${postUrl}`,
  ],
  /** The sign-off. The letter dialog adds the reader's name under it, when they give one. */
  signOff: "Yours sincerely",
};

/** The whole letter as plain text, signed with a name if there is one. */
export const letterText = (name = "") =>
  [
    ...letterToMember.paragraphs,
    name ? `${letterToMember.signOff},\n${name}` : letterToMember.signOff,
  ].join("\n\n");

export const letterMailto = (name = "") =>
  `mailto:?subject=${encodeURIComponent(letterToMember.subject)}&body=${encodeURIComponent(letterText(name))}`;
