/**
 * Santa, his sleigh and four reindeer, drawn side-on and facing right, in the
 * same bold cartoon style as `SantaFigure`. The legs gallop and the team bobs.
 */

import { SantaFigure } from './SantaFigure';

const LINE = '#1b0f0a';

function Reindeer({ x, y, far, lead }: { x: number; y: number; far?: boolean; lead?: boolean }) {
  const coat = far ? 'url(#deerFar)' : 'url(#deer)';
  const leg = far ? '#5b3a1e' : '#6f4724';
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* legs */}
      <rect className="leg-a" x="6" y="18" width="4.6" height="24" rx="2.3" fill={leg} stroke={LINE} strokeWidth="1.4" />
      <rect className="leg-b" x="13" y="18" width="4.6" height="24" rx="2.3" fill={leg} stroke={LINE} strokeWidth="1.4" />
      <rect className="leg-b" x="36" y="18" width="4.6" height="24" rx="2.3" fill={leg} stroke={LINE} strokeWidth="1.4" />
      <rect className="leg-a" x="43" y="18" width="4.6" height="24" rx="2.3" fill={leg} stroke={LINE} strokeWidth="1.4" />
      {/* tail, body, chest */}
      <ellipse cx="2" cy="10" rx="5" ry="3.6" fill="#fff6e6" />
      <ellipse cx="26" cy="14" rx="25" ry="10.5" fill={coat} stroke={LINE} strokeWidth="2" />
      <path d="M40 22 Q48 26 52 14 Q46 6 38 10 Z" fill="#f3dfc0" opacity={far ? 0.5 : 0.95} />
      {/* neck and head */}
      <path d="M40 8 L55 -14 L64 -9 L52 18 Z" fill={coat} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="63" cy="-13" rx="10.5" ry="6.6" transform="rotate(14 63 -13)" fill={coat} stroke={LINE} strokeWidth="2" />
      <ellipse cx="71" cy="-10.5" rx="5" ry="3.8" fill="#e9cfa6" />
      <circle
        cx="75.5"
        cy="-11"
        r={lead ? 3.2 : 2}
        fill={lead ? '#ff3148' : '#2a1608'}
        filter={lead ? 'url(#noseGlow)' : undefined}
      />
      <circle cx="64" cy="-15.5" r="1.5" fill="#1a0d05" />
      <circle cx="64.5" cy="-16" r="0.5" fill="#fff" />
      <path d="M55 -18 q-5 -5 -2 -9 q4 3 5 8 Z" fill={coat} />
      {/* antlers */}
      <path
        d="M58 -19 q-3 -12 2 -20 M57.5 -27 q-7 -3 -9 -9 M58.5 -31 q5 -4 5 -10 M62 -19 q3 -9 10 -12 M66 -26 q5 -1 7 -6"
        fill="none"
        stroke={far ? '#a98a5a' : '#d9bd8a'}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* harness with bells */}
      <path d="M44 4 Q49 14 46 24" fill="none" stroke="#c8102e" strokeWidth="4" strokeLinecap="round" />
      <path d="M10 5 Q26 1 42 5" fill="none" stroke="#c8102e" strokeWidth="3" />
      {[45, 47.5, 46.5].map((bx, i) => (
        <circle key={i} cx={bx} cy={8 + i * 6.5} r="2.2" fill="#f6d27a" stroke="#9a6a10" strokeWidth="0.6" />
      ))}
    </g>
  );
}

