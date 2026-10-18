# Daylight saving post: brief for section writers

The post is about daylight saving time: its pros and cons, written for **Australian readers**, with the rest of the
world as context. It will be published on Syed Rafay's personal site (srafay.github.io). The author lives in Australia
and is a software engineer.

Today is **Sunday 11 October 2026**. Daylight saving began in NSW, Victoria, the ACT, Tasmania and South Australia on
Sunday 4 October 2026 and ends on Sunday 4 April 2027 (confirm these dates if your section uses them).

The post has two modes the reader can switch between:

- **Short**: a summary and one picture or graph per section.
- **Long**: everything.

So every section is written in both forms.

## The sections (each is written by a different writer: stay inside yours)

1. **The Monday after**: what losing an hour does to sleep, hearts, road crashes and work injuries in the days after the spring change.
2. **How it started**: Franklin's 1784 satire, George Hudson (1895), William Willett (1907), Germany 1916, Australia's First and Second World War use, Tasmania 1967, the other states from 1971.
3. **Who fought it**: Queensland (dropped, trialled 1989 to 1992, 1992 referendum), Western Australia's trials and referendums, the famous arguments (faded curtains, confused cows). Overseas: the US repeal in 1919, Russia's reversal in 2014.
4. **Does it save energy?**: the original reason, tested. Especially the Sydney 2000 Olympics extension in NSW and Victoria, and other measured studies.
5. **The case for it**: the real benefits. Evening light, sport, beach, tourism and hospitality, fewer evening crashes or crimes.
6. **Your body clock against the wall clock**: circadian rhythm, social jet lag, dark mornings, why sleep scientists prefer standard time.
7. **Should Queensland and WA join?**: Australia's live debate. Includes the south-east Queensland split time zone idea. Sunrise and sunset in Brisbane, Perth, Sydney and Hobart with and without daylight saving.
8. **Australia's clock is a mess**: three zones in winter, five in summer. Coolangatta and Tweed Heads, Broken Hill on South Australian time, Lord Howe Island's 30-minute shift, Eucla's unofficial time.
9. **The hour computers hate**: skipped and repeated hours, broken alarms and scheduled jobs, why programmers store UTC, the volunteer-run tz database. Southern hemisphere twist: Australia changes the opposite way to the US and Europe on different dates, so the gaps to London and New York move through the year.
10. **Where it stands now**: in Australia each state decides. Overseas: the US House passed the Sunshine Protection Act (H.R. 139) on 14 July 2026, 308 to 117, and it waits in the Senate. The EU has been stalled since 2019, with a Commission study due by the end of 2026. Also the practical tips for getting through each change.

## Research rules

- **Every fact must come from a source you actually found and read** with web search or fetch. Nothing from memory alone.
  Prefer government sites, peer-reviewed studies, parliamentary records, national archives, the Bureau of Meteorology,
  Geoscience Australia, reputable news.
- **Never invent a URL, a study, a quote, a number or a date.** If you cannot confirm something, leave it out of the
  text and list it under "Could not confirm".
- **Never invent anything about the author** (no made-up anecdotes, feelings or experiences). Write in a neutral
  first person only where it reads naturally, e.g. "I wanted to know whether...". The author will add personal detail.
- Where Australian data does not exist, use international data and say plainly where it comes from.
- Note when something is disputed, and give both sides.

## Writing rules

Read `AGENTS.md` at the repo root, the sections **"Writing posts"**, **"Voice rules"** and **"Self-review every draft
before saving it"**, and follow them exactly. The hard ones, in short:

- No em dashes or en dashes. No semicolons joining clauses. **No contractions** ("it is", not "it's").
- Sentences under about 25 words. One claim per sentence.
- Show, do not judge: give the number or example instead of "huge", "amazing", "great".
- No idioms or stock phrases. Humble and conversational, not a sales pitch.
- **Australian English spelling**: colour, centre, organise, metre, programme (but "program" for software).
- Lead with the most interesting thing in your section.

Before saving, run the self-review checklist on your file, including searching it for `—`, `–`, `;` and `'` (every
apostrophe must be a possessive, not a contraction).

## Output

Write **one file**: `drafts/daylight-saving/NN-slug.md` (your section number and slug are given to you). Edit no other
file. Use exactly this layout:

```markdown
# NN. Section title

## Short

Two to four sentences, at most 80 words. The heart of the section.

### Visual

- **Type:** bar chart, line chart, timeline, map, diagram or photo.
- **Title and caption:** as they would appear on the page.
- **Data:** a markdown table with every value the chart needs, and the source of each value.
- **Notes for drawing it:** axes, units, what to highlight.

## Long

300 to 600 words of finished prose. Short paragraphs. Subheadings (###) only if they help. Cite sources inline as
numbered markers like [1], matching the list below.

## Sources

1. Author or organisation, "Title", publisher, year. URL. What it supports.

## Could not confirm

- Anything you looked for but could not verify, or found disputed. Write "Nothing" if empty.
```

When you are done, reply with the file path, the word count of the Long part, and anything in "Could not confirm".
