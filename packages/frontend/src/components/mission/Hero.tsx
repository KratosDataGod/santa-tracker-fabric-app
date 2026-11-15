import { useMemo } from 'react';

import { SantaFigure } from './SantaFigure';

// Drop an image you own the rights to at src/assets/hero.jpg (or .png/.webp)
// and it replaces the drawn scene, title included: the artwork carries its own.
const customHero = Object.values(
  import.meta.glob('../../assets/hero.{jpg,jpeg,png,webp}', {
    eager: true,
    import: 'default',
    query: '?url',
  }) as Record<string, string>
)[0];

/** Deterministic pseudo-random numbers so the scene is identical on every render. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function ridge(rand: () => number, base: number, height: number, steps: number): string {
  const points: string[] = [`0,520`, `0,${base}`];
  let y = base;
  for (let i = 1; i <= steps; i++) {
    const x = (i / steps) * 1600;
    y = base - height * (0.25 + rand() * 0.75) * (i % 2 === 0 ? 0.45 : 1);
    points.push(`${x.toFixed(0)},${y.toFixed(0)}`);
  }
  points.push('1600,520');
  return points.join(' ');
}

function Reindeer({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="14" cy="30" rx="11" ry="4.6" />
      <path d="M22 29 L29 20 L33 21 L26 31 Z" />
      <ellipse cx="32.5" cy="19.5" rx="4" ry="2.5" />
      <path
        d="M31 17 l-2 -8 m1 4 l4 -5 m-4 5 l-4 -3 M33 17 l2 -7 m-1 3 l4 -3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M6 32 l-8 8 M10 33 l-4 10 M19 33 l7 8 M22 31 l10 5 M3 29 l-4 -2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Santa's sleigh and team as a silhouette, built to be seen against the moon. */
function SleighSilhouette() {
  return (
    <g fill="currentColor">
      {/* sleigh */}
      <path d="M4 44 q-6 0 -6 -6 M-2 44 H52 q10 0 10 -10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 40 q-2 -20 12 -20 l4 0 l3 8 h18 q8 0 9 -9 l5 0 q3 21 -13 21 Z" />
      <circle cx="38" cy="15" r="9" />
      <path d="M17 22 q4 -12 10 -3 l0 9 Z" />
      <circle cx="22" cy="10" r="4" />
      <path d="M18 8 q5 -9 10 -1 l-9 2 Z" />
      <circle cx="29.5" cy="6.5" r="1.6" />
      {/* reins */}
      <path d="M26 20 Q110 12 232 24" fill="none" stroke="currentColor" strokeWidth="0.8" />
      {[76, 116, 156, 196].map((x) => (
        <Reindeer key={x} x={x} />
      ))}
    </g>
  );
}

function Cottage({
  x,
  y,
  s,
  wall,
  roof,
  delay,
}: {
  x: number;
  y: number;
  s: number;
  wall: string;
  roof: string;
  delay: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="-10" rx="70" ry="34" fill="url(#warm)" opacity="0.55" />
      <rect x="20" y="-86" width="11" height="26" fill="#3a1a14" />
      <ellipse cx="25.5" cy="-86" rx="8" ry="3" fill="#f4f9ff" />
      <circle className="smoke" cx="26" cy="-92" r="6" fill="#dfe9f7" style={{ animationDelay: `${delay}s` }} />
      <rect x="-36" y="-48" width="72" height="48" rx="3" fill={wall} />
      <rect x="-36" y="-48" width="72" height="48" rx="3" fill="url(#shade)" />
      <path d="M-48 -44 L0 -92 L48 -44 Z" fill={roof} />
      <path d="M-50 -42 L0 -94 L50 -42 L40 -44 L0 -82 L-40 -44 Z" fill="#f4f9ff" />
      <path d="M-40 -44 q6 9 12 0 q6 9 12 0 q6 9 12 0 q6 9 12 0 q6 9 12 0 q6 9 12 0 q4 6 8 0" fill="#f4f9ff" />
      <rect x="-9" y="-28" width="18" height="28" rx="9" fill="#8f1026" />
      <circle cx="0" cy="-17" r="6.5" fill="none" stroke="#1d7a46" strokeWidth="4" />
      <path d="M-4 -11 l4 3 l4 -3 l-2 6 h-4 Z" fill="#ff3148" />
      {/* garland with lights along the eaves, and a bow at the peak */}
      <path d="M-40 -46 q10 12 20 0 q10 12 20 0 q10 12 20 0 q10 12 20 0" fill="none" stroke="#14602f" strokeWidth="5" strokeLinecap="round" />
      {[-35, -25, -15, -5, 5, 15, 25, 35].map((gx, i) => (
        <circle key={gx} className="bulb" cx={gx} cy={i % 2 ? -46 : -41} r="2.3" fill={['#ff3148', '#ffd166', '#8fd6ff', '#fff8e8'][i % 4]} filter="url(#glow)" style={{ animationDelay: `${delay + i * 0.25}s` }} />
      ))}
      <path d="M0 -62 l-9 -6 v12 Z M0 -62 l9 -6 v12 Z M-2 -60 l-4 10 M2 -60 l4 10" fill="#e0162f" stroke="#e0162f" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="0" cy="-62" r="2.6" fill="#ffd166" />
      {[-29, 15].map((wx) => (
        <g key={wx}>
          <rect x={wx} y="-36" width="14" height="15" rx="2" fill="#ffd166" filter="url(#glow)" />
          <path d={`M${wx + 7} -36 v15 M${wx} -28.5 h14`} stroke="#8a4a10" strokeWidth="1.2" />
        </g>
      ))}
    </g>
  );
}

