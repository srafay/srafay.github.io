/*
  For the owner only while the three versions are compared: which version this is, and plain links to the others
  and to the first draft. It sits under the article, outside it.
*/
const VERSIONS = [
  { number: 1, address: "/about/v1/" },
  { number: 2, address: "/about/v2/" },
  { number: 3, address: "/about/v3/" },
];
const FIRST_DRAFT = "/about/";

export function VersionLine({ current }: { current: number }) {
  const others = VERSIONS.filter((version) => version.number !== current);
  return (
    <nav className="dispatch-versions" aria-label="Versions of this page">
      <p>
        Version {current} of {VERSIONS.length}. See{" "}
        {others.map((version) => (
          <span key={version.number}>
            <a href={version.address}>version {version.number}</a>,{" "}
          </span>
        ))}
        or <a href={FIRST_DRAFT}>the first draft</a>.
      </p>
    </nav>
  );
}
