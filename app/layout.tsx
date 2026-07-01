import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

const serif = Source_Serif_4({
  variable: "--font-serif-body",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const code = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
  openGraph: { siteName: site.name, type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${serif.variable} ${code.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-8">{children}</main>
          <footer className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-muted-foreground sm:px-8">
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-6">
              {site.links.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-foreground">
                  {link.label}
                </a>
              ))}
              <a href="/rss.xml" className="hover:text-foreground">
                RSS
              </a>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