function Pine({ x, y, s, lit }: { x: number; y: number; s: number; lit?: boolean }) {
  const lights = ['#ff3148', '#ffd166', '#8fd6ff', '#74e8a4', '#ff9a3c'];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-4" y="-2" width="8" height="12" fill="#2a160c" />
      <path d="M0 -92 L22 -60 H12 L30 -34 H16 L38 -4 H-38 L-16 -34 H-30 L-12 -60 H-22 Z" fill="#0d3b24" />
      <path d="M0 -92 L22 -60 H12 L30 -34 H16 L38 -4 H0 Z" fill="#082a19" />
      <path d="M0 -92 L9 -78 Q0 -72 -9 -78 Z M-22 -60 Q-11 -52 0 -60 Q11 -52 22 -60 L17 -67 H-17 Z M-30 -34 Q-15 -25 0 -34 Q15 -25 30 -34 L25 -41 H-25 Z" fill="#f4f9ff" opacity="0.95" />
      {lit &&
        Array.from({ length: 14 }, (_, i) => {
          const t = i / 13;
          const row = -84 + t * 76;
          const half = 4 + t * 30;
          const lx = Math.sin(i * 2.4) * half;
          return (
            <circle
              key={i}
              className="bulb"
              cx={lx}
              cy={row}
              r="2.6"
              fill={lights[i % lights.length]}
              filter="url(#glow)"
              style={{ animationDelay: `${(i * 0.31) % 2.4}s` }}
            />
          );
        })}
    </g>
  );
}

/**
 * The opening shot: aurora over the North Pole, the sleigh crossing the moon,
 * and the workshop village glowing in the snow. Purely decorative.
 */
/** The candy-cane arch, the title and the subtitle, in scene coordinates. */
function TitleArt({ subtitle }: { subtitle?: string }) {
  return (
    <g>
      <text x="800" y="34" textAnchor="middle" fontFamily="'Great Vibes', cursive" fontSize="32" fill="#f6d27a" filter="url(#titleShadow)">
        KratosBI presents
      </text>
      {/* ropes, the striped arch, snow on top, lights underneath */}
      <path d="M548 130 V-10 M1052 130 V-10" stroke="#6b4a1e" strokeWidth="4" />
      <use href="#archPath" fill="none" stroke="#1b0f0a" strokeWidth="70" strokeLinecap="round" />
      <use href="#archPath" fill="none" stroke="url(#candy)" strokeWidth="64" strokeLinecap="round" />
      <use href="#archPath" fill="none" stroke="#1b0f0a" strokeWidth="44" strokeLinecap="round" />
      <use href="#archPath" fill="none" stroke="#fff8e8" strokeWidth="39" strokeLinecap="round" />
      <path d="M518 142 Q800 12 1082 142" fill="none" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
      <path d="M580 112 q12 10 26 -3 M716 66 q14 10 30 -1 M866 64 q14 11 30 2 M1000 100 q12 9 24 -3" fill="none" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />
      <text fontFamily="'Cinzel Decorative', 'Playfair Display', Georgia, serif" fontWeight="900" fontSize="34" letterSpacing="7" fill="#7a0717" dy="12">
        <textPath href="#archPath" startOffset="50%" textAnchor="middle">
          NORTH POLE
        </textPath>
      </text>
      {Array.from({ length: 17 }, (_, i) => {
        const t = (i + 0.5) / 17;
        const x = 530 + 540 * t;
        const y = (1 - t) * (1 - t) * 168 + 2 * (1 - t) * t * 44 + t * t * 168 + 37;
        return (
          <circle key={i} className="bulb" cx={x} cy={y} r="5" fill={['#ff3148', '#ffd166', '#74e8a4', '#8fd6ff'][i % 4]} filter="url(#glow)" style={{ animationDelay: `${i * 0.18}s` }} />
        );
      })}
      <text x="800" y="268" textAnchor="middle" fontFamily="'Cinzel Decorative', 'Playfair Display', Georgia, serif" fontWeight="900" fontSize="70" letterSpacing="3" fill="url(#foilText)" filter="url(#titleShadow)">
        MISSION CONTROL
      </text>
      {subtitle && (
        <text x="800" y="306" textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="26" fill="#fdf3dc" filter="url(#titleShadow)">
          {subtitle}
        </text>
      )}
    </g>
  );
}

