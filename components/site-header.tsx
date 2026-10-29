import { ThemeToggle } from "@/components/theme-toggle";
import { site } from "@/lib/site";

/*
  The bar across the top. Its links are plain <a>s: the homepage isn't a React page (see lib/hypercube/home-page.ts),
  so going there is always a full page load.
*/
export function SiteHeader() {
  return (
    <header className="bar">
      <a href="/" className="mark">
        srafay<span>.github.io</span>
      </a>
      <nav aria-label="Site">
        <a href="/">Home</a>
        <a href="/posts/">Posts</a>
        <a href={site.about}>About</a>
        <ThemeToggle />
      </nav>
    </header>
  );
}
