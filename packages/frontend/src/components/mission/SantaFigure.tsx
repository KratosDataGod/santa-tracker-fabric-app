/**
 * Santa as a bold-outline cartoon: round face, big nose, twinkly eyes, a beard
 * you could lose a cookie in. An original drawing in a sticker-cartoon style.
 *
 * `SantaFigure` is a bare <g> (200 x 232 units) so it can sit inside other
 * drawings; `CartoonSanta` wraps it in its own <svg>.
 */

const LINE = '#1b0f0a';
const RED = '#e3212f';
const RED_DARK = '#b3121f';
const FUR = '#ffffff';
const FUR_SHADE = '#dfe6ee';
const SKIN = '#f6c7a2';
const SKIN_SHADE = '#eaa987';

export function SantaFigure() {
  const outline = { stroke: LINE, strokeWidth: 5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <g>
      {/* arms on hips */}
      <path d="M44 148 Q4 160 14 200 Q26 214 44 202 Q36 182 60 168 Z" fill={RED} {...outline} />
      <path d="M156 148 Q196 160 186 200 Q174 214 156 202 Q164 182 140 168 Z" fill={RED} {...outline} />
      <ellipse cx="27" cy="203" rx="17" ry="12" fill={FUR} {...outline} />
      <ellipse cx="173" cy="203" rx="17" ry="12" fill={FUR} {...outline} />
      <path d="M22 212 Q24 232 44 228 Q52 218 42 208 Z" fill="#2a2d33" {...outline} />
      <path d="M178 212 Q176 232 156 228 Q148 218 158 208 Z" fill="#2a2d33" {...outline} />

      {/* body */}
      <path d="M36 232 Q26 160 62 138 L138 138 Q174 160 164 232 Z" fill={RED} {...outline} />
      <path d="M150 150 Q168 180 160 228 L146 228 Q152 186 140 152 Z" fill={RED_DARK} opacity="0.55" />
      <path d="M90 138 H110 V232 H90 Z" fill={FUR} {...outline} />
      <rect x="34" y="190" width="132" height="19" fill="#2a2d33" {...outline} />
      <rect x="84" y="185" width="32" height="29" rx="5" fill="#f2b632" {...outline} />
      <rect x="92" y="192" width="16" height="15" rx="2" fill="#8a8f98" stroke={LINE} strokeWidth="3" />

      {/* ears and face */}
      <ellipse cx="48" cy="96" rx="11" ry="14" fill={SKIN} {...outline} />
      <ellipse cx="152" cy="96" rx="11" ry="14" fill={SKIN} {...outline} />
      <ellipse cx="100" cy="92" rx="52" ry="48" fill={SKIN} {...outline} />

      {/* beard */}
      <path
        d="M50 100 Q40 150 66 164 Q72 178 86 174 Q100 190 114 174 Q128 178 134 164 Q160 150 150 100 Q140 122 124 118 Q100 132 76 118 Q60 122 50 100 Z"
        fill={FUR}
        {...outline}
      />
      <path d="M62 150 Q72 166 86 162 M114 162 Q128 166 138 150 M92 170 Q100 178 108 170" fill="none" stroke={FUR_SHADE} strokeWidth="4" strokeLinecap="round" />

      {/* cheeks, mouth, moustache, nose */}
      <ellipse cx="70" cy="104" rx="12" ry="9" fill="#f59a8c" opacity="0.8" />
      <ellipse cx="130" cy="104" rx="12" ry="9" fill="#f59a8c" opacity="0.8" />
      <path d="M88 124 Q100 140 112 124 Z" fill="#8f1420" {...outline} strokeWidth="4" />
      <path d="M94 131 Q100 136 106 131" fill="none" stroke="#f28a8a" strokeWidth="4" strokeLinecap="round" />
      <path d="M100 112 Q84 104 64 116 Q76 132 100 122 Q124 132 136 116 Q116 104 100 112 Z" fill={FUR} {...outline} />
      <ellipse cx="100" cy="102" rx="15" ry="12" fill="#f3a089" {...outline} />
      <ellipse cx="95" cy="97" rx="5" ry="3" fill="#ffd9cc" />

      {/* eyes and brows */}
      <ellipse cx="80" cy="80" rx="10" ry="12" fill="#ffffff" {...outline} strokeWidth="4" />
      <ellipse cx="120" cy="80" rx="10" ry="12" fill="#ffffff" {...outline} strokeWidth="4" />
      <circle cx="82" cy="82" r="6" fill="#2f6fc2" />
      <circle cx="118" cy="82" r="6" fill="#2f6fc2" />
      <circle cx="82" cy="82" r="3" fill={LINE} />
      <circle cx="118" cy="82" r="3" fill={LINE} />
      <circle cx="84" cy="79" r="1.6" fill="#ffffff" />
      <circle cx="120" cy="79" r="1.6" fill="#ffffff" />
      <path d="M66 64 Q78 54 92 62 Q80 60 68 70 Z" fill={FUR} {...outline} strokeWidth="4" />
      <path d="M134 64 Q122 54 108 62 Q120 60 132 70 Z" fill={FUR} {...outline} strokeWidth="4" />
      <path d="M52 86 Q46 96 52 104" fill="none" stroke={SKIN_SHADE} strokeWidth="3" strokeLinecap="round" />

      {/* hat */}
      <path d="M50 62 Q52 8 112 10 Q160 14 152 64 Z" fill={RED} {...outline} />
      <path d="M52 44 Q20 44 20 86 Q32 70 56 70 Z" fill={RED} {...outline} />
      <path d="M124 18 Q146 30 146 58 L136 58 Q136 34 124 18 Z" fill={RED_DARK} opacity="0.55" />
      <path d="M44 58 Q100 34 156 58 Q164 70 154 78 Q100 56 46 78 Q36 70 44 58 Z" fill={FUR} {...outline} />
      <circle cx="20" cy="92" r="15" fill={FUR} {...outline} />
      <path d="M12 96 Q20 104 30 98" fill="none" stroke={FUR_SHADE} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

export function CartoonSanta({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="-4 -4 208 244" className={className}>
      <SantaFigure />
    </svg>
  );
}
