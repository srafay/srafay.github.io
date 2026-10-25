import { profilePurposes } from "@/content/about/profile";
import { pageSections } from "@/lib/about/sections";
import { site } from "@/lib/site";

/** The site's profiles (lib/site.ts), each with a word on what it holds. */
export function Elsewhere() {
  const { id, label } = pageSections.elsewhere;
  return (
    <section
      id={id}
      className="profile-section"
      aria-labelledby="elsewhere-heading"
    >
      <h2 id="elsewhere-heading">{label}</h2>
      <ul className="elsewhere">
        {site.links.map((link) => (
          <li key={link.href}>
            <a href={link.href} rel="me">
              {link.label}
            </a>
            {profilePurposes[link.label] && (
              <span>{profilePurposes[link.label]}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
