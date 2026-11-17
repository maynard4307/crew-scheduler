# Crew Scheduler — Hand-off

**Read this first in any new chat or before changing the app.** It records what the app does, how it's built, the decisions behind it, and how to ship an update. Keep it current: every release updates this file and `CHANGELOG.md`.

- Live app: https://maynard4307.github.io/crew-scheduler/
- Repository: https://github.com/maynard4307/crew-scheduler (public; GitHub Pages from `main`, root)
- Current version: **2026.11.17-b** (shown in the app's top bar; tap it for What's new)
- Owner: maynard4307 · Primary user: the owner's brother (dispatcher, iPhone + PC)

## 1. What it's for

A field-service contractor in North Carolina gets the next day's jobs as Google Calendar events around 9 p.m. The dispatcher must decide by 4 a.m. which crew lead (who has the company truck) takes which truck to which job, who rides with whom, and send the schedule out. Crew Scheduler does that matching and produces the schedule, then keeps a searchable record of who worked where.

## 2. Daily workflow

Tabs: **Today · Workers · History · ⚙ Settings** (since 2026.11.11-a; before that Crew rules and How to were separate tabs).

1. Export the job calendar (calendar.google.com → Settings → the calendar → Export) and open the .zip/.ics in **Today → step 1**, or paste event titles (More menu). First pick **Scheduling for** (Today / Tomorrow / a date) at the top of step 1 (it starts on Today, or on Tomorrow from 3 p.m. on); the calendar day list starts on that day, and loading a day sets it to match. A calendar event that spans several days, or repeats, is loaded on every day it covers.
2. Check **Trucks** and **Per truck** on each job; in step 2 mark who's off.
3. **Build crews** (step 3, or the bottom bar) → review notes, adjust with Add/move and 🔒 locks; optional **Review with AI**. Steps 1–2 fold into one-line summaries once crews exist (auto-open again when they have problems).
4. **Copy schedule** (bottom bar or end of the crews; also saves the day to **History**) and send it.
5. Next morning: **History → Close out** each job (Completed / Rained out / Cancelled, notes, crew changes).

### Where things live (layout agreed Nov 11, 2026)

