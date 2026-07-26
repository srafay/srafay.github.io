import type { PostMetadata } from "@/lib/posts";

function declarations(tokens: Record<string, string> = {}) {
  return Object.entries(tokens)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}

/**
 * Applies a post's own theme and CSS. It renders a plain <style> in the page,
 * so the overrides are removed when you navigate away from the post.
 * `:root:root` outranks the site tokens in globals.css; light and dark overrides each apply only in their own mode.
 */
export function PostTheme({ theme, css }: Pick<PostMetadata, "theme" | "css">) {
  const rules = [
    theme?.light &&
      `:root:root:not([data-theme="dark"]) { ${declarations(theme.light)} }`,
    theme?.dark &&
      `:root:root[data-theme="dark"] { ${declarations(theme.dark)} }`,
    css,
  ]
    .filter(Boolean)
    .join("\n");

  if (!rules) return null;
  return <style dangerouslySetInnerHTML={{ __html: rules }} />;
}
