/**
 * The North Pole Gazette's season of news: a story every hour from the day the
 * workshop opens until takeoff (every 15 minutes in the final day), and a
 * note from Santa every morning.
 *
 * Like the rest of the plan this is a deterministic SIMULATION: the same year
 * always prints the same paper. The numbers in the stories are read from the
 * same production curves the dashboard shows, so a headline never disagrees
 * with the cards beside it.
 */

import { cookiesBakedK, kitchenAt, TOTAL_COOKIES_K } from './cookies.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface GazetteLine {
  code: string;
  name: string;
  emoji: string;
  workshop: string;
  leadElf: string;
  targetK: number;
  at: (t: number) => { builtK: number; wrappedK: number; loadedK: number };
}

export interface GazetteTimeline {
  buildStart: number;
  wrapStart: number;
  loadStart: number;
  takeoff: number;
  landing: number;
}

export interface GazetteEvent {
  ts: number;
  stage: 'build' | 'wrap' | 'load' | 'flight';
  kind: string;
  title: string;
  detail?: string;
  lineCode?: string;
}

const toys = (k: number) =>
  k >= 1_000_000
    ? `${(k / 1_000_000).toFixed(2)} billion`
    : k >= 1000
      ? `${(k / 1000).toFixed(1)} million`
      : `${Math.max(0, Math.round(k)).toLocaleString('en-US')} thousand`;

