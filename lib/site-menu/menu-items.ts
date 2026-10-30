import type { MenuPost } from "@/lib/site-menu/shared";

/*
  What the menu holds, worked out each time it opens: a page's theme switch may arrive after the menu's script does
  (Earth's post sets it up once its first screen has painted), and an item is left out while its page has no way to
  do it.
*/
export type MenuLink = { kind: "link"; label: string; address: string };
export type MenuAction = { kind: "action"; label: string; run: () => void };
export type MenuParent = { kind: "parent"; label: string; items: MenuEntry[] };
export type MenuSeparator = { kind: "separator" };
export type MenuEntry = MenuLink | MenuAction | MenuParent | MenuSeparator;
export type MenuItem = Exclude<MenuEntry, MenuSeparator>;

const link = (label: string, address: string): MenuLink => ({
  kind: "link",
  label,
  address,
});

const homeLink = () => link("Home", "/");
// The list of every post, above the posts themselves.
const allPostsLink = () => link("All posts", "/posts/");
const postLink = (post: MenuPost) => link(post.title, post.address);

const postsMenu = (posts: MenuPost[]): MenuParent => ({
  kind: "parent",
  label: "Posts",
  items: [allPostsLink(), { kind: "separator" }, ...posts.map(postLink)],
});

const navigateMenu = (posts: MenuPost[]): MenuParent => ({
  kind: "parent",
  label: "Navigate",
  // In the order the bar at the top of every page has them.
  items: [homeLink(), postsMenu(posts)],
});

/** Change theme, through the page's own switch, or nothing where the page has none. */
function themeActions(): MenuAction[] {
  const pageTheme = window.siteTheme;
  if (!pageTheme) return [];
  return [
    { kind: "action", label: "Change theme", run: () => pageTheme.flip() },
  ];
}

export const menuEntries = (posts: MenuPost[]): MenuEntry[] => [
  navigateMenu(posts),
  ...themeActions(),
];

export const isItem = (entry: MenuEntry): entry is MenuItem =>
  entry.kind !== "separator";

/** The address names the page the reader is on, with or without its trailing slash. */
export function isThePageShown(address: string) {
  const withoutTrailingSlash = (path: string) => path.replace(/\/+$/, "");
  return (
    withoutTrailingSlash(new URL(address, location.href).pathname) ===
    withoutTrailingSlash(location.pathname)
  );
}
