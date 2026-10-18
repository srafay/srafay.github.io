import { ThemeToggle } from "@/components/theme-toggle";

/*
  The homepage's bar. Its links are plain <a>s: the homepage isn't a React page (see lib/home.ts), so going there is
  always a full page load.
*/
export function SiteHeader() {
  return (
    <header className="bar">
      <a href="/" className="mark">
        srafay<span>.github.io</span>
      </a>
      <nav aria-label="Site">
        <a href="/">Home</a>
        <a href="/#posts">Posts</a>
        <ThemeToggle />
      </nav>
    </header>
  );
}
