// 파티클(오버레이 효과) — 2026-10-24 P-0 새로 씀(음악 담당 `claude-win-20261024-music`).
// 이전 파일은 외부 상용 프로그램 번들에서 옮겨 온 코드여서(권리 점검 docs/analysis-spectrum-studio-pro-20261024/RIGHTS_CHECK_20261024.md)
// 효과 종류(설정 이름)만 유지하고 생성 규칙·움직임·색·모양을 우리 방식으로 다시 작성했다.
// - 효과 14종을 KINDS 표 하나로 정의(초당 생성 수·수명·크기·속도·흔들림·모양)
// - 프레임 수가 아니라 흐른 시간(초) 기준으로 움직여, 미리보기(화면 시계)와 MP4(프레임 시각)의 속도가 같다
// - 크기·속도는 화면 짧은 변 1080px 기준 단위로 맞춰 가로·세로·미리보기 크기와 상관없이 같은 모양
import { StudioSettings } from '@/types/playlist';
import { getPresetColor } from './color-utils';

export type ParticleShape = 'dot' | 'glow' | 'drop' | 'star' | 'heart' | 'note' | 'square' | 'triangle' | 'streak' | 'beam' | 'dash' | 'bolt';

export interface Particle {
  kind: ParticleKey;
  x: number;
  y: number;
  vx: number; // 단위/초
  vy: number;
  size: number; // 단위
  color: string;
  age: number; // 초
  life: number; // 초
  spin: number; // 라디안
  spinSpeed: number; // 라디안/초
  phase: number; // 흔들림·반짝임 위상
  shape: ParticleShape;
}

export const PARTICLE_KEYS = [
  'waterDrops', 'sparkles', 'neonShapes', 'hearts', 'embers',
  'snow', 'rain', 'confetti', 'laserBeams', 'bokeh',
  'lightning', 'shards', 'cyberLines', 'musicNotes',
] as const;
export type ParticleKey = (typeof PARTICLE_KEYS)[number];

