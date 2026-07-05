import type { Metadata } from "next";
import { Bodoni_Moda, Figtree, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import "./globals.css";

/*
  Every page except the homepage. The homepage is plain HTML (app/route.ts and lib/home.ts) and loads the same two
  typefaces from Google Fonts.
*/
const display = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const text = Figtree({
  variable: "--font-text",
  subsets: ["latin"],
});

const code = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  alternates: { types: { "application/rss+xml": site.rss } },
  openGraph: { siteName: site.name, type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${text.variable} ${code.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Same attribute and storage key as the homepage, so the theme carries across the whole site. */}
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="site-footer">
            {site.links.map((link) => (
              <a key={link.href} href={link.href} rel="me">
                {link.label}
              </a>
            ))}
            <a href={site.rss}>RSS</a>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
