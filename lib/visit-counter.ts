import { site } from "@/lib/site";

/*
  Visits are counted with GoatCounter (https://www.goatcounter.com/help/js). Every page carries the script below, at
  its end (in the head of the homepage, which is a template with no end of its own), except the sky page, which is only
  ever seen inside a post's frame. Earth's post counts itself the same way, from its own script in the cosmos repo, once
  its globe's first imagery is in.

  Nothing may slow a page for it. GoatCounter's script (about 3 KB) is added only after the page has loaded, then a
  couple of seconds later at a quiet moment, and it counts the page in one small request. It runs on the live site
  only, so a visit to a copy on this computer or on the home network never counts. GoatCounter's own script skips
  local addresses too.
*/
export const visitCounter = {
  endpoint: "https://srafay.goatcounter.com/count",
  script: "https://gc.zgo.at/count.js",
  liveHost: new URL(site.url).hostname,
};

const WAIT_AFTER_LOAD_MILLISECONDS = 2000;
const LONGEST_IDLE_WAIT_MILLISECONDS = 3000;

/** The inline script that adds GoatCounter's script to a page, late. */
export const visitCounterScript = `(() => {
  const isLiveSite = () => location.hostname === ${JSON.stringify(visitCounter.liveHost)};
  function addCounter() {
    const counter = document.createElement("script");
    counter.async = true;
    counter.fetchPriority = "low";
    counter.src = ${JSON.stringify(visitCounter.script)};
    counter.dataset.goatcounter = ${JSON.stringify(visitCounter.endpoint)};
    document.head.append(counter);
  }
  const atQuietMoment = () =>
    window.requestIdleCallback ? requestIdleCallback(addCounter, { timeout: ${LONGEST_IDLE_WAIT_MILLISECONDS} }) : addCounter();
  const afterLoad = () => setTimeout(atQuietMoment, ${WAIT_AFTER_LOAD_MILLISECONDS});
  if (!isLiveSite()) return;
  if (document.readyState === "complete") afterLoad();
  else addEventListener("load", afterLoad, { once: true });
})();`;
