import Link from "next/link";

export default function NotFound() {
  return (
    <section className="pt-20 pb-24">
      <h1 className="font-display text-7xl sm:text-9xl">404</h1>
      <p className="mt-4 max-w-[40ch] font-serif text-lg text-muted-foreground">
        Nothing here. The page may have moved, or the link has a typo.
      </p>
      <Link href="/" className="mt-8 inline-block font-medium text-link underline underline-offset-4">
        Go to the home page
      </Link>
    </section>
  );
}
