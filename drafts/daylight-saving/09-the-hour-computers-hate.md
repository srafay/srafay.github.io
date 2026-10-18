# 9. The hour computers hate

## Short

On 4 October 2026, 2:30 am did not happen in Sydney. On 4 April 2027, it will happen twice. [1][2] Software has to cope with both, and it does not always manage. In 2010, repeating iPhone alarms in Australia went off an hour early. [9] The rules on your phone come from volunteers, and governments sometimes give them days of notice. [8][16] A vote held with each election would give everyone months.

### Visual

- **Type:** step chart, with two lines on one axis.
- **Title and caption:** "How far ahead is Sydney?". Caption: "Hours Sydney is ahead of London and New York, October 2026 to October 2027. Each step is a day when one of the three cities changes its clocks."
- **Data:**

| From | To | Ahead of London | Ahead of New York | What changed | Source |
|---|---|---|---|---|---|
| Before 4 Oct 2026 | | 9 | 14 | | [1][4][5] |
| 4 Oct 2026 | 24 Oct 2026 | 10 | 15 | Sydney starts daylight saving | [1] |
| 25 Oct 2026 | 31 Oct 2026 | 11 | 15 | London ends summer time | [4] |
| 1 Nov 2026 | 13 Mar 2027 | 11 | 16 | New York ends daylight saving | [5] |
| 14 Mar 2027 | 27 Mar 2027 | 11 | 15 | New York starts daylight saving | [5] |
| 28 Mar 2027 | 3 Apr 2027 | 10 | 15 | London starts summer time | [4] |
| 4 Apr 2027 | 2 Oct 2027 | 9 | 14 | Sydney ends daylight saving | [1] |
| 3 Oct 2027 | | 10 | 15 | Sydney starts daylight saving | [3] |

- **Notes for drawing it:** Dates along the bottom, a tick at the first of each month. Hours ahead up the side, from 8 to 17. Draw both lines as steps and mark each change with a dot and its date. Footnote: "Checked against the IANA time zone data built into the JavaScript runtime."

### Share line

In 2006, Western Australia gave the world's time zone volunteers 12 days' notice of a clock change. Morocco once gave two.

## Long

Say you set an alarm for 2:30 am on Sunday 4 October 2026, in Sydney. What should it have done?

There was no right answer. At 2 am that morning, the clocks jumped straight to 3 am. [1][3] For everyone in NSW, Victoria, the ACT, South Australia and Tasmania, 2:30 am did not exist.

April has the opposite problem. On Sunday 4 April 2027, the clocks go back from 3 am to 2 am. [1][2] The hour from 2 am to 3 am happens twice.

People shrug this off. Computers cannot. They did not get a vote either, and they complain the loudest.

### The time that happens twice

A program that stores "2:30 am, 4 April 2027, Sydney" has a problem. That time happens twice, an hour apart. Python, for example, keeps an extra flag called fold to say which of the two it means. [13]

The safer habit is to avoid local time altogether. Coordinated Universal Time, UTC, never changes with the seasons. [15] Many programs store every moment in UTC and convert to local time only when a person reads it. [6]

### When it went wrong

In October 2010, Australians and New Zealanders woke to a strange bug. After the clocks went forward, repeating iPhone alarms went off an hour early. [9][10] Apple's advice was to switch off the repeat and set the alarm again each day. [9] For once, the clock change gave people an extra hour of being awake.

That was not the first time. In 2007, the United States moved its daylight saving dates. Many computer systems had to be updated, and email and calendar programs were hit hardest. [6]

Servers have their own version. Older versions of the Unix scheduler cron could run a job twice when the clocks went back. [11] Modern versions skip the repeat, and run jobs from a skipped hour just after the change. [12]

### The volunteers who keep time

So how does your phone know when Sydney changes its clocks? Almost every phone and computer gets its rules from one source, the tz database. [7] It is also called the Olson database, after its founder, Arthur David Olson. [7] Volunteers maintain it, led today by Paul Eggert and Tim Parenti. [7] Changes are argued over on a public mailing list. [7]

Governments do not always give them much warning. Western Australia's Parliament approved its daylight saving trial on 21 November 2006. [8] The trial started on 3 December, 12 days later. [8] A volunteer posted the news to the list the next day, adding: "The lack of notice is quite unfortunate". [8] Microsoft rushed out updates for "the DST transition at short notice". [14]

Morocco cut it even finer. On 26 October 2018, its government decided to stay on summer time for good. [16] The clocks had been due to go back two days later. [16] Even that "permanent" time has an exception. Morocco still moves its clocks back an hour for Ramadan. In 2026, that ran from 15 February to 22 March. [16]

### Why a vote helps here too

A vote at each state election has a quiet bonus. Everyone would know the answer months ahead. NSW, for example, votes on 13 March 2027. [18] A result that night could take effect from October, nearly seven months later. That is plenty of time for the volunteers, the phone makers and the people who book meeting rooms.

Changing the rules is not the problem for software. Changing them by surprise is.

### The southern twist

Australia changes its clocks in spring, when the US and Europe are changing theirs for autumn. The dates do not line up either. [1][4][5]

