import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { preload } from "react-dom";
import { SiteHeader } from "@/components/site-header";
import { fontFaceCss, preloadedFonts } from "@/lib/fonts";
import { site } from "@/lib/site";
import "./globals.css";

/*
  Every page except the homepage, which is plain HTML (app/route.ts and lib/home.ts). Both use the same self-hosted
  typefaces (lib/fonts.ts); code is set in JetBrains Mono, used only here.
*/
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
  for (const href of preloadedFonts) preload(href, { as: "font", type: "font/woff2", crossOrigin: "" });
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${code.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: fontFaceCss }} />
      </head>
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
