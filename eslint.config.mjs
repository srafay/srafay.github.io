import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The cosmos source (the 404 page, the sky behind the posts, Earth's post) lives in its own private repo; public/cosmos/ is its build.
    "cosmos/**",
    "public/cosmos/**",
    // The site's menu, built from lib/site-menu/ by scripts/build-site-menu.ts.
    "public/site-menu.js",
    // The homepage's scene (version 5 of the About page), built by scripts/build-hypercube-page.ts.
    "public/hypercube/**",
  ]),
  {
    // The homepage is plain HTML from a route handler (app/route.ts), not a React page, so links to it are plain <a>s
    // and load the page in full.
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
]);

export default eslintConfig;