/** Workshop colour: [headline, detail]. {elf}, {elf2}, {workshop} and {toy} are filled in. */
const COLOUR: [string, string][] = [
  ['☕ Cocoa cart reaches {workshop}', '{elf} orders extra marshmallows for the whole crew. Morale: very high.'],
  ['🦌 Reindeer flight practice over the ice shelf', 'Nine take-offs, nine landings. The lead lantern passed its fog test.'],
  ['🛷 Test run down Peppermint Hill', '{elf} clocks a new sled record and insists it was "purely for quality control".'],
  ['🔔 Bell choir rehearses in the rafters', '{workshop} worked the whole hour in time to the music.'],
  ['❄️ Fresh snow on the workshop roofs', 'The snow-shovel elves cleared the loading doors before the next shift.'],
  ['🧤 Mitten amnesty at the lost-and-found', 'Forty-one left mittens returned. {elf} claims three of them.'],
  ['🍪 Mrs. Claus sends cookies to {workshop}', 'Gingerbread, still warm. Production paused for exactly four minutes.'],
  ['📜 The Nice List grows again', 'The list-keepers added another long scroll overnight. Santa read every name twice.'],
  ['🎄 The great tree in the square is lit', 'One switch, ten thousand lights. {elf} did the honours.'],
  ['🧵 Ribbon delivery arrives by dog sled', 'Red, green and gold, enough to circle the Pole. The Wrapping Hall cheers.'],
  ['🔧 {elf} fixes a squeaky conveyor in {workshop}', 'One drop of peppermint oil. Silent ever since.'],
  ['🌌 Northern lights over the workshop', 'Every elf stepped outside for one minute to look up. Then straight back to work.'],
  ['🎺 Shift-change fanfare sounds', "The night crew hands {workshop} to the day crew with nothing left on the bench."],
  ['🧹 Sawdust sweep in {workshop}', '{elf} found a stray box of {toy} under the workbench. Dusted off and back on the shelf.'],
  ['🥕 Carrot delivery for the stables', 'The reindeer inspected every crate. All approved.'],
  ['📦 Box-folding contest in the Wrapping Hall', '{elf} folds 200 in an hour. {elf2} demands a recount.'],
  ['🕯️ Lanterns trimmed along Candy Cane Lane', 'The path from the workshops to the sleigh dock glows end to end.'],
  ['🧪 Quality check on the {toy} line', 'Every one tested by hand. {elf} signs the certificate with a flourish.'],
  ['✉️ Mailbag from the children arrives', 'The letter-readers are three sacks deep and smiling. Santa asked for the crayon ones first.'],
  ['🧊 Ice road to the sleigh dock re-smoothed', 'The dock crew skated it flat. Twice, for fun.'],
  ['🎶 {workshop} learns a new working song', '{elf} wrote the tune. It is about {toy}, and it is very catchy.'],
  ['🧣 Scarf weather at the Pole', 'The Weather Elf recommends two scarves. {elf} is wearing three.'],
  ['🔨 Tiny hammers, big hour in {workshop}', 'The tap-tap-tap could be heard from the stables.'],
  ['🛎️ Dinner bell: stew and star-shaped bread', 'The canteen fed every workshop in twenty minutes flat.'],
  ['🧭 Santa studies the route map', 'A thousand pins, one very long night. He moved none of them.'],
  ['🎁 Name-tag checkers double-check', 'Every tag read aloud by two elves. No mix-ups allowed.'],
  ['🪵 Firewood stacked for the Great Hall', '{elf} and {elf2} raced the wheelbarrows. Officially a tie.'],
  ['🦉 Night owl shift settles in', 'Quiet tools, soft lanterns, steady hands in {workshop}.'],
  ['🧁 Bake-off at the canteen', "{elf}'s peppermint cupcakes win by one vote. {elf2} baked the runner-up."],
  ['🎯 {workshop} hits its hourly mark early', '{elf} rings the little brass bell and the crew takes a bow.'],
  ['🛠️ New tool day in {workshop}', 'Fresh brushes, sharp chisels and one very shiny ruler.'],
  ['⛸️ Lunch-break skating on the pond', 'Back at the benches on time, cheeks red, spirits high.'],
  ['📯 Santa walks the workshop floor', 'He stopped at every bench in {workshop} and shook {elf} by the hand.'],
  ['🧶 Stocking knitters pass a milestone', 'Enough stockings to hang on every chimney on the route.'],
  ['🌟 Star polishers finish the tree toppers', 'Each one buffed until an elf could see their own hat in it.'],
  ['🚪 Sleigh hangar doors oiled', 'They open without a sound now. The reindeer prefer it.'],
  ['🎨 Paint delivery: twelve new reds', '{elf} cannot choose a favourite and is using all of them.'],
  ['🥛 Milk-and-cookie tasting panel meets', 'Purely for research, the panel says. Santa chaired it.'],
  ['🧸 {toy}: one goes back for a second look', '{elf} wanted a straighter bow on it. Standards are standards.'],
  ['🗺️ Chimney survey updated', 'New rooftops added to the map. No house gets missed.'],
  ['🎉 {workshop} celebrates a birthday', '{elf2} turns 312. There was cake, and then there was more work.'],
  ['💡 Bright idea from the suggestion box', '{elf} proposes hot-cocoa taps at every bench. Under serious review.'],
  ['🧼 Sleigh runners waxed', 'Two coats. You could see the northern lights in the shine.'],
  ['📚 Story hour for the youngest elves', "Tonight's tale: the year the fog rolled in and one red nose saved Christmas."],
  ['🪙 Jingle-bell tuning day', 'Each harness bell checked against the big brass one. All in key.'],
  ['🌨️ Snowball truce declared', 'Between {workshop} and the Wrapping Hall, until after Christmas.'],
  ['🧺 Laundry day for the red suit', 'Pressed, brushed and hung by the fire. The spare is ready too.'],
  ['🍪 Santa caught at the cookie jar again', 'He says he was counting them. Mrs. Claus has moved the jar to the top shelf.'],
  ['🥛 Fresh tray reaches {workshop}', 'Still warm from Mrs. Claus\'s oven. {elf} shared them out fairly, more or less.'],
  ['🏅 Elf of the hour: {elf}', 'For keeping {workshop} cheerful and on pace. The medal is made of chocolate.'],
];

const COOKIES_OF_THE_DAY = [
  'gingerbread elves with red-hot buttons',
  'snickerdoodles, rolled twice in cinnamon sugar',
  'peppermint bark shortbread',
  'sugar cookies with far too many sprinkles',
  'molasses crinkles',
  'chocolate chip, the big ones',
  'jam thumbprints, raspberry and apricot',
  'oatmeal raisin (the reindeer pick out the raisins)',
  'butter spritz in the shape of little trees',
  'double-chocolate snowcaps',
  'lemon stars with a sugar glaze',
  'almond crescents dusted like fresh snow',
];

/** What Mrs. Claus adds after the day's baking. {santa} is his running count. */
const KITCHEN_ASIDES = [
  'Santa has had {santa} this season. He calls it quality control; I call it Tuesday.',
  'I counted the jar before bed and again at breakfast. Someone in a red suit owes me an explanation.',
  'The elves in {workshop} sent the tray back empty and polished, bless them.',
  'I set a plate by the stable door. The reindeer like the carrot ones best.',
  'Santa came in "just to check the oven" three times before lunch.',
  'Every tray goes out warm. Cold cookies are for people who are not at the North Pole.',
  'I have hidden the next batch behind the flour. He never looks behind the flour.',
  'The kitchen smells of cinnamon from the cellar to the rafters, just as it should.',
];

