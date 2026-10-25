import { BuildingIcon, LinkIcon, PlaceIcon } from "@/components/about/icons";
import {
  avatar,
  bio,
  currentRole,
  handle,
  location,
} from "@/content/about/profile";
import { site } from "@/lib/site";

/**
 * The narrow column, as on a GitHub profile: the picture, the name and handle, one line, then the facts and links.
 * The picture is a plain <img>: a static export cannot resize images, so next/image would only add script.
 */
export function ProfileCard() {
  return (
    <aside className="profile-card" aria-label="Profile">
      <div className="profile-identity">
        {/* eslint-disable-next-line @next/next/no-img-element -- next/image would only add script here */}
        <img
          className="avatar"
          src={avatar.address}
          width={avatar.pixels}
          height={avatar.pixels}
          alt=""
          decoding="async"
        />
        <p className="profile-names">
          <span className="profile-name">{site.name}</span>
          <span className="profile-handle">{handle}</span>
        </p>
      </div>
      <p className="profile-bio">{bio}</p>
      <ul className="profile-facts">
        <li>
          <BuildingIcon />
          <span>
            {currentRole.title} at {currentRole.organisation}
          </span>
        </li>
        <li>
          <PlaceIcon />
          <span>{location}</span>
        </li>
        {site.links.map((link) => (
          <li key={link.href}>
            <LinkIcon />
            <a href={link.href} rel="me">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
