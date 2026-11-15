/**
 * The North Pole season plan — a deterministic SIMULATION.
 *
 * Nobody publishes an official machine-readable feed of Santa's workshop or
 * his flight, so this module generates the season's plan: toy lines, the
 * build / wrap / load production curves, the Christmas Eve route and the
 * mission log. The same year always produces the same plan, which is what
 * makes a season replayable. `seedSeason` writes the plan into the app's
 * Fabric SQL database; the app then reads it back from Fabric.
 *
 * Counts ending in `K` are THOUSANDS of toys.
 */

import { EXTRA_CITIES } from './cities.js';
import { buildGazette } from './gazette.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const TOTAL_TOYS_K = 2_400_000; // 2.4 billion toys

interface ToyLineSeed {
  code: string;
  name: string;
  emoji: string;
  workshop: string;
  leadElf: string;
  tagline: string;
  weight: number;
}

const TOY_LINES: ToyLineSeed[] = [
  { code: 'trains', name: 'Whistling Wooden Trains', emoji: '🚂', workshop: 'Tinker Hall', leadElf: 'Pip Tinselwick', tagline: 'Every whistle is tuned by ear, one toot at a time.', weight: 9 },
  { code: 'bears', name: 'Hug-Tested Teddy Bears', emoji: '🧸', workshop: 'The Stitchery', leadElf: 'Juniper Frostbutton', tagline: 'No bear ships until it passes three squeezes.', weight: 13 },
  { code: 'bricks', name: 'Build-Anything Bricks', emoji: '🧱', workshop: 'Brick Foundry', leadElf: 'Clove Stackwell', tagline: 'Castles, rockets, castle-rockets. Sorted by color at midnight.', weight: 13 },
  { code: 'sleds', name: 'Rocket Sleds', emoji: '🛷', workshop: 'The Wheelhouse', leadElf: 'Bramble Quickrunner', tagline: 'Waxed twice and test-ridden down Peppermint Hill.', weight: 6 },
  { code: 'robots', name: 'Wind-Up Robot Pals', emoji: '🤖', workshop: 'Spark Lab', leadElf: 'Fizz Copperkettle', tagline: 'Twelve turns of the key for one very good dance.', weight: 9 },
  { code: 'books', name: 'Pop-Up Storybooks', emoji: '📖', workshop: 'Print Loft', leadElf: 'Marigold Inkwhistle', tagline: 'Dragons that stand up when you turn the page.', weight: 11 },
  { code: 'dolls', name: 'Hand-Painted Dolls', emoji: '🪆', workshop: "Dollmakers' Row", leadElf: 'Saffron Bellweather', tagline: 'Every smile painted with a single-hair brush.', weight: 8 },
  { code: 'games', name: 'Family Game Night Sets', emoji: '🎲', workshop: 'Game Guild', leadElf: 'Nutmeg Rollingpin', tagline: 'Rules tested by elves who really hate to lose.', weight: 8 },
  { code: 'music', name: 'Snowfall Music Boxes', emoji: '🎶', workshop: 'Chime Tower', leadElf: 'Carol Silverpin', tagline: 'Each one plays a tune you have almost heard before.', weight: 6 },
  { code: 'dinos', name: 'Glow-in-the-Dark Dinosaurs', emoji: '🦖', workshop: 'Glow Works', leadElf: 'Ember Mossfoot', tagline: 'Charged under the northern lights for a full night.', weight: 7 },
  { code: 'kites', name: 'Northern Lights Kites', emoji: '🪁', workshop: 'Breeze Loft', leadElf: 'Wren Featherby', tagline: 'Silk tails dyed in the colors of the aurora.', weight: 5 },
  { code: 'globes', name: 'Shake-and-Sparkle Snow Globes', emoji: '❄️', workshop: 'Glass Garden', leadElf: 'Opal Wintermere', tagline: 'A tiny blizzard in every one, counted flake by flake.', weight: 5 },
];

interface StopSeed {
  city: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  /** Relative share of the gifts. */
  weight: number;
  usState?: string;
  caProvince?: string;
  /** True for a viewer's own house, added to their copy of the route only. */
  mine?: boolean;
}

/** A viewer's own location, for a personal stop on their copy of the route. */
export interface HomeStop {
  lat: number;
  lon: number;
  /** The town's name, when the viewer chose one. Never a street address. */
  name?: string;
}

/**
 * Bump when the plan's contents change (route, toy lines, timings). The app
 * compares this with the version stored in Fabric and offers a rebuild.
 */
export const PLAN_VERSION = 6;

/** The 27 member states of the European Union. */
export const EU_COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark',
  'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland',
  'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland',
  'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
];

/** The 50 US states. Every one has a stop. */
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana',
  'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
  'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

/** The 195 countries the United Nations recognises: 193 member states plus Vatican City and Palestine. Every one has a stop. */
export const WORLD_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia', 'Côte d\'Ivoire', 'DR Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'São Tomé and Príncipe', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkmenistan', 'Tuvalu', 'Türkiye', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

/** Canada's 10 provinces and 3 territories. Every one has a stop. */
export const CA_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Northwest Territories', 'Nunavut', 'Yukon',
];

/**
 * The hand-written stops: one for every country, US state and Canadian
 * province or territory, plus a few extras. A few places that are not among the 195 countries
 * (Greenland, Puerto Rico, Taiwan, Kosovo, New Caledonia) get a visit too;
 * they are simply not counted in the country tally.
 */
