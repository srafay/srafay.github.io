/*
  What a page and the site's menu hand each other. The page's own inline script (start-script.ts) fills
  window.siteMenu as the page parses; the menu's script (menu.ts) arrives later and opens the menu from it.
  window.siteTheme is the page's own light and dark switch: the cosmos pages, Earth's post and the Next pages each set it,
  and the menu's "Change theme" goes through it, never around it.
*/

/** A post as the menu lists it. */
export type MenuPost = { title: string; address: string };

/**
 * How the menu looks on a page, as CSS values: each page passes its own custom properties, so the menu takes the
 * page's colours and face and follows its theme as the page's tokens change.
 */
export type MenuLook = {
  panel: string;
  ink: string;
  muted: string;
  rule: string;
  face: string;
};

/** Where and how the reader asked for the menu. */
export type MenuRequest = {
  pointX: number;
  pointY: number;
  byKeyboard: boolean;
  target: EventTarget | null;
};

export type MenuStart = {
  posts: MenuPost[];
  look: MenuLook;
  /** A right click that came before the menu's script: the script opens the menu there as it arrives. */
  waiting?: MenuRequest;
  /** Set by the menu's script once it has arrived. */
  open?: (request: MenuRequest) => void;
};

/** A page's own switch between the light and dark themes. */
export type PageTheme = { flip(): void };

declare global {
  interface Window {
    siteMenu?: MenuStart;
    siteTheme?: PageTheme;
  }
}
