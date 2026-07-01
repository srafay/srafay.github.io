import Link from "next/link";

export default function NotFound() {
  return (
    <section className="pt-20 pb-24">
      <h1 className="text-6xl font-extrabold tracking-[-0.04em] sm:text-8xl">404</h1>
      <p className="mt-4 max-w-[40ch] font-serif text-lg text-muted-foreground">
        This page doesn&apos;t exist. It may have moved, or the link has a typo.
      </p>
      <Link href="/" className="mt-8 inline-block font-medium text-link underline underline-offset-4">
        Go to the home page
      </Link>
    </section>
  );
}