export function SantaSleigh({ parked = false }: { parked?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 330 150"
      className={`h-full w-full overflow-visible ${parked ? 'sleigh-parked' : ''}`}
    >
      <defs>
        <linearGradient id="deer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8703a" />
          <stop offset="1" stopColor="#6f4724" />
        </linearGradient>
        <linearGradient id="deerFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#86592c" />
          <stop offset="1" stopColor="#56371a" />
        </linearGradient>
        <linearGradient id="lacquer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0344a" />
          <stop offset="0.5" stopColor="#c8102e" />
          <stop offset="1" stopColor="#7a0717" />
        </linearGradient>
        <linearGradient id="goldTrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1c4" />
          <stop offset="0.5" stopColor="#f2c14e" />
          <stop offset="1" stopColor="#a8700c" />
        </linearGradient>
        <linearGradient id="coat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ee2f45" />
          <stop offset="1" stopColor="#a50d24" />
        </linearGradient>
        <radialGradient id="sack" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#3fa866" />
          <stop offset="1" stopColor="#0f5a35" />
        </radialGradient>
        <filter id="noseGlow" x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="sleighShadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#2a1404" floodOpacity="0.45" />
        </filter>
      </defs>

      <g className="sleigh-bob" filter="url(#sleighShadow)">
        {/* magic dust trailing behind */}
        {[
          [4, 96, 3.2], [-12, 84, 2.2], [-6, 110, 2], [-26, 100, 2.6], [-40, 88, 1.8], [-22, 118, 1.6],
        ].map(([sx, sy, r], i) => (
          <path
            key={i}
            className="star"
            style={{ animationDelay: `${i * 0.35}s`, animationDuration: '1.6s' }}
            transform={`translate(${sx} ${sy}) scale(${r / 3})`}
            d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z"
            fill="#ffe08a"
          />
        ))}

        {/* far-side reindeer, then reins, then near-side */}
        <Reindeer x={176} y={62} far />
        <Reindeer x={238} y={58} far lead />
        <path d="M96 62 Q150 52 222 66 M96 62 Q170 44 284 62" fill="none" stroke="#5b3a1e" strokeWidth="1.4" />
        <Reindeer x={166} y={70} />
        <Reindeer x={228} y={66} />

        {/* the sack of gifts */}
        <path d="M18 92 Q4 52 30 38 Q44 30 58 40 Q72 54 62 94 Z" fill="url(#sack)" stroke={LINE} strokeWidth="2.5" />
        <path d="M30 40 q8 -10 18 -2" fill="none" stroke="#f6d27a" strokeWidth="3" strokeLinecap="round" />
        <rect x="20" y="24" width="18" height="16" rx="2" fill="#2b6cb0" transform="rotate(-12 29 32)" />
        <path d="M27 24 l3 16 M19 33 l19 -4" stroke="#fff6e6" strokeWidth="2" transform="rotate(-12 29 32)" />
        <rect x="40" y="18" width="16" height="16" rx="2" fill="#f2c14e" transform="rotate(10 48 26)" />
        <path d="M48 18 v16 M40 26 h16" stroke="#c8102e" strokeWidth="2" transform="rotate(10 48 26)" />
        <circle cx="36" cy="20" r="6" fill="#c8102e" />
        <path d="M33 14 q3 -6 6 0" fill="none" stroke="#fff6e6" strokeWidth="1.6" />

        {/* Santa, riding up front */}
        <g transform="translate(68 4) scale(0.36)">
          <SantaFigure />
        </g>

        {/* the sleigh */}
        <path d="M6 86 Q2 60 22 60 L26 60 Q30 84 58 84 L112 84 Q132 84 138 62 Q142 50 152 54 Q150 82 140 96 Q132 108 110 108 L30 108 Q10 108 6 86 Z" fill="url(#lacquer)" stroke={LINE} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M6 86 Q2 60 22 60 L26 60 Q30 84 58 84 L112 84 Q132 84 138 62 Q142 50 152 54" fill="none" stroke="url(#goldTrim)" strokeWidth="4" strokeLinecap="round" />
        <path d="M38 96 q10 -8 20 0 q10 8 20 0 q10 -8 20 0 q10 8 20 0" fill="none" stroke="url(#goldTrim)" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M26 108 V122 M110 108 V122" stroke="url(#goldTrim)" strokeWidth="4" />
        <path d="M-2 116 Q-10 116 -8 124 Q-6 128 4 126 H140 Q160 126 164 108" fill="none" stroke="url(#goldTrim)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="152" cy="54" r="4.5" fill="#f6d27a" stroke="#9a6a10" />
      </g>
    </svg>
  );
}