type Range = [number, number];
type Spawn = { x: number; y: number; vx: number; vy: number };
interface KindSpec {
  /** 밀도 100%일 때 초당 생성 수 */
  rate: number;
  life: Range; // 초
  size: Range; // 단위(짧은 변 1080 기준 px)
  shape: ParticleShape | (() => ParticleShape);
  /** 시작 위치·속도(단위/초). w·h는 단위로 환산한 화면 크기 */
  spawn: (w: number, h: number, s: StudioSettings) => Spawn;
  /** 좌우 흔들림 폭(단위/초)·빠르기(Hz) */
  sway?: [number, number];
  /** 아래로 끌어당김(단위/초²) — 음수면 위로 */
  gravity?: number;
  spin?: number; // 최대 회전 속도(라디안/초)
  /** 기본 색 프리셋(DEFAULT)일 때 쓸 이 효과 고유 색 — 없으면 프리셋 색 */
  ownColor?: () => string;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

const KINDS: Record<ParticleKey, KindSpec> = {
  waterDrops: {
    rate: 14, life: [2.5, 4.5], size: [5, 9], shape: 'drop',
    spawn: (w, h, s) => {
      const v = rnd(160, 300);
      if (s.waterDirection === 'up') return { x: rnd(0, w), y: h + 12, vx: 0, vy: -v };
      if (s.waterDirection === 'left') return { x: w + 12, y: rnd(0, h), vx: -v, vy: 0 };
      if (s.waterDirection === 'right') return { x: -12, y: rnd(0, h), vx: v, vy: 0 };
      return { x: rnd(0, w), y: -12, vx: 0, vy: v };
    },
  },
  sparkles: {
    rate: 18, life: [0.8, 1.6], size: [4, 10], shape: 'star',
    spawn: (w, h) => ({ x: rnd(0, w), y: rnd(0, h), vx: rnd(-8, 8), vy: rnd(-14, -2) }),
  },
  neonShapes: {
    rate: 6, life: [3, 5], size: [10, 22], shape: () => (Math.random() < 0.5 ? 'triangle' : 'square'),
    spawn: (w, h) => ({ x: rnd(0, w), y: rnd(0, h), vx: rnd(-40, 40), vy: rnd(-40, 40) }), spin: 1.4,
  },
  hearts: {
    rate: 7, life: [4, 6.5], size: [12, 22], shape: 'heart',
    spawn: (w, h) => ({ x: rnd(0, w), y: h + 24, vx: 0, vy: rnd(-150, -80) }),
    sway: [45, 0.6], ownColor: () => pick(['#ff5c8a', '#ff3d6e', '#ff8fab']),
  },
  embers: {
    rate: 22, life: [2, 3.5], size: [2.5, 6], shape: 'glow',
    spawn: (w, h) => ({ x: rnd(0, w), y: h + 8, vx: rnd(-35, 35), vy: rnd(-230, -120) }),
    sway: [30, 1.3], ownColor: () => pick(['#ff7a1a', '#ffb23f', '#ff4d1a']),
  },
  snow: {
    rate: 26, life: [6, 10], size: [3, 7], shape: 'dot',
    spawn: (w) => ({ x: rnd(-20, w + 20), y: -8, vx: rnd(-12, 12), vy: rnd(45, 95) }),
    sway: [25, 0.35], ownColor: () => '#f4f8ff',
  },
  rain: {
    rate: 60, life: [0.7, 1.2], size: [1.2, 2], shape: 'streak',
    spawn: (w) => ({ x: rnd(-60, w), y: rnd(-120, -20), vx: 70, vy: rnd(1300, 1700) }),
    ownColor: () => 'rgba(180, 205, 255, 0.7)',
  },
  confetti: {
    rate: 16, life: [4, 6], size: [6, 11], shape: () => (Math.random() < 0.6 ? 'square' : 'triangle'),
    spawn: (w) => ({ x: rnd(0, w), y: -16, vx: rnd(-50, 50), vy: rnd(90, 190) }),
    sway: [60, 0.9], spin: 4, ownColor: () => `hsl(${Math.round(rnd(0, 360))}, 85%, 62%)`,
  },
  laserBeams: {
    rate: 3, life: [0.9, 1.4], size: [2, 3.5], shape: 'beam',
    spawn: (w, h) => (Math.random() < 0.5
      ? { x: -260, y: rnd(h * 0.1, h * 0.9), vx: rnd(1500, 2100), vy: 0 }
      : { x: w + 260, y: rnd(h * 0.1, h * 0.9), vx: -rnd(1500, 2100), vy: 0 }),
  },
  bokeh: {
    rate: 4, life: [5, 8], size: [26, 70], shape: 'glow',
    spawn: (w, h) => ({ x: rnd(0, w), y: rnd(0, h), vx: rnd(-18, 18), vy: rnd(-22, 6) }),
  },
  lightning: {
    rate: 0.7, life: [0.18, 0.3], size: [2, 4], shape: 'bolt',
    spawn: (w) => ({ x: rnd(w * 0.1, w * 0.9), y: 0, vx: 0, vy: 0 }),
    ownColor: () => '#e8f0ff',
  },
  shards: {
    rate: 8, life: [2, 3.5], size: [8, 18], shape: 'triangle',
    spawn: (w, h) => {
      const a = rnd(0, Math.PI * 2), v = rnd(120, 320);
      return { x: w / 2 + rnd(-w * 0.1, w * 0.1), y: h / 2 + rnd(-h * 0.1, h * 0.1), vx: Math.cos(a) * v, vy: Math.sin(a) * v };
    },
    spin: 3,
  },
  cyberLines: {
    rate: 20, life: [1, 1.8], size: [1.5, 2.5], shape: 'dash',
    spawn: (w) => ({ x: Math.round(rnd(0, w) / 24) * 24, y: rnd(-80, -20), vx: 0, vy: rnd(500, 900) }),
    ownColor: () => '#3dff8f',
  },
  musicNotes: {
    rate: 5, life: [4, 6], size: [16, 26], shape: 'note',
    spawn: (w, h) => ({ x: rnd(0, w), y: h + 30, vx: 0, vy: rnd(-120, -70) }),
    sway: [35, 0.5], spin: 0.6,
  },
};

const MAX_DT = 0.1;

export class ParticleSystem {
  particles: Particle[] = [];
  maxParticles = 400;
  private lastMs: number | null = null;
  private pending: Partial<Record<ParticleKey, number>> = {};

