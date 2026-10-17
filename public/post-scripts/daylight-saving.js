/*
  The daylight saving post's moving parts (content/posts/daylight-saving.mdx).

  It runs on the post's own page and in the homepage's reader, and it may run more than once on the same page, so
  each run sets up only the parts no earlier run has touched. Everything it touches already works as plain HTML:
  this adds the reveals, the story deck's playback, the sun explorer and the noon slider.
*/
(() => {
  const POST_URL = "https://srafay.github.io/posts/daylight-saving/";
  const prefersLessMotion = matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ---------- Clock readings ---------- */

  /** The alarm the post assumes until the reader picks their own: 6 am, in minutes after midnight. */
  const DEFAULT_ALARM = 6 * 60;

  /** Minutes after midnight as a clock reading, e.g. 390 as "6:30 am". */
  function formatClock(minutesAfterMidnight) {
    const wrapped = ((Math.round(minutesAfterMidnight) % 1440) + 1440) % 1440;
    const hours = Math.floor(wrapped / 60);
    const minutes = wrapped % 60;
    const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${twelveHour}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "am" : "pm"}`;
  }

  /** Moves a number to a new value over a moment, instead of jumping, so a change is easy to follow. */
  function tweenNumber(element, target) {
    const from = Number(element.dataset.value ?? element.textContent) || 0;
    element.dataset.value = String(target);
    if (prefersLessMotion || from === target) {
      element.textContent = String(target);
      return;
    }
    const startedAt = performance.now();
    function step(now) {
      if (element.dataset.value !== String(target)) return; // a newer change took over
      const progress = Math.min(1, (now - startedAt) / 450);
      element.textContent = String(
        Math.round(from + (target - from) * (1 - Math.pow(1 - progress, 3))),
      );
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /** An alarm time as it reads in a sentence, e.g. "6 am" or "6:30 am". */
  const alarmWords = (minutes) => formatClock(minutes).replace(":00", "");

  /* ---------- Reveals ---------- */

  /** Marks each figure as seen when it scrolls into view, which starts its CSS animation, and counts its numbers up. */
  function revealFiguresOnView(post) {
    const figures = post.querySelectorAll("[data-reveal]");
    if (prefersLessMotion) {
      figures.forEach((figure) => figure.classList.add("is-seen"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-seen");
          entry.target.querySelectorAll("[data-count-to]").forEach(countUp);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    figures.forEach((figure) => observer.observe(figure));
  }

  /** Counts a number up from zero to the value it was rendered with. */
  function countUp(number) {
    const target = Number(number.dataset.countTo);
    const before = number.dataset.countBefore ?? "";
    const after = number.dataset.countAfter ?? "";
    const duration = 1100;
    const startedAt = performance.now();
    const easeOut = (progress) => 1 - Math.pow(1 - progress, 3);
    function step(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      number.textContent = `${before}${Math.round(target * easeOut(progress))}${after}`;
      if (progress < 1) requestAnimationFrame(step);
    }
    number.textContent = `${before}0${after}`;
    setTimeout(() => requestAnimationFrame(step), 350);
  }

  /* ---------- Quick or full ---------- */

  /** Switching length brings the reader back to the switch, so they start the new version at its top. */
  function followTheModeSwitch(post) {
    const bar = post.querySelector(".dst-bar");
    for (const radio of post.querySelectorAll('input[name="dst-length"]'))
      radio.addEventListener("change", () =>
        bar.scrollIntoView({
          block: "start",
          behavior: prefersLessMotion ? "auto" : "smooth",
        }),
      );
    // A card's "the evidence" link opens the full story at that card's section.
    post.addEventListener("click", (event) => {
      const link = event.target.closest(".dst-card-more");
      if (!link) return;
      event.preventDefault();
      post.querySelector("#dst-full").checked = true;
      const section = post.querySelector(link.getAttribute("href"));
      requestAnimationFrame(() =>
        section?.scrollIntoView({ block: "start", behavior: "smooth" }),
      );
    });
  }

  /* ---------- The story deck ---------- */

  function playStoryDeck(deck) {
    const track = deck.querySelector(".dst-deck-track");
    const cards = [...track.querySelectorAll(".dst-card")];
    const fills = [...deck.querySelectorAll(".dst-deck-progress i")];
    const cardNumber = deck.querySelector('[data-show="card"]');
    const backButton = deck.querySelector(".dst-deck-step.is-back");
    const nextButton = deck.querySelector(".dst-deck-step.is-next");
    const cardMilliseconds = Number(deck.dataset.cardMilliseconds) || 5500;
    const lastCard = cards.length - 1;
    let currentCard = 0;
    let elapsed = 0;
    let lastFrame = performance.now();
    let isOnScreen = false;
    let isPausedByReader = prefersLessMotion;
    let isHeld = false;

    /** Where the track scrolls to so a card sits at its left edge. */
    const scrollLeftOf = (position) =>
      cards[position].offsetLeft - cards[0].offsetLeft;

    /** The card nearest the track's left edge. */
    function cardAtScroll() {
      let nearest = 0;
      cards.forEach((card, position) => {
        if (
          Math.abs(scrollLeftOf(position) - track.scrollLeft) <
          Math.abs(scrollLeftOf(nearest) - track.scrollLeft)
        )
          nearest = position;
      });
      return nearest;
    }

    function showCurrent() {
      cards.forEach((card, position) => {
        card.classList.remove("is-current");
        if (position === currentCard) {
          void card.offsetWidth; // restarts the card's entrance animation
          card.classList.add("is-current");
        }
      });
      cardNumber.textContent = String(currentCard + 1);
      backButton.disabled = currentCard === 0;
      nextButton.disabled = currentCard === lastCard;
    }

    /** The reader has moved the deck themselves, so the hint and the nudge have done their job. */
    const noteTheReaderMoved = () => deck.classList.add("has-moved");

    function goTo(position, { byReader = true } = {}) {
      currentCard = Math.max(0, Math.min(lastCard, position));
      elapsed = 0;
      if (byReader) noteTheReaderMoved();
      track.scrollTo({
        left: scrollLeftOf(currentCard),
        behavior: prefersLessMotion ? "auto" : "smooth",
      });
      showCurrent();
    }

    function drawProgress() {
      fills.forEach((fill, position) => {
        const share =
          position < currentCard
            ? 1
            : position > currentCard
              ? 0
              : elapsed / cardMilliseconds;
        fill.style.setProperty("--fill", `${Math.min(1, share) * 100}%`);
      });
    }

    function setPaused(paused) {
      isPausedByReader = paused;
      deck.classList.toggle("is-paused", paused);
    }

    function frame(now) {
      if (!deck.isConnected) return;
      const sinceLastFrame = now - lastFrame;
      lastFrame = now;
      if (isOnScreen && !isPausedByReader && !isHeld) {
        elapsed += sinceLastFrame;
        if (elapsed >= cardMilliseconds) {
          if (currentCard < lastCard)
            goTo(currentCard + 1, { byReader: false });
          else {
            elapsed = cardMilliseconds;
            setPaused(true);
          }
        }
      }
      drawProgress();
      requestAnimationFrame(frame);
    }

    // A swipe lands on a card by itself (scroll snap); this notices which one.
    let settleTimer = 0;
    track.addEventListener("scroll", () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        const landedOn = cardAtScroll();
        if (landedOn === currentCard) return;
        currentCard = landedOn;
        elapsed = 0;
        noteTheReaderMoved();
        showCurrent();
      }, 120);
    });

    // With a mouse, the cards can be dragged like on a phone. A short press counts as a click.
    let drag = null;
    track.addEventListener("pointerdown", (event) => {
      isHeld = true;
      if (
        event.pointerType !== "mouse" ||
        event.target.closest("a, button, label, input")
      )
        return;
      drag = {
        startX: event.clientX,
        startScroll: track.scrollLeft,
        moved: false,
      };
    });
    addEventListener("pointermove", (event) => {
      if (!drag) return;
      const distance = event.clientX - drag.startX;
      if (Math.abs(distance) > 6 && !drag.moved) {
        drag.moved = true;
        track.classList.add("is-dragging");
      }
      if (drag.moved) track.scrollLeft = drag.startScroll - distance;
    });
    addEventListener("pointerup", (event) => {
      isHeld = false;
      if (!drag) return;
      const { moved, startX } = drag;
      drag = null;
      track.classList.remove("is-dragging");
      if (!moved) return;
      const distance = event.clientX - startX;
      track.dataset.justDragged = "";
      goTo(
        Math.abs(distance) > 50
          ? currentCard + (distance < 0 ? 1 : -1)
          : currentCard,
      );
    });
    track.addEventListener("pointercancel", () => (isHeld = false));

    // A tap on the left third goes back; anywhere else goes forward. Links and buttons keep their own job.
    track.addEventListener("click", (event) => {
      if ("justDragged" in track.dataset) {
        delete track.dataset.justDragged;
        return;
      }
      if (event.target.closest("a, button, label, input")) return;
      const box = track.getBoundingClientRect();
      goTo(
        event.clientX - box.left < box.width * 0.3
          ? currentCard - 1
          : currentCard + 1,
      );
    });
    track.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") goTo(currentCard + 1);
      else if (event.key === "ArrowLeft") goTo(currentCard - 1);
      else return;
      event.preventDefault();
    });
    backButton.addEventListener("click", () => goTo(currentCard - 1));
    nextButton.addEventListener("click", () => goTo(currentCard + 1));
    deck.querySelector(".dst-deck-pause").addEventListener("click", () => {
      if (
        isPausedByReader &&
        currentCard === lastCard &&
        elapsed >= cardMilliseconds
      )
        goTo(0);
      setPaused(!isPausedByReader);
    });

    new IntersectionObserver(([entry]) => (isOnScreen = entry.isIntersecting), {
      threshold: 0.6,
    }).observe(deck);
    setPaused(isPausedByReader);
    showCurrent();
    requestAnimationFrame(frame);
  }

  /* ---------- The sun explorer ---------- */

  const DEGREES = Math.PI / 180;
  const SUNRISE_ZENITH = 90.833; // the sun's upper edge on an ideal horizon, with refraction

  /** Sunrise and sunset in minutes after midnight UTC, from the NOAA solar position equations. */
  function sunriseAndSetInUtc(latitude, longitude, year, monthIndex, day) {
    const noonUtc = Date.UTC(year, monthIndex, day, 12);
    const julianCentury = (noonUtc / 86400000 + 2440587.5 - 2451545) / 36525;
    const meanLongitude =
      (280.46646 + julianCentury * (36000.76983 + julianCentury * 0.0003032)) %
      360;
    const meanAnomaly =
      357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury);
    const eccentricity =
      0.016708634 -
      julianCentury * (0.000042037 + 0.0000001267 * julianCentury);
    const equationOfCentre =
      Math.sin(meanAnomaly * DEGREES) *
        (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) +
      Math.sin(2 * meanAnomaly * DEGREES) *
        (0.019993 - 0.000101 * julianCentury) +
      Math.sin(3 * meanAnomaly * DEGREES) * 0.000289;
    const nutation = 125.04 - 1934.136 * julianCentury;
    const apparentLongitude =
      meanLongitude +
      equationOfCentre -
      0.00569 -
      0.00478 * Math.sin(nutation * DEGREES);
    const obliquity =
      23 +
      (26 +
        (21.448 -
          julianCentury *
            (46.815 + julianCentury * (0.00059 - julianCentury * 0.001813))) /
          60) /
        60 +
      0.00256 * Math.cos(nutation * DEGREES);
    const declination =
      Math.asin(
        Math.sin(obliquity * DEGREES) * Math.sin(apparentLongitude * DEGREES),
      ) / DEGREES;
    const obliquityTerm = Math.tan((obliquity / 2) * DEGREES) ** 2;
    const equationOfTime =
      (4 / DEGREES) *
      (obliquityTerm * Math.sin(2 * meanLongitude * DEGREES) -
        2 * eccentricity * Math.sin(meanAnomaly * DEGREES) +
        4 *
          eccentricity *
          obliquityTerm *
          Math.sin(meanAnomaly * DEGREES) *
          Math.cos(2 * meanLongitude * DEGREES) -
        0.5 *
          obliquityTerm *
          obliquityTerm *
          Math.sin(4 * meanLongitude * DEGREES) -
        1.25 *
          eccentricity *
          eccentricity *
          Math.sin(2 * meanAnomaly * DEGREES));
    const hourAngle =
      Math.acos(
        Math.cos(SUNRISE_ZENITH * DEGREES) /
          (Math.cos(latitude * DEGREES) * Math.cos(declination * DEGREES)) -
          Math.tan(latitude * DEGREES) * Math.tan(declination * DEGREES),
      ) / DEGREES;
    const solarNoon = 720 - 4 * longitude - equationOfTime;
    return {
      sunrise: solarNoon - 4 * hourAngle,
      sunset: solarNoon + 4 * hourAngle,
    };
  }

  /** The day of the month of the first Sunday, e.g. firstSunday(2026, 9) is 4, for 4 October. */
  function firstSunday(year, monthIndex) {
    const weekdayOfFirst = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
    return 1 + ((7 - weekdayOfFirst) % 7);
  }

  /** Whether the south-east's summer daylight saving applies on a date: first Sunday in October to first Sunday in April. */
  function isSummerSavingDay(date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const afterStart =
      month > 9 || (month === 9 && day >= firstSunday(year, 9));
    const beforeEnd = month < 3 || (month === 3 && day < firstSunday(year, 3));
    return afterStart || beforeEnd;
  }

  /** Minutes the clock is ahead of UTC on a date, under one of the three rules. */
  function clockOffset(city, rule, date) {
    if (rule === "always") return city.standardOffset + 60;
    if (rule === "summer" && isSummerSavingDay(date))
      return city.standardOffset + 60;
    return city.standardOffset;
  }

  const RULE_WORDS = {
    summer: "with daylight saving in summer",
    always: "with daylight saving all year",
    never: "with no daylight saving",
  };
  const EVENING_LIGHT_FROM = 19 * 60;

  /** A small icon for each share link, in the link's own colour. */
  const shareIcon = (drawing) =>
    `<svg class="dst-share-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${drawing}</svg>`;
  const SHARE_ICONS = {
    X: shareIcon(
      '<path d="M4 4h4.6L20 20h-4.6z" fill="currentColor" stroke="none"/><path d="M20 4l-6.8 7.4M10.8 12.6 4 20"/>',
    ),
    Facebook: shareIcon(
      '<path d="M14.5 8H17V4.5h-2.5A3.5 3.5 0 0 0 11 8v2.5H8.5V14H11v6.5h3.5V14H17l.5-3.5h-3V8z"/>',
    ),
    WhatsApp: shareIcon(
      '<path d="M4 20l1.3-4A8 8 0 1 1 8.5 19z"/><path d="M9 9.5c.4 2 2.5 4.6 5.5 5.3l1.2-1.3-1.8-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-1.8z"/>',
    ),
    Bluesky: shareIcon(
      '<path d="M12 11c-1.5-3-5-6-7-6-1 0-1.5.8-1.5 2 0 2 .6 4.5 2.5 5.2-2.4.6-2.3 3.3-.5 4.3 2.3 1.3 4.5-.8 6.5-4.5 2 3.7 4.2 5.8 6.5 4.5 1.8-1 1.9-3.7-.5-4.3 1.9-.7 2.5-3.2 2.5-5.2 0-1.2-.5-2-1.5-2-2 0-5.5 3-7 6z"/>',
    ),
    Email: shareIcon(
      '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    ),
  };

  function shareLinks(text) {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(POST_URL);
    const withUrl = encodeURIComponent(`${text} ${POST_URL}`);
    return [
      ["X", `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`],
      [
        "Facebook",
        `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      ],
      ["WhatsApp", `https://wa.me/?text=${withUrl}`],
      ["Bluesky", `https://bsky.app/intent/compose?text=${withUrl}`],
      [
        "Email",
        `mailto:?subject=${encodeURIComponent("Nobody asked us about daylight saving")}&body=${withUrl}`,
      ],
    ];
  }

  /*
    The explorer's calendar: twelve rows of months, one square per day. In the morning view a square is dark when
    the alarm rings more than 30 minutes before sunrise, twilight within 30 minutes of it, and light once the sun is
    up. In the evening view it asks the same of 7 pm and sunset. Counts follow the same lines: a dark morning is any
    morning the alarm beats the sun; a light evening is any evening the sun is still up at 7 pm.
  */
  const TWILIGHT_MINUTES = 30;
  const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const CALENDAR_LEGENDS = {
    mornings: [
      ["dark", "Dark when your alarm rings"],
      ["twilight", "Within 30 minutes of sunrise"],
      ["light", "Sun already up"],
    ],
    evenings: [
      ["dark", "Sun down before 7 pm"],
      ["twilight", "Sunset between 7 and 7:30 pm"],
      ["light", "Sun up past 7:30 pm"],
    ],
  };

  /** How light a morning is when the alarm rings. */
  function morningState(sunrise, alarm) {
    if (sunrise - alarm > TWILIGHT_MINUTES) return "dark";
    if (sunrise > alarm) return "twilight";
    return "light";
  }

  /** How light an evening is at 7 pm. */
  function eveningState(sunset) {
    if (sunset < EVENING_LIGHT_FROM) return "dark";
    if (sunset < EVENING_LIGHT_FROM + TWILIGHT_MINUTES) return "twilight";
    return "light";
  }

  function exploreTheSun(explorer) {
    explorer.classList.add("is-live");
    const citySelect = explorer.querySelector('[data-control="city"]');
    const alarmSlider = explorer.querySelector('[data-control="alarm"]');
    const ruleButtons = [...explorer.querySelectorAll("[data-rule]")];
    const viewButtons = [...explorer.querySelectorAll("[data-view]")];
    const calendar = explorer.querySelector('[data-show="calendar"]');
    const show = (name) => explorer.querySelector(`[data-show="${name}"]`);
    const year = new Date().getFullYear();
    const daysInYear =
      (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
    const today = Math.floor((Date.now() - Date.UTC(year, 0, 1)) / 86400000);
    const homeCity = readerCity();
    if (
      homeCity &&
      [...citySelect.options].some((option) => option.value === homeCity)
    )
      citySelect.value = homeCity;
    let chosenRule = null;
    let view = "mornings";
    let currentDays = [];
    const sunTimesByCity = new Map();

    const selectedCity = () => {
      const option = citySelect.selectedOptions[0];
      return {
        name: option.value,
        latitude: Number(option.dataset.latitude),
        longitude: Number(option.dataset.longitude),
        standardOffset: Number(option.dataset.standardOffset),
        ruleNow: option.dataset.summerSaving === "yes" ? "summer" : "never",
      };
    };
    const dateOfDay = (dayOfYear) => new Date(Date.UTC(year, 0, 1 + dayOfYear));

    /** The year's sunrises and sunsets in UTC, worked out once per city. */
    function sunTimesInUtc(city) {
      if (!sunTimesByCity.has(city.name)) {
        const days = [];
        for (let dayOfYear = 0; dayOfYear < daysInYear; dayOfYear++) {
          const date = dateOfDay(dayOfYear);
          days.push({
            date,
            ...sunriseAndSetInUtc(
              city.latitude,
              city.longitude,
              year,
              date.getUTCMonth(),
              date.getUTCDate(),
            ),
          });
        }
        sunTimesByCity.set(city.name, days);
      }
      return sunTimesByCity.get(city.name);
    }

    /** The year on the clock under one rule: each day's sunrise and sunset, in local minutes after midnight. */
    function yearOnTheClock(city, rule) {
      return sunTimesInUtc(city).map(({ date, sunrise, sunset }) => {
        const offset = clockOffset(city, rule, date);
        return {
          date,
          offset,
          sunrise: sunrise + offset,
          sunset: sunset + offset,
        };
      });
    }

    const countDarkMornings = (days, alarm) =>
      days.filter((day) => day.sunrise > alarm).length;
    const countLightEvenings = (days) =>
      days.filter((day) => day.sunset >= EVENING_LIGHT_FROM).length;

    // The calendar's squares are made once: twelve small months, a week to a row, starting on Monday.
    const squares = [];
    calendar.innerHTML = MONTH_NAMES.map((month, monthIndex) => {
      const daysInMonth = new Date(
        Date.UTC(year, monthIndex + 1, 0),
      ).getUTCDate();
      const blanksBeforeFirst =
        (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
      const blanks = '<span class="dst-day is-empty"></span>'.repeat(
        blanksBeforeFirst,
      );
      const days = Array.from({ length: daysInMonth }, (_, dayIndex) => {
        const dayOfYear =
          (Date.UTC(year, monthIndex, dayIndex + 1) - Date.UTC(year, 0, 1)) /
          86400000;
        return `<span class="dst-day${dayOfYear === today ? " is-today" : ""}" data-day="${dayOfYear}" style="--order:${dayOfYear}"></span>`;
      }).join("");
      return `<div class="dst-month"><p class="dst-month-name">${month}</p><div class="dst-month-days">${blanks}${days}</div></div>`;
    }).join("");
    calendar
      .querySelectorAll("[data-day]")
      .forEach((square) => (squares[Number(square.dataset.day)] = square));

    /** What one square says when it is pointed at or tapped. */
    function describeDay(dayOfYear) {
      const day = currentDays[dayOfYear];
      if (!day) return;
      const alarm = Number(alarmSlider.value);
      show("tip-date").textContent = day.date.toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      });
      if (view === "mornings") {
        const gap = Math.round(day.sunrise - alarm);
        const relation =
          gap > 0
            ? `Your alarm rings ${gap} minutes before sunrise.`
            : `The sun has been up for ${-gap} minutes when your alarm rings.`;
        show("tip").innerHTML =
          `Sunrise ${formatClock(day.sunrise)} · ${relation}`;
        show("scene").dataset.state = morningState(day.sunrise, alarm);
      } else {
        const gap = Math.round(day.sunset - EVENING_LIGHT_FROM);
        const relation =
          gap >= 0
            ? `The sun is still up for ${gap} minutes after 7 pm.`
            : `The sun set ${-gap} minutes before 7 pm.`;
        show("tip").innerHTML =
          `Sunset ${formatClock(day.sunset)} · ${relation}`;
        show("scene").dataset.state = eveningState(day.sunset);
      }
      squares.forEach((square, position) =>
        square.classList.toggle("is-picked", position === dayOfYear),
      );
    }
    calendar.addEventListener("pointerover", (event) => {
      const square = event.target.closest("[data-day]");
      if (square) describeDay(Number(square.dataset.day));
    });
    calendar.addEventListener("click", (event) => {
      const square = event.target.closest("[data-day]");
      if (square) describeDay(Number(square.dataset.day));
    });

    function update() {
      const city = selectedCity();
      const alarm = Number(alarmSlider.value);
      chosenRule ??= city.ruleNow;
      show("alarm").textContent = formatClock(alarm);

      for (const button of ruleButtons) {
        const days = yearOnTheClock(city, button.dataset.rule);
        tweenNumber(
          button.querySelector('[data-stat="dark"]'),
          countDarkMornings(days, alarm),
        );
        tweenNumber(
          button.querySelector('[data-stat="light"]'),
          countLightEvenings(days),
        );
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.rule === chosenRule),
        );
        button.classList.toggle("is-now", button.dataset.rule === city.ruleNow);
      }
      for (const button of viewButtons)
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.view === view),
        );

      currentDays = yearOnTheClock(city, chosenRule);
      const darkMornings = countDarkMornings(currentDays, alarm);
      const lightEvenings = countLightEvenings(currentDays);
      currentDays.forEach((day, position) => {
        const square = squares[position];
        if (!square) return;
        square.dataset.state =
          view === "mornings"
            ? morningState(day.sunrise, alarm)
            : eveningState(day.sunset);
        square.classList.toggle(
          "is-change",
          position > 0 && day.offset !== currentDays[position - 1].offset,
        );
      });
      calendar.setAttribute(
        "aria-label",
        view === "mornings"
          ? `A calendar of ${year}. ${darkMornings} mornings start before sunrise for a ${formatClock(alarm)} alarm.`
          : `A calendar of ${year}. ${lightEvenings} evenings are still light at 7 pm.`,
      );
      show("headline").innerHTML =
        view === "mornings"
          ? `<span class="dst-headline-badge is-dark" aria-hidden="true"></span><b>${darkMornings}</b> mornings start in the dark`
          : `<span class="dst-headline-badge is-light" aria-hidden="true"></span><b>${lightEvenings}</b> evenings are still light at 7 pm`;
      show("legend").innerHTML =
        CALENDAR_LEGENDS[view]
          .map(
            ([state, words]) =>
              `<span><i data-state="${state}"></i>${words}</span>`,
          )
          .join("") + `<span><i class="is-change-key"></i>Clocks change</span>`;
      show("sentence").innerHTML =
        `In ${city.name}, ${RULE_WORDS[chosenRule]}, a ${formatClock(alarm)} alarm goes off before sunrise on <b>${darkMornings} days</b> a year. The sun is still up at 7 pm on <b>${lightEvenings} evenings</b>.`;
      const shareText = `In ${city.name}, ${RULE_WORDS[chosenRule]}, my ${formatClock(alarm)} alarm would go off in the dark on ${darkMornings} days a year. Which would you choose? Nobody asked us.`;
      show("share").innerHTML = `<span>Share your result:</span>${shareLinks(
        shareText,
      )
        .map(
          ([name, href]) =>
            `<a href="${href}">${SHARE_ICONS[name] ?? ""}${name}</a>`,
        )
        .join("")}`;
      describeDay(Math.min(today, daysInYear - 1));
    }

    citySelect.addEventListener("change", () => {
      chosenRule = null;
      update();
    });
    alarmSlider.addEventListener("input", update);
    for (const button of ruleButtons)
      button.addEventListener("click", () => {
        chosenRule = button.dataset.rule;
        update();
      });
    for (const button of viewButtons)
      button.addEventListener("click", () => {
        view = button.dataset.view;
        update();
      });
    update();
  }

  /* ---------- Noon in Sydney ---------- */

  function slideNoonInSydney(figure) {
    figure.classList.add("is-live");
    const slider = figure.querySelector('input[type="range"]');
    const sydneyReading = figure.querySelector('[data-show="sydney"]');
    const zones = [...figure.querySelectorAll("[data-offset-from-sydney]")];
    function update() {
      const sydney = Number(slider.value);
      sydneyReading.textContent = formatClock(sydney);
      for (const zone of zones) {
        const reading = sydney + Number(zone.dataset.offsetFromSydney);
        zone.querySelector('[data-show="time"]').textContent = formatClock(
          reading,
        ).replace(" ", " ");
        zone.querySelector('[data-show="day"]').textContent =
          reading < 0 ? " · yesterday" : reading >= 1440 ? " · tomorrow" : "";
        const hour = Math.floor((((reading % 1440) + 1440) % 1440) / 60);
        zone.classList.toggle("is-night", hour < 6 || hour >= 21);
      }
    }
    slider.addEventListener("input", update);
    update();
  }

  /* ---------- Reading a date off the time-gap chart ---------- */

  function readTheGapChart(chart) {
    const left = Number(chart.dataset.left);
    const right = Number(chart.dataset.right);
    const width = Number(chart.dataset.width);
    const periodDays = Number(chart.dataset.periodDays);
    const gaps = JSON.parse(chart.dataset.gaps);
    const guide = chart.querySelector(".dst-steps-guide");
    const readout = chart.closest("figure").querySelector('[data-show="gap"]');
    const firstDay = Date.UTC(2026, 9, 1);
    let isReading = false;
    function readAt(event) {
      const box = chart.getBoundingClientRect();
      const inViewBox = ((event.clientX - box.left) / box.width) * width;
      const day = Math.round(
        Math.max(0, Math.min(1, (inViewBox - left) / (right - left))) *
          periodDays,
      );
      const [, aheadOfLondon, aheadOfNewYork] = gaps
        .filter(([fromDay]) => fromDay <= day)
        .at(-1);
      const x = left + (day / periodDays) * (right - left);
      guide.setAttribute("x1", x);
      guide.setAttribute("x2", x);
      chart.classList.add("is-reading");
      const date = new Date(firstDay + day * 86400000).toLocaleDateString(
        "en-AU",
        {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        },
      );
      readout.innerHTML = `On ${date}, Sydney is <b>${aheadOfLondon} hours</b> ahead of London and <b class="is-warm">${aheadOfNewYork} hours</b> ahead of New York.`;
    }
    chart.addEventListener("pointerdown", (event) => {
      isReading = true;
      chart.setPointerCapture(event.pointerId);
      readAt(event);
    });
    chart.addEventListener("pointermove", (event) => {
      if (isReading || event.pointerType === "mouse") readAt(event);
    });
    for (const release of ["pointerup", "pointercancel"])
      chart.addEventListener(release, () => (isReading = false));
  }

  /* ---------- Writing to your MP ----------
    "Write to your MP" and "Open it as an email" open a dialog: first the reader's state (guessed from their time
    zone) and name (optional), then the email, written with their state's own figures, to copy or to open in their
    email app. Without the script, those links go to the letter printed on the page, which has its own email link. */

  /** A state's capital over a year: mornings the default alarm beats the sun, and evenings still light at 7 pm, under the
   *  state's rule now and under the other rule (no daylight saving, or summer daylight saving). */
  function stateFigures(state) {
    const year = new Date().getFullYear();
    const now = { dark: 0, light: 0 };
    const other = { dark: 0, light: 0 };
    for (let day = 0; day < 365; day++) {
      const date = new Date(Date.UTC(year, 0, 1 + day, 12));
      const { sunrise, sunset } = sunriseAndSetInUtc(
        state.latitude,
        state.longitude,
        year,
        date.getUTCMonth(),
        date.getUTCDate(),
      );
      const summerHour = isSummerSavingDay(date) ? 60 : 0;
      const offsetNow =
        state.standardOffset + (state.usesSaving ? summerHour : 0);
      const offsetOther =
        state.standardOffset + (state.usesSaving ? 0 : summerHour);
      if (sunrise + offsetNow > DEFAULT_ALARM) now.dark++;
      if (sunset + offsetNow >= EVENING_LIGHT_FROM) now.light++;
      if (sunrise + offsetOther > DEFAULT_ALARM) other.dark++;
      if (sunset + offsetOther >= EVENING_LIGHT_FROM) other.light++;
    }
    return { now, other };
  }

  const capitalised = (words) => words.charAt(0).toUpperCase() + words.slice(1);

  /** The letter, for one state, signed with a name if there is one. */
  function letterFor(state, name) {
    const { now, other } = stateFigures(state);
    const paragraphs = ["Dear Member of Parliament,"];
    if (state.usesSaving) {
      paragraphs.push(
        "I live in your electorate. Every October the clocks go forward, and my household loses an hour of sleep.",
      );
      paragraphs.push(
        `In ${state.capital}, a ${alarmWords(DEFAULT_ALARM)} alarm now goes off before sunrise on ${now.dark} mornings a year. Without daylight saving, it would be ${other.dark}.` +
          (state.evidence ? ` ${state.evidence}` : ""),
      );
    } else {
      paragraphs.push(
        `I live in your electorate. ${capitalised(state.name)} does not use daylight saving, but the question keeps coming back.`,
      );
      paragraphs.push(
        `In ${state.capital}, daylight saving in summer would mean ${other.light - now.light} more evenings a year still light at 7 pm. It would also mean ${other.dark - now.dark} more mornings that start before a ${alarmWords(DEFAULT_ALARM)} alarm.`,
      );
    }
    paragraphs.push(
      `${state.voteHistory} I am not asking you to keep daylight saving or to scrap it. I am asking for a say.`,
    );
    paragraphs.push(
      `Please support one question on daylight saving at each ${state.kind} election, with the majority deciding for the next term.` +
        (state.nextElection
          ? ` The next one is on ${state.nextElection}.`
          : ""),
    );
    paragraphs.push(
      `If you would like the research behind this, for and against, it is collected here: ${POST_URL}`,
    );
    paragraphs.push(name ? `Yours sincerely,\n${name}` : "Yours sincerely");
    return paragraphs.join("\n\n");
  }

  /** The reader's state, from the time zone their browser reports, or NSW when it names none. */
  function readerState(states) {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return (
        states.find((state) => state.timeZones.includes(timeZone)) ?? states[0]
      );
    } catch {
      return states[0];
    }
  }

  function writeToYourMember(post) {
    const dialog = post.querySelector("[data-letter-dialog]");
    if (!dialog || typeof dialog.showModal !== "function") return;
    const states = JSON.parse(dialog.dataset.states);
    const nameStep = dialog.querySelector('[data-step="name"]');
    const letterStep = dialog.querySelector('[data-step="letter"]');
    const stateChoices = [...dialog.querySelectorAll('input[name="state"]')];
    /** The state the reader has picked in the dialog. */
    const pickedStateCode = () =>
      stateChoices.find((choice) => choice.checked)?.value;
    /** Ticks one state in the dialog's picker. */
    const pickState = (code) => {
      for (const choice of stateChoices) choice.checked = choice.value === code;
    };
    const nameInput = dialog.querySelector('input[name="name"]');
    const letterBox = dialog.querySelector('[data-show="letter"]');
    const mailtoLink = dialog.querySelector('[data-show="mailto"]');
    const membersLink = dialog.querySelector('[data-show="members"]');
    const status = dialog.querySelector('[data-show="status"]');
    const subject = dialog.dataset.subject;
    pickState(readerState(states).code);
    const pageLetter = post.querySelector('[data-show="page-letter"]');
    const pageLetterFor = post.querySelector('[data-show="page-letter-for"]');
    const pageMailto = post.querySelector(".dst-letter [data-letter-open]");

    /** Rewrites the letter printed on the page for one state, unsigned. */
    function showPageLetter(state) {
      if (!pageLetter) return;
      const letter = letterFor(state, "");
      pageLetter.replaceChildren(
        ...letter.split("\n\n").map((paragraph) => {
          const line = document.createElement("p");
          line.textContent = paragraph;
          return line;
        }),
      );
      pageLetterFor.innerHTML = `Written with ${state.capital}'s figures.<button type="button" data-letter-open="">Change state</button>`;
      pageLetterFor.closest(".dst-letter-for").hidden = false;
      if (pageMailto)
        pageMailto.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(letter)}`;
    }
    if (pageLetter) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          showPageLetter(
            states.find((state) => state.code === pickedStateCode()) ??
              states[0],
          );
        },
        { rootMargin: "600px 0px" },
      );
      observer.observe(pageLetter);
    }

    function showStep(step) {
      nameStep.hidden = step !== "name";
      letterStep.hidden = step !== "letter";
      status.textContent = "";
    }

    function open() {
      showStep("name");
      dialog.showModal();
      nameInput.focus();
    }

    function compose() {
      const state =
        states.find((candidate) => candidate.code === pickedStateCode()) ??
        states[0];
      const letter = letterFor(state, nameInput.value.trim());
      showPageLetter(state);
      letterBox.textContent = letter;
      mailtoLink.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(letter)}`;
      membersLink.href = state.membersPage;
      membersLink.textContent = `Find your MP in ${state.name}`;
      dialog.querySelector('[data-show="letter-title"]').textContent =
        `Your email, with ${state.capital}'s figures`;
      showStep("letter");
      dialog.querySelector('[data-action="copy"]').focus();
    }

    function copy() {
      const letter = letterBox.textContent;
      const selectInstead = () => {
        // Select the whole email, so the reader's own copy shortcut takes it.
        const selection = getSelection();
        const range = document.createRange();
        range.selectNodeContents(letterBox);
        selection.removeAllRanges();
        selection.addRange(range);
        status.textContent =
          "Selected. Press Ctrl+C, or Cmd+C on a Mac, to copy it.";
      };
      if (!navigator.clipboard) return selectInstead();
      navigator.clipboard
        .writeText(`Subject: ${subject}\n\n${letter}`)
        .then(
          () =>
            (status.textContent = "Copied. Paste it into an email to your MP."),
        )
        .catch(selectInstead);
    }

    // Every link to the letter opens the dialog instead, wherever it sits in the post.
    post.addEventListener("click", (event) => {
      const trigger = event.target.closest(
        '[data-letter-open], a[href="#dst-letter"]',
      );
      if (!trigger || dialog.contains(trigger)) return;
      event.preventDefault();
      open();
    });
    nameStep.addEventListener("submit", (event) => {
      event.preventDefault();
      compose();
    });
    dialog.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "close") dialog.close();
      else if (action === "copy") copy();
      else if (action === "back") showStep("name");
      else if (event.target === dialog) dialog.close(); // a click on the backdrop
    });
    // Escape closes the dialog only. The homepage's reader also listens for Escape, to close the whole post.
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") event.stopPropagation();
    });
  }

  /* ---------- Your clock ----------
    The reader's own time, from the time zone their browser reports. Nothing about them leaves the browser. Offsets
    come from the browser's time zone data (Intl), so any zone works; sunrise needs a place, so only the zones below
    get one. */

  const ZONE_PLACES = {
    "Australia/Sydney": {
      name: "Sydney",
      latitude: -33.8688,
      longitude: 151.2093,
    },
    "Australia/ACT": {
      name: "Canberra",
      latitude: -35.2809,
      longitude: 149.13,
    },
    "Australia/Canberra": {
      name: "Canberra",
      latitude: -35.2809,
      longitude: 149.13,
    },
    "Australia/Melbourne": {
      name: "Melbourne",
      latitude: -37.8136,
      longitude: 144.9631,
    },
    "Australia/Brisbane": {
      name: "Brisbane",
      latitude: -27.4678,
      longitude: 153.0281,
    },
    "Australia/Lindeman": {
      name: "the Whitsundays",
      latitude: -20.4457,
      longitude: 149.0427,
    },
    "Australia/Perth": {
      name: "Perth",
      latitude: -31.9523,
      longitude: 115.8613,
    },
    "Australia/Adelaide": {
      name: "Adelaide",
      latitude: -34.9285,
      longitude: 138.6007,
    },
    "Australia/Broken_Hill": {
      name: "Broken Hill",
      latitude: -31.9539,
      longitude: 141.4539,
    },
    "Australia/Hobart": {
      name: "Hobart",
      latitude: -42.8821,
      longitude: 147.3272,
    },
    "Australia/Darwin": {
      name: "Darwin",
      latitude: -12.4637,
      longitude: 130.8444,
    },
    "Australia/Lord_Howe": {
      name: "Lord Howe Island",
      latitude: -31.5553,
      longitude: 159.0821,
    },
    "Australia/Eucla": {
      name: "Eucla",
      latitude: -31.6773,
      longitude: 128.8836,
    },
    "Pacific/Auckland": {
      name: "Auckland",
      latitude: -36.8485,
      longitude: 174.7633,
    },
    "Europe/London": { name: "London", latitude: 51.5074, longitude: -0.1278 },
    "America/New_York": {
      name: "New York",
      latitude: 40.7128,
      longitude: -74.006,
    },
    "America/Los_Angeles": {
      name: "Los Angeles",
      latitude: 34.0522,
      longitude: -118.2437,
    },
  };

  /** Minutes a time zone is ahead of UTC at a moment, from the browser's own time zone data. */
  function offsetMinutesIn(timeZone, date) {
    const name = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName").value; // e.g. "GMT+11:00", or "GMT" for UTC itself
    const match = name.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (!match) return 0;
    const minutes = Number(match[2]) * 60 + Number(match[3]);
    return match[1] === "-" ? -minutes : minutes;
  }

  /** "an hour", "half an hour", or a number of minutes. */
  const durationWords = (minutes) =>
    minutes === 60
      ? "an hour"
      : minutes === 30
        ? "half an hour"
        : `${minutes} minutes`;

  /** A moment shown as the time a zone's clock reads, e.g. "3:42 pm". */
  const clockReadingIn = (timeZone, date) =>
    date
      .toLocaleTimeString("en-AU", {
        timeZone,
        hour: "numeric",
        minute: "2-digit",
      })
      .replace(/\s?([ap])m/i, " $1m")
      .toLowerCase();

  /** The next day this zone's clocks change, looking up to a year ahead, and which way they move. */
  function nextClockChange(timeZone, from) {
    const startOffset = offsetMinutesIn(timeZone, from);
    for (let day = 1; day <= 370; day++) {
      const date = new Date(from.getTime() + day * 86400000);
      const offset = offsetMinutesIn(timeZone, date);
      if (offset !== startOffset) {
        // Step back hour by hour to find the change itself, so the date shown is the day it happens.
        let moment = date;
        while (
          offsetMinutesIn(timeZone, new Date(moment.getTime() - 3600000)) ===
          offset
        )
          moment = new Date(moment.getTime() - 3600000);
        return {
          date: moment,
          minutes: Math.abs(offset - startOffset),
          forward: offset > startOffset,
        };
      }
    }
    return null;
  }

  /** The year's mornings for a place: how many start before a given alarm, by its real clock and by standard time. */
  function darkMorningsFor(place, timeZone, standardOffset, alarm) {
    const year = new Date().getFullYear();
    let withSaving = 0;
    let withoutSaving = 0;
    for (let day = 0; day < 365; day++) {
      const date = new Date(Date.UTC(year, 0, 1 + day, 12));
      const { sunrise } = sunriseAndSetInUtc(
        place.latitude,
        place.longitude,
        year,
        date.getUTCMonth(),
        date.getUTCDate(),
      );
      if (sunrise + offsetMinutesIn(timeZone, date) > alarm) withSaving++;
      if (sunrise + standardOffset > alarm) withoutSaving++;
    }
    return { withSaving, withoutSaving };
  }

  function showYourClock(panel) {
    let timeZone;
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return; // no time zone: the panel keeps its general sentence
    }
    if (!timeZone) return;
    const place = ZONE_PLACES[timeZone];
    const placeName =
      place?.name ?? timeZone.split("/").pop().replaceAll("_", " ");
    const year = new Date().getFullYear();
    const januaryOffset = offsetMinutesIn(
      timeZone,
      new Date(Date.UTC(year, 0, 15)),
    );
    const julyOffset = offsetMinutesIn(
      timeZone,
      new Date(Date.UTC(year, 6, 15)),
    );
    const standardOffset = Math.min(januaryOffset, julyOffset);
    const usesSaving = januaryOffset !== julyOffset;
    const show = (name) => panel.querySelector(`[data-show="${name}"]`);

    function render() {
      if (!panel.isConnected) return;
      const now = new Date();
      const offsetNow = offsetMinutesIn(timeZone, now);
      const savingNow = offsetNow - standardOffset;
      const withoutSaving = new Date(now.getTime() - savingNow * 60000);
      panel.classList.add("is-live");
      panel.classList.toggle("is-saving", savingNow > 0);
      show("where").textContent = `Your clock · ${placeName} time`;
      show("now").textContent = clockReadingIn(timeZone, now);
      show("standard").textContent =
        savingNow > 0
          ? clockReadingIn(timeZone, withoutSaving)
          : clockReadingIn(timeZone, now);

      if (savingNow > 0)
        show("line").textContent =
          `Your clock is ${durationWords(savingNow)} ahead of standard time. When your alarm rings at ${alarmWords(DEFAULT_ALARM)}, standard time says ${alarmWords(DEFAULT_ALARM - savingNow)}.`;
      else if (usesSaving)
        show("line").textContent =
          `${placeName} is on standard time right now, so your clock and standard time agree.`;
      else if (
        timeZone === "Australia/Brisbane" ||
        timeZone === "Australia/Lindeman"
      )
        show("line").textContent =
          offsetMinutesIn("Australia/Sydney", now) > 600
            ? "Queensland stays on standard time. Across the border in NSW, it is an hour later right now."
            : "Queensland stays on standard time all year.";
      else
        show("line").textContent =
          `${placeName} does not use daylight saving, so your clock and standard time always agree.`;

      const facts = [];
      const change = usesSaving ? nextClockChange(timeZone, now) : null;
      if (change) {
        const day = change.date.toLocaleDateString("en-AU", {
          timeZone,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        facts.push(
          change.forward
            ? `Your clocks go forward ${durationWords(change.minutes)} on ${day}. That night is ${durationWords(change.minutes)} shorter.`
            : `Your clocks go back ${durationWords(change.minutes)} on ${day}. That night is ${durationWords(change.minutes)} longer.`,
        );
      }
      if (usesSaving)
        facts.push(
          "On the first night after the spring change, people in a UK study slept 65 minutes less than the week before.",
        );
      if (place) {
        const today = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            12,
          ),
        );
        const { sunrise } = sunriseAndSetInUtc(
          place.latitude,
          place.longitude,
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
        );
        facts.push(
          savingNow > 0
            ? `Sunrise in ${placeName} today: ${formatClock(sunrise + offsetNow)} on your clock, ${formatClock(sunrise + standardOffset)} on standard time.`
            : `Sunrise in ${placeName} today: ${formatClock(sunrise + offsetNow)}.`,
        );
        if (usesSaving) {
          const mornings = darkMorningsFor(
            place,
            timeZone,
            standardOffset,
            DEFAULT_ALARM,
          );
          facts.push(
            `With a ${alarmWords(DEFAULT_ALARM)} alarm, ${mornings.withSaving} of your mornings this year start before sunrise. Without daylight saving, it would be ${mornings.withoutSaving}.`,
          );
          const shareText = `My ${alarmWords(DEFAULT_ALARM)} alarm in ${placeName} rings before sunrise on ${mornings.withSaving} days a year. Without daylight saving it would be ${mornings.withoutSaving}. Nobody asked us which we want.`;
          show("share").innerHTML = `<span>Share yours:</span>${shareLinks(
            shareText,
          )
            .map(
              ([name, href]) =>
                `<a href="${href}">${SHARE_ICONS[name] ?? ""}${name}</a>`,
            )
            .join("")}`;
        }
      }
      show("facts").innerHTML = facts
        .map((fact) => `<li>${fact}</li>`)
        .join("");
    }

    render();
    // The reading stays current while the page is open.
    const timer = setInterval(
      () => (panel.isConnected ? render() : clearInterval(timer)),
      30000,
    );
  }

  /** The explorer starts on the reader's own city, when their time zone names one it knows. */
  function readerCity() {
    try {
      return (
        ZONE_PLACES[Intl.DateTimeFormat().resolvedOptions().timeZone]?.name ??
        null
      );
    } catch {
      return null;
    }
  }

  /* ---------- Charts, drawn with Apache ECharts ----------
    ECharts is served from this site (/vendor/echarts.js) and fetched only when the first chart is about to scroll
    into view. Until then, and without it, each figure shows its HTML version. Colours and fonts come from the
    post's own tokens, so the charts follow the light and dark themes. */

  const ECHARTS_SOURCE = "/vendor/echarts.js";
  // Shared by every run of this script, so one theme watcher redraws charts from all of them.
  const drawnCharts = (window.__dstDrawnCharts ??= []);

  /** Loads ECharts once per page, however many times this script runs. */
  function loadECharts() {
    if (window.echarts) return Promise.resolve(window.echarts);
    let script = document.querySelector("script[data-echarts]");
    if (!script) {
      script = document.createElement("script");
      script.src = ECHARTS_SOURCE;
      script.async = true;
      script.dataset.echarts = "";
      document.head.append(script);
    }
    return new Promise((resolve, reject) => {
      script.addEventListener("load", () => resolve(window.echarts), {
        once: true,
      });
      script.addEventListener("error", reject, { once: true });
    });
  }

  /** The post's colours and fonts, as the browser has worked them out for the current theme. */
  function chartTheme(post) {
    const style = getComputedStyle(post);
    const token = (name) => style.getPropertyValue(name).trim();
    return {
      ink: token("--dst-ink"),
      dim: token("--dst-dim"),
      rule: token("--dst-rule"),
      ground: token("--dst-ground"),
      accent: token("--dst-accent"),
      warm: token("--dst-warm"),
      text: token("--dst-text"),
      display: token("--dst-display"),
      night: "#1d2550",
      daylight: "#f4d9a6",
      sun: "#f2a93b",
    };
  }

  /** The settings every chart shares: type, tooltips and the motion it enters with. */
  function baseOption(theme) {
    return {
      backgroundColor: "transparent",
      textStyle: { fontFamily: theme.text, color: theme.ink },
      animationDuration: prefersLessMotion ? 0 : 1100,
      animationEasing: "cubicOut",
      animationDurationUpdate: prefersLessMotion ? 0 : 500,
      tooltip: {
        backgroundColor: theme.ground,
        borderColor: theme.rule,
        borderWidth: 1,
        padding: [8, 12],
        extraCssText:
          "box-shadow: 0 8px 24px -12px rgba(0,0,0,.35); border-radius: 8px;",
        textStyle: { color: theme.ink, fontFamily: theme.text, fontSize: 13 },
      },
    };
  }

  const hairline = (theme) => ({ lineStyle: { color: theme.rule, width: 1 } });
  /** Charts narrower than this put each label above its bar, so the bars keep their room. */
  const COMPACT_BELOW = 520;
  /** A category label laid over the plot, just above its bar, for narrow charts. */
  const labelAboveBar = (formatter, rich) => ({
    inside: true,
    align: "left",
    verticalAlign: "bottom",
    padding: [0, 0, 11, 0],
    formatter,
    rich,
  });
  const valueAxisLabel = (theme, formatter) => ({
    color: theme.dim,
    fontSize: 11,
    formatter,
  });

  /** Stripes, for what was promised or imagined rather than measured. */
  const stripes = (color) => ({
    color,
    symbol: "rect",
    symbolSize: 1,
    dashArrayX: [1, 0],
    dashArrayY: [3, 4],
    rotation: -Math.PI / 4,
  });

  const CHART_BUILDERS = {
    /** Section 1: how much each risk rose after the spring change. */
    risks(risks, theme, { compact }) {
      const rich = {
        measure: {
          color: theme.ink,
          fontWeight: 600,
          fontSize: 12,
          lineHeight: 16,
        },
        where: { color: theme.dim, fontSize: 11, lineHeight: 15 },
      };
      return {
        ...baseOption(theme),
        grid: compact
          ? { left: 0, right: 92, top: 18, bottom: 24, containLabel: false }
          : { left: 8, right: 110, top: 8, bottom: 24, containLabel: true },
        xAxis: {
          type: "value",
          max: 30,
          interval: 10,
          splitLine: { lineStyle: { color: theme.rule, type: [2, 4] } },
          axisLabel: valueAxisLabel(theme, (value) =>
            value === 0 ? "0" : "+" + value + "%",
          ),
        },
        yAxis: {
          type: "category",
          inverse: true,
          data: risks.map((risk) => risk.measure),
          axisLine: hairline(theme),
          axisTick: { show: false },
          axisLabel: compact
            ? labelAboveBar(
                (_, position) =>
                  `{measure|${risks[position].measure}} {where|${risks[position].where}}`,
                rich,
              )
            : {
                formatter: (_, position) =>
                  `{measure|${risks[position].measure}}\n{where|${risks[position].where}}`,
                rich: {
                  measure: {
                    color: theme.ink,
                    fontWeight: 600,
                    fontSize: 12,
                    lineHeight: 16,
                  },
                  where: { color: theme.dim, fontSize: 11, lineHeight: 15 },
                },
              },
          z: 3,
        },
        tooltip: {
          ...baseOption(theme).tooltip,
          trigger: "item",
          formatter: ({ dataIndex }) => {
            const risk = risks[dataIndex];
            const change =
              risk.risePercent > 0
                ? `+${risk.risePercent}%`
                : "No change found";
            return `<b>${risk.measure}</b><br>${risk.where}<br>${risk.window}: <b>${change}</b>${risk.note ? `<br><span style="opacity:.7">${risk.note}</span>` : ""}`;
          },
        },
        series: [
          {
            type: "bar",
            barWidth: compact ? 10 : 14,
            data: risks.map((risk) => ({
              value: risk.risePercent,
              itemStyle: {
                color: risk.australian ? theme.warm : theme.accent,
                borderRadius: [0, 3, 3, 0],
              },
            })),
            label: {
              show: true,
              position: "right",
              color: theme.ink,
              fontWeight: 600,
              formatter: ({ value }) =>
                value > 0 ? `+${value}%` : "No change found",
            },
            animationDelay: (position) => position * 110,
          },
        ],
      };
    },

    /** Section 3: every statewide referendum, yes against no. */
    referendums(votes, theme) {
      const categories = votes.map((vote) => `${vote.place}, ${vote.date}`);
      const share = (value) => `${value.toFixed(1)}%`;
      return {
        ...baseOption(theme),
        grid: { left: 8, right: 16, top: 8, bottom: 24, containLabel: true },
        xAxis: {
          type: "value",
          max: 100,
          interval: 50,
          splitLine: { show: false },
          axisLabel: valueAxisLabel(theme, "{value}%"),
        },
        yAxis: {
          type: "category",
          inverse: true,
          data: categories,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            formatter: (_, position) =>
              `{place|${votes[position].place}}\n{date|${votes[position].date}}`,
            rich: {
              place: {
                color: theme.ink,
                fontWeight: 600,
                fontSize: 12,
                lineHeight: 16,
              },
              date: { color: theme.dim, fontSize: 11 },
            },
          },
        },
        tooltip: {
          ...baseOption(theme).tooltip,
          trigger: "axis",
          axisPointer: {
            type: "shadow",
            shadowStyle: { color: "rgba(127,127,127,.08)" },
          },
          formatter: ([yes]) => {
            const vote = votes[yes.dataIndex];
            return `<b>${vote.place}</b>, ${vote.date}<br>Yes ${share(vote.yesPercent)} · No ${share(100 - vote.yesPercent)}<br><b>${vote.yesPercent > 50 ? "Kept" : "Rejected"}</b>`;
          },
        },
        series: [
          {
            name: "Yes",
            type: "bar",
            stack: "vote",
            barWidth: 20,
            data: votes.map((vote) => vote.yesPercent),
            itemStyle: { color: theme.accent, borderRadius: [3, 0, 0, 3] },
            label: {
              show: true,
              position: "insideLeft",
              color: theme.ground,
              fontWeight: 600,
              formatter: ({ value }) => `Yes ${share(value)}`,
            },
            markLine: {
              silent: true,
              symbol: "none",
              lineStyle: { color: theme.ink, type: [3, 3], width: 1 },
              label: { show: false },
              data: [{ xAxis: 50 }],
            },
            animationDelay: (position) => position * 120,
          },
          {
            name: "No",
            type: "bar",
            stack: "vote",
            data: votes.map((vote) => 100 - vote.yesPercent),
            itemStyle: {
              color: theme.warm,
              opacity: 0.75,
              borderRadius: [0, 3, 3, 0],
            },
            label: {
              show: true,
              position: "insideRight",
              color: theme.ground,
              fontWeight: 600,
              formatter: ({ value }) => `No ${share(value)}`,
            },
            animationDelay: (position) => position * 120 + 300,
          },
        ],
      };
    },

    /** Section 4: promised savings against measured ones. */
    energy(changes, theme, { compact }) {
      const victoria = changes.find((change) => change.standardError);
      const rich = {
        // A backing, so the zero line does not run through the words.
        label: {
          color: theme.ink,
          fontWeight: 600,
          fontSize: 12,
          lineHeight: 16,
          backgroundColor: theme.ground,
          padding: [1, 4],
        },
        basis: { color: theme.dim, fontSize: 11 },
      };
      return {
        ...baseOption(theme),
        aria: { enabled: true, decal: { show: false } },
        grid: compact
          ? { left: 0, right: 0, top: 18, bottom: 40, containLabel: false }
          : { left: 8, right: 56, top: 8, bottom: 30, containLabel: true },
        xAxis: {
          type: "value",
          min: -1.2,
          max: 1.2,
          interval: compact ? 1.2 : 0.6,
          splitLine: { lineStyle: { color: theme.rule, type: [2, 4] } },
          axisLabel: valueAxisLabel(theme, (value) =>
            value === 0 ? "0" : `${value > 0 ? "+" : ""}${value}%`,
          ),
          name: "← saves power      costs power →",
          nameLocation: "middle",
          nameGap: 24,
          nameTextStyle: { color: theme.dim, fontSize: 11 },
        },
        yAxis: {
          type: "category",
          inverse: true,
          data: changes.map((change) => change.label),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: compact
            ? labelAboveBar(
                (_, position) => `{label|${changes[position].label}}`,
                rich,
              )
            : {
                formatter: (_, position) =>
                  `{label|${changes[position].label}}\n{basis|${changes[position].kind}, ${changes[position].basis}}`,
                rich: {
                  label: {
                    color: theme.ink,
                    fontWeight: 600,
                    fontSize: 12,
                    lineHeight: 16,
                  },
                  basis: { color: theme.dim, fontSize: 11 },
                },
              },
          z: 3,
        },
        tooltip: {
          ...baseOption(theme).tooltip,
          trigger: "item",
          formatter: ({ dataIndex }) => {
            const change = changes[dataIndex];
            const error = change.standardError
              ? `<br>Margin of error ±${change.standardError}%: too small to tell from zero`
              : "";
            return `<b>${change.label}</b><br>${change.kind === "promised" ? "Promised" : "Measured"}: <b>${change.changePercent > 0 ? "+" : ""}${change.changePercent}%</b> ${change.basis}${error}`;
          },
        },
        series: [
          {
            type: "bar",
            barWidth: 14,
            data: changes.map((change) => ({
              value: change.changePercent,
              label: change.standardError ? { distance: 46 } : undefined,
              itemStyle:
                change.kind === "promised"
                  ? {
                      color: "transparent",
                      borderColor: theme.dim,
                      borderWidth: 1,
                      decal: stripes(theme.dim),
                    }
                  : {
                      color:
                        change.changePercent < 0 ? theme.accent : theme.warm,
                      borderRadius:
                        change.changePercent < 0 ? [4, 0, 0, 4] : [0, 4, 4, 0],
                    },
            })),
            label: {
              show: true,
              position: "right",
              color: theme.ink,
              fontWeight: 600,
              formatter: ({ value }) => `${value > 0 ? "+" : ""}${value}%`,
            },
            markLine: {
              silent: true,
              symbol: ["none", "none"],
              animation: false,
              lineStyle: { color: theme.ink, width: 1.2, type: [4, 3] },
              label: { show: false },
              data: [
                [
                  { coord: [0, 0], symbol: "none" },
                  { coord: [0, changes.length - 1], symbol: "none" },
                ],
                [
                  {
                    coord: [
                      victoria.changePercent - victoria.standardError,
                      victoria.label,
                    ],
                  },
                  {
                    coord: [
                      victoria.changePercent + victoria.standardError,
                      victoria.label,
                    ],
                  },
                ],
              ],
            },
            animationDelay: (position) => position * 120,
          },
        ],
      };
    },

    /** Section 7: midsummer daylight on the clock. */
    midsummer(days, theme, { compact }) {
      const rich = {
        city: {
          color: theme.ink,
          fontWeight: 600,
          fontSize: 12,
          lineHeight: 16,
        },
        clock: { color: theme.dim, fontSize: 11 },
      };
      return {
        ...baseOption(theme),
        aria: { enabled: true, decal: { show: false } },
        grid: compact
          ? { left: 0, right: 8, top: 18, bottom: 24, containLabel: false }
          : { left: 8, right: 16, top: 8, bottom: 24, containLabel: true },
        xAxis: {
          type: "value",
          min: 4 * 60,
          max: 21 * 60,
          interval: 180,
          splitLine: { lineStyle: { color: theme.rule, type: [2, 4] } },
          axisLabel: valueAxisLabel(theme, (minutes) =>
            formatClock(minutes).replace(":00", ""),
          ),
        },
        yAxis: {
          type: "category",
          inverse: true,
          data: days.map((day) => `${day.city} ${day.clockName}`),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: compact
            ? labelAboveBar(
                (_, position) =>
                  `{city|${days[position].city}} {clock|${days[position].clockName}}`,
                rich,
              )
            : {
                formatter: (_, position) =>
                  `{city|${days[position].city}}\n{clock|${days[position].clockName}}`,
                rich: {
                  city: {
                    color: theme.ink,
                    fontWeight: 600,
                    fontSize: 12,
                    lineHeight: 16,
                  },
                  clock: { color: theme.dim, fontSize: 11 },
                },
              },
        },
        tooltip: {
          ...baseOption(theme).tooltip,
          trigger: "item",
          formatter: ({ dataIndex }) => {
            const day = days[dataIndex];
            return `<b>${day.city}</b>, ${day.clockName}<br>Sunrise ${formatClock(day.sunrise)}<br>Sunset ${formatClock(day.sunset)}`;
          },
        },
        series: [
          {
            type: "bar",
            stack: "day",
            silent: true,
            itemStyle: { color: "transparent" },
            data: days.map((day) => day.sunrise),
            barWidth: 16,
          },
          {
            type: "bar",
            stack: "day",
            data: days.map((day) => ({
              value: day.sunset - day.sunrise,
              itemStyle: day.hypothetical
                ? {
                    color: "transparent",
                    borderColor: theme.accent,
                    borderWidth: 1,
                    decal: stripes(theme.accent),
                    borderRadius: 3,
                  }
                : {
                    color: theme.daylight,
                    borderColor: theme.sun,
                    borderWidth: 1,
                    borderRadius: 3,
                  },
            })),
            label: {
              show: true,
              position: "insideRight",
              color: theme.ink,
              fontSize: 11,
              backgroundColor: theme.ground,
              padding: [2, 5],
              borderRadius: 3,
              formatter: ({ dataIndex }) =>
                `sunset ${formatClock(days[dataIndex].sunset)}`,
            },
            animationDelay: (position) => position * 120,
          },
        ],
      };
    },

    /** Section 9: how far ahead Sydney is of London and New York. */
    gaps({ firstDay, periodDays, gaps }, theme) {
      const start = Date.parse(`${firstDay}T00:00:00Z`);
      const dateOf = (day) => start + day * 86400000;
      const steps = (hoursAhead) => [
        ...gaps.map((gap) => [dateOf(gap.dayOfPeriod), hoursAhead(gap)]),
        [dateOf(periodDays), hoursAhead(gaps[gaps.length - 1])],
      ];
      const line = (name, color, hoursAhead) => ({
        name,
        type: "line",
        step: "end",
        symbol: "circle",
        symbolSize: 6,
        showSymbol: true,
        lineStyle: { color, width: 2.5 },
        itemStyle: { color },
        endLabel: { show: true, formatter: "{a}", color, fontWeight: 600 },
        data: steps(hoursAhead),
      });
      const today = Date.UTC(2026, 9, 12);
      return {
        ...baseOption(theme),
        animationDuration: prefersLessMotion ? 0 : 2200,
        grid: { left: 8, right: 84, top: 16, bottom: 24, containLabel: true },
        xAxis: {
          type: "time",
          min: start,
          max: dateOf(periodDays),
          axisLine: hairline(theme),
          splitLine: { show: false },
          axisLabel: { color: theme.dim, fontSize: 11, formatter: "{MMM}" },
        },
        yAxis: {
          type: "value",
          min: 8,
          max: 17,
          interval: 1,
          splitLine: { lineStyle: { color: theme.rule, type: [2, 4] } },
          axisLabel: valueAxisLabel(theme, (hours) =>
            [9, 10, 11, 14, 15, 16].includes(hours) ? `${hours} h` : "",
          ),
        },
        tooltip: {
          ...baseOption(theme).tooltip,
          trigger: "axis",
          axisPointer: {
            type: "line",
            lineStyle: { color: theme.dim, type: [3, 3] },
          },
          formatter: (points) => {
            const date = new Date(points[0].axisValue).toLocaleDateString(
              "en-AU",
              {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              },
            );
            return `<b>${date}</b><br>${points.map((point) => `${point.marker} ${point.seriesName}: <b>${point.value[1]} hours</b> behind Sydney`).join("<br>")}`;
          },
        },
        series: [
          {
            ...line("London", theme.accent, (gap) => gap.aheadOfLondon),
            markLine: {
              silent: true,
              symbol: "none",
              lineStyle: { color: theme.ink, type: [3, 3], width: 1 },
              label: {
                formatter: "Today",
                color: theme.dim,
                fontSize: 11,
                position: "end",
              },
              data: [{ xAxis: today }],
            },
          },
          line("New York", theme.warm, (gap) => gap.aheadOfNewYork),
        ],
      };
    },
  };

  /** Draws one figure's chart with ECharts, then lets its HTML version step aside. */
  async function drawChart(container, post) {
    const echarts = await loadECharts();
    const { kind, data } = JSON.parse(container.dataset.chart);
    const build = CHART_BUILDERS[kind];
    if (!build) return;
    const figure = container.closest("figure");
    figure.classList.add("is-charted"); // shows the container, so ECharts can measure it
    const chart = echarts.init(container, null, { renderer: "svg" });
    const layout = () => ({ compact: container.clientWidth < COMPACT_BELOW });
    let wasCompact = layout().compact;
    chart.setOption(build(data, chartTheme(post), layout()));
    const redraw = () =>
      chart.setOption(build(data, chartTheme(post), layout()), {
        notMerge: true,
      });
    drawnCharts.push({ chart, redraw });
    new ResizeObserver(() => {
      chart.resize();
      if (layout().compact !== wasCompact) {
        wasCompact = layout().compact;
        redraw();
      }
    }).observe(container);
  }

  /** Each chart is drawn when it is about to come into view, so ECharts loads only for readers who reach one. */
  function drawChartsNearView(post) {
    const containers = post.querySelectorAll(".dst-echart[data-chart]");
    if (!containers.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          const container = entry.target.querySelector(".dst-echart");
          drawChart(container, post).catch(() =>
            entry.target.classList.remove("is-charted"),
          ); // the HTML version stays
        }
      },
      { rootMargin: "400px 0px" },
    );
    // The figure is watched, not the chart container, which stays hidden until its chart is drawn.
    containers.forEach((container) =>
      observer.observe(container.closest("figure")),
    );
  }

  /** When the reader switches between light and dark, every chart redraws in the new colours. */
  function redrawChartsOnThemeChange() {
    if (window.__dstWatchingTheme) return;
    window.__dstWatchingTheme = true;
    const redrawAll = () =>
      requestAnimationFrame(() =>
        window.__dstDrawnCharts.forEach(({ chart, redraw }) => {
          if (!chart.isDisposed() && chart.getDom().isConnected) redraw();
        }),
      );
    new MutationObserver(redrawAll).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-mode", "class"],
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener(
      "change",
      redrawAll,
    );
  }

  /* ---------- Set up every post on the page that no earlier run has touched ---------- */

  for (const post of document.querySelectorAll(".dst:not([data-enhanced])")) {
    post.dataset.enhanced = "";
    post.classList.add("is-enhanced");
    revealFiguresOnView(post);
    followTheModeSwitch(post);
    post.querySelectorAll("[data-story-deck]").forEach(playStoryDeck);
    post.querySelectorAll("[data-sun-explorer]").forEach(exploreTheSun);
    post.querySelectorAll("[data-noon-slider]").forEach(slideNoonInSydney);
    post.querySelectorAll("[data-gap-chart]").forEach(readTheGapChart);
    drawChartsNearView(post);
    post.querySelectorAll("[data-your-clock]").forEach(showYourClock);
    writeToYourMember(post);
    redrawChartsOnThemeChange();
  }
})();
