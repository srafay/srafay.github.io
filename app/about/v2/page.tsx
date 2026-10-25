import type { Metadata } from "next";
import { PAGE_CLASS } from "@/components/about/v2/class-names";
import { NightSky } from "@/components/about/v2/night-sky";
import { VersionLine } from "@/components/about/v2/version-line";
import { addressWithContentHash } from "@/lib/content-hash";
import "./year-of-nights.css";

/*
  Version 2 of the About page, "A year of nights": the last year on GitHub as a night sky of 365 stars, which the
  camera flies through to the career, the code, the tools and the links. A draft for the owner to compare, so search
  engines are asked to leave it out.

  The words are all in the HTML. The sky is drawn by public/about-v2.js (lib/year-of-nights/scene/, built by
  scripts/build-about-scenes.ts), added after the HTML. The page reads as a plain column of words without it.
*/
export const metadata: Metadata = {
  title: "About me",
  description:
    "Syed Rafay, senior software engineer at Twin Technology: the work now, the roles before it, pinned projects and a year of GitHub contributions.",
  robots: { index: false, follow: false },
};

const SCENE_SCRIPT = "about-v2.js";

export default function AboutVersionTwo() {
  return (
    <div className={PAGE_CLASS}>
      <NightSky />
      <VersionLine current={2} />
      <script src={addressWithContentHash(SCENE_SCRIPT)} defer />
    </div>
  );
}
