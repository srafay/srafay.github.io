import type { PostMetadata } from "@/lib/posts";

function declarations(tokens: Record<string, string> = {}) {
  return Object.entries(tokens)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}

/**
 * Applies a post's own theme and CSS. It renders a plain <style> in the page,
 * so the overrides are removed when you navigate away from the post.
 * `:root:root` outranks the site tokens in globals.css.
 */
export function PostTheme({ theme, css }: Pick<PostMetadata, "theme" | "css">) {
  const rules = [
    theme?.light && `:root:root { ${declarations(theme.light)} }`,
    theme?.dark && `:root:root.dark { ${declarations(theme.dark)} }`,
    css,
  ]
    .filter(Boolean)
    .join("\n");

  if (!rules) return null;
  return <style dangerouslySetInnerHTML={{ __html: rules }} />;
}
