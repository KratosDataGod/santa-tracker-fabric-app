import { useEffect, useRef } from 'react';

/**
 * SVG filter that roughens the edge of the paper sheets, so they look torn
 * and hand-cut. Referenced from CSS as `url(#deckle)`.
 */
export function PaperDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <filter id="deckle" x="-2%" y="-2%" width="104%" height="104%">
        <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="4" result="rough" />
        <feDisplacementMap in="SourceGraphic" in2="rough" scale="7" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

/** Gentle snowfall over the whole page. Skipped when motion is reduced. */
export function Snowfall() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = 0;
    let height = 0;
    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const flakes = Array.from({ length: 110 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 1 + ((i * 7) % 10) / 4,
      speed: 0.02 + ((i * 13) % 10) / 260,
      sway: Math.random() * Math.PI * 2,
    }));
    let frame = 0;
    let last = performance.now();
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (const f of flakes) {
        f.y += f.speed * dt;
        f.sway += dt * 0.8;
        if (f.y > 1.02) {
          f.y = -0.02;
          f.x = Math.random();
        }
        ctx.globalAlpha = 0.35 + f.r / 6;
        ctx.beginPath();
        ctx.arc(f.x * width + Math.sin(f.sway) * 14, f.y * height, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 h-full w-full"
    />
  );
}