Sydney moved forward on 4 October 2026. London goes back on 25 October, and New York on 1 November. [1][4][5] So the gap to London went from 9 hours to 10, and will reach 11. The gap to New York went from 14 to 15, and will reach 16. [17]

If you run a weekly call with London, it moves twice this October alone. Every invite between those cities needs a time zone attached, not just a time.

Several governments are trying to stop the clocks changing for good. So where does each one stand? And where does that leave us?

## Sources

1. NSW Government, "Daylight saving". https://www.nsw.gov.au/living-in-nsw/daylight-saving. Starts Sunday 4 October 2026 at 2 am, ends Sunday 4 April 2027 at 3 am.
2. Time Out Sydney, "NSW daylight savings is ending soon: here is when the clocks change", 2026. https://www.timeout.com/sydney/news/nsw-daylight-savings-is-ending-soon-heres-when-the-clocks-change-030226. Clocks go back from 3 am to 2 am.
3. Wikipedia, "Daylight saving time in Australia". https://en.wikipedia.org/wiki/Daylight_saving_time_in_Australia. The first Sunday in October and April rule, and the 2 am to 3 am change.
4. Wikipedia, "Daylight saving time in the United Kingdom". https://en.wikipedia.org/wiki/Daylight_saving_time_in_the_United_Kingdom. Last Sunday in March and October: 25 October 2026 and 28 March 2027.
5. Wikipedia, "Daylight saving time in the United States". https://en.wikipedia.org/wiki/Daylight_saving_time_in_the_United_States. Second Sunday in March, first Sunday in November: 1 November 2026 and 14 March 2027. The 2007 change.
6. Wikipedia, "Daylight saving time". https://en.wikipedia.org/wiki/Daylight_saving_time. Applications that standardise on UTC, and the 2007 US change requiring many systems to be upgraded, with email and calendars most affected.
7. Wikipedia, "Tz database". https://en.wikipedia.org/wiki/Tz_database. The Olson name, Paul Eggert and Tim Parenti, volunteers, and the mailing list.
8. Peter Jeremy, "[patch] Daylight Savings is being introduced in Western Australia", tz mailing list, 22 November 2006. https://mm.icann.org/pipermail/tz/2006-November/039018.html. Passed 21 November, trial from 3 December 2006, and the "lack of notice" quote.
9. Macworld, "DST bug iPhone", 2010. https://www.macworld.com/article/208844/dst_bug_iphone.html. Repeating alarms in New Zealand and Australia, and Apple's advice.
10. The Register, "iPhone daylight saving", 5 October 2010. https://www.theregister.com/2010/10/05/iphone_daylight_saving/.
11. Red Hat Bugzilla, bug 138001, "Cron jobs run twice during Daylight savings time". https://bugzilla.redhat.com/show_bug.cgi?id=138001. vixie-cron 3.0.1.
12. Debian, "cron(8)". https://manpages.debian.org/cron. Skipped-hour jobs run soon after, repeated-hour jobs are not run again.
13. Python Software Foundation, "zoneinfo: IANA time zone support". https://docs.python.org/3/library/zoneinfo.html. The fold attribute.
14. Microsoft, "WA Daylight Savings Update - Its approved!", 2006 blog post, Microsoft Learn archive. https://learn.microsoft.com/en-us/archive/blogs/mkleef/wa-daylight-savings-update-its-approved.
15. Wikipedia, "Time zone". https://en.wikipedia.org/wiki/Time_zone. Time zones as offsets from UTC.
16. IANA tz database, file "africa". https://github.com/eggert/tz/blob/main/africa. Read 12 October 2026. Note of 26 October 2018: a Moroccan government council approved permanently adding 60 minutes, citing the official bulletin (BO 6720-bis). The Casablanca zone line shows the old rules ending on 28 October 2018 at 3 am, the scheduled change. Rules for 2026: back one hour on 15 February, forward again on 22 March, for Ramadan. The Bun runtime's Intl data gives the same offsets (GMT+0 on 20 February 2026, GMT+1 on 25 March 2026).
17. Calculated with the IANA time zone data in the JavaScript Intl API (Bun runtime, October 2026), for Australia/Sydney, Europe/London and America/New_York on each date in the table. All values match the table.
18. Wikipedia, "2027 New South Wales state election". https://en.wikipedia.org/wiki/2027_New_South_Wales_state_election. "Scheduled to be held on 13 March 2027". The NSW Government announced the move from 27 March to avoid Easter: https://www.nsw.gov.au/ministerial-releases/nsw-government-takes-steps-to-avoid-easter-long-weekend-clash-2027-state-election (18 February 2025). Read 12 October 2026.

## Could not confirm

- Whether the 2010 iPhone bug affected all models. The sources name specific devices.
- How current cron implementations on macOS or other systems behave. Only the Debian and old Red Hat behaviour was read.
- The Moroccan decree text itself was not read. The dates come from the tz database, which cites it.
- "Could take effect from October" is an example of timing, not a law. Any change would need the NSW Parliament to pass it.
- "For once, the clock change gave people an extra hour of being awake" is a joke about the alarms going off early.