  updateAndDraw(ctx: CanvasRenderingContext2D, width: number, height: number, settings: StudioSettings, timeMs: number) {
    const active = PARTICLE_KEYS.filter((k) => settings[k]);
    // 흐른 시간(초) — 첫 프레임·뒤로 감기·멈춤은 0, 큰 건너뜀은 잘라서 한꺼번에 몰리지 않게
    const dt = this.lastMs === null ? 0 : Math.max(0, Math.min(MAX_DT, (timeMs - this.lastMs) / 1000));
    this.lastMs = timeMs;

    if (active.length === 0) {
      this.particles = [];
      this.pending = {};
      return;
    }

    const unit = Math.min(width, height) / 1080; // 단위 → 화면 px
    const w = width / unit, h = height / unit; // 화면 크기를 단위로
    const density = settings.overlayDensity / 100;
    const speed = settings.overlaySpeed / 100;
    const sizeScale = settings.overlaySize / 100;

    for (const key of active) {
      const spec = KINDS[key];
      let due = (this.pending[key] ?? 0) + spec.rate * density * dt;
      while (due >= 1 && this.particles.length < this.maxParticles) {
        this.particles.push(this.make(key, spec, w, h, settings, sizeScale, timeMs));
        due -= 1;
      }
      this.pending[key] = Math.min(due, 3);
    }

    ctx.save();
    ctx.globalAlpha = settings.overlayOpacity / 100;
    const keep: Particle[] = [];
    for (const p of this.particles) {
      if (!settings[p.kind]) continue; // 끈 효과는 바로 사라짐
      const spec = KINDS[p.kind];
      p.age += dt;
      if (spec.gravity) p.vy += spec.gravity * dt;
      const sway = spec.sway ? Math.sin((p.age * spec.sway[1] + p.phase) * Math.PI * 2) * spec.sway[0] : 0;
      p.x += (p.vx + sway) * speed * dt;
      p.y += p.vy * speed * dt;
      p.spin += p.spinSpeed * dt;
      const out = p.x < -300 || p.x > w + 300 || p.y < -300 || p.y > h + 300;
      if (p.age >= p.life || out) continue;
      keep.push(p);
      this.draw(ctx, p, unit, h);
    }
    this.particles = keep;
    ctx.restore();
  }

  private make(kind: ParticleKey, spec: KindSpec, w: number, h: number, s: StudioSettings, sizeScale: number, timeMs: number): Particle {
    const at = spec.spawn(w, h, s);
    const color = spec.ownColor && s.overlayColorPreset === 'DEFAULT'
      ? spec.ownColor()
      : getPresetColor(s.overlayColorPreset, s.overlayColor, Math.floor(rnd(0, 100)), 100, timeMs);
    return {
      kind,
      ...at,
      size: rnd(spec.size[0], spec.size[1]) * sizeScale,
      color,
      age: 0,
      life: rnd(spec.life[0], spec.life[1]),
      spin: rnd(0, Math.PI * 2),
      spinSpeed: spec.spin ? rnd(-spec.spin, spec.spin) : 0,
      phase: Math.random(),
      shape: typeof spec.shape === 'function' ? spec.shape() : spec.shape,
    };
  }

