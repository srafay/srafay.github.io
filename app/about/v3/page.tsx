import type { Metadata } from "next";
import { FlightChapters } from "@/components/about/v3/chapters";
import { PAGE_CLASS, styles } from "@/components/about/v3/class-names";
import { HydrationSignal } from "@/components/about/v3/hydration-signal";
import { VersionLine } from "@/components/about/v3/version-line";
import { addressWithContentHash } from "@/lib/content-hash";
import "./flight.css";

/*
  Version 3 of the About page, "Flight": the real Earth at night, flown from Karachi to Darwin to Sydney as the reader
  scrolls, and back out to the whole planet. A draft for the owner to compare, so search engines are asked to leave
  it out.

  The words are all in the HTML. The planet is drawn by public/about-v3.js (lib/flight/, built by
  scripts/build-about-scenes.ts with three.js), added after the HTML. Until it runs, the first screen's planet is a
  plain dark disc drawn in CSS at the same place, and the page reads as a column of words without it.
*/
export const metadata: Metadata = {
  title: "About me",
  description:
    "Syed Rafay, senior software engineer at Twin Technology: the work now, the roles before it, pinned projects and a year of GitHub contributions.",
  robots: { index: false, follow: false },
};

const SCENE_SCRIPT = "about-v3.js";

export default function AboutVersionThree() {
  return (
    <div className={PAGE_CLASS} data-flight-root="">
      <div className={styles.track} data-flight-track="">
        <div className={styles.stage} data-flight-stage="">
          <div
            className={styles.standIn}
            data-flight-stand-in=""
            aria-hidden="true"
          />
          {/* Drawn on by the scene's script; until then (or without it) it stays clear over the stand-in. */}
          <canvas data-flight-canvas="" aria-hidden="true" />
          <div className={styles.shade} aria-hidden="true" />
          <div className={styles.dim} aria-hidden="true" />
          <FlightChapters />
        </div>
      </div>
      <VersionLine current={3} />
      <HydrationSignal />
      <script src={addressWithContentHash(SCENE_SCRIPT)} defer />
    </div>
  );
}