const CORE_STOPS: StopSeed[] = [
  { city: 'Algiers', country: 'Algeria', region: 'Africa', lat: 36.75, lon: 3.06, weight: 8 },
  { city: 'Luanda', country: 'Angola', region: 'Africa', lat: -8.84, lon: 13.23, weight: 7 },
  { city: 'Porto-Novo', country: 'Benin', region: 'Africa', lat: 6.5, lon: 2.63, weight: 3 },
  { city: 'Gaborone', country: 'Botswana', region: 'Africa', lat: -24.65, lon: 25.91, weight: 1 },
  { city: 'Ouagadougou', country: 'Burkina Faso', region: 'Africa', lat: 12.37, lon: -1.52, weight: 5 },
  { city: 'Gitega', country: 'Burundi', region: 'Africa', lat: -3.43, lon: 29.93, weight: 3 },
  { city: 'Praia', country: 'Cabo Verde', region: 'Africa', lat: 14.93, lon: -23.51, weight: 1 },
  { city: 'Yaoundé', country: 'Cameroon', region: 'Africa', lat: 3.87, lon: 11.52, weight: 6 },
  { city: 'Bangui', country: 'Central African Republic', region: 'Africa', lat: 4.39, lon: 18.56, weight: 2 },
  { city: 'N\'Djamena', country: 'Chad', region: 'Africa', lat: 12.13, lon: 15.06, weight: 4 },
  { city: 'Moroni', country: 'Comoros', region: 'Africa', lat: -11.7, lon: 43.26, weight: 1 },
  { city: 'Brazzaville', country: 'Congo', region: 'Africa', lat: -4.26, lon: 15.24, weight: 2 },
  { city: 'Kinshasa', country: 'DR Congo', region: 'Africa', lat: -4.44, lon: 15.27, weight: 18 },
  { city: 'Yamoussoukro', country: 'Côte d\'Ivoire', region: 'Africa', lat: 6.83, lon: -5.29, weight: 6 },
  { city: 'Djibouti', country: 'Djibouti', region: 'Africa', lat: 11.59, lon: 43.15, weight: 1 },
  { city: 'Cairo', country: 'Egypt', region: 'Africa', lat: 30.04, lon: 31.24, weight: 22 },
  { city: 'Malabo', country: 'Equatorial Guinea', region: 'Africa', lat: 3.75, lon: 8.78, weight: 1 },
  { city: 'Asmara', country: 'Eritrea', region: 'Africa', lat: 15.32, lon: 38.93, weight: 1 },
  { city: 'Mbabane', country: 'Eswatini', region: 'Africa', lat: -26.31, lon: 31.14, weight: 1 },
  { city: 'Addis Ababa', country: 'Ethiopia', region: 'Africa', lat: 9.03, lon: 38.74, weight: 18 },
  { city: 'Libreville', country: 'Gabon', region: 'Africa', lat: 0.42, lon: 9.47, weight: 1 },
  { city: 'Banjul', country: 'Gambia', region: 'Africa', lat: 13.45, lon: -16.58, weight: 1 },
  { city: 'Accra', country: 'Ghana', region: 'Africa', lat: 5.6, lon: -0.19, weight: 7 },
  { city: 'Conakry', country: 'Guinea', region: 'Africa', lat: 9.64, lon: -13.58, weight: 3 },
  { city: 'Bissau', country: 'Guinea-Bissau', region: 'Africa', lat: 11.86, lon: -15.6, weight: 1 },
  { city: 'Nairobi', country: 'Kenya', region: 'Africa', lat: -1.29, lon: 36.82, weight: 10 },
  { city: 'Maseru', country: 'Lesotho', region: 'Africa', lat: -29.31, lon: 27.48, weight: 1 },
  { city: 'Monrovia', country: 'Liberia', region: 'Africa', lat: 6.3, lon: -10.8, weight: 2 },
  { city: 'Tripoli', country: 'Libya', region: 'Africa', lat: 32.89, lon: 13.19, weight: 2 },
  { city: 'Antananarivo', country: 'Madagascar', region: 'Africa', lat: -18.88, lon: 47.51, weight: 6 },
  { city: 'Lilongwe', country: 'Malawi', region: 'Africa', lat: -13.96, lon: 33.77, weight: 4 },
  { city: 'Bamako', country: 'Mali', region: 'Africa', lat: 12.64, lon: -8.0, weight: 5 },
  { city: 'Nouakchott', country: 'Mauritania', region: 'Africa', lat: 18.08, lon: -15.98, weight: 1 },
  { city: 'Port Louis', country: 'Mauritius', region: 'Africa', lat: -20.16, lon: 57.5, weight: 1 },
  { city: 'Rabat', country: 'Morocco', region: 'Africa', lat: 34.02, lon: -6.84, weight: 5 },
  { city: 'Maputo', country: 'Mozambique', region: 'Africa', lat: -25.97, lon: 32.57, weight: 6 },
  { city: 'Windhoek', country: 'Namibia', region: 'Africa', lat: -22.56, lon: 17.08, weight: 1 },
  { city: 'Niamey', country: 'Niger', region: 'Africa', lat: 13.51, lon: 2.11, weight: 5 },
  { city: 'Abuja', country: 'Nigeria', region: 'Africa', lat: 9.06, lon: 7.49, weight: 20 },
  { city: 'Kigali', country: 'Rwanda', region: 'Africa', lat: -1.95, lon: 30.06, weight: 3 },
  { city: 'São Tomé', country: 'São Tomé and Príncipe', region: 'Africa', lat: 0.34, lon: 6.73, weight: 1 },
  { city: 'Dakar', country: 'Senegal', region: 'Africa', lat: 14.72, lon: -17.47, weight: 4 },
  { city: 'Victoria', country: 'Seychelles', region: 'Africa', lat: -4.62, lon: 55.45, weight: 1 },
  { city: 'Freetown', country: 'Sierra Leone', region: 'Africa', lat: 8.47, lon: -13.23, weight: 2 },
  { city: 'Mogadishu', country: 'Somalia', region: 'Africa', lat: 2.05, lon: 45.32, weight: 4 },
  { city: 'Pretoria', country: 'South Africa', region: 'Africa', lat: -25.75, lon: 28.19, weight: 6 },
  { city: 'Juba', country: 'South Sudan', region: 'Africa', lat: 4.85, lon: 31.58, weight: 3 },
  { city: 'Khartoum', country: 'Sudan', region: 'Africa', lat: 15.5, lon: 32.56, weight: 9 },
  { city: 'Dodoma', country: 'Tanzania', region: 'Africa', lat: -6.16, lon: 35.75, weight: 12 },
  { city: 'Lomé', country: 'Togo', region: 'Africa', lat: 6.13, lon: 1.22, weight: 2 },
  { city: 'Tunis', country: 'Tunisia', region: 'Africa', lat: 36.81, lon: 10.18, weight: 3 },
  { city: 'Kampala', country: 'Uganda', region: 'Africa', lat: 0.35, lon: 32.58, weight: 9 },
  { city: 'Lusaka', country: 'Zambia', region: 'Africa', lat: -15.39, lon: 28.32, weight: 4 },
  { city: 'Harare', country: 'Zimbabwe', region: 'Africa', lat: -17.83, lon: 31.05, weight: 4 },
  { city: 'Kabul', country: 'Afghanistan', region: 'Asia', lat: 34.53, lon: 69.17, weight: 9 },
  { city: 'Yerevan', country: 'Armenia', region: 'Asia', lat: 40.18, lon: 44.51, weight: 1 },
  { city: 'Baku', country: 'Azerbaijan', region: 'Asia', lat: 40.41, lon: 49.87, weight: 3 },
  { city: 'Manama', country: 'Bahrain', region: 'Asia', lat: 26.23, lon: 50.59, weight: 1 },
  { city: 'Dhaka', country: 'Bangladesh', region: 'Asia', lat: 23.81, lon: 90.41, weight: 24 },
  { city: 'Thimphu', country: 'Bhutan', region: 'Asia', lat: 27.47, lon: 89.64, weight: 1 },
  { city: 'Bandar Seri Begawan', country: 'Brunei', region: 'Asia', lat: 4.9, lon: 114.94, weight: 1 },
  { city: 'Phnom Penh', country: 'Cambodia', region: 'Asia', lat: 11.56, lon: 104.92, weight: 4 },
  { city: 'Beijing', country: 'China', region: 'Asia', lat: 39.9, lon: 116.41, weight: 28 },
  { city: 'Tbilisi', country: 'Georgia', region: 'Asia', lat: 41.72, lon: 44.83, weight: 1 },
  { city: 'Delhi', country: 'India', region: 'Asia', lat: 28.61, lon: 77.21, weight: 34 },
  { city: 'Jakarta', country: 'Indonesia', region: 'Asia', lat: -6.21, lon: 106.85, weight: 28 },
  { city: 'Tehran', country: 'Iran', region: 'Asia', lat: 35.69, lon: 51.39, weight: 14 },
  { city: 'Baghdad', country: 'Iraq', region: 'Asia', lat: 33.31, lon: 44.37, weight: 9 },
  { city: 'Tel Aviv', country: 'Israel', region: 'Asia', lat: 32.08, lon: 34.78, weight: 3 },
  { city: 'Tokyo', country: 'Japan', region: 'Asia', lat: 35.68, lon: 139.69, weight: 30 },
  { city: 'Amman', country: 'Jordan', region: 'Asia', lat: 31.95, lon: 35.93, weight: 3 },
  { city: 'Astana', country: 'Kazakhstan', region: 'Asia', lat: 51.17, lon: 71.43, weight: 4 },
  { city: 'Kuwait City', country: 'Kuwait', region: 'Asia', lat: 29.38, lon: 47.98, weight: 1 },
  { city: 'Bishkek', country: 'Kyrgyzstan', region: 'Asia', lat: 42.87, lon: 74.59, weight: 2 },
  { city: 'Vientiane', country: 'Laos', region: 'Asia', lat: 17.98, lon: 102.63, weight: 2 },
  { city: 'Beirut', country: 'Lebanon', region: 'Asia', lat: 33.89, lon: 35.5, weight: 2 },
  { city: 'Kuala Lumpur', country: 'Malaysia', region: 'Asia', lat: 3.14, lon: 101.69, weight: 8 },
  { city: 'Malé', country: 'Maldives', region: 'Asia', lat: 4.18, lon: 73.51, weight: 1 },
  { city: 'Ulaanbaatar', country: 'Mongolia', region: 'Asia', lat: 47.89, lon: 106.91, weight: 1 },
  { city: 'Naypyidaw', country: 'Myanmar', region: 'Asia', lat: 19.76, lon: 96.08, weight: 10 },
  { city: 'Kathmandu', country: 'Nepal', region: 'Asia', lat: 27.72, lon: 85.32, weight: 6 },
  { city: 'Pyongyang', country: 'North Korea', region: 'Asia', lat: 39.04, lon: 125.76, weight: 6 },
  { city: 'Muscat', country: 'Oman', region: 'Asia', lat: 23.59, lon: 58.41, weight: 1 },
  { city: 'Islamabad', country: 'Pakistan', region: 'Asia', lat: 33.68, lon: 73.05, weight: 12 },
  { city: 'Manila', country: 'Philippines', region: 'Asia', lat: 14.6, lon: 120.98, weight: 22 },
  { city: 'Doha', country: 'Qatar', region: 'Asia', lat: 25.29, lon: 51.53, weight: 1 },
  { city: 'Riyadh', country: 'Saudi Arabia', region: 'Asia', lat: 24.71, lon: 46.68, weight: 8 },
  { city: 'Singapore', country: 'Singapore', region: 'Asia', lat: 1.35, lon: 103.82, weight: 4 },
  { city: 'Seoul', country: 'South Korea', region: 'Asia', lat: 37.57, lon: 126.98, weight: 16 },
  { city: 'Colombo', country: 'Sri Lanka', region: 'Asia', lat: 6.93, lon: 79.86, weight: 5 },
  { city: 'Damascus', country: 'Syria', region: 'Asia', lat: 33.51, lon: 36.28, weight: 5 },
  { city: 'Dushanbe', country: 'Tajikistan', region: 'Asia', lat: 38.56, lon: 68.79, weight: 2 },
  { city: 'Bangkok', country: 'Thailand', region: 'Asia', lat: 13.76, lon: 100.5, weight: 16 },
  { city: 'Dili', country: 'Timor-Leste', region: 'Asia', lat: -8.56, lon: 125.57, weight: 1 },
  { city: 'Ankara', country: 'Türkiye', region: 'Asia', lat: 39.93, lon: 32.86, weight: 8 },
  { city: 'Ashgabat', country: 'Turkmenistan', region: 'Asia', lat: 37.96, lon: 58.33, weight: 1 },
  { city: 'Abu Dhabi', country: 'United Arab Emirates', region: 'Asia', lat: 24.45, lon: 54.38, weight: 2 },
  { city: 'Tashkent', country: 'Uzbekistan', region: 'Asia', lat: 41.3, lon: 69.24, weight: 8 },
  { city: 'Hanoi', country: 'Vietnam', region: 'Asia', lat: 21.03, lon: 105.85, weight: 20 },
  { city: 'Sanaa', country: 'Yemen', region: 'Asia', lat: 15.37, lon: 44.19, weight: 8 },
  { city: 'Ramallah', country: 'Palestine', region: 'Asia', lat: 31.9, lon: 35.2, weight: 2 },
  { city: 'Tirana', country: 'Albania', region: 'Europe', lat: 41.33, lon: 19.82, weight: 1 },
  { city: 'Andorra la Vella', country: 'Andorra', region: 'Europe', lat: 42.51, lon: 1.52, weight: 1 },
  { city: 'Vienna', country: 'Austria', region: 'Europe', lat: 48.21, lon: 16.37, weight: 3 },
  { city: 'Minsk', country: 'Belarus', region: 'Europe', lat: 53.9, lon: 27.56, weight: 3 },
  { city: 'Brussels', country: 'Belgium', region: 'Europe', lat: 50.85, lon: 4.35, weight: 4 },
  { city: 'Sarajevo', country: 'Bosnia and Herzegovina', region: 'Europe', lat: 43.86, lon: 18.41, weight: 1 },
  { city: 'Sofia', country: 'Bulgaria', region: 'Europe', lat: 42.7, lon: 23.32, weight: 2 },
  { city: 'Zagreb', country: 'Croatia', region: 'Europe', lat: 45.81, lon: 15.98, weight: 1 },
  { city: 'Nicosia', country: 'Cyprus', region: 'Europe', lat: 35.17, lon: 33.36, weight: 1 },
  { city: 'Prague', country: 'Czechia', region: 'Europe', lat: 50.08, lon: 14.44, weight: 4 },
  { city: 'Copenhagen', country: 'Denmark', region: 'Europe', lat: 55.68, lon: 12.57, weight: 2 },
  { city: 'Tallinn', country: 'Estonia', region: 'Europe', lat: 59.44, lon: 24.75, weight: 1 },
  { city: 'Helsinki', country: 'Finland', region: 'Europe', lat: 60.17, lon: 24.94, weight: 2 },
  { city: 'Paris', country: 'France', region: 'Europe', lat: 48.86, lon: 2.35, weight: 14 },
  { city: 'Berlin', country: 'Germany', region: 'Europe', lat: 52.52, lon: 13.4, weight: 16 },
  { city: 'Athens', country: 'Greece', region: 'Europe', lat: 37.98, lon: 23.73, weight: 4 },
  { city: 'Budapest', country: 'Hungary', region: 'Europe', lat: 47.5, lon: 19.04, weight: 4 },
  { city: 'Reykjavík', country: 'Iceland', region: 'Europe', lat: 64.15, lon: -21.94, weight: 1 },
  { city: 'Dublin', country: 'Ireland', region: 'Europe', lat: 53.35, lon: -6.26, weight: 2 },
  { city: 'Rome', country: 'Italy', region: 'Europe', lat: 41.9, lon: 12.5, weight: 12 },
  { city: 'Riga', country: 'Latvia', region: 'Europe', lat: 56.95, lon: 24.11, weight: 1 },
  { city: 'Vaduz', country: 'Liechtenstein', region: 'Europe', lat: 47.14, lon: 9.52, weight: 1 },
  { city: 'Vilnius', country: 'Lithuania', region: 'Europe', lat: 54.69, lon: 25.28, weight: 1 },
  { city: 'Luxembourg', country: 'Luxembourg', region: 'Europe', lat: 49.61, lon: 6.13, weight: 1 },
  { city: 'Valletta', country: 'Malta', region: 'Europe', lat: 35.9, lon: 14.51, weight: 1 },
  { city: 'Chișinău', country: 'Moldova', region: 'Europe', lat: 47.01, lon: 28.86, weight: 1 },
  { city: 'Monaco', country: 'Monaco', region: 'Europe', lat: 43.74, lon: 7.42, weight: 1 },
  { city: 'Podgorica', country: 'Montenegro', region: 'Europe', lat: 42.44, lon: 19.26, weight: 1 },
  { city: 'Amsterdam', country: 'Netherlands', region: 'Europe', lat: 52.37, lon: 4.9, weight: 5 },
  { city: 'Skopje', country: 'North Macedonia', region: 'Europe', lat: 42.0, lon: 21.43, weight: 1 },
  { city: 'Oslo', country: 'Norway', region: 'Europe', lat: 59.91, lon: 10.75, weight: 2 },
  { city: 'Warsaw', country: 'Poland', region: 'Europe', lat: 52.23, lon: 21.01, weight: 8 },
  { city: 'Lisbon', country: 'Portugal', region: 'Europe', lat: 38.72, lon: -9.14, weight: 3 },
  { city: 'Bucharest', country: 'Romania', region: 'Europe', lat: 44.43, lon: 26.1, weight: 5 },
  { city: 'Moscow', country: 'Russia', region: 'Europe', lat: 55.76, lon: 37.62, weight: 18 },
  { city: 'San Marino', country: 'San Marino', region: 'Europe', lat: 43.94, lon: 12.46, weight: 1 },
  { city: 'Belgrade', country: 'Serbia', region: 'Europe', lat: 44.79, lon: 20.45, weight: 2 },
  { city: 'Bratislava', country: 'Slovakia', region: 'Europe', lat: 48.15, lon: 17.11, weight: 2 },
  { city: 'Ljubljana', country: 'Slovenia', region: 'Europe', lat: 46.06, lon: 14.51, weight: 1 },
  { city: 'Madrid', country: 'Spain', region: 'Europe', lat: 40.42, lon: -3.7, weight: 10 },
  { city: 'Stockholm', country: 'Sweden', region: 'Europe', lat: 59.33, lon: 18.07, weight: 3 },
  { city: 'Bern', country: 'Switzerland', region: 'Europe', lat: 46.95, lon: 7.45, weight: 3 },
  { city: 'Kyiv', country: 'Ukraine', region: 'Europe', lat: 50.45, lon: 30.52, weight: 9 },
  { city: 'London', country: 'United Kingdom', region: 'Europe', lat: 51.51, lon: -0.13, weight: 14 },
  { city: 'Vatican City', country: 'Vatican City', region: 'Europe', lat: 41.9, lon: 12.45, weight: 1 },
  { city: 'St. John\'s', country: 'Antigua and Barbuda', region: 'North America', lat: 17.12, lon: -61.85, weight: 1 },
  { city: 'Nassau', country: 'Bahamas', region: 'North America', lat: 25.05, lon: -77.35, weight: 1 },
  { city: 'Bridgetown', country: 'Barbados', region: 'North America', lat: 13.1, lon: -59.61, weight: 1 },
  { city: 'Belmopan', country: 'Belize', region: 'North America', lat: 17.25, lon: -88.77, weight: 1 },
  { city: 'Ottawa', country: 'Canada', region: 'North America', lat: 45.42, lon: -75.7, weight: 3 },
  { city: 'San José', country: 'Costa Rica', region: 'North America', lat: 9.93, lon: -84.08, weight: 2 },
  { city: 'Havana', country: 'Cuba', region: 'North America', lat: 23.11, lon: -82.37, weight: 3 },
  { city: 'Roseau', country: 'Dominica', region: 'North America', lat: 15.3, lon: -61.39, weight: 1 },
  { city: 'Santo Domingo', country: 'Dominican Republic', region: 'North America', lat: 18.49, lon: -69.93, weight: 3 },
  { city: 'San Salvador', country: 'El Salvador', region: 'North America', lat: 13.69, lon: -89.22, weight: 2 },
  { city: 'St. George\'s', country: 'Grenada', region: 'North America', lat: 12.05, lon: -61.75, weight: 1 },
  { city: 'Guatemala City', country: 'Guatemala', region: 'North America', lat: 14.63, lon: -90.51, weight: 5 },
  { city: 'Port-au-Prince', country: 'Haiti', region: 'North America', lat: 18.59, lon: -72.31, weight: 3 },
  { city: 'Tegucigalpa', country: 'Honduras', region: 'North America', lat: 14.07, lon: -87.19, weight: 3 },
  { city: 'Kingston', country: 'Jamaica', region: 'North America', lat: 17.97, lon: -76.79, weight: 1 },
  { city: 'Mexico City', country: 'Mexico', region: 'North America', lat: 19.43, lon: -99.13, weight: 24 },
  { city: 'Managua', country: 'Nicaragua', region: 'North America', lat: 12.11, lon: -86.24, weight: 2 },
  { city: 'Panama City', country: 'Panama', region: 'North America', lat: 8.98, lon: -79.52, weight: 1 },
  { city: 'Basseterre', country: 'Saint Kitts and Nevis', region: 'North America', lat: 17.3, lon: -62.72, weight: 1 },
  { city: 'Castries', country: 'Saint Lucia', region: 'North America', lat: 14.01, lon: -60.99, weight: 1 },
  { city: 'Kingstown', country: 'Saint Vincent and the Grenadines', region: 'North America', lat: 13.16, lon: -61.23, weight: 1 },
  { city: 'Port of Spain', country: 'Trinidad and Tobago', region: 'North America', lat: 10.65, lon: -61.52, weight: 1 },
  { city: 'Washington, D.C.', country: 'United States', region: 'North America', lat: 38.91, lon: -77.04, weight: 6 },
  { city: 'Buenos Aires', country: 'Argentina', region: 'South America', lat: -34.6, lon: -58.38, weight: 12 },
  { city: 'La Paz', country: 'Bolivia', region: 'South America', lat: -16.5, lon: -68.15, weight: 3 },
  { city: 'Brasília', country: 'Brazil', region: 'South America', lat: -15.79, lon: -47.88, weight: 8 },
  { city: 'Santiago', country: 'Chile', region: 'South America', lat: -33.45, lon: -70.67, weight: 6 },
  { city: 'Bogotá', country: 'Colombia', region: 'South America', lat: 4.71, lon: -74.07, weight: 12 },
  { city: 'Quito', country: 'Ecuador', region: 'South America', lat: -0.18, lon: -78.47, weight: 4 },
  { city: 'Georgetown', country: 'Guyana', region: 'South America', lat: 6.8, lon: -58.16, weight: 1 },
  { city: 'Asunción', country: 'Paraguay', region: 'South America', lat: -25.26, lon: -57.58, weight: 2 },
  { city: 'Lima', country: 'Peru', region: 'South America', lat: -12.05, lon: -77.05, weight: 9 },
  { city: 'Paramaribo', country: 'Suriname', region: 'South America', lat: 5.85, lon: -55.2, weight: 1 },
  { city: 'Montevideo', country: 'Uruguay', region: 'South America', lat: -34.9, lon: -56.16, weight: 1 },
  { city: 'Caracas', country: 'Venezuela', region: 'South America', lat: 10.48, lon: -66.9, weight: 7 },
  { city: 'Canberra', country: 'Australia', region: 'Oceania', lat: -35.28, lon: 149.13, weight: 1 },
  { city: 'Suva', country: 'Fiji', region: 'Oceania', lat: -18.14, lon: 178.44, weight: 1 },
  { city: 'Tarawa', country: 'Kiribati', region: 'Oceania', lat: 1.45, lon: 173.03, weight: 1 },
  { city: 'Majuro', country: 'Marshall Islands', region: 'Oceania', lat: 7.09, lon: 171.38, weight: 1 },
  { city: 'Palikir', country: 'Micronesia', region: 'Oceania', lat: 6.92, lon: 158.16, weight: 1 },
  { city: 'Yaren', country: 'Nauru', region: 'Oceania', lat: -0.55, lon: 166.92, weight: 1 },
  { city: 'Wellington', country: 'New Zealand', region: 'Oceania', lat: -41.29, lon: 174.78, weight: 1 },
  { city: 'Ngerulmud', country: 'Palau', region: 'Oceania', lat: 7.5, lon: 134.62, weight: 1 },
  { city: 'Port Moresby', country: 'Papua New Guinea', region: 'Oceania', lat: -9.44, lon: 147.18, weight: 3 },
  { city: 'Apia', country: 'Samoa', region: 'Oceania', lat: -13.83, lon: -171.77, weight: 1 },
  { city: 'Honiara', country: 'Solomon Islands', region: 'Oceania', lat: -9.43, lon: 159.95, weight: 1 },
  { city: 'Nukuʻalofa', country: 'Tonga', region: 'Oceania', lat: -21.14, lon: -175.2, weight: 1 },
  { city: 'Funafuti', country: 'Tuvalu', region: 'Oceania', lat: -8.52, lon: 179.2, weight: 1 },
  { city: 'Port Vila', country: 'Vanuatu', region: 'Oceania', lat: -17.73, lon: 168.32, weight: 1 },
  { city: 'Anadyr', country: 'Russia', region: 'Asia', lat: 64.73, lon: 177.51, weight: 1 },
  { city: 'Vladivostok', country: 'Russia', region: 'Asia', lat: 43.12, lon: 131.89, weight: 2 },
  { city: 'Auckland', country: 'New Zealand', region: 'Oceania', lat: -36.85, lon: 174.76, weight: 3 },
  { city: 'Nouméa', country: 'New Caledonia', region: 'Oceania', lat: -22.27, lon: 166.44, weight: 1 },
  { city: 'Brisbane', country: 'Australia', region: 'Oceania', lat: -27.47, lon: 153.03, weight: 4 },
  { city: 'Sydney', country: 'Australia', region: 'Oceania', lat: -33.87, lon: 151.21, weight: 7 },
  { city: 'Melbourne', country: 'Australia', region: 'Oceania', lat: -37.81, lon: 144.96, weight: 7 },
  { city: 'Perth', country: 'Australia', region: 'Oceania', lat: -31.95, lon: 115.86, weight: 3 },
  { city: 'Sapporo', country: 'Japan', region: 'Asia', lat: 43.06, lon: 141.35, weight: 4 },
  { city: 'Shanghai', country: 'China', region: 'Asia', lat: 31.23, lon: 121.47, weight: 30 },
  { city: 'Hong Kong', country: 'China', region: 'Asia', lat: 22.32, lon: 114.17, weight: 10 },
  { city: 'Taipei', country: 'Taiwan', region: 'Asia', lat: 25.03, lon: 121.57, weight: 8 },
  { city: 'Kolkata', country: 'India', region: 'Asia', lat: 22.57, lon: 88.36, weight: 20 },
  { city: 'Mumbai', country: 'India', region: 'Asia', lat: 19.08, lon: 72.88, weight: 30 },
  { city: 'Karachi', country: 'Pakistan', region: 'Asia', lat: 24.86, lon: 67.01, weight: 18 },
  { city: 'Dubai', country: 'United Arab Emirates', region: 'Asia', lat: 25.2, lon: 55.27, weight: 4 },
  { city: 'Istanbul', country: 'Türkiye', region: 'Europe', lat: 41.01, lon: 28.98, weight: 14 },
  { city: 'Pristina', country: 'Kosovo', region: 'Europe', lat: 42.66, lon: 21.17, weight: 1 },
  { city: 'Rovaniemi', country: 'Finland', region: 'Europe', lat: 66.5, lon: 25.72, weight: 1 },
  { city: 'Johannesburg', country: 'South Africa', region: 'Africa', lat: -26.2, lon: 28.05, weight: 8 },
  { city: 'Cape Town', country: 'South Africa', region: 'Africa', lat: -33.92, lon: 18.42, weight: 5 },
  { city: 'Lagos', country: 'Nigeria', region: 'Africa', lat: 6.52, lon: 3.38, weight: 20 },
  { city: 'Casablanca', country: 'Morocco', region: 'Africa', lat: 33.57, lon: -7.59, weight: 5 },
  { city: 'Rio de Janeiro', country: 'Brazil', region: 'South America', lat: -22.91, lon: -43.17, weight: 12 },
  { city: 'São Paulo', country: 'Brazil', region: 'South America', lat: -23.55, lon: -46.63, weight: 24 },
  { city: 'Nuuk', country: 'Greenland', region: 'North America', lat: 64.18, lon: -51.72, weight: 1 },
  { city: 'San Juan', country: 'Puerto Rico', region: 'North America', lat: 18.47, lon: -66.11, weight: 2 },
  { city: 'Birmingham', country: 'United States', region: 'North America', lat: 33.52, lon: -86.8, weight: 3, usState: 'Alabama' },
  { city: 'Anchorage', country: 'United States', region: 'North America', lat: 61.22, lon: -149.9, weight: 1, usState: 'Alaska' },
  { city: 'Phoenix', country: 'United States', region: 'North America', lat: 33.45, lon: -112.07, weight: 6, usState: 'Arizona' },
  { city: 'Little Rock', country: 'United States', region: 'North America', lat: 34.75, lon: -92.29, weight: 2, usState: 'Arkansas' },
  { city: 'Los Angeles', country: 'United States', region: 'North America', lat: 34.05, lon: -118.24, weight: 16, usState: 'California' },
  { city: 'Denver', country: 'United States', region: 'North America', lat: 39.74, lon: -104.99, weight: 5, usState: 'Colorado' },
  { city: 'Hartford', country: 'United States', region: 'North America', lat: 41.76, lon: -72.68, weight: 2, usState: 'Connecticut' },
  { city: 'Wilmington', country: 'United States', region: 'North America', lat: 39.74, lon: -75.55, weight: 1, usState: 'Delaware' },
  { city: 'Miami', country: 'United States', region: 'North America', lat: 25.76, lon: -80.19, weight: 8, usState: 'Florida' },
  { city: 'Atlanta', country: 'United States', region: 'North America', lat: 33.75, lon: -84.39, weight: 7, usState: 'Georgia' },
  { city: 'Honolulu', country: 'United States', region: 'North America', lat: 21.31, lon: -157.86, weight: 2, usState: 'Hawaii' },
  { city: 'Boise', country: 'United States', region: 'North America', lat: 43.62, lon: -116.2, weight: 2, usState: 'Idaho' },
  { city: 'Chicago', country: 'United States', region: 'North America', lat: 41.88, lon: -87.63, weight: 12, usState: 'Illinois' },
  { city: 'Indianapolis', country: 'United States', region: 'North America', lat: 39.77, lon: -86.16, weight: 4, usState: 'Indiana' },
  { city: 'Des Moines', country: 'United States', region: 'North America', lat: 41.59, lon: -93.62, weight: 2, usState: 'Iowa' },
  { city: 'Wichita', country: 'United States', region: 'North America', lat: 37.69, lon: -97.34, weight: 2, usState: 'Kansas' },
  { city: 'Louisville', country: 'United States', region: 'North America', lat: 38.25, lon: -85.76, weight: 3, usState: 'Kentucky' },
  { city: 'New Orleans', country: 'United States', region: 'North America', lat: 29.95, lon: -90.07, weight: 3, usState: 'Louisiana' },
  { city: 'Portland', country: 'United States', region: 'North America', lat: 43.66, lon: -70.26, weight: 1, usState: 'Maine' },
  { city: 'Baltimore', country: 'United States', region: 'North America', lat: 39.29, lon: -76.61, weight: 4, usState: 'Maryland' },
  { city: 'Boston', country: 'United States', region: 'North America', lat: 42.36, lon: -71.06, weight: 6, usState: 'Massachusetts' },
  { city: 'Detroit', country: 'United States', region: 'North America', lat: 42.33, lon: -83.05, weight: 6, usState: 'Michigan' },
  { city: 'Minneapolis', country: 'United States', region: 'North America', lat: 44.98, lon: -93.27, weight: 4, usState: 'Minnesota' },
  { city: 'Jackson', country: 'United States', region: 'North America', lat: 32.3, lon: -90.18, weight: 2, usState: 'Mississippi' },
  { city: 'Kansas City', country: 'United States', region: 'North America', lat: 39.1, lon: -94.58, weight: 3, usState: 'Missouri' },
  { city: 'Billings', country: 'United States', region: 'North America', lat: 45.78, lon: -108.5, weight: 1, usState: 'Montana' },
  { city: 'Omaha', country: 'United States', region: 'North America', lat: 41.26, lon: -95.93, weight: 2, usState: 'Nebraska' },
  { city: 'Las Vegas', country: 'United States', region: 'North America', lat: 36.17, lon: -115.14, weight: 3, usState: 'Nevada' },
  { city: 'Manchester', country: 'United States', region: 'North America', lat: 42.99, lon: -71.45, weight: 1, usState: 'New Hampshire' },
  { city: 'Newark', country: 'United States', region: 'North America', lat: 40.74, lon: -74.17, weight: 5, usState: 'New Jersey' },
  { city: 'Albuquerque', country: 'United States', region: 'North America', lat: 35.08, lon: -106.65, weight: 2, usState: 'New Mexico' },
  { city: 'New York', country: 'United States', region: 'North America', lat: 40.71, lon: -74.01, weight: 24, usState: 'New York' },
  { city: 'Charlotte', country: 'United States', region: 'North America', lat: 35.23, lon: -80.84, weight: 5, usState: 'North Carolina' },
  { city: 'Fargo', country: 'United States', region: 'North America', lat: 46.88, lon: -96.79, weight: 1, usState: 'North Dakota' },
  { city: 'Columbus', country: 'United States', region: 'North America', lat: 39.96, lon: -83.0, weight: 5, usState: 'Ohio' },
  { city: 'Oklahoma City', country: 'United States', region: 'North America', lat: 35.47, lon: -97.52, weight: 3, usState: 'Oklahoma' },
  { city: 'Portland', country: 'United States', region: 'North America', lat: 45.52, lon: -122.68, weight: 3, usState: 'Oregon' },
  { city: 'Philadelphia', country: 'United States', region: 'North America', lat: 39.95, lon: -75.17, weight: 7, usState: 'Pennsylvania' },
  { city: 'Providence', country: 'United States', region: 'North America', lat: 41.82, lon: -71.41, weight: 1, usState: 'Rhode Island' },
  { city: 'Charleston', country: 'United States', region: 'North America', lat: 32.78, lon: -79.93, weight: 3, usState: 'South Carolina' },
  { city: 'Sioux Falls', country: 'United States', region: 'North America', lat: 43.55, lon: -96.73, weight: 1, usState: 'South Dakota' },
  { city: 'Nashville', country: 'United States', region: 'North America', lat: 36.16, lon: -86.78, weight: 4, usState: 'Tennessee' },
  { city: 'Dallas', country: 'United States', region: 'North America', lat: 32.78, lon: -96.8, weight: 9, usState: 'Texas' },
  { city: 'Salt Lake City', country: 'United States', region: 'North America', lat: 40.76, lon: -111.89, weight: 2, usState: 'Utah' },
  { city: 'Burlington', country: 'United States', region: 'North America', lat: 44.48, lon: -73.21, weight: 1, usState: 'Vermont' },
  { city: 'Richmond', country: 'United States', region: 'North America', lat: 37.54, lon: -77.44, weight: 4, usState: 'Virginia' },
  { city: 'Seattle', country: 'United States', region: 'North America', lat: 47.61, lon: -122.33, weight: 6, usState: 'Washington' },
  { city: 'Charleston', country: 'United States', region: 'North America', lat: 38.35, lon: -81.63, weight: 1, usState: 'West Virginia' },
  { city: 'Milwaukee', country: 'United States', region: 'North America', lat: 43.04, lon: -87.91, weight: 3, usState: 'Wisconsin' },
  { city: 'Cheyenne', country: 'United States', region: 'North America', lat: 41.14, lon: -104.82, weight: 1, usState: 'Wyoming' },
  { city: 'Calgary', country: 'Canada', region: 'North America', lat: 51.05, lon: -114.07, weight: 3, caProvince: 'Alberta' },
  { city: 'Vancouver', country: 'Canada', region: 'North America', lat: 49.28, lon: -123.12, weight: 4, caProvince: 'British Columbia' },
  { city: 'Winnipeg', country: 'Canada', region: 'North America', lat: 49.9, lon: -97.14, weight: 2, caProvince: 'Manitoba' },
  { city: 'Fredericton', country: 'Canada', region: 'North America', lat: 45.96, lon: -66.64, weight: 1, caProvince: 'New Brunswick' },
  { city: 'St. John\'s', country: 'Canada', region: 'North America', lat: 47.56, lon: -52.71, weight: 1, caProvince: 'Newfoundland and Labrador' },
  { city: 'Halifax', country: 'Canada', region: 'North America', lat: 44.65, lon: -63.58, weight: 2, caProvince: 'Nova Scotia' },
  { city: 'Toronto', country: 'Canada', region: 'North America', lat: 43.65, lon: -79.38, weight: 8, caProvince: 'Ontario' },
  { city: 'Charlottetown', country: 'Canada', region: 'North America', lat: 46.24, lon: -63.13, weight: 1, caProvince: 'Prince Edward Island' },
  { city: 'Montréal', country: 'Canada', region: 'North America', lat: 45.5, lon: -73.57, weight: 6, caProvince: 'Quebec' },
  { city: 'Regina', country: 'Canada', region: 'North America', lat: 50.45, lon: -104.62, weight: 1, caProvince: 'Saskatchewan' },
  { city: 'Yellowknife', country: 'Canada', region: 'North America', lat: 62.45, lon: -114.37, weight: 1, caProvince: 'Northwest Territories' },
  { city: 'Iqaluit', country: 'Canada', region: 'North America', lat: 63.75, lon: -68.52, weight: 1, caProvince: 'Nunavut' },
  { city: 'Whitehorse', country: 'Canada', region: 'North America', lat: 60.72, lon: -135.06, weight: 1, caProvince: 'Yukon' },
];

