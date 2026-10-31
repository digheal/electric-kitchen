// Small glowing dots that travel along the hero's grid lines and sometimes turn at crossings.
// Purely decorative. The caller pauses it (button, or reduced motion).

interface Dot { x: number; y: number; dx: number; dy: number; age: number; life: number; trail: [number, number][] }

const TRAIL = 46;
const SPEED = 70; // pixels per second

export function startGrid(hero: HTMLElement, canvas: HTMLCanvasElement, cell = 24) {
  const ctx = canvas.getContext('2d')!;
  let w = 0, h = 0, dpr = 1;
  let dots: Dot[] = [];
  let paused = true;
  let visible = true;
  let raf = 0;
  let last = 0;
  const rand = (n: number) => Math.floor(Math.random() * n);
  const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const spawn = (): Dot => {
    const [dx, dy] = dirs[rand(4)];
    return {
      x: rand(Math.floor(w / cell) + 1) * cell,
      y: rand(Math.floor(h / cell) + 1) * cell,
      dx, dy, age: 0, life: 7 + Math.random() * 7, trail: [],
    };
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(8, Math.min(26, Math.round((w * h) / 32000)));
    dots = Array.from({ length: count }, () => { const d = spawn(); d.age = Math.random() * d.life; return d; });
  };

  // Move toward the next grid crossing. At a crossing there is a chance to turn.
  const advance = (d: Dot, dist: number) => {
    while (dist > 0) {
      const horizontal = d.dx !== 0;
      const pos = horizontal ? d.x : d.y;
      const dir = horizontal ? d.dx : d.dy;
      const next = dir > 0 ? (Math.floor(pos / cell) + 1) * cell : (Math.ceil(pos / cell) - 1) * cell;
      const gap = Math.abs(next - pos);
      if (gap > dist) {
        if (horizontal) d.x += dir * dist; else d.y += dir * dist;
        return;
      }
      if (horizontal) d.x = next; else d.y = next;
      dist -= gap;
      if (Math.random() < 0.3) {
        const sign = Math.random() < 0.5 ? 1 : -1;
        if (horizontal) { d.dx = 0; d.dy = sign; } else { d.dy = 0; d.dx = sign; }
      }
    }
  };

  const frame = (now: number) => {
    raf = 0;
    if (paused || !visible) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = ctx.strokeStyle = getComputedStyle(hero).getPropertyValue('--accent').trim() || '#0b6b6b';

    dots.forEach((d, i) => {
      d.age += dt;
      advance(d, SPEED * dt);
      const outside = d.x < -cell || d.x > w + cell || d.y < -cell || d.y > h + cell;
      if (d.age > d.life || outside) { dots[i] = d = spawn(); }
      d.trail.push([d.x + 0.5, d.y + 0.5]);
      if (d.trail.length > TRAIL) d.trail.shift();

      const fade = Math.min(d.age, 1) * Math.min((d.life - d.age) / 1, 1);
      if (fade <= 0) return;
      for (let k = 1; k < d.trail.length; k++) {
        ctx.globalAlpha = (k / d.trail.length) * 0.55 * fade;
        ctx.lineWidth = 1 + (k / d.trail.length);
        ctx.beginPath();
        ctx.moveTo(d.trail[k - 1][0], d.trail[k - 1][1]);
        ctx.lineTo(d.trail[k][0], d.trail[k][1]);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.16 * fade;
      ctx.beginPath(); ctx.arc(d.x + 0.5, d.y + 0.5, 7, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.95 * fade;
      ctx.beginPath(); ctx.arc(d.x + 0.5, d.y + 0.5, 2.4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };

  const run = () => { if (!raf && !paused && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; run(); }).observe(hero);
  resize();

  return {
    setPaused(value: boolean) {
      paused = value;
      hero.classList.toggle('paused', value);
      if (value) { cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, w, h); } else run();
    },
  };
}
