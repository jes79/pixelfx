import { Particles, Bits, Lights, P, B, Rng, fit, crystal, band, flare, clamp, smooth, ease, TAU, WHITE } from "../../core/index.js";

export const meta = {
  name: "Frost ring",
  desc: "A blue ice ring bursts out of the floor and races outward, kicking up small ice shards and snow; crystals stand along the ring, then it thins and melts away.",
  tags: ["ice", "ring", "aoe", "frost", "one-shot"],
  size: [240, 120],
  origin: [120, 84],
  duration: 2.6,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], reach: 88, seed: 11 },
};

const SPREAD = 0.55, HOLD = 1.1, FADE = 1.0;

export function create(o) {
  const C = fit(o.palette, 8), DIM = [C[0], C[0], C[1], C[2], C[3], C[4], C[5], C[6]], REACH = o.reach;
  const R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] });
  const bits = new Bits({ ground: floor }), lights = new Lights();
  const front = (t) => REACH * (1 - Math.pow(1 - clamp(t / SPREAD), 3));
  const fade = (t) => 1 - smooth(HOLD, HOLD + FADE, t);
  const sites = [];
  for (let i = 0; i < 14; i++) {
    const g = ((i + R.range(0.1, 0.9)) / 14) * TAU, d = REACH * R.range(0.55, 0.98);
    const x = Math.cos(g) * d, y = Math.sin(g) * d * 0.16;
    sites.push({ x, y, back: y < 0, d, h: R.range(10, 22), w: R.range(5, 8), lean: R.range(-4, 4), up: false, t0: SPREAD * (1 - Math.cbrt(1 - d / REACH)), ph: R.next() });
  }
  let t = 0, released = false;

  const ring = (p, back) => {
    const u = clamp(t / (SPREAD + 0.3)), f = fade(t);
    if (f <= 0) return;
    const a = u < 0.8 ? 1 : 1 - 0.35 * ((u - 0.8) / 0.2);
    band(p, 0, 0, front(t) + 2, 0.16, u < 1 ? Math.max(2, 6 * Math.pow(1 - u, 0.7)) : 2, Math.min(a, f), back ? DIM : C, (g) => Math.sin(g) < 0 === back, t < 0.1);
  };
  const crystals = (p, back) => {
    const m = 1 - fade(t);
    for (const s of sites) {
      if (!s.up || s.back !== back || m >= 1) continue;
      const g = ease.outBack(clamp((t - s.t0) / 0.1), 2.4), white = t < s.t0 + 0.03;
      const sw = (((t - s.t0) * 0.8 + s.ph * 3) % 1.8) / 0.5;
      crystal(p, s.x, s.y, s.h * g * (1 - m), s.w * (1 - m * 0.3), s.lean * g, back ? DIM : C, { white, glint: sw <= 1 ? sw : -1 });
    }
  };

  return {
    update(dt) {
      t += dt;
      if (!released) {
        released = true;
        lights.add(0, -2, 60, C[4], 0.8, 0.6);
        lights.add(0, -2, 30, WHITE, 0.7, 0.12);
      }
      const fr = front(t);
      if (t < SPREAD) {
        for (const s of [-1, 1]) {
          if (R.chance(0.7)) {
            const a = -Math.PI / 2 + R.range(-0.9, 0.9), sp = R.range(60, 170);
            bits.add({ kind: B.SHARD, x: s * fr, y: -1, vx: Math.cos(a) * sp * 0.5 + s * 30, vy: Math.sin(a) * sp, g: 0.8, drag: 0.6, bounce: 0.3, life: R.range(0.6, 1.1), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.2, 2.8), c: R.pick([C[7], C[6], C[5]]) });
          }
          ps.spawn(P.VAPOUR, s * fr + R.range(-2, 2), -R.range(0, 3), s * R.range(10, 50), -R.range(2, 10), R.range(0.5, 0.9), C[6], R.range(2.5, 4));
          if (R.chance(0.4)) ps.spawn(P.FLAKE, s * fr, -2, s * R.range(8, 35), -R.range(25, 70), R.range(0.9, 1.5), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.2));
        }
      }
      for (const s of sites) {
        if (!s.up && t >= s.t0) {
          s.up = true;
          for (let i = 0; i < 2 + Math.round(s.h / 6); i++) {
            const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(50, 150);
            bits.add({ kind: B.SHARD, x: s.x + R.range(-2, 2), y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.8, drag: 0.6, bounce: 0.3, life: R.range(0.6, 1.2), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.2, 2.4), c: R.pick([C[7], C[6], C[5]]) });
          }
          ps.spawn(P.VAPOUR, s.x, s.y - 1, R.range(-20, 20), -R.range(2, 8), R.range(0.4, 0.8), C[6], R.range(2, 3));
        }
      }
      if (t > SPREAD && t < HOLD + 0.3 && R.chance(0.5)) {
        const s = R.pick(sites);
        if (s.up) ps.spawn(P.STAR, s.x + R.range(-2, 2), s.y - R.range(2, s.h * 0.9), 0, -3, R.range(0.3, 0.5), R.chance(0.6) ? C[6] : WHITE, R.range(0.6, 1.8));
      }
      if (t > HOLD && t < HOLD + 0.5 && R.chance(0.3)) {
        const g = R.range(0, TAU);
        ps.spawn(P.VAPOUR, Math.cos(g) * REACH * 0.8, Math.sin(g) * 4, R.range(-8, 8), -R.range(6, 14), R.range(0.5, 0.9), C[5], R.range(2.5, 4));
      }
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      ring(p, true);
      crystals(p, true);
      ps.draw(p, "back");
    },
    draw(p) {
      ring(p, false);
      crystals(p, false);
      if (t < 0.2) {
        const a = t / 0.2;
        flare(p, 0, -3, 26 * Math.pow(1 - a, 1.5), 1 - a, C);
      }
      const k = fade(t);
      if (k > 0) for (let i = -3; i <= 3; i++) p.glow((i / 3.5) * front(t), -2, 20, C[4], 0.14 * k);
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
