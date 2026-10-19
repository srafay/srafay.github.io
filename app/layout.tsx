import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { PageChangeCounter } from "@/components/page-change-counter";
import { SiteHeader } from "@/components/site-header";
import { fontFaceCss } from "@/lib/fonts";
import { site } from "@/lib/site";
import { visitCounterScript } from "@/lib/visit-counter";
import "./globals.css";

/*
  Every page except the homepage, which is plain HTML (app/route.ts and lib/home.ts). Both use the same self-hosted
  typefaces (lib/fonts.ts); code is set in JetBrains Mono, used only here.
  These pages don't preload their fonts: the faces are declared inline at the top of the page, so the browser finds
  them almost as early anyway. Preloads here also reached the homepage, which fetches a post's page to show its text
  (in dev as a Link header), and the browser then warned that the preloaded fonts went unused.
*/
const code = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  preload: false, // only code blocks use it
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  alternates: { types: { "application/rss+xml": site.rss } },
  openGraph: { siteName: site.name, type: "website" },
  // The black hole: app/favicon.ico (16, 32 and 48 px), and a larger one for phones' home screens.
  icons: { apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
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
        <PageChangeCounter />
        <script dangerouslySetInnerHTML={{ __html: visitCounterScript }} />
      </body>
    </html>
  );
}