  /** 나타날 때·사라질 때 부드럽게(앞 15%·뒤 25%) */
  private fade(p: Particle): number {
    const t = p.age / p.life;
    const ease = (x: number) => x * x * (3 - 2 * x);
    if (t < 0.15) return ease(t / 0.15);
    if (t > 0.75) return ease((1 - t) / 0.25);
    return 1;
  }

  private draw(ctx: CanvasRenderingContext2D, p: Particle, unit: number, hUnits: number) {
    const a = this.fade(p);
    if (a <= 0) return;
    const r = p.size * unit;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(p.x * unit, p.y * unit);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;

    switch (p.shape) {
      case 'dot':
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'glow': {
        // 가운데가 밝고 바깥으로 번지는 원(불씨·보케)
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'drop': {
        // 진행 방향으로 꼬리가 긴 물방울
        ctx.rotate(Math.atan2(p.vy, p.vx) - Math.PI / 2);
        ctx.beginPath();
        ctx.arc(0, r * 0.6, r * 0.6, 0, Math.PI);
        ctx.lineTo(0, -r * 1.6);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'star': {
        // 네 갈래 반짝임 — 크기가 살짝 맥박친다
        const k = r * (0.75 + 0.25 * Math.sin((p.age * 3 + p.phase) * Math.PI * 2));
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2;
          const rr = i % 2 === 0 ? k : k * 0.22;
          ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'heart': {
        // 원 두 개 + 아래 꼭짓점
        ctx.rotate(Math.sin(p.spin) * 0.25);
        const q = r * 0.5;
        ctx.beginPath();
        ctx.arc(-q, -q * 0.3, q, Math.PI * 0.85, Math.PI * 2);
        ctx.arc(q, -q * 0.3, q, Math.PI, Math.PI * 0.15 + Math.PI * 2);
        ctx.lineTo(0, r * 1.05);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'note':
        ctx.rotate(Math.sin(p.spin) * 0.3);
        ctx.font = `${Math.round(r * 1.9)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.phase < 0.5 ? '♪' : '♫', 0, 0);
        break;
      case 'square':
        ctx.rotate(p.spin);
        ctx.fillRect(-r * 0.5, -r * 0.5, r, r * (p.kind === 'confetti' ? 0.55 : 1));
        break;
      case 'triangle':
        ctx.rotate(p.spin);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.7);
        ctx.lineTo(r * 0.6, r * 0.45);
        ctx.lineTo(-r * 0.6, r * 0.45);
        ctx.closePath();
        if (p.kind === 'neonShapes') {
          ctx.lineWidth = Math.max(1, r * 0.12);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = r * 0.8;
          ctx.stroke();
        } else ctx.fill();
        break;
      case 'streak': {
        // 빗줄기: 속도 방향으로 0.03초만큼의 선
        ctx.lineWidth = Math.max(1, r);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-p.vx * 0.03 * unit, -p.vy * 0.03 * unit);
        ctx.stroke();
        break;
      }
      case 'beam': {
        const len = 240 * unit * (p.vx > 0 ? -1 : 1);
        const g = ctx.createLinearGradient(len, 0, 0, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, p.color);
        ctx.strokeStyle = g;
        ctx.lineWidth = r;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = r * 4;
        ctx.beginPath();
        ctx.moveTo(len, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
        break;
      }
      case 'dash': {
        ctx.lineWidth = r;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6 * unit;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -46 * unit);
        ctx.stroke();
        break;
      }
      case 'bolt': {
        // 화면 위에서 아래로 갈라지는 번개 — 위상값으로 모양을 고정해 한 번개 안에서는 흔들리지 않게
        let seed = Math.floor(p.phase * 1e6);
        const next = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        const bottom = hUnits * (0.45 + next() * 0.35) * unit;
        ctx.lineWidth = r;
        ctx.shadowColor = '#9ec5ff';
        ctx.shadowBlur = 18 * unit;
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        let x = 0;
        ctx.moveTo(0, 0);
        for (let y = 0; y < bottom; y += 38 * unit) {
          x += (next() - 0.5) * 70 * unit;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }
}
