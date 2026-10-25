import {
  rulerBars,
  rulerCities,
  rulerYears,
  type RulerBar,
} from "@/lib/about/ruler";

/*
  A thin ruler of the years over the timeline (lib/about/ruler.ts): a bar for each role at its place and length, the
  current one filled, and under the bars the cities. Each bar is a link to its role below, so the ruler works as a
  picture and as a way in with no script at all. The page's script adds a label over a bar when it is pointed at,
  focused or tapped, and lights its role.

  Built as HTML rather than SVG: a link inside SVG shows its focus ring unreliably in WebKit, and placing everything
  by percentage lets the ruler fit any column with no script.
*/
// A bar shorter than this share of the ruler is narrower than a fingertip on a phone, so its wider target lies on top.
const SHORT_BAR_SHARE = 6;

function barClass(bar: RulerBar) {
  const classes = [
    bar.isCurrent && "is-current",
    bar.width < SHORT_BAR_SHARE && "is-short",
  ].filter(Boolean);
  return classes.length > 0 ? classes.join(" ") : undefined;
}

const at = (left: number) => ({ left: `${left}%` });
const across = (left: number, width: number) => ({
  left: `${left}%`,
  width: `${width}%`,
});

export function YearRuler() {
  return (
    <div className="ruler" data-ruler="">
      <ol className="ruler-bars" aria-label="Each role on a line of years">
        {rulerBars().map((bar) => (
          <li
            key={bar.key}
            className={barClass(bar)}
            style={across(bar.left, bar.width)}
          >
            <a href={`#${bar.anchor}`} data-role={bar.key}>
              <span className="sr-only">{bar.name}</span>
            </a>
          </li>
        ))}
      </ol>
      <div className="ruler-cities" aria-hidden="true">
        {rulerCities().map((city) => (
          <span key={city.name} style={across(city.left, city.width)}>
            {city.name}
          </span>
        ))}
      </div>
      <div className="ruler-years" aria-hidden="true">
        {rulerYears().map((mark) => (
          <span key={mark.year} style={at(mark.left)}>
            {mark.year}
          </span>
        ))}
      </div>
    </div>
  );
}
