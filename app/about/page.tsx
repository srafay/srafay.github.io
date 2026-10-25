import type { Metadata } from "next";
import { ContributionCalendar } from "@/components/about/contribution-calendar";
import { Elsewhere } from "@/components/about/elsewhere";
import { Education, Experience } from "@/components/about/history";
import { NowCard } from "@/components/about/now-card";
import { PinnedRepositories } from "@/components/about/pinned-repositories";
import { ProfileCard } from "@/components/about/profile-card";
import { SkillGroups } from "@/components/about/skill-groups";
import {
  avatar,
  currentRole,
  handle,
  introduction,
  personalNote,
} from "@/content/about/profile";
import { site } from "@/lib/site";

/*
  The About page, in the shape of a GitHub profile: the person in a narrow column, the rest beside it. Its words and
  numbers live in content/about/, and everything is drawn at build time, so the page sends no script of its own.
*/
const TITLE = "About me";
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
    </div>
  );
}
