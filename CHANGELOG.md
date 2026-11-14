# Changelog

Tap the version number at the top of the app to see this inside Crew Scheduler.

## 2026.11.14-a — Nov 14, 2026

**New**
- Backup reminder: if your workers haven't been backed up in a week, Today shows a reminder with a Save backup file button. Settings → Backup & restore shows when the last backup was made.
- A job that runs several days on the calendar (one event from Monday to Friday), or one that repeats, now shows up on every day it covers when you open the job file. It's marked “day 2 of 5” or “repeats” in the job list.
- From 3 p.m. on, “Scheduling for” starts on Tomorrow, since the next day's jobs come in at night. Tap Today if you mean today.
- Removing a job with × now shows an Undo button for a few seconds.
- Messages at the bottom of the screen stay up longer when they're long, and you can tap one to dismiss it.

**Fixed**
- If the phone or browser ran out of storage space, changes could fail to save while the top still said “Saved”. The app now clears out old remembered lookups to make room by itself, and if a save still fails it shows a red “NOT SAVED” warning telling you to save a backup file.
- A job with no map location was left off the crews and the copied schedule without a word, and the screen still said every truck was covered. Now a red note lists any job that isn't on the schedule, and the copied schedule ends with a “NOT SCHEDULED YET” list.
- If yesterday's jobs were still loaded and you typed in new ones, the schedule went out with yesterday's date and was saved over yesterday in History. Now a red note warns when the day has already passed, with a Start new day button, and Copy schedule asks before using an old date.
- Unticking a job after crews were built left it in the crews and in the copied schedule until you rebuilt. Now it comes off right away and its people are free.
- When you load a new day's jobs, the app asks whether to keep the people who were marked off before, so nobody stays off by accident.
- A report time typed without a or p (like 7:00 or 0700) gave no leave-by times. It's now read as a morning time (7:00a) and tidied when you save, and a time that can't be read is flagged on the job.
- “Delete everything” now also clears saved map spots, remembered address lookups and drive times, the last calendar import and the support log. Only your keys stay, and the screen says so.
- The AI notes said no addresses are sent. To be exact: job-site addresses and the calendar notes are sent to the AI when you use it; workers' home addresses and phone numbers never are. The wording now says that.

## 2026.11.12-a — Nov 12, 2026

**New**
- New “Scheduling for” choice at the top of step 1 on Today: tap Today or Tomorrow, or pick any date. Jobs you add by hand go on that day, and the copied schedule and History use that date. Step 1 and 2 titles say which day you're working on.
- When you open a job file, the day list starts on the day you picked, and loading a day's jobs sets “Scheduling for” to match. If loaded calendar jobs are for a different day than the one picked, a note says so.

## 2026.11.11-d — Nov 11, 2026

**New**
- New option: type a job in plain English. Turn it on in Settings → Type jobs in plain English, then tap + Add a job and type something like “Smith mowing, 412 Oak St Raeford, 7am, 2 trucks of 3, req Marcus, no Kevin”. Tap Fill in the form and it fills in the name, time, address, trucks, crew size and who's requested, for you to check before you Save. It only fills the form: who goes where and who drives is still up to your scheduling rules.
- It uses free AI first: the AI built into newer Chrome on a PC (stays on your computer), or Google Gemini with a free key you paste in Settings. With no AI or no internet, a basic reader still picks out the time, trucks, crew size and names. Only the sentence you type is sent, never your worker list or addresses. Off until you turn it on.

## 2026.11.11-c — Nov 11, 2026

**New**
- New option in Settings → Scheduling rules: when a job has a spare crew lead, they can bring their own truck as an extra truck when they'd drive to the job alone anyway, or when it saves the crew at least 10 minutes of driving. The crew size stays the same, and workers ride with whichever truck passes closest to them. It's shown as “Truck 2 (extra)” on the crews and the schedule. Off until you turn it on.

## 2026.11.11-b — Nov 11, 2026

**New**
- New “🚚 Make driver” button: when a job has more than one crew lead, tap it next to the lead you want driving the truck. It stays that way when you rebuild, like a 🔒 lock (tap the lock to undo).

**Fixed**
- When a job had two crew leads, the one living closest to the job always got the truck, even when the other lead lived next to the workers. Now the app picks the driver that makes the least driving for the whole crew, so people near the other lead can ride along instead of driving themselves.

## 2026.11.11-a — Nov 11, 2026

**New**
- Simpler layout with four tabs: Today, Workers, History and ⚙ Settings. Crew rules and How to are now inside Settings.
- Today walks you through 3 steps: load jobs, who's working, build crews & send. After crews are built, the first two steps fold up into a one-line summary (tap Edit to open them again).
- A bar at the bottom of Today always shows the next thing to do: Open job file, Build crews, or Copy schedule.
- Copy schedule now sits at the end of the crews too, so you don't have to scroll back up to send.
- Rarely used buttons (Paste titles, Start new day, Download CSV, Clear crews) are under “More”.
- Can't work together and Work well together moved to the Workers tab, and each worker's profile shows their pairs.
- Backup & restore has one home: Settings → Backup & restore.
- How-to topics, What's new and the support pack are in Settings → Help.
- Phoenix Spirit Group logo at the top, and as the icon when you add the app to your home screen.

**Fixed**
- How-to said pickups happen within 2 miles of the lead's route. It now says the real rule: when picking up adds no more than 10 minutes (adjustable).

## 2026.11.09-j — Nov 9, 2026

**New**
- Load jobs from a support pack: Today → Open job file, pick the pack (.zip). The jobs come back as they were — report times, addresses, map spots, trucks, crew sizes, requested and don't-send people, notes and who's off. It also offers to load the pack's workers.

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