export interface SeasonTimeline {
  buildStart: number;
  wrapStart: number;
  loadStart: number;
  loadEnd: number;
  takeoff: number;
  landing: number;
}

export function seasonTimeline(year: number): SeasonTimeline {
  return {
    buildStart: Date.UTC(year, 10, 1),
    wrapStart: Date.UTC(year, 10, 15),
    loadStart: Date.UTC(year, 11, 20),
    loadEnd: Date.UTC(year, 11, 24, 10, 30),
    // 12:00 UTC on Dec 24 is midnight on the date line. Santa leaves the Pole
    // an hour earlier, then rides the midnight meridian west around the
    // planet, reaching each stop at about local solar midnight.
    takeoff: Date.UTC(year, 11, 24, 11),
    landing: Date.UTC(year, 11, 25, 13, 0),
  };
}

export type PlanEntity =
  | 'Season'
  | 'ToyLine'
  | 'RouteStop'
  | 'ProductionSnapshot'
  | 'MissionEvent';

export interface PlanRow {
  entity: PlanEntity;
  key: string;
  row: Record<string, unknown>;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** Steady pace with a gentle ramp-up and wind-down. */
const pace = (x: number) => {
  const c = clamp01(x);
  return 0.45 * c + 0.55 * c * c * (3 - 2 * c);
};

function shareOut(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const out = weights.map((w) => Math.round((w / sum) * total));
  out[out.length - 1] += total - out.reduce((a, b) => a + b, 0);
  return out;
}

interface LineCurve {
  code: string;
  name: string;
  emoji: string;
  leadElf: string;
  targetK: number;
  at: (t: number) => { builtK: number; wrappedK: number; loadedK: number };
}

function lineCurves(tl: SeasonTimeline): LineCurve[] {
  const targets = shareOut(
    TOY_LINES.map((l) => l.weight),
    TOTAL_TOYS_K
  );
  const buildEnd = tl.takeoff - 1.9 * DAY;
  const wrapEnd = tl.takeoff - 0.7 * DAY;
  return TOY_LINES.map((line, i) => {
    const bStart = tl.buildStart + i * 0.6 * DAY;
    const bEnd = buildEnd - (TOY_LINES.length - 1 - i) * 0.35 * DAY;
    const wStart = tl.wrapStart + i * 0.4 * DAY;
    const targetK = targets[i];
    return {
      code: line.code,
      name: line.name,
      emoji: line.emoji,
      leadElf: line.leadElf,
      targetK,
      at: (t: number) => {
        const built = pace((t - bStart) / (bEnd - bStart));
        const wrapped = Math.min(built, pace((t - wStart) / (wrapEnd - wStart)));
        const loaded = Math.min(
          wrapped,
          clamp01((t - tl.loadStart) / (tl.loadEnd - tl.loadStart))
        );
        return {
          builtK: Math.round(built * targetK),
          wrappedK: Math.round(wrapped * targetK),
          loadedK: Math.round(loaded * targetK),
        };
      },
    };
  });
}

/** First hour at which `fraction` of the line's target is reached for a counter. */
function whenReached(
  curve: LineCurve,
  counter: 'builtK' | 'wrappedK',
  fraction: number,
  from: number,
  to: number
): number {
  const goal = Math.round(curve.targetK * fraction);
  for (let t = from; t <= to; t += HOUR) {
    if (curve.at(t)[counter] >= goal) return t;
  }
  return to;
}

const fmtToys = (k: number) =>
  k >= 1_000_000
    ? `${(k / 1_000_000).toFixed(2)} billion`
    : k >= 1000
      ? `${(k / 1000).toFixed(1)} million`
      : `${k.toLocaleString('en-US')} thousand`;
const REGION_OF = new Map(CORE_STOPS.map((s) => [s.country, s.region]));

/** Every stop on the route: the hand-written stops plus the big-city list. */
const STOPS: StopSeed[] = [
  ...CORE_STOPS,
  ...EXTRA_CITIES.map(([city, country, lat, lon, weight, sub]): StopSeed => ({
    city,
    country,
    region: REGION_OF.get(country) ?? 'Asia',
    lat,
    lon,
    weight,
    usState: country === 'United States' ? sub : undefined,
    caProvince: country === 'Canada' ? sub : undefined,
  })),
];

/** Builds the full deterministic plan for a season, in a stable order. */
/**
 * `home` adds one personal stop ("Your house") for a viewer watching in their
 * own browser. It is never passed when the plan is written to Fabric, so the
 * stored season always has the standard route.
 */
export function buildSeasonPlan(year: number, home?: HomeStop): PlanRow[] {
  const tl = seasonTimeline(year);
  const rows: PlanRow[] = [];

  // --- Route -------------------------------------------------------------
  // East to west in 4-degree strips of longitude, sweeping north to south down
  // one strip and back up the next, so the sleigh snakes around the globe
  // instead of zig-zagging between hemispheres.
  const strip = (s: StopSeed) => Math.floor((180 - s.lon) / 4);
  const allStops = [...STOPS];
  if (home && Number.isFinite(home.lat) && Number.isFinite(home.lon)) {
    const lat = Math.max(-89, Math.min(89, home.lat));
    const lon = Math.max(-179.9, Math.min(179.9, home.lon));
    // Borrow the region of the nearest city so the map and log read sensibly.
    const nearest = STOPS.reduce((best, stop) =>
      Math.hypot(stop.lat - lat, (stop.lon - lon) * Math.cos((lat * Math.PI) / 180)) <
      Math.hypot(best.lat - lat, (best.lon - lon) * Math.cos((lat * Math.PI) / 180))
        ? stop
        : best
    );
    const city = home.name?.trim().slice(0, 80) || 'Your house';
    allStops.push({ city, country: nearest.country, region: nearest.region, lat, lon, weight: 0, mine: true });
  }
  const ordered = allStops.sort((a, b) => {
    const sa = strip(a);
    const sb = strip(b);
    if (sa !== sb) return sa - sb;
    return (sa % 2 === 0 ? b.lat - a.lat : a.lat - b.lat) || b.lon - a.lon;
  });
  const gifts = shareOut(
    ordered.map((s) => s.weight),
    TOTAL_TOYS_K
  );
  const dateLineMidnight = Date.UTC(year, 11, 24, 12);
  let cumulativeK = 0;
  let previousDeparture = tl.takeoff + 10 * 60_000;
  const stops = ordered.map((s, i) => {
    const { city, country, region, lat, lon, weight, usState, caProvince, mine } = s;
    const solar = dateLineMidnight + ((180 - lon) / 15) * HOUR;
    // Local midnight where he can, but with 1,000 stops the crowded
    // longitudes run a little late and he catches up over the oceans.
    const arrival = Math.max(solar, previousDeparture + 12_000);
    const dwell = mine ? 30_000 : Math.min(30_000, 10_000 + weight * 1000);
    const departure = arrival + dwell;
    previousDeparture = departure;
    cumulativeK += gifts[i];
    return {
      seq: i + 1,
      city,
      country,
      region,
      lat,
      lon,
      arrival,
      departure,
      giftsK: gifts[i],
      cumulativeK,
      usState,
      caProvince,
      bloc: !mine && EU_COUNTRIES.includes(country) ? 'EU' : undefined,
      tally: !mine && WORLD_COUNTRIES.includes(country) ? 'UN' : undefined,
      ...(mine ? { mine: true } : {}),
    };
  });

  rows.push({
    entity: 'Season',
    key: `${year}`,
    row: {
      year,
      name: `Christmas ${year}`,
      buildStart: new Date(tl.buildStart),
      wrapStart: new Date(tl.wrapStart),
      loadStart: new Date(tl.loadStart),
      takeoff: new Date(tl.takeoff),
      landing: new Date(tl.landing),
      totalToysK: TOTAL_TOYS_K,
      stopCount: stops.length,
      planVersion: PLAN_VERSION,
    },
  });

  // --- Toy lines -----------------------------------------------------------
  const curves = lineCurves(tl);
  TOY_LINES.forEach((line, i) => {
    rows.push({
      entity: 'ToyLine',
      key: `${year}:line:${line.code}`,
      row: {
        season: year,
        code: line.code,
        name: line.name,
        emoji: line.emoji,
        workshop: line.workshop,
        leadElf: line.leadElf,
        tagline: line.tagline,
        targetK: curves[i].targetK,
        sortOrder: i + 1,
      },
    });
  });

  for (const stop of stops) {
    rows.push({
      entity: 'RouteStop',
      key: `${year}:stop:${stop.seq}`,
      row: {
        season: year,
        ...stop,
        arrival: new Date(stop.arrival),
        departure: new Date(stop.departure),
      },
    });
  }

  // --- Production snapshots: daily, plus the final hours before takeoff ---
  const snapshotTimes: number[] = [];
  for (let t = tl.buildStart; t < tl.takeoff; t += DAY) snapshotTimes.push(t);
  snapshotTimes.push(tl.takeoff - 12 * HOUR, tl.loadEnd, tl.takeoff);
  const uniqueTimes = [...new Set(snapshotTimes)].sort((a, b) => a - b);
  for (const t of uniqueTimes) {
    for (const curve of curves) {
      rows.push({
        entity: 'ProductionSnapshot',
        key: `${year}:prod:${curve.code}:${Math.round(t / 60_000)}`,
        row: { season: year, ts: new Date(t), lineCode: curve.code, ...curve.at(t) },
      });
    }
  }

  // --- Mission log -----------------------------------------------------------
  const events: {
    ts: number;
    stage: 'build' | 'wrap' | 'load' | 'flight';
    kind: string;
    title: string;
    detail?: string;
    stopSeq?: number;
    lineCode?: string;
  }[] = [];

  events.push(
    {
      ts: tl.buildStart,
      stage: 'build',
      kind: 'stage',
      title: `The workshop whistle blows: Christmas ${year} production begins`,
      detail: `Twelve workshops, one goal: ${fmtToys(TOTAL_TOYS_K)} toys before takeoff.`,
    },
    {
      ts: tl.wrapStart,
      stage: 'wrap',
      kind: 'stage',
      title: 'The Wrapping Hall opens its doors',
      detail: 'Paper, ribbon and name tags start flowing behind the build lines.',
    },
    {
      ts: tl.loadStart,
      stage: 'load',
      kind: 'stage',
      title: 'Sleigh loading begins at Dock 1',
      detail: 'Wrapped gifts are sorted into delivery order, last stop first.',
    },
    {
      ts: tl.takeoff - 6 * HOUR,
      stage: 'load',
      kind: 'preflight',
      title: 'Reindeer pre-flight checks complete',
      detail: 'Nine for nine. Harness bells polished, lead lantern at full glow.',
    },
    {
      ts: tl.loadEnd,
      stage: 'load',
      kind: 'stage',
      title: 'Sleigh fully loaded',
      detail: `${fmtToys(TOTAL_TOYS_K)} gifts aboard. Doors sealed.`,
    },
    {
      ts: tl.takeoff,
      stage: 'flight',
      kind: 'takeoff',
      title: 'Santa is airborne!',
      detail: 'Cleared from the North Pole, heading for the date line.',
    },
    {
      ts: tl.landing,
      stage: 'flight',
      kind: 'landing',
      title: 'Santa is home. Mission complete!',
      detail: `${stops.length} stops: every country on Earth, all 50 US states and every Canadian province and territory. ${fmtToys(TOTAL_TOYS_K)} gifts delivered. Merry Christmas!`,
    }
  );

  for (const curve of curves) {
    for (const pct of [25, 50, 75, 100]) {
      events.push({
        ts: whenReached(curve, 'builtK', pct / 100, tl.buildStart, tl.takeoff),
        stage: 'build',
        kind: 'build-milestone',
        title:
          pct === 100
            ? `${curve.emoji} ${curve.name}: every last one built!`
            : `${curve.emoji} ${curve.name}: ${pct}% built`,
        detail:
          pct === 100
            ? `${curve.leadElf} rings the workshop bell. ${fmtToys(curve.targetK)} finished.`
            : `${fmtToys(Math.round((curve.targetK * pct) / 100))} of ${fmtToys(curve.targetK)}. ${curve.leadElf}'s crew is on pace.`,
        lineCode: curve.code,
      });
    }
    for (const pct of [50, 100]) {
      events.push({
        ts: whenReached(curve, 'wrappedK', pct / 100, tl.wrapStart, tl.takeoff),
        stage: 'wrap',
        kind: 'wrap-milestone',
        title:
          pct === 100
            ? `🎁 ${curve.name}: every gift wrapped and tagged`
            : `🎀 ${curve.name}: halfway through wrapping`,
        detail: `${fmtToys(Math.round((curve.targetK * pct) / 100))} wrapped.`,
        lineCode: curve.code,
      });
    }
  }

  for (const stop of stops) {
    const mine = 'mine' in stop;
    events.push({
      ts: stop.departure,
      stage: 'flight',
      kind: 'delivery',
      title: mine
        ? `🎁 Delivered: ${stop.city === 'Your house' ? 'your house' : stop.city}! Santa was here.`
        : `🎄 Delivered: ${stop.city}, ${stop.usState ?? stop.caProvince ?? stop.country}`,
      detail: mine
        ? 'Everyone was asleep. The cookies are gone.'
        : `${fmtToys(stop.giftsK)} gifts. Running total ${fmtToys(stop.cumulativeK)}.`,
      stopSeq: stop.seq,
    });
  }

  // The Gazette's hourly stories and Santa's daily notes.
  events.push(
    ...buildGazette(
      tl,
      curves.map((curve, i) => ({ ...curve, workshop: TOY_LINES[i].workshop })),
      TOTAL_TOYS_K
    )
  );

  events
    .sort((a, b) => a.ts - b.ts)
    .forEach((event, i) => {
      rows.push({
        entity: 'MissionEvent',
        key: `${year}:event:${i + 1}`,
        row: { season: year, ...event, ts: new Date(event.ts) },
      });
    });

  return rows;
}
