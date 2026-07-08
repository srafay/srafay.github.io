import { site } from "@/lib/site";

/*
  /robots.txt. Search engines, and the AI assistants that fetch a page to answer a question and cite it, may read
  everything. Crawlers that collect text to train AI models are kept out: nothing here may be copied without written
  permission (see /llms.txt). A route handler rather than app/robots.ts, so the file can carry these terms as comments.
*/
export const dynamic = "force-static";

// Crawlers whose purpose is gathering training data. Search and on-demand fetchers (Googlebot, Bingbot,
// OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot) are deliberately not listed.
const TRAINING_CRAWLERS = [
  "GPTBot", // OpenAI
  "ClaudeBot", // Anthropic
  "anthropic-ai",
  "Google-Extended", // Gemini training; Google Search is unaffected
  "Applebot-Extended", // Apple Intelligence training; Applebot search is unaffected
  "CCBot", // Common Crawl, a source for many models
  "meta-externalagent", // Meta
  "Bytespider", // ByteDance
  "Amazonbot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "AI2Bot", // Allen Institute
  "Diffbot",
  "img2dataset",
  "omgili",
];

export function GET() {
  const text = `# ${site.url}
# Everything on this site is (c) ${site.name}. Do not copy or reuse it, including to train AI models,
# without written permission. Cite ${site.name} and link to the page when sharing.
# How to read this site and the terms in full: ${site.url}/llms.txt

${TRAINING_CRAWLERS.map((bot) => `User-agent: ${bot}`).join("\n")}
Disallow: /

User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`;

  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
