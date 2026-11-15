# North Pole Mission Control

A Santa tracker built as a Microsoft Fabric App (preview) with the Rayfin SDK.
It follows the whole supply chain (toys built, gifts wrapped, sleigh loaded,
gifts delivered) and can replay any moment of the season for demos.

Everything runs in Fabric: the data lives in the app's SQL database in Fabric,
the server-side logic runs as Fabric App functions, and the front end is served
by Fabric App static hosting behind Fabric (Entra ID) sign-in.

## What is real and what is simulated

| Feed | Source | Notes |
| --- | --- | --- |
| Weather where the mission is right now | [Open-Meteo](https://open-meteo.com/) forecast API, called by the `ingestLiveFeed` function once a minute while someone has the app in live mode | Real data. No API key. Free tier is for non-commercial use (CC BY 4.0); commercial use needs their paid plan. |
| Toy production, wrapping, loading, the route and the mission log | The season plan generator in `packages/functions/src/plan.ts` | A deterministic simulation. Nobody publishes an official machine-readable Santa feed. The same year always gives the same plan, which is what makes replay exact. |

The app says this on screen, in the footer.

## How it fits together

```text
packages/data        Fabric SQL tables: Season, ToyLine, RouteStop,
                     ProductionSnapshot, MissionEvent, LiveReading
packages/functions   seedSeason     writes a season plan into Fabric (idempotent, resumable)
                     ingestLiveFeed Open-Meteo -> LiveReading (throttled to one call a minute)
packages/shared      record contracts shared by the three packages
packages/frontend    React app: supply-chain cards, snow-globe map, sleigh tracker,
                     weather feed, twelve toy workshops, the Gazette, replay bar
```

The front end reads the season from Fabric, then derives the picture for any
moment in time (`packages/frontend/src/mission/derive.ts`). Live mode uses the
real clock. Replay uses the same data with a clock you control: play, pause,
six speeds, a scrubber, and jump buttons for Workshop opens, Wrapping begins,
Sleigh loading, Takeoff, Milwaukee and Home stretch.

The season runs November 1 to December 25 (UTC). Live mode is available inside
that window; outside it the app opens in replay.

## The route

1,000 stops, flown east to west along the midnight line in 4-degree strips of
longitude, north to south down one strip and back up the next. Before the
sleigh heads home it stops in:

- all 195 countries the United Nations recognises (193 member states plus
  Vatican City and Palestine),
- all 50 US states,
- all 10 Canadian provinces and 3 territories.

The rest of the 1,000 are the world's largest cities, capped per country so
the whole globe lights up. They live in `packages/functions/src/cities.ts`;
city names and locations there come from GeoNames (https://www.geonames.org),
CC BY 4.0, and the app credits it in its footer.

A few other places get a visit too (Greenland, Puerto Rico, Taiwan, Kosovo,
New Caledonia); they are not counted in the country tally.
`packages/functions/src/plan.spec.ts` checks the coverage on every test run.
Changing the route means bumping `PLAN_VERSION` in
`packages/functions/src/plan.ts` and in
`packages/frontend/src/mission/backend.ts`.

## Watching it

- **Globe view** takes over during the flight: the 3D globe zooms in, a
  close-up atlas map follows the sleigh from town to town, and the other cards
  fold away behind one button. Switch views any time with the button top right.
- **Watch the story** plays the season by itself: one day a second until
  takeoff, then 30 minutes a second, so the flight lasts about 51 seconds.

## Public and crew modes

The app is public (`assetAccess: public` in `rayfin/rayfin.yml`): anyone with
the link sees Mission Control without signing in.

- **Visitors (signed out)** never touch the Fabric database or functions. The
  season is built in the browser by the same deterministic generator that
  fills Fabric SQL (`packages/functions/src/plan.ts`), so visitors and crew see
  the same Christmas, and a crowd of visitors costs the database nothing.
  Weather goes straight from Open-Meteo to the visitor's browser, at most once
  every ten minutes.
- **Crew (signed in with Fabric, via "Crew sign-in" at the foot of the page,
  or by opening the app inside Fabric)** read the season from Fabric SQL, can
  load or rebuild it, and their sessions pull weather into Fabric.

No table is open to anonymous access, so the tenant's "Anonymous data access"
setting is not needed. To make the app private again, set `assetAccess:
protected` and remove the `visitor` prop from `AuthGate` in
`packages/frontend/src/Root.tsx`.

## "Santa reaches you at..." and the bedtime tool

The app tells each viewer when Santa reaches them, and helps parents get
children to bed.

- **Where the viewer is.** With no prompt, the app knows only the browser's
  time zone and says so ("the Central Time zone", never a city). **Set my
  town** opens a box to type a town or a US ZIP code, or to let the browser
  share a location. There is no street-address lookup anywhere in the app, by
  design.
- **Nothing leaves the browser.** The town and ZIP lists ship with the app
  (`packages/frontend/src/assets/data`, downloaded only when the box is
  opened), so no outside service sees what a visitor types. The choice is kept
  in that browser's local storage; **Forget my town** removes it. The one
  exception: once a town is set, Santa's note asks Open-Meteo for the weather
  at that town rounded to a tenth of a degree (about 10 km).
- **A personal stop.** For public visitors the town becomes a stop on their
  own copy of the route. Signed-in crew, whose route comes from Fabric, get
  the nearest city's time instead.
- **Watch my visit** replays the approach in real time from **1 hour out** or
  **10 minutes out**, with **Speed up** and **Back to live**. It works on any
  night, at any hour.
- **Staged warnings**: a calm banner from an hour out, flashing red and green
  from 30 minutes, a final warning for the last 10, then a drawn rooftop
  landing. The flash is once a second and stops for reduced-motion settings.
- **Bedtime mode** is the flight view full screen (globe and close-up map)
  under one very large countdown. It opens by asking how far away Santa
  should be, and until he takes off the map rests on the viewer's town.

Town names come from GeoNames (CC BY 4.0). US ZIP codes come from the `zipcodes`
npm package (BSD), which draws on US government data.

## The Gazette

`packages/functions/src/gazette.ts` writes the season's paper: a story every
hour from November 1 to takeoff (every 15 minutes in the final day), tied to
the same production numbers the cards show, and a note from Santa at 09:00 UTC
each day. In the app Santa's note is pinned on its own card and gains a line
for the viewer (their town or time zone, their arrival time, the stops before
and after them). Those personal lines are added in the browser; the notes
stored in Fabric are the same for everyone.

## Mrs. Claus's Kitchen and the snow report

- **The cookie tracker** counts cookies baked, eaten (by the elves, the
  reindeer and Santa) and left in the jar, and on Christmas Eve the cookies
  and milk left out along the route. The numbers are formulas of the season
  clock in `packages/functions/src/cookies.ts`: simulation, like the toys, and
  nothing extra is stored. Mrs. Claus's notes (every third day) and the cookie
  headlines are Gazette entries, stored in Fabric with the rest.
- **Snow** on the ground and fresh snowfall are real, read from Open-Meteo by
  the viewer's browser every 15 minutes in live mode. The North Pole is sea
  ice and may have no snow-depth reading; the app then reports Alert, Nunavut,
  the nearest land weather post, and labels it. During the flight it reports
  the snow under the sleigh. The Fabric weather table is unchanged.

## The guide, the globe and the crew link

- **How it works** in the header opens a guide to every feature. First-time
  visitors get a one-time pointer to it.
- **The globe** can be dragged to turn and pinched or (in flight view and
  bedtime mode) wheeled to zoom. It returns to Santa four seconds after it is
  let go, or at once with **Back to Santa**.
- **Crew sign-in** only appears when the app is opened with the crew link: the
  normal address with `?crew` added. The public sees no sign-in at all. A
  sign-in that never reports back resets after 30 seconds.

## Letters to Santa

**Letters to Santa** is a wish list for each child in the house: start a letter
with a first name, add wishes with a picture, edit, reorder, cross off, print.
A **Grown-ups** side, behind a birth-year check, lets an adult tick wishes as
taken care of (hidden on the children's side) and throw a letter away.

- Letters are kept in the browser's local storage only. Nothing is sent to
  Fabric or to any other service.
- Names are limited to letters, 20 characters: first names or nicknames, no
  surnames, ages, birthdays or addresses.
- There are no shopping or affiliate links anywhere in the feature. Amazon's
  Associates program does not allow its links on sites directed at children,
  so none should be added without Amazon's written approval.

## Artwork

The banner, the title in globe view, the twelve toy paintings and the paintings
on the four stage cards are image files in `packages/frontend/src/assets`. They
were cut from the design mockups supplied for this app; see the README in that
folder to replace them. Everything else (frames, snow, seals, bars, the globe,
the map, Santa's sleigh) is drawn in code and updates live.

## Deploy

Prerequisites: Node.js 20 or later, a Fabric workspace on a Fabric capacity in
a region that supports Fabric Apps, and the "Fabric Apps (preview)" tenant
setting enabled.

```sh
npm install
npx rayfin login
npx rayfin up -n --workspace "<your workspace>"     # preview, changes nothing
npx rayfin up --workspace "<your workspace>"        # deploy
```

If `npm install` stops with "Cannot read properties of null (reading
'edgesOut')", that is an npm 10 bug: run `npx npm@11 install` instead.

Open the app URL the CLI prints, sign in, and press **Load Christmas <year>
into Fabric**. That writes about 1,350 rows and takes two or three minutes. If Fabric already holds a season written by an older version of the route, the button reads **Rebuild** and clears the old plan first. After that
the app opens straight into Mission Control.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

## Good to know

- Every signed-in user of the app can read and write the mission tables
  (`@authenticated('*')`). Functions use the caller's identity for data
  access, so the tables cannot be limited to function-only writes. Fine for a
  demo; tighten before wider use.
- Fabric App functions are invoked over HTTP and have no scheduler, so the
  live feed updates only while someone has the app open in live mode.
- The function schema in `packages/functions/src/types.ts` is generated by the
  Rayfin CLI. Do not edit it by hand; `npm run dev` regenerates it.
