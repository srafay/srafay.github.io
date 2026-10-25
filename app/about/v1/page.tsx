import type { Metadata } from "next";
import {
  AskMeAbout,
  Elsewhere,
  Studies,
} from "@/components/about/v1/closing-sections";
import { CodeIndex } from "@/components/about/v1/code-index";
import { Now } from "@/components/about/v1/now";
import { Opening } from "@/components/about/v1/opening";
import { TheWayHere } from "@/components/about/v1/the-way-here";
import { VersionLine } from "@/components/about/v1/version-line";
import "./dispatch.css";

/*
  Version 1 of the About page, "Dispatch": a magazine profile. The name set at the size of the screen, a deck, then
  an article with its dates in the margin. A draft for the owner to compare, so search engines are asked to leave it
  out. Everything is drawn at build time; the page sends no script of its own.
*/
export const metadata: Metadata = {
  title: "About me",
  description:
    "Syed Rafay, senior software engineer at Twin Technology: the work now, the roles before it, pinned projects and a year of GitHub contributions.",
  robots: { index: false, follow: false },
};

export default function AboutVersionOne() {
  return (
    <div className="about-v1">
      <article className="dispatch-article">
        <Opening />
        <Now />
        <TheWayHere />
        <CodeIndex />
        <Studies />
        <AskMeAbout />
        <Elsewhere />
      </article>
      <VersionLine current={1} />
    </div>
  );
}
