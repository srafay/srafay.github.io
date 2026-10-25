import { styles } from "@/components/about/v2/class-names";
import { CareerScene } from "@/components/about/v2/career-scene";
import {
  CodeScene,
  ElsewhereScene,
  ToolsScene,
} from "@/components/about/v2/closing-scenes";
import { GalaxyDrawing } from "@/components/about/v2/galaxy-drawing";
import { HeroScene } from "@/components/about/v2/hero-scene";
import { year } from "@/components/about/v2/words";
import { YearScene } from "@/components/about/v2/year-scene";

/*
  Version 2's sky and its six scenes, in reading order. The stage comes first: the canvas the script draws on, the
  drawn galaxy a reader without the script sees, the grain, and the two labels that belong to the sky itself (the
  busiest day's name and the card a tapped day shows).

  The one inline script marks the page as waiting for the sky's script, as the HTML is read, so the first screen's
  words wait unseen for the intro instead of showing and then hiding. Without scripts it never runs, and the page
  stays a plain column of words.
*/
const MARK_AS_WAITING =
  'document.currentScript.parentElement.dataset.skyState="waiting"';

function Stage() {
  return (
    <div className={styles.stage} data-sky-stage="">
      <GalaxyDrawing />
      <canvas className={styles.canvas} data-sky-canvas="" aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      <p
        className={`${styles.label} ${styles.busiest}`}
        data-sky-anchor="busiest"
        aria-hidden="true"
      >
        <span className={styles.labelBody}>
          <span className={styles.labelName}>{year.busiestDay}</span>
          <span className={styles.labelLine}>
            The busiest day: {year.busiestCount}
          </span>
        </span>
      </p>
      <div
        className={styles.dayCard}
        data-sky-day-card=""
        aria-live="polite"
        hidden
      >
        <p className={styles.dayDate} data-sky-day-date="" />
        <p className={styles.dayCount} data-sky-day-count="" />
      </div>
    </div>
  );
}

export function NightSky() {
  return (
    <div className={styles.sky} data-sky-root="">
      <script dangerouslySetInnerHTML={{ __html: MARK_AS_WAITING }} />
      <Stage />
      <HeroScene />
      <YearScene />
      <CareerScene />
      <CodeScene />
      <ToolsScene />
      <ElsewhereScene />
    </div>
  );
}
