import type { MDXComponents } from "mdx/types";
import Link from "next/link";

// Components available to every post. A post can also import its own.
const components: MDXComponents = {
  a: ({ href = "", ...props }) =>
    href.startsWith("/") ? (
      <Link href={href} {...props} />
    ) : (
      <a href={href} target="_blank" rel="noreferrer" {...props} />
    ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
