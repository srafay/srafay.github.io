# srafay.github.io

Personal site and blog for Syed Rafay, live at https://srafay.github.io.

Built with Next.js (static export), Tailwind CSS, shadcn/ui and Motion. Posts are MDX.

## Requirements

- Node 26+
- Bun 1.4+

## Commands

| Command | What it does |
|---|---|
| `bun install` | Install dependencies |
| `bun run dev` | Run the site locally at http://localhost:3000 (drafts included) |
| `bun run build` | Build the static site into `out/` |
| `bun run start` | Serve the built `out/` folder |
| `bun run lint` | Lint with ESLint |
| `bun run typecheck` | Type-check with TypeScript 7 |

TypeScript is installed twice on purpose: `@typescript/native` is TypeScript 7 (`tsc`), and `typescript` is the TypeScript 6 API package, which ESLint still needs until TypeScript 7.1 adds an API.

## Writing a post

Add a file to `content/posts/`. The file name becomes the URL: `my-post.mdx` is published at `/posts/my-post/`.

```mdx
export const metadata = {
  title: "My post",
  date: "2026-10-10",
  summary: "One line for the post list and link previews.",
};

Write Markdown here. You can also use JSX and import React components.
```

Set `draft: true` to keep a post out of the published site. Drafts still show in `bun run dev`.

### Giving a post its own style

Every option below applies to that post's page only.

- **`theme`** overrides the colour tokens, separately for light and dark mode:

  ```js
  theme: {
    light: { "--signal": "#2f9e6a", "--background": "#f1f6f2" },
    dark: { "--signal": "#4cc38a", "--background": "#0c1a15" },
  },
  ```

  Tokens: `--background`, `--surface`, `--foreground`, `--muted-foreground`, `--border`, `--signal` (dots and marks), `--link` (link text).

- **`css`** adds any CSS. Use `[data-post="my-post"]` to target only the article.
- **Components:** import a React component in the MDX file and use it inline. Put components used by a single post in `content/posts/_components/`.

See `content/posts/styling-a-post.mdx` for a working example.

## Deploying

Every push to `master` runs `.github/workflows/deploy.yml`. It lints, type-checks and builds the site, then publishes `out/` to GitHub Pages.
