import type { CSSProperties } from "react";
import { styles } from "@/components/about/v2/class-names";
import { site } from "@/lib/site";
import { hero } from "@/components/about/v2/words";

/*
  The first screen: the name across the galaxy's core, and the first words under it. Each letter carries how far it
  sits from the name's middle (--spread, from -1 to 1) and its place in the intro's order (--order, the middle
  first), so the stylesheet can settle the letters in the intro and part them as the reader scrolls on.
*/
function letterStyle(index: number, letterCount: number): CSSProperties {
  const middle = (letterCount - 1) / 2;
  return {
    "--spread": ((index - middle) / middle).toFixed(3),
    "--order": Math.round(Math.abs(index - middle)),
  } as CSSProperties;
}

function NameLetters() {
  const words = site.name.split(" ");
  const letterCount = words.join("").length;
  let index = 0;
  return words.map((word) => (
    <span key={word} className={styles.word} aria-hidden="true">
      {[...word].map((letter) => {
        const style = letterStyle(index++, letterCount);
        return (
          <span key={index} className={styles.letter} style={style}>
            {letter}
          </span>
        );
      })}
    </span>
  ));
}

export function HeroScene() {
  return (
    <section
      className={`${styles.scene} ${styles.sceneHero}`}
      data-sky-scene="hero"
    >
      <div className={`${styles.panel} ${styles.heroPanel}`} data-sky-panel="">
        <h1 className={styles.name} data-sky-name="" aria-label={site.name}>
          <NameLetters />
        </h1>
        <div
          className={styles.reader}
          data-sky-reader=""
          role="group"
          aria-label={hero.readerLabel}
        />
        <div className={styles.heroWords}>
          <p className={styles.bio}>{hero.bio}</p>
          <p className={styles.now}>{hero.now}</p>
          <p className={styles.explanation}>
            {hero.explanation}{" "}
            <span className={styles.touchHint}>{hero.touchHint}</span>
            <span className={styles.pointerHint}>{hero.pointerHint}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