- **Today**: the daily 1-2-3 flow only. Rare actions (Paste titles, Start new day, Download CSV, Save to History, Clear crews) are under **More** menus. Fixed bottom action bar shows the one next step.
- **Workers**: people, plus Can't work together / Work well together (shown in each worker's profile too).
- **History**: unchanged.
- **Header**: Phoenix Spirit Group (PSG) square logo left of the title, embedded as a data-URI PNG (`.brand`, on a white tile so it reads in dark mode); the same logo is the favicon / apple-touch-icon. Chosen over the wide "Phoenix Spirit Group / A Helix Company" logo because it stays legible at 34–40 px.
- **⚙ Settings**: Scheduling rules (numbers, checkboxes) → Temp agency (switch + agency list) → Connections (Road drive times key, AI key, Type jobs in plain English) → Backup & restore (+ download app) → Help & updates (how-to topics, What's new, support pack) → Delete data. Jump chips at the top.
- Per-job and per-lead settings stay on the job / worker form.
- **Plain-English job entry** (off by default, Settings → Type jobs in plain English): when on, + Add a job / Edit job shows a “Type the job in plain English” box and **Fill in the form** button above the fields.

## 3. Business rules (agreed with the owner — don't change without asking)

- Every truck needs **exactly one crew lead**; other people on the truck are workers. A job can need several trucks. "Per truck" counts the lead.
- When a job has more leads than trucks, the driver is the lead that makes the **least total driving for the crew** (lead's drive + each worker's way to the truck), not simply the lead closest to the job. Leads past their mile limit are only picked if locked by hand (requested people count as locked). The dispatcher can override with **🚚 Make driver** (sticks while that person is locked to the job).
- **Extra truck** (setting `extraTruck`, default off): a job with a spare lead may send one extra truck (at most one per job) driven by that lead, when the spare lead would drive to the job alone anyway or it saves the crew ≥ `EXTRA_TRUCK_MIN` (10) min. Crew size doesn't change; workers go with the closest truck. Shown as "Truck N (extra)". Decided in `trucksFor` (display/schedule only; the solver doesn't add leads to get one).
- The lead drives the truck **from home to the job**; the job distance/time is measured from the lead's home.
- Workers either get **picked up at home** (if it adds ≤ `pickupMin` minutes to the lead's drive, default 10) or **meet the truck along the lead's route**. If the meet point is basically at the job (meeting saves < 5 min, or the point is < 10 min from the job), the worker drives to the job. If the worker lives "behind" the lead, they meet at the lead's home.
- Workers are matched to the lead whose route passes closest to them (by minutes).
- **Can't-work-together** pairs are never on the same job. **Work-well-together** is a light preference.
- **Requested** people (from calendar text like `Req: Marcus, Lena`, full names anywhere, or picked by hand) are locked to that job. **Don't send** people are never put on it.
- Crew lead **max distance to job**: default in settings, optional per lead; hard limit on **driving a truck** unless assigned by hand. A spare lead past their limit may still ride as a worker in another lead's truck (owner's default, Nov 16, 2026: "ride yes, drive never"). Enforced in three places: the lead step and the fill step of `run` (a past-limit lead is not added to a job that still has a truck without a lead), a final safety pass in `solveInner` that takes any unlocked past-limit truck lead off the job, and `trucksFor` (no extra truck for a past-limit lead).
- Spare leads may fill worker spots (setting, default on); their truck stays parked.
- **Rebuild keeps people in place.** When crews already exist, each person is worth `STAY` (5) minutes for staying on their current job, and one extra run starts from the current crews (`prevJ`, `run(noise,seed)`), so a rebuild only moves someone when it saves real driving. A message lists who changed jobs. Clear crews, then Build, gives a fresh result.
- Leave-by times: work backward from the job's report time — arrive `arriveEarly` min early (default 15), allow `stopMinutes` per pickup/meet stop (default 5). Leave times round down to 5 minutes.
- Meet spots: suggest **Park & Ride** first, then public free lots; store/gas lots (Walmart, Food Lion…) only if the user turns that option on, always with a towing warning.
- **Nothing is left off quietly.** A ticked job that has no crew (no map location, or added after crews were built) is listed in red on the crews and at the end of the copied schedule as “NOT SCHEDULED YET”. A save that fails shows “NOT SAVED”; the app never shows “Saved” for something that wasn't.
- **Temp agency** (setting `tempAgency`, default off; agencies in `settings.agencies`: name, phone, address, note, map spot). Temps **only fill worker spots, never crew lead** (a lead has the company truck). Off: step 2 counts worker spots vs. available people, crews say "Needs N more workers", a banner lists the short jobs and offers to turn the setting on, the copied schedule ends with "SHORT-HANDED". On (with at least one agency): open worker spots show as **Temp worker** placeholders (crews, copied schedule, CSV) that meet the crew at the job by report time − `arriveEarly`; the **closest agency** to each job (by `travel`) is suggested; a banner and a "TEMP WORKERS NEEDED" list say whom to call for how many. Placeholders never enter `tonight.assign` and the solver ignores them. Agreed with the owner Nov 15, 2026.
- **AI never decides crews or drivers.** Plain-English job entry only fills the job form; the dispatcher checks it and taps Save. Review with AI only suggests moves the dispatcher applies by hand.
- Close-out happens **the next morning**. Statuses: Completed, Rained out, Cancelled (no "Partial"). **History is kept forever.**
- Calendar titles look like `7a-Lee Electric/Cameron Epps-Raeford, NC, Hoke County` → time · client / contact · town. Headings like `***Fayetteville Schedule***` are skipped.

## 4. How it's built

- **One file:** `index.html` (HTML + CSS + vanilla JS, no build step). No external scripts: JSZip 3.10.1 is pasted into the first `<script>` block (KMZ/zip import and support-pack zips), so the file is about 420 KB. To update JSZip, replace that block with the new `dist/jszip.min.js`.
- **Runs in the browser**; nothing runs on a server. Works as the GitHub Pages site, a downloaded `.html` file (PC/Android), and a Claude artifact (limited — see §7).