export function Hero({ subtitle, showTitle = true }: { subtitle?: string; showTitle?: boolean }) {
  const scene = useMemo(() => {
    const rand = seeded(20261224);
    const stars = Array.from({ length: 170 }, () => ({
      x: rand() * 1600,
      y: rand() * 330,
      r: 0.5 + rand() * 1.5,
      delay: rand() * 3.6,
      twinkle: rand() > 0.6,
    }));
    const far = ridge(seeded(7), 330, 150, 14);
    const mid = ridge(seeded(19), 372, 120, 10);
    const windows = Array.from({ length: 26 }, (_, i) => ({
      x: -112 + (i % 13) * 18,
      y: i < 13 ? -92 : -58,
      on: rand() > 0.12,
    }));
    const bokeh = Array.from({ length: 16 }, () => ({
      x: rand() * 1600,
      y: 400 + rand() * 120,
      r: 10 + rand() * 26,
      c: ['#ffd166', '#ff7088', '#8fd6ff', '#fff8e8'][Math.floor(rand() * 4)],
    }));
    return { stars, far, mid, windows, bokeh };
  }, []);

  return (
    <svg
      aria-hidden
      viewBox="0 0 1600 520"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#030817" />
          <stop offset="0.55" stopColor="#0a2250" />
          <stop offset="1" stopColor="#1c4f86" />
        </linearGradient>
        <linearGradient id="auroraA" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#3dffb0" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#35d0e8" stopOpacity="0.45" />
          <stop offset="1" stopColor="#9d6bff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="auroraB" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#7dffcf" stopOpacity="0.8" />
          <stop offset="0.6" stopColor="#b77dff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ff7ad9" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="moon" cx="0.38" cy="0.34" r="0.75">
          <stop offset="0" stopColor="#fffdf2" />
          <stop offset="0.7" stopColor="#ffeebe" />
          <stop offset="1" stopColor="#e9c98a" />
        </radialGradient>
        <radialGradient id="halo">
          <stop offset="0" stopColor="#fff3c9" stopOpacity="0.75" />
          <stop offset="0.35" stopColor="#ffe49a" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffe49a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="warm">
          <stop offset="0" stopColor="#ffc24a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffc24a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.38" />
        </linearGradient>
        <linearGradient id="farM" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a6aa8" />
          <stop offset="1" stopColor="#1b3f78" />
        </linearGradient>
        <linearGradient id="midM" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dcecff" />
          <stop offset="0.5" stopColor="#6f9bd1" />
          <stop offset="1" stopColor="#274f8a" />
        </linearGradient>
        <linearGradient id="snowA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef6ff" />
          <stop offset="1" stopColor="#8fb4e2" />
        </linearGradient>
        <linearGradient id="snowB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9d3f2" />
        </linearGradient>
        <linearGradient id="hall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8f1026" />
          <stop offset="1" stopColor="#4d0613" />
        </linearGradient>
        <filter id="blur18" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id="blur6">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <path id="flight" d="M-320 210 C-60 150 120 96 250 100 C520 110 900 300 1900 40" />
        <path id="archPath" d="M530 168 Q800 44 1070 168" />
        <pattern id="candy" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <rect width="34" height="34" fill="#fff8e8" />
          <rect width="17" height="34" fill="#d4142f" />
        </pattern>
        <linearGradient id="foilText" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6d6" />
          <stop offset="0.38" stopColor="#f6d27a" />
          <stop offset="0.62" stopColor="#c98a1e" />
          <stop offset="0.82" stopColor="#ffe9a8" />
          <stop offset="1" stopColor="#b9781a" />
        </linearGradient>
        <filter id="titleShadow" x="-10%" y="-30%" width="120%" height="170%">
          <feDropShadow dx="0" dy="3" stdDeviation="0.6" floodColor="#3c1400" floodOpacity="0.9" />
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#000" floodOpacity="0.75" />
        </filter>
      </defs>

      {customHero ? (
        <image href={customHero} width="1600" height="520" preserveAspectRatio="xMidYMid slice" />
      ) : (
        <Scene scene={scene} />
      )}
      {showTitle && !customHero && <TitleArt subtitle={subtitle} />}
    </svg>
  );
}