const KITCHEN_REMINDERS = [
  'Do remember to leave a few out on Christmas Eve, dears. He works up an appetite.',
  'A glass of milk beside the plate is always appreciated.',
  'Be good, be kind, and save one cookie for someone else.',
  'If you bake this week, bake extra and share them.',
];

/** Sentences Santa opens with, about the day's progress. {pct}, {built}, {leader}, {elf}, {workshop}. */
const NOTE_PROGRESS = [
  'I walked the floor this morning and could not stop smiling: {built} toys built already, {pct}% of the way there.',
  'What a crew! {workshop} is leading the board today, and {elf} has every bench humming.',
  'The elves have outdone themselves again. {built} toys finished, and every one made with care.',
  "I peeked into {workshop} before breakfast. {elf}'s team was already hard at work, singing as they went.",
  'We are {pct}% of the way to a full sleigh, and I have never been prouder of this workshop.',
  'Mrs. Claus says I have been grinning all week. With {built} toys on the shelves, how could I not?',
  'Every day the shelves get fuller. {leader} are coming along beautifully, thanks to {elf}.',
  '{built} toys and counting. I checked the numbers twice, the way I check everything twice.',
  'The workshop is right on pace. I told {elf} so myself, and got a salute and a cookie in return.',
  'I tested a few toys this morning, strictly as part of my duties. {leader}: wonderful.',
];

/** What he is looking forward to. */
const NOTE_FORWARD = [
  'I cannot wait to bring them to all the good boys and girls.',
  'I keep thinking of the smiles on Christmas morning. That is why we do this.',
  'Every one of these is going to a child who has been kind this year, and there are so many of you.',
  'I am counting the days until I can deliver them to the good girls and boys around the world.',
  'Somewhere a child is being helpful right now, and one of these toys has their name on it.',
  'The reindeer are as eager as I am to get these to the good boys and girls.',
  'Being good is not always easy. I notice when you try, and I am looking forward to saying thank you.',
  'I can already picture the stockings. Keep being kind to each other until I get there.',
];

const NOTE_SLEEPS = [
  'Only {sleeps} to go!',
  '{sleeps} until Christmas.',
  'Just {sleeps} left.',
  '{sleeps} to go. Be good!',
];

const sleepsText = (n: number) => (n === 1 ? '1 sleep' : `${n} sleeps`);

const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');