### Data storage (all on the device)

Every key is also listed in `STORE` at the top of the script with where it goes in a backup / support pack; `SECRET` names the API-key fields that never leave the device. `tests/checks.js` (13c) fails if a new `crew_…` key, a new Settings field or a new setting isn't covered. Rule (owner, Nov 17, 2026): **backups and support packs carry every setting and tick box; only API keys are left out.**

| Key / store | What | In backups? |
|---|---|---|
| localStorage `crew_roster` | workers, conflicts, prefers, settings (incl. temp agencies) | Yes |
| localStorage `crew_tonight` | `day` (the day being scheduled, YYYY-MM-DD; set by Scheduling for, by loading a calendar day, or pinned by `pinDay` when a job is typed in or crews are built), `offAt` (when the off list was last touched), today's jobs, assignments, locks, off list, meets, `drivers` (Make driver: worker id → job id, counts only while locked to that job — `isDriver`), AI review, `histSaved` | Yes (`today`, since 17-b; on restore it's offered with “Load jobs” unless its day is past) |
| IndexedDB `crew-scheduler` → `days` | History, one record per date (names copied in) | Yes (merged on restore, newer edit wins) |
| IndexedDB `kv.histFile` | PC history-file handle (File System Access) | No |
| localStorage `crew_geo` | address lookup cache (`v2|<query>` → up to 15 results from all services) | Support pack only |
| localStorage `crew_places` | saved spots: street address fixed by hand → coordinates, reused for every later job/worker with that address | Yes (`places`, newer wins on restore) |
| localStorage `crew_rc`, `crew_rg` | road drive time cache (`"lat,lng>lat,lng"` → [min, mi]); route geometries | `crew_rc` yes (`roadTimes`, merged: only missing entries added); `crew_rg` support pack only |
| localStorage `crew_history` | History, only when IndexedDB isn't available (fallback) | Yes |
| localStorage `crew_backup` | when the last backup was saved from this device (`at`), reminder snooze | Support pack only |
| localStorage `crew_ai`, `crew_route` | Claude API `key`, `model`, `autoNotes` (read notes automatically); OpenRouteService `key` | Everything but the keys (`device` in the backup; restored on Replace, this device's keys kept) |
| localStorage `crew_jobtext` | plain-English job entry: `on`, `engine` (auto/builtin/gemini/claude/basic), `geminiKey`, `geminiModel` | Everything but `geminiKey` (same as above) |
| localStorage `crew_log`, `crew_lastimport`, `crew_seenver` | support log (300 entries), last import raw text, last seen version | Support pack only |

On the Claude artifact the roster/today also sync through the artifact database (`db` docs `app/roster`, `app/tonight`).

### External services

| Service | Used for | Key | Notes |
|---|---|---|---|
| OpenStreetMap Nominatim, OpenRouteService geocode (if key), US Census geocoder, Photon | address → map location | none (ORS uses the routing key) | Nominatim throttled 1/sec; all cached; stops asking once a street-level match fits the typed town/ZIP. Census CORS from browsers is unverified: if blocked it is skipped for the session (`censusReachable` in environment.json) |
| Overpass API | Park & Ride / public lot search near meet points | none | on demand only |
| OpenRouteService (HeiGIT) | real road drive times (matrix) and lead routes (directions) | free Standard key, on device | cached; a first build uses ~10 requests; falls back to estimates (≈) at `avgMph` |
| Anthropic Claude API (`claude-sonnet-5-5` default, `claude-haiku-5-5`) | Read job notes with AI; Review with AI; plain-English job entry (if chosen) | user's API key, on device | sends worker names, job names with job-site addresses, the calendar titles/notes as written, minutes, rules — never workers' home addresses, phones or coordinates. Job entry sends only the typed sentence |
| Chrome built-in AI (Prompt API, `LanguageModel`, Gemini Nano) | plain-English job entry | none, free | Chrome 148+ on desktops with enough GPU/RAM/disk; not phones. Runs on the device. One-time ~2–4 GB download started by Settings → Test |
| Google Gemini API (`gemini-2.5-flash` default, editable) | plain-English job entry | user's free AI Studio key, on device | sends only the typed sentence (no roster). Free tier may be used by Google to improve products — the Settings card says so |

### Main code areas (search these names in `index.html`)

- Import: `parseJobTitle`, `parseICS` (two passes: collect events, then one job per covered day via `icsDays` — multi-day spans from DTEND, repeats from RRULE with INTERVAL / COUNT / UNTIL / BYDAY / BYMONTHDAY / EXDATE, worked out from 14 days back to 120 days ahead; a RECURRENCE-ID event replaces that day of its series; timed events under 24 h stay one day; jobs carry `multi` = “day 2 of 5” / “repeats”), `parseKML`, `rowsToPlaces`, `importPlaces`, `pickDay`, `findRequested`, `countsFrom`
- Geocoding: `geocodeAddress` (saved spot `placeGet` → `geoCandidates`: cleaned address via `cleanAddr`/`hwyVariants`, then road without house number, ZIP, town → `geoAll` asks every service → `geoFit` keeps the result in the typed town/ZIP and within `FAR_MI` of the crew; otherwise the best fallback), `geocodeMissing`, saved spots `placeSave`/`placeForget` (saved when a location is pasted by hand; forgotten when the user clears it). "Look up again" (`refindJobs`/`refindWorkers`) retries orange ones and keeps the old spot if nothing better is found. Location checks: `locWarn` (wrong town vs. the typed address, town-center-only match, or > `FAR_MI` (75) mi from every worker), shown in orange on job/worker lists and forms, a Today banner, and `jobIssues`. Jobs/workers keep the full lookup label in `geoLabel`; "Set by hand" locations are never flagged.
- Routing: `travel` (cached real time or estimate), `ors` (a failed fetch is sorted by `orsWhyFailed`: `blocked` on the Claude page, `offline`, `refused` when a no-cors probe reaches the server — ORS sends its 401/403/429 refusals without CORS headers, so a bad key or used-up limit looks like a network failure — else `unreachable`; `routeErrText` turns each into advice), `orsMatrix`, `orsRoute`, `warmBeforeSolve`, `warmPlans`, `planPairs`, `meetPoint`
- Matching: `solve` → `solveInner` (greedy: leads → workers → spare leads, then local search with moves/swaps/chains, ~6–24 random restarts), `pairCrew` (also picks which leads drive when there are extra leads: tries each choice, up to 8 leads, lowest total minutes; honors `forced` = Make driver, `leadPen` = past mile limit), `jobScore`
- Per-truck view: `trucksFor` (also the optional extra truck: compares crew minutes with T vs T+1 trucks via `legFor`; `truckLabel`), `legFor` (lead / pickup / meet / atlead / atjob / job), `planTruck` (leave-by timeline), `jobIssues`
- Layout: `render` (tabs `tonight`/`workers`/`history`/`settings`; it redraws the whole tab, so when the same form is still open (`lastRenderKey`) it puts back what was typed in the `KEEP_SEL` fields, the requested chips and the focus; `formDirty` makes the tab bar ask before leaving a half-filled job or worker; the temp agency card updates in place instead of redrawing), `rTonight` with `stepWrap` (collapsible steps, `todayOpen` overrides, reset on build/new day), `moreMenu`, `rActionBar` (bottom bar), `goSettings(cardId, openId)` for links into Settings; Settings = `rSettings` → `rRouteSettings`, `rAISettings`, `rBackupCard`, `rHelpCard` (wraps `rHelp` sections as `<details>`), `rDeleteCard`; pair lists `rPairs` on Workers
- Day being scheduled: `scheduleDay()` = `tonight.day` → first job's calendar day → `defaultDay()` (today; tomorrow from `EVENING_HOUR` = 15:00). `pinDay()` fixes it once a job is typed or crews are built. `dayIsPast()` drives the red warning in `rDayPicker` and the confirm on Copy schedule. `rDayPicker`, `setScheduleDay`, `dayWord`. Used by the copied schedule, History save, step titles. Hand-added jobs have no `day` of their own; they follow `tonight.day`. Cleared by Start new day; a past `day` with no jobs resets to today.
- Temp agency: `agencyList`, `tempsOn` (setting on and ≥ 1 agency), `agencyFor` (closest agency with a map spot, else the first), `openSpots` (open worker spots per truck, same count as jobIssues' "Needs N more workers"), `tempArrive`, `shortList`, `tempBanner` (crews), `rTempSettings` / `agencyLocate` (Settings card, geocodes the agency address), actions `goTemp` / `agAdd` / `agDel`, inputs `data-agf`. History jobs carry `temps:{n,agency}` when temps were planned.
- Output: `rResults`, `scheduleText`, `scheduleCSV`, `rMap`; `skippedJobs()` (ticked jobs with no crew entry) feeds the red note and the “NOT SCHEDULED YET” list
- Saving: `save` → `lsSave` (on a failed write `freeSpace()` drops the lookup / drive-time / import / log caches and retries; still failing sets `saveFailed` → “NOT SAVED” in the top bar and `saveFailBanner` on every tab). `navigator.storage.persist()` is requested at start when there are workers. Backup reminder: `backupDue` / `backupBanner` / `markBackedUp` (`BACKUP_DAYS` = 7, skipped for sample data and under 3 workers). Messages: `toast(msg,{action,fn,ms})` stacks up to 3, stays longer for long text, tap to dismiss; used for Undo on job delete.
- Report times: `parseClock` reads “7:00a”, “630a”, and a/p-less “7”, “7:00”, “0700”, “15:30” (24-hour reading); `normTime` tidies on Save job; unreadable times are flagged in `jobIssues`.
- History: `saveDayToHistory`, `histEdit`, `rHistory`, `rHistDay`, `rHistSearch`, `historyCSV`, `fileConnect`/`fileSync`, `mergeHistory`
- AI: `askClaude`, `aiReadNotes`, `aiReview`, `applySuggestion`
- Plain-English job entry: `readJobText` (engine order for Automatic: `jtBuiltin` → `jtGemini` → `jtClaude`, falls back to `jtBasic`, the offline regex reader), `jobTextFill` (fills the form fields and requested chips; names matched on the device by `jtPerson`/`jtNameKeys` — full, unique first or unique last name; `formAI` carries don't-send + note to `saveJob`), `rJobTextBox`, `rJobTextSettings`, `jtCfg`
- Load a support pack in Today → Open job file (`readAnyFile` kind `pack`: the .zip, its `today.json`, or the offline single-JSON pack) → `loadPackJobs` restores jobs exactly (time, trucks, crew, requested/avoid, notes, off list), offers the pack's workers via `restoreRoster`, maps people by id then by name (`today.json` now carries `names`).
- Backup/support: `rosterBackup` (version 3: roster, places, history, `today`, `roadTimes`, `device`, `keysLeftOut` flags), `readBackup` (still reads version 2), `restoreRoster(text,{skipToday})`, `deviceSettings`/`restoreDeviceSettings`/`noSecrets`, `supportPack` (+ `deviceStorage`: every other `crew_` key, keys stripped, `keySet` flags), `logEvent`. A backup `.json` opened through Workers → Import list is detected (`asJSON`, `isBackupJSON`) and sent to `restoreRoster`; JSON never goes through the CSV reader (`placesFrom` refuses it). `restoreRoster` also removes leftover junk rows (`isJunkWorker`) from the pre-g bug.
- Release notes: `APP_VERSION`, `CHANGELOG` (top of the script)

## 5. How to ship an update

1. Edit `index.html`.
2. Bump `APP_VERSION` (format `YYYY.MM.DD-letter`) and add an entry at the top of `CHANGELOG` (`added` / `fixed`, plain language for the dispatcher).
3. Test in a headless browser (Playwright): run `node tests/checks.js` (matching rules on random days, the schedule, History, backups (incl. every setting in the backup and support pack, no API keys), calendar reading, storage-full, the Nov 16 review fixes, version/doc sync) and add a check there for the feature touched. Mock external APIs (ORS, Claude, Overpass, Nominatim) — they aren't reachable from Claude's workspace.
4. Regenerate `CHANGELOG.md` from the `CHANGELOG` array; update this file if rules/architecture changed.
5. Commit and push to `main` (GitHub Pages updates in 1–2 minutes). Users close/reopen the app; What's new pops up once.
6. Also republish the Claude artifact (slug `bec01df9-3b49-428f-ad6b-c555570c7da6`) and send a versioned copy `crew-scheduler-v<version>.html` if the owner wants a file.

Never commit backups, support packs, CSVs or keys (`.gitignore` blocks `*.json`, `*.zip`, `*.csv`).

## 6. Troubleshooting

- Ask for **Settings → Help → Having a problem? → Pack & save for support** (.zip). To reproduce a day, open that .zip in **Today → Open job file** (loads its jobs, and its workers if you say so). It has the roster backup (with every setting), today, last import (raw calendar text), schedule, issues, all of History (`history.json`; before 17-b only 60 days), road times and route lines, saved spots, `device-storage.json` (every other stored setting, keys left out), the log, and environment (now also `history`: days, where stored, PC file state) (version, where it runs, whether routing/AI keys are set, cached route counts, last routing error).
- Road times "not used": check `environment.json` → `routingConfigured`, `routeCached`, `routeLastErr`. OpenRouteService's usage dashboard can lag. A message saying OpenRouteService "turned down the request" means the server answered but refused: the key in that browser is wrong/expired, or the daily limit is used up (Settings → Road drive times → Test; re-paste the key from account.heigit.org). The log has `route-error` entries.
- Calendar parsing problems: check `last-import.json` raw events against `parseJobTitle`.
- Workers named `{`, `]`, `name: …`, `lat: …` with no address: a backup `.json` was opened with Import list in a version before 2026.11.09-g. Fix: update, then Restore backup (or Import list) with the same file → Replace.

## 7. Known limits

- Data lives on each device (a browser can clear it; the app asks it not to and reminds about backups weekly); sharing is by backup files (the Claude-artifact version syncs, but can't reach outside services).
- iPhone can't run a downloaded `.html`; use the website + Add to Home Screen.
- Free map services aren't for heavy commercial use; no live traffic in drive times.
- Calendar title format is specific to this company (the AI notes reader helps with other formats).
- Code is public on GitHub.

## 8. Ideas not built yet

- Read the Google Calendar directly (Apps Script or calendar API) instead of exporting.
- Crew lead view / texts with each person's own leave time.
- Learn the dispatcher's repeated manual swaps and suggest rules.
- Use AI review suggestions history to improve defaults.
- Product version (accounts, cloud sync, paid maps) — see the product summary doc; only if the owner decides to sell.

## 9. Decision log

| Date | Decision |
|---|---|
| Nov 3, 2026 | Jobs come from Google Calendar events (not a map); titles carry time, client/contact and town |
| Nov 6, 2026 | One crew lead per truck (has the company truck); trucks per job; "Tonight" → "Today" |
| Nov 7, 2026 | Workers join the lead along the route (pickup or meet), not at the lead's home; Park & Ride meet spots; store lots optional |
| Nov 7, 2026 | Requested crews from calendar text; backups must move workers between devices/versions; support pack for debugging |
| Nov 8, 2026 | Hosted on GitHub Pages (iPhone friendly); AI via user's own Claude API key, no addresses sent |
| Nov 9, 2026 | History: save on send, next-morning close-out (Completed/Rained out/Cancelled), kept forever, PC file sync in Chrome/Edge |
| Nov 9, 2026 | Real road times via OpenRouteService (free); arrive 15 min early, 5 min per stop, both adjustable |
| Nov 9, 2026 | Pickup decided by extra minutes for the lead (≤ 10, adjustable), not miles from the route |
| Nov 9, 2026 | If meeting the truck barely beats driving to the job, worker drives to the job |
| Nov 9, 2026 | Better address lookup with free services only (no Google); remember hand-fixed spots per street address and carry them in backups |
| Nov 9, 2026 | Jobs are often typed in by hand (not only from the calendar): warn when a typed address lands in another town, only the town center, or far from everyone |
| Nov 9, 2026 | Backup files opened with Import list are restored as backups (not read as CSV); older backups (version 2, `pickupMiles` setting) still load |
| Nov 11, 2026 | Simpler layout: 4 tabs (Today · Workers · History · ⚙ Settings); Today is a guided 1-2-3 with collapsing steps and a bottom action bar; pair rules on Workers; one home for backup. Built as a preview branch first for the owner to try |
| Nov 11, 2026 | Extra leads on a job: driver = least total crew driving (was: closest to the job), plus a Make driver override. Found from a Siler City job where the Asheboro-area lead drove and two Fayetteville people (one a lead) each drove ~65 mi alone |
| Nov 11, 2026 | Optional extra truck for a spare lead (off by default): only when they'd drive alone anyway or it saves ≥ 10 min; max one per job; crew size unchanged |
| Nov 11, 2026 | Plain-English job entry (off by default): AI only fills the Add a job form for review, never changes crews or drivers. Free first: Chrome built-in AI, then a free Gemini key, then the existing Claude key; basic offline reader always as the fallback. Only the typed sentence is sent; the roster is matched on the device |
| Nov 14, 2026 | Full review, then a safety release (2026.11.14-a): failed saves are loud, backup reminder, skipped jobs shown on the schedule, past-date warning, unticked jobs come off at once. Multi-day and repeating calendar events load on every day they cover (owner's call until the dispatcher confirms how the calendar is used). "Scheduling for" starts on Tomorrow from 3 p.m. AI wording corrected: job-site addresses and calendar notes are sent, home addresses and phones never. Release checks saved in `tests/checks.js` |
| Nov 15, 2026 | Temp agency option (off by default): several agencies, closest one suggested; temps only fill worker spots, never lead. Off = a note saying how many workers are short; on = Temp worker placeholders on the crews and schedule |
| Nov 16, 2026 | 2026.11.16-b, Justin chose three of the four open items: “Keep off this job” on the Undo message after × (adds the person to that job's `avoid` list; each Don't-send name has a × to undo, `rmAvoid`); JSZip built into the file; backups use the Share sheet on a phone (`shareFile`, only when the pointer is coarse and `navigator.canShare` accepts the file, otherwise the normal download; a cancelled share does not count as a backup). Not yet tried on a real iPhone. Still open: whether the copied schedule should hide home addresses and phones. |
| Nov 16, 2026 | Second review, then a fix release (2026.11.16-a). Mile limit: a lead past their limit never drives unless placed by hand, but may ride as a worker. Rebuild keeps people where they are unless moving saves more than about 5 minutes each. Forms keep typed text through background redraws. Restore: Merge is the highlighted choice. Ids read from files are cleaned (`cleanId`). History job keys get `#2`, `#3` when a name and time repeat on one day. Left for the owner to decide: whether the copied schedule should include home addresses and phones; a "keep off this job" choice on ×; building the unzip tool into the file; an iPhone share-sheet backup |
| Nov 17, 2026 | 2026.11.17-a: road time errors name the real reason. Found from the website showing “Couldn't reach OpenRouteService … use the website version” on the website itself: ORS refusals carry no CORS headers, so the browser reports every refusal as a network failure. |
| Nov 17, 2026 | 2026.11.17-b: backups and support packs carry every setting and tick box, only API keys left out (Justin). Found from the dispatcher's 16-b pack: no road time cache, empty History file, and the AI “read notes automatically” box and plain-English options were in no backup. Backup also carries the day being scheduled (offered on restore) and saved road times. |
| Nov 12, 2026 | "Scheduling for" day choice (Today / Tomorrow / date) on Today, so hand-typed jobs can be scheduled for the next day; schedule and History use it |
