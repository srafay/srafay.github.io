import { sectionsInPageOrder } from "@/lib/about/sections";

/*
  "On this page": a plain link to each section. On a computer the list sits in the profile column and stays in view.
  On a phone it sits once at the top of the main column as a row. Only one of the two shows at any width
  (globals.css). The page's script marks the section being read.
*/
type Layout = "column" | "row";

export function SectionLinks({ layout }: { layout: Layout }) {
  return (
    <nav
      className={`section-links section-links-${layout}`}
      aria-label="On this page"
    >
      {layout === "column" && (
        <p className="section-links-heading" aria-hidden="true">
          On this page
        </p>
      )}
      <ul>
        {sectionsInPageOrder.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} data-section-link={section.id}>
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