/** The whole season of stories and notes, unsorted. */
export function buildGazette(tl: GazetteTimeline, lines: GazetteLine[], totalK: number): GazetteEvent[] {
  const events: GazetteEvent[] = [];
  const stageAt = (t: number): GazetteEvent['stage'] =>
    t < tl.wrapStart ? 'build' : t < tl.loadStart ? 'wrap' : t < tl.takeoff ? 'load' : 'flight';
  const totals = (t: number) =>
    lines.reduce(
      (sum, line) => {
        const now = line.at(t);
        return {
          builtK: sum.builtK + now.builtK,
          wrappedK: sum.wrappedK + now.wrappedK,
          loadedK: sum.loadedK + now.loadedK,
        };
      },
      { builtK: 0, wrappedK: 0, loadedK: 0 }
    );
  const leaderAt = (t: number) =>
    lines.reduce((best, line) =>
      line.at(t).builtK / line.targetK > best.at(t).builtK / best.targetK ? line : best
    );
  const sleeps = (t: number) => {
    const christmas = Date.UTC(new Date(tl.takeoff).getUTCFullYear(), 11, 25);
    return Math.max(0, Math.round((christmas - Math.floor(t / DAY) * DAY) / DAY));
  };

  // --- Stories: hourly, then every 15 minutes in the final day -------------
  const finalDay = tl.takeoff - DAY;
  const slots: number[] = [];
  for (let t = tl.buildStart + HOUR; t < finalDay; t += HOUR) slots.push(t);
  for (let t = finalDay; t < tl.takeoff; t += 15 * MINUTE) slots.push(t);

  slots.forEach((t, i) => {
    const stage = stageAt(t);
    const line = lines[(i * 5) % lines.length];
    const other = lines[(i * 5 + 3) % lines.length];
    const now = line.at(t);
    const before = line.at(t - HOUR);
    const all = totals(t);
    const allBefore = totals(t - HOUR);
    const pct = (part: number, whole: number) => Math.floor((part / whole) * 100);
    let title: string;
    let detail: string;
    let lineCode: string | undefined;

    const kind = i % 4;
    if (kind === 0) {
      // One toy line's numbers.
      lineCode = line.code;
      if (now.builtK <= 0) {
        title = `${line.emoji} ${line.workshop} is warming up`;
        detail = `Tools sharpened, benches cleared. ${line.leadElf} says the first ${line.name} are days away.`;
      } else if (now.loadedK > 0 && i % 8 === 0) {
        title = `🛷 ${toys(now.loadedK)} ${line.name} aboard the sleigh`;
        detail = `${pct(now.loadedK, line.targetK)}% of the line is loaded. ${line.leadElf} is checking the straps.`;
      } else if (now.builtK >= line.targetK) {
        title = `🎁 ${line.name}: ${toys(now.wrappedK)} wrapped`;
        detail =
          now.wrappedK >= line.targetK
            ? `Every one built, wrapped and tagged. ${line.leadElf}'s crew is helping at the dock.`
            : `The build is finished; ${toys(line.targetK - now.wrappedK)} still waiting for paper and ribbon.`;
      } else if (now.wrappedK > 0 && i % 8 === 4) {
        title = `🎀 ${line.name}: ${toys(now.wrappedK)} wrapped so far`;
        detail = `${toys(now.builtK - now.wrappedK)} more are built and waiting their turn in the Wrapping Hall.`;
      } else {
        title = `${line.emoji} ${line.name}: ${toys(now.builtK)} built`;
        detail = `${line.leadElf}'s crew in ${line.workshop} added ${toys(now.builtK - before.builtK)} in the last hour. ${pct(now.builtK, line.targetK)}% done.`;
      }
    } else if (kind === 2) {
      // The whole workshop's numbers.
      const variant = (i >> 2) % 5;
      const leader = leaderAt(t);
      if (variant === 0 || all.wrappedK <= 0) {
        title = `🏭 Workshop total: ${toys(all.builtK)} toys built`;
        detail = `${pct(all.builtK, totalK)}% of this season's ${toys(totalK)}. ${sleepsText(sleeps(t))} until Christmas.`;
      } else if (variant === 1) {
        title = `🎀 Wrapping Hall report: ${toys(all.wrappedK)} gifts wrapped`;
        detail = `${toys(all.builtK - all.wrappedK)} toys are waiting for paper, ribbon and a name tag.`;
      } else if (variant === 2) {
        title = `🏆 Leading the board: ${leader.name}`;
        detail = `${pct(leader.at(t).builtK, leader.targetK)}% built. ${leader.leadElf} says ${leader.workshop} is not slowing down.`;
      } else if (variant === 3 && all.loadedK > 0) {
        title = `🛷 Sleigh Dock: ${toys(all.loadedK)} gifts aboard`;
        detail = `${pct(all.loadedK, totalK)}% of the load is on. The dock crew packs in delivery order, last stop first.`;
      } else {
        title = `⏱️ Hourly pace: ${toys(Math.max(0, all.builtK - allBefore.builtK))} toys in the last hour`;
        detail = `That is every workshop together. Running total ${toys(all.builtK)}.`;
      }
    } else {
      const [headline, body] = COLOUR[(i * 7 + Math.floor(i / COLOUR.length)) % COLOUR.length];
      const values = {
        elf: line.leadElf,
        elf2: other.leadElf,
        workshop: line.workshop,
        toy: line.name,
      };
      title = fill(headline, values);
      detail = fill(body, values);
    }

    // The final day counts down out loud.
    if (t >= finalDay && i % 4 === 3) {
      const left = tl.takeoff - t;
      const hours = Math.floor(left / HOUR);
      const minutes = Math.round((left % HOUR) / MINUTE);
      title = `⏳ ${hours > 0 ? `${hours}h ` : ''}${minutes}m to takeoff`;
      detail =
        all.loadedK >= totalK
          ? 'The sleigh is full, the reindeer are harnessed, and Santa is checking his list one last time.'
          : `${toys(totalK - all.loadedK)} gifts still to load. The dock crew has never moved faster.`;
      lineCode = undefined;
    }

    events.push({ ts: t, stage, kind: 'story', title: title.slice(0, 160), detail: detail.slice(0, 400), lineCode });
  });

  // --- A note from Santa, every morning at nine ---------------------------
  const firstNote = tl.buildStart + 9 * HOUR;
  for (let t = firstNote, day = 0; t < tl.takeoff; t += DAY, day++) {
    const all = totals(t);
    const leader = leaderAt(t);
    const values = {
      built: toys(all.builtK),
      pct: `${Math.floor((all.builtK / totalK) * 100)}`,
      leader: leader.name,
      elf: leader.leadElf,
      workshop: leader.workshop,
      sleeps: sleepsText(sleeps(t)),
    };
    const dayStart = Math.floor(t / DAY) * DAY;
    let body: string;
    if (day === 0) {
      body =
        'Ho ho ho! The workshop whistle blew this morning and every elf was at their bench before it finished. A whole season of toys to make for the good boys and girls of the world, and I cannot think of anything I would rather do.';
    } else if (dayStart === Math.floor(tl.wrapStart / DAY) * DAY) {
      body =
        'The Wrapping Hall opened its doors today. Paper, ribbon and name tags as far as I can see! Each tag has the name of a child who has been good this year. I read a few aloud, and it made my morning.';
    } else if (dayStart === Math.floor(tl.loadStart / DAY) * DAY) {
      body =
        'We began loading the sleigh today. Seeing the first wrapped gifts go aboard gets me every year. The reindeer watched from the stable door, and I do believe they are as excited as I am to visit you.';
    } else if (t + DAY >= tl.takeoff) {
      body =
        'Tonight is the night! The sleigh is packed, the reindeer are fed and I have checked my list twice. Go to bed early, good boys and girls, and I will see to the rest. Merry Christmas!';
    } else {
      body = [
        fill(NOTE_PROGRESS[(day * 3) % NOTE_PROGRESS.length], values),
        NOTE_FORWARD[(day * 5) % NOTE_FORWARD.length],
        fill(NOTE_SLEEPS[day % NOTE_SLEEPS.length], values),
      ].join(' ');
    }
    events.push({ ts: t, stage: stageAt(t), kind: 'santa-note', title: 'A note from Santa', detail: body.slice(0, 400) });
  }
  events.push({
    ts: tl.landing + 10 * MINUTE,
    stage: 'flight',
    kind: 'santa-note',
    title: 'A note from Santa',
    detail:
      'Home again, boots off, cocoa in hand. Thank you to every elf, every reindeer, and most of all to the good boys and girls who made this trip worth making. Be kind to each other, and I will see you next year. Merry Christmas!',
  });

  // --- From Mrs. Claus's kitchen, every third afternoon ---------------------
  for (let t = tl.buildStart + DAY + 15 * HOUR, n = 0; t < tl.takeoff; t += 3 * DAY, n++) {
    const kitchen = kitchenAt(tl, t);
    const line = lines[(n * 5 + 2) % lines.length];
    const body = [
      `Today it is ${COOKIES_OF_THE_DAY[n % COOKIES_OF_THE_DAY.length]}. That makes ${toys(kitchen.bakedK)} cookies out of my oven this season.`,
      fill(KITCHEN_ASIDES[(n * 3) % KITCHEN_ASIDES.length], {
        santa: kitchen.santa.toLocaleString('en-US'),
        workshop: line.workshop,
      }),
      KITCHEN_REMINDERS[n % KITCHEN_REMINDERS.length],
    ].join(' ');
    events.push({
      ts: t,
      stage: stageAt(t),
      kind: 'mrs-claus-note',
      title: "From Mrs. Claus's kitchen",
      detail: body.slice(0, 400),
    });
  }

  // --- Cookie records ---------------------------------------------------------
  const records: [number, string, string][] = [
    [0.25, '🍪 Cookie count passes a quarter of the way', 'Mrs. Claus has not sat down since breakfast.'],
    [0.5, '🍪 Halfway to the cookie target', 'The oven has not cooled since November.'],
    [1_000_000 / TOTAL_COOKIES_K, '🍪 One billionth cookie out of the oven!', 'A gingerbread elf. Mrs. Claus gave it to the youngest apprentice.'],
    [0.9, '🍪 The last big batch begins', 'Every tray in the kitchen is in use, and three borrowed from the canteen.'],
  ];
  for (const [fraction, title, detail] of records) {
    const goal = TOTAL_COOKIES_K * fraction;
    for (let t = tl.buildStart; t < tl.takeoff; t += HOUR) {
      if (cookiesBakedK(tl, t) >= goal) {
        events.push({ ts: t + 30 * MINUTE, stage: stageAt(t), kind: 'story', title, detail: `${toys(cookiesBakedK(tl, t))} baked so far. ${detail}` });
        break;
      }
    }
  }

  return events;
}
