import type { Metadata } from "next";
import { ContributionCalendar } from "@/components/about/contribution-calendar";
import { Elsewhere } from "@/components/about/elsewhere";
import { Education, Experience } from "@/components/about/history";
import { HydrationSignal } from "@/components/about/hydration-signal";
import { NowCard } from "@/components/about/now-card";
import { PinnedRepositories } from "@/components/about/pinned-repositories";
import { ProfileCard } from "@/components/about/profile-card";
import { SectionLinks } from "@/components/about/section-links";
import { SkillGroups } from "@/components/about/skill-groups";
import {
  avatar,
  currentRole,
  handle,
  introduction,
  personalNote,
} from "@/content/about/profile";
import { addressWithContentHash } from "@/lib/content-hash";
import { site } from "@/lib/site";

/*
  The About page, in the shape of a GitHub profile: the person in a narrow column, the rest beside it. Its words and
  numbers live in content/about/, and everything is drawn at build time, so it reads in full with no script.

  One small deferred script (public/about.js, built from lib/about/script/ by scripts/build-about-scenes.ts) makes it
  answer a touch: a pressed skill lights the roles that used it, the ruler names a role, the calendar names a day,
  the column marks the section being read, and the place gives the time there now.
*/
const TITLE = "About me";
const PAGE_SCRIPT = "about.js";
const DESCRIPTION =
  "Syed Rafay, senior software engineer at Twin Technology: the work now, the roles before it, pinned projects and a year of GitHub contributions.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: site.about },
  openGraph: {
    type: "profile",
    siteName: site.name,
    title: TITLE,
    description: DESCRIPTION,
    url: site.about,
    username: handle,
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

/** What search engines read: a profile page about the site's author, the same person the posts name. */
function structuredData() {
  const address = `${site.url}${site.about}`;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${address}#page`,
    url: address,
    name: TITLE,
    mainEntity: {
      "@type": "Person",
      "@id": `${site.url}/#person`,
      name: site.name,
      url: `${site.url}/`,
      image: avatar.address,
      jobTitle: currentRole.title,
      worksFor: { "@type": "Organization", name: currentRole.organisation },
      sameAs: site.links.map((link) => link.href),
    },
  };
}

export default function AboutPage() {
  return (
    <div className="profile">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData()).replace(/</g, "\\u003c"),
        }}
      />
      <ProfileCard />
      <div className="profile-main">
        <SectionLinks layout="row" />
        <header className="profile-intro">
          <h1>{TITLE}</h1>
          {introduction.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="profile-aside">{personalNote}</p>
        </header>
        <NowCard />
        <PinnedRepositories />
        <ContributionCalendar />
        <Experience />
        <Education />
        <SkillGroups />
        <Elsewhere />
      </div>
      <HydrationSignal />
      <script src={addressWithContentHash(PAGE_SCRIPT)} defer />
    </div>
  );
}
