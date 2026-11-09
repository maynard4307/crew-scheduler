# Changelog

Tap the version number at the top of the app to see this inside Crew Scheduler.

## 2026.11.09-i — Nov 9, 2026

**New**
- Smarter address lookup: messy addresses are cleaned up first (like “1891-1801 NC-24” → “1891 NC Highway 24”), more free map services are asked (US Census, and OpenRouteService if your routing key is set), and the result in the town or ZIP you typed is picked — not one far away.
- If the house can't be found, it falls back to the road, then the ZIP code area, before the town center.
- Fixed spots are remembered: when you paste the right location for an address, every later job or worker with that address uses it automatically. Saved spots are included in backups.
- “Look up again” button for jobs and workers marked in orange.

## 2026.11.09-h — Nov 9, 2026

**New**
- Warning when a typed address lands in the wrong place: the map found a different town than the one you typed, only the town center (not the street), or a spot far from all your workers.
- Jobs and workers with a location that looks off are marked in orange, listed at the top of the Today tab, and flagged on the crews, with how to paste the exact spot from Google Maps.

## 2026.11.09-g — Nov 9, 2026

**Fixed**
- Opening a backup file with Workers → Import list now restores it properly. Before, it turned every line of the backup into a fake “worker” (like “{” or “name: …”) and the real people didn't come in.
- Restoring a backup also clears out those fake rows if an earlier import left them behind.
- Opening a backup file in the Today tab now says to use Restore backup instead of making junk jobs.

## 2026.11.09-f — Nov 9, 2026

**Fixed**
- A worker whose meet point would be basically at the job site (or barely closer than the job) is now told to drive straight to the job instead.

## 2026.11.09-e — Nov 9, 2026

**New**
- Pickups are now decided by time: a lead picks a worker up at home if it adds no more than 10 minutes to the drive (adjustable); otherwise the worker meets the truck along the way.
- Real road drive times (free OpenRouteService key, set in Crew rules): matching, pickups and meet points now follow actual roads and minutes, not straight lines.
- Leave-by times for everyone: when each lead leaves home, when each pickup should be ready, and when each worker leaves to meet the truck.
- Arrive-early buffer (15 min) and minutes per pickup or meet stop (5 min) — both adjustable in Crew rules.
- Without a routing key, times are estimated (shown with ≈) at an adjustable average speed.

## 2026.11.09-d — Nov 9, 2026

**New**
- New History tab: every day's schedule is saved when you copy or send it — who was on each truck, for which job.
- Close out each job the next morning: Completed, Rained out or Cancelled, with a note and crew changes (sent home, no-show, swapped in).
- Month calendar with colored dots, a search box (person, client or town) and spreadsheet export for any date range.
- On a PC (Chrome or Edge): connect a history file once and it's kept up to date automatically.
- History is included in backups and kept forever.

## 2026.11.09-c — Nov 9, 2026

**New**
- “Download this app” button (How to tab and Crew rules) on the website version: saves a copy you can open on a computer without internet setup, named with its version number.

## 2026.11.09-b — Nov 9, 2026

**New**
- What's new: tap the version number at the top to see what changed. It also pops up once after each update.

## 2026.11.09-a — Nov 9, 2026

**New**
- Version number shown in the top bar on every screen.
- Separate delete choices in Crew rules → Delete data: today's crews, today's jobs & crews, all workers & crew rules, or everything.
- “Delete all workers…” on the Workers tab, with a “Save backup first” option.

## 2026.11.08-ai1 — Nov 8, 2026

**New**
- AI assistant (optional, needs a Claude API key): “Read job notes with AI” pulls trucks, crew size, requested and “don't send” people and key notes from calendar text.
- “Review with AI” checks the built crews, takes today's special instructions, and suggests fixes you can apply with one tap.
- “Don't send” list per job — those people are never put on that job.

**Fixed**
- Calendar notes are now kept in full (up to 1,500 characters) so nothing important is cut off.

## 2026.11.07-g — Nov 7, 2026

**New**
- Max distance from a crew lead's home to the job, with an optional limit per lead.
- “Pack & save for support”: one .zip with everything needed to troubleshoot a problem.
- A log of recent errors and actions, included in support packs.

**Fixed**
- Checkbox labels no longer wrap onto their own line on phones.

## 2026.11.07-c — Nov 7, 2026

**New**
- Requested crew: people named in a calendar event (e.g. “Req: Marcus, Lena”) are put on that job automatically. You can also pick them by hand.
- Option to include store & gas station lots (Walmart, Food Lion…) as meet spots, marked with a towing warning.

## 2026.11.07-b — Nov 7, 2026

**New**
- Workers are picked up at home if they live on the lead's way to the job, or meet the truck along the route.
- Workers are matched to the lead whose route passes closest to them.
- Optional meet spots: finds Park & Ride lots and public parking near the route.
- Schedule shows each worker's pickup or meet spot with a map link.

## 2026.11.07-a — Nov 7, 2026

**New**
- Backup & restore of all workers, leads and crew rules — move them to another phone or a newer version.
- Merge or replace when restoring.
- Export workers as a spreadsheet (CSV).

**Fixed**
- Saving files now works in the downloaded/website version (it used to only show text to copy).

## 2026.11.06 — Nov 6, 2026

**New**
- Every truck gets exactly one crew lead (they have the company truck), then workers.
- Jobs can need several trucks; set Trucks and People per truck on each job.
- Truck counts like “2 trucks” or “3 man crew” are read from the calendar.
- “Tonight” renamed to “Today”; calendar import picks today's jobs by default.

## 2026.11.03-b — Nov 3, 2026

**New**
- Import jobs from the Google Calendar export (.ics or .zip), choosing the day.
- Reads titles like “7a-Lee Electric/Cameron Epps-Raeford, NC” into time, job and town; skips headings like “***Fayetteville Schedule***”.
- Finds job towns and worker home addresses on the map automatically.

## 2026.11.03 — Nov 3, 2026

**New**
- First version: workers with home locations, “can't work together” and “work well together” rules, build crews by distance, copy or download the schedule.