type SceneData = {
  stars: { x: number; y: number; r: number; delay: number; twinkle: boolean }[];
  far: string;
  mid: string;
  windows: { x: number; y: number; on: boolean }[];
  bokeh: { x: number; y: number; r: number; c: string }[];
};

/** The drawn North Pole: sky, aurora, moon, mountains, village and foreground. */
function Scene({ scene }: { scene: SceneData }) {
  return (
    <>
      <rect width="1600" height="520" fill="url(#sky)" />

      {scene.stars.map((s, i) => (
        <circle
          key={i}
          className={s.twinkle ? 'star' : undefined}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#fff"
          opacity={0.35 + s.r / 3}
          style={s.twinkle ? { animationDelay: `${s.delay}s` } : undefined}
        />
      ))}

      {/* Aurora curtains */}
      <g filter="url(#blur18)" style={{ mixBlendMode: 'screen' }}>
        <path className="aurora" d="M-80 300 C220 120 420 260 700 150 S1220 60 1700 210 L1700 40 C1300 -30 900 60 620 20 S160 60 -80 20 Z" fill="url(#auroraA)" />
        <path className="aurora" style={{ animationDuration: '19s', animationDelay: '-6s' }} d="M-80 250 C260 210 520 90 860 190 S1340 220 1700 110 L1700 0 L-80 0 Z" fill="url(#auroraB)" opacity="0.7" />
        <path className="aurora" style={{ animationDuration: '23s', animationDelay: '-11s' }} d="M200 330 C420 210 660 300 900 210 S1280 170 1500 260 L1500 120 C1200 60 760 150 200 100 Z" fill="url(#auroraA)" opacity="0.5" />
      </g>

      {/* Moon, and the sleigh crossing it */}
      <circle cx="250" cy="112" r="230" fill="url(#halo)" />
      <circle cx="250" cy="112" r="70" fill="url(#moon)" />
      <g fill="#d9b877" opacity="0.35">
        <circle cx="226" cy="92" r="10" />
        <circle cx="270" cy="132" r="13" />
        <circle cx="278" cy="84" r="6" />
        <circle cx="232" cy="140" r="5" />
      </g>
      <g color="#07101f">
        <g>
          <SleighSilhouette />
          <animateMotion dur="36s" begin="-14s" repeatCount="indefinite" rotate="auto">
            <mpath href="#flight" />
          </animateMotion>
        </g>
      </g>

      {/* Mountains */}
      <polygon points={scene.far} fill="url(#farM)" opacity="0.75" />
      <polygon points={scene.mid} fill="url(#midM)" />
      <rect y="300" width="1600" height="130" fill="#9cc4f0" opacity="0.12" filter="url(#blur18)" />

      {/* Snowfield behind the village */}
      <path d="M0 418 Q240 372 520 404 T1040 392 T1600 410 V520 H0 Z" fill="url(#snowA)" />

      {/* Back-row pines */}
      {[40, 130, 590, 700, 1010, 1070, 1330, 1500].map((x, i) => (
        <Pine key={x} x={x} y={404 + (i % 3) * 4} s={0.62 + (i % 4) * 0.08} />
      ))}

      {/* Santa's Workshop: the great hall */}
      <g transform="translate(1300 420) scale(0.8)">
        <ellipse cx="0" cy="-50" rx="230" ry="110" fill="url(#warm)" opacity="0.5" />
        <rect x="-130" y="-112" width="260" height="112" fill="url(#hall)" />
        <path d="M-146 -108 L-96 -160 H96 L146 -108 Z" fill="#3b0812" />
        <path d="M-150 -106 L-98 -164 H98 L150 -106 L138 -108 L92 -152 H-92 L-138 -108 Z" fill="#f4f9ff" />
        <path d="M-138 -108 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q7 11 14 0 q5 8 10 0" fill="#f4f9ff" />
        {/* clock tower */}
        <rect x="-26" y="-232" width="52" height="124" fill="#6d0c1e" />
        <rect x="-26" y="-232" width="52" height="124" fill="url(#shade)" />
        <path d="M-36 -230 L0 -290 L36 -230 Z" fill="#3b0812" />
        <path d="M-38 -228 L0 -294 L38 -228 L30 -230 L0 -280 L-30 -230 Z" fill="#f4f9ff" />
        <circle cx="0" cy="-196" r="19" fill="#fff3c9" filter="url(#glow)" />
        <circle cx="0" cy="-196" r="19" fill="none" stroke="#f6d27a" strokeWidth="3" />
        <path d="M0 -196 V-209 M0 -196 L9 -191" stroke="#3b0812" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M0 -294 V-312" stroke="#f6d27a" strokeWidth="2" />
        <path d="M0 -326 l3.5 9 9 .6 -7 6 2.4 9 -7.9 -5 -7.9 5 2.4 -9 -7 -6 9 -.6z" fill="#ffe08a" filter="url(#glow)" />
        {scene.windows.map((w, i) => (
          <rect key={i} x={w.x} y={w.y} width="11" height="20" rx="5.5" fill={w.on ? '#ffd166' : '#4a2a10'} filter={w.on ? 'url(#glow)' : undefined} />
        ))}
        <path d="M-22 0 V-40 a22 22 0 0 1 44 0 V0 Z" fill="#2a0a10" />
        <path d="M-16 0 V-38 a16 16 0 0 1 32 0 V0 Z" fill="#ffc24a" filter="url(#glow)" />
        <path d="M-130 -42 q32 22 65 0 q32 22 65 0 q32 22 65 0 q32 22 65 0" fill="none" stroke="#0d3b24" strokeWidth="6" />
        {[-114, -98, -81, -49, -33, -16, 16, 33, 49, 81, 98, 114].map((x, i) => (
          <circle key={x} className="bulb" cx={x} cy={-34 + (i % 3 === 1 ? 4 : 0)} r="3.4" fill={['#ff3148', '#ffd166', '#8fd6ff'][i % 3]} filter="url(#glow)" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
        <rect x="82" y="-176" width="16" height="36" fill="#2a0a10" />
        <circle className="smoke" cx="90" cy="-182" r="9" fill="#dfe9f7" />
        <circle className="smoke" cx="90" cy="-182" r="9" fill="#dfe9f7" style={{ animationDelay: '3s' }} />
      </g>

      {/* The village */}
      <Cottage x={640} y={424} s={0.86} wall="#1f5f9c" roof="#12365c" delay={0.5} />
      <Cottage x={790} y={420} s={1.0} wall="#5a3a22" roof="#2f1c10" delay={2.1} />
      <Cottage x={945} y={428} s={0.84} wall="#1d7a46" roof="#0c3f24" delay={3.4} />
      <Cottage x={1090} y={426} s={0.9} wall="#a3122a" roof="#5a0915" delay={1.2} />
      <Cottage x={1560} y={430} s={0.8} wall="#6a3fa0" roof="#3b2160" delay={4.3} />

      {/* The great tree */}
      <g transform="translate(-600 0)">
        <circle cx="1060" cy="330" r="150" fill="url(#warm)" opacity="0.35" />
        <Pine x={1060} y={432} s={1.9} lit />
        <path d="M1060 232 l6 16 17 1 -13 11 4.5 17 -14.5 -9.5 -14.5 9.5 4.5 -17 -13 -11 17 -1z" fill="#ffe08a" filter="url(#glow)" />
      </g>

      {/* Lamp posts with candy stripes */}
      {[560, 715, 870, 1020, 1160, 1470].map((x) => (
        <g key={x} transform={`translate(${x} 436)`}>
          <circle cx="0" cy="-62" r="34" fill="url(#warm)" opacity="0.6" />
          <rect x="-2.5" y="-58" width="5" height="58" fill="#fff8e8" />
          <path d="M-2.5 -50 l5 -5 v6 l-5 5z M-2.5 -36 l5 -5 v6 l-5 5z M-2.5 -22 l5 -5 v6 l-5 5z M-2.5 -8 l5 -5 v6 l-5 5z" fill="#d4142f" />
          <rect x="-7" y="-72" width="14" height="14" rx="3" fill="#ffd98a" filter="url(#glow)" />
          <path d="M-9 -72 L0 -80 L9 -72 Z" fill="#2a160c" />
        </g>
      ))}

      {/* Foreground drifts */}
      <path d="M0 452 Q300 416 620 448 T1180 438 T1600 454 V520 H0 Z" fill="url(#snowB)" />
      <Pine x={40} y={470} s={1.5} />
      <Pine x={1570} y={474} s={1.6} />
      <path d="M0 486 Q420 452 820 482 T1600 474 V520 H0 Z" fill="#ffffff" />

      {/* Up front: Santa by his sleigh, and a pile of presents */}
      <g transform="translate(250 372)">
        <ellipse cx="60" cy="118" rx="150" ry="14" fill="#7fa3d1" opacity="0.45" />
        <path d="M70 96 Q60 40 100 30 Q124 26 140 44 Q156 70 146 100 Z" fill="#167a43" stroke="#1b0f0a" strokeWidth="3" />
        <rect x="88" y="16" width="24" height="22" rx="3" fill="#2b6cb0" stroke="#1b0f0a" strokeWidth="3" transform="rotate(-10 100 27)" />
        <rect x="112" y="10" width="22" height="22" rx="3" fill="#f2c14e" stroke="#1b0f0a" strokeWidth="3" transform="rotate(12 123 21)" />
        <path d="M56 92 Q52 60 74 60 Q80 88 108 88 H170 Q192 88 198 62 Q204 48 216 54 Q212 92 198 108 Q190 118 170 118 H82 Q60 118 56 92 Z" fill="#d4142f" stroke="#1b0f0a" strokeWidth="3" strokeLinejoin="round" />
        <path d="M56 92 Q52 60 74 60 M198 62 Q204 48 216 54" fill="none" stroke="#f6d27a" strokeWidth="5" strokeLinecap="round" />
        <path d="M86 104 q12 -8 24 0 q12 8 24 0 q12 -8 24 0 q12 8 24 0" fill="none" stroke="#f6d27a" strokeWidth="3" strokeLinecap="round" />
        <path d="M44 128 Q34 128 36 136 Q38 140 50 138 H206 Q228 138 232 118 M84 118 V134 M176 118 V134" fill="none" stroke="#f6d27a" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g transform="translate(120 318) scale(0.74)">
        <SantaFigure />
      </g>
      <g transform="translate(1335 432)" stroke="#1b0f0a" strokeWidth="2.5" strokeLinejoin="round">
        <rect x="0" y="20" width="46" height="40" rx="3" fill="#d4142f" />
        <path d="M23 20 v40 M0 38 h46" stroke="#fff8e8" strokeWidth="5" />
        <rect x="40" y="34" width="38" height="28" rx="3" fill="#167a43" />
        <path d="M59 34 v28" stroke="#f6d27a" strokeWidth="5" />
        <rect x="12" y="-6" width="34" height="28" rx="3" fill="#2b6cb0" />
        <path d="M29 -6 v28 M12 8 h34" stroke="#f6d27a" strokeWidth="4" />
        <path d="M29 -6 q-12 -14 -14 -2 q6 6 14 2 q12 -14 14 -2 q-6 6 -14 2" fill="#f6d27a" />
      </g>

      {/* Out-of-focus lights close to the lens */}
      <g filter="url(#blur6)" style={{ mixBlendMode: 'screen' }}>
        {scene.bokeh.map((b, i) => (
          <circle key={i} className="bulb" cx={b.x} cy={b.y} r={b.r} fill={b.c} opacity="0.2" style={{ animationDelay: `${i * 0.4}s`, animationDuration: '5s' }} />
        ))}
      </g>
    </>
  );
}
