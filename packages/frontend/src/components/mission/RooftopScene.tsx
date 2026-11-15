import { useMemo } from 'react';

import { ROOFTOP_APPROACH_MS as APPROACH_MS, ROOFTOP_LEAVE_MS as LEAVE_MS, type MyVisit } from '@/mission/home';

import { SantaSleigh } from './SantaSleigh';


const ease = (x: number) => x * x * (3 - 2 * x);

/**
 * "Santa over your house": a drawn rooftop where the sleigh comes down, waits
 * while the gifts go down the chimney, and lifts off again. It is an
 * illustration, not a picture of anyone's real street.
 */
export function RooftopScene({ visit, time }: { visit: MyVisit; time: number }) {
  const { arrival, departure } = visit.stop;
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        x: (i * 137.5) % 800,
        y: ((i * 61.3) % 230) + 6,
        r: 0.6 + ((i * 7) % 10) / 9,
      })),
    []
  );

  // Where the sleigh is, as a share of the scene's width and height.
  let x: number;
  let y: number;
  let parked = false;
  if (time < arrival) {
    const p = ease(Math.max(0, 1 - (arrival - time) / APPROACH_MS));
    x = -42 + p * 70;
    y = -6 + p * 37;
  } else if (time < departure) {
    parked = true;
    x = 28;
    y = 31;
  } else {
    const p = ease(Math.min(1, (time - departure) / LEAVE_MS));
    x = 28 + p * 84;
    y = 31 - p * 44;
  }

  return (
    <div className="rooftop absolute inset-0 overflow-hidden" role="img" aria-label={`Santa's sleigh over ${visit.label}`}>
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="roofSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#040a1c" />
            <stop offset="0.6" stopColor="#0c2350" />
            <stop offset="1" stopColor="#274a86" />
          </linearGradient>
          <linearGradient id="roofTile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a2a22" />
            <stop offset="1" stopColor="#3d120e" />
          </linearGradient>
          <radialGradient id="roofMoon" cx="0.4" cy="0.35">
            <stop offset="0" stopColor="#fffdf0" />
            <stop offset="1" stopColor="#f3e3a8" />
          </radialGradient>
        </defs>
        <rect width="800" height="500" fill="url(#roofSky)" />
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.5 + (i % 5) / 10} />
        ))}
        <circle cx="660" cy="92" r="46" fill="url(#roofMoon)" />
        <circle cx="660" cy="92" r="70" fill="#fff7c8" opacity="0.12" />
        {/* Hills and a far street of lit houses */}
        <path d="M0 330 Q130 270 270 316 T540 300 T800 322 V500 H0 Z" fill="#162f5e" />
        {[20, 118, 214, 590, 684].map((hx, i) => (
          <g key={hx} transform={`translate(${hx} ${318 + (i % 2) * 8})`}>
            <path d="M0 34 V10 L32 -14 L64 10 V34 Z" fill="#0b1a36" />
            <path d="M-6 12 L32 -18 L70 12" fill="none" stroke="#f4f8ff" strokeWidth="6" strokeLinecap="round" />
            <rect x="10" y="12" width="12" height="13" fill="#ffd772" />
            <rect x="40" y="12" width="12" height="13" fill={i % 2 ? '#ffd772' : '#ffb347'} />
          </g>
        ))}
        {/* The roof he lands on */}
        <path d="M120 500 V404 L400 286 L690 404 V500 Z" fill="url(#roofTile)" />
        {[430, 456, 482].map((ry) => (
          <path key={ry} d={`M120 ${ry} H690`} stroke="#2a0c09" strokeWidth="2" opacity="0.5" />
        ))}
        <path d="M96 412 L400 280 L714 412" fill="none" stroke="#f4f8ff" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M96 418 L400 288 L714 418" fill="none" stroke="#c9d6ee" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        {/* Chimney */}
        <rect x="560" y="296" width="62" height="92" fill="#8a3a2c" stroke="#3d120e" strokeWidth="3" />
        {[318, 340, 362].map((cy) => (
          <path key={cy} d={`M560 ${cy} H622`} stroke="#3d120e" strokeWidth="2" opacity="0.6" />
        ))}
        <rect x="550" y="284" width="82" height="16" rx="4" fill="#f4f8ff" />
        {/* A lit attic window */}
        <rect x="372" y="398" width="56" height="50" rx="4" fill="#ffd772" stroke="#3d120e" strokeWidth="4" />
        <path d="M400 398 V448 M372 423 H428" stroke="#3d120e" strokeWidth="3" />
        <path d="M0 492 Q200 470 400 486 T800 480 V500 H0 Z" fill="#f4f8ff" />
      </svg>

      <div
        className="pointer-events-none absolute w-[46%]"
        style={{ left: `${x}%`, top: `${y}%`, aspectRatio: '330 / 150' }}
      >
        <SantaSleigh parked={parked} />
      </div>

      {parked && (
        <>
          <div className="rooftop-gift absolute left-[71.5%] top-[40%] text-[34px]" aria-hidden>
            🎁
          </div>
          <div className="plaque absolute left-1/2 top-[8%] -translate-x-1/2 !rounded-full px-800 py-300 text-center">
            <div className="script whitespace-nowrap text-[40px] leading-[1.3] text-gold">Ho ho ho!</div>
          </div>
        </>
      )}
      <div className="plaque absolute bottom-300 left-300 !rounded-full px-400 py-100 text-200 font-bold">
        {parked ? `Santa has landed: ${visit.label}` : time < arrival ? `Coming in to land: ${visit.label}` : 'Up, up and away!'}
      </div>
    </div>
  );
}
