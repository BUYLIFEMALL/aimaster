// P-4(2026-10-24) AI 없이 움직이는 무료 배경 — 배경 이미지를 넣지 않았을 때 그린다.
// 미리보기(EditorStudio)와 MP4(video-exporter)가 같은 함수를 쓰고, 모든 움직임을 시간(timeMs)만으로 정해 두 결과가 같다.
// 배경 5종·색 묶음 4종은 우리 디자인(외부 원본 값 없음). 저음(bassLevel 0~255)에 살짝 반응한다.
import type { AnimatedBg, BgAnimPalette, StudioSettings } from '@/types/playlist';

export const ANIMATED_BGS: { value: AnimatedBg; label: string }[] = [
  { value: 'none', label: '끔' },
  { value: 'orbs', label: '빛 구슬' },
  { value: 'aurora', label: '오로라' },
  { value: 'stars', label: '별밤' },
  { value: 'grid', label: '레트로 격자' },
  { value: 'gradient', label: '그라디언트' },
];

export const BG_PALETTES: { value: BgAnimPalette; label: string; colors: [string, string, string]; base: string }[] = [
  { value: 'night', label: '밤하늘', colors: ['#6d5dfc', '#22d3ee', '#c026d3'], base: '#070a18' },
  { value: 'sunset', label: '노을', colors: ['#ff7a45', '#ff4d8d', '#8b5cf6'], base: '#1a0b16' },
  { value: 'forest', label: '숲', colors: ['#2dd4bf', '#84cc16', '#0ea5e9'], base: '#04140f' },
  { value: 'mono', label: '흑백', colors: ['#e5e7eb', '#9ca3af', '#6b7280'], base: '#0b0b0d' },
];

/** 0~1 고정 난수(같은 번호면 늘 같은 값) */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function drawAnimatedBackground(ctx: CanvasRenderingContext2D, width: number, height: number, s: StudioSettings, timeMs: number, bassLevel: number) {
  const kind = s.bgAnimated;
  if (kind === 'none') return;
  const pal = BG_PALETTES.find((p) => p.value === s.bgAnimPalette) ?? BG_PALETTES[0];
  const t = (timeMs / 1000) * (s.bgAnimSpeed / 100);
  const bass = Math.max(0, Math.min(1, bassLevel / 255));
  const u = Math.min(width, height) / 1080;

  ctx.save();
  ctx.fillStyle = pal.base;
  ctx.fillRect(0, 0, width, height);

  switch (kind) {
    case 'orbs': {
      // 큰 빛 구슬 6개가 서로 다른 궤도로 천천히 떠다닌다
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const fx = 0.07 + hash(i) * 0.08, fy = 0.05 + hash(i + 9) * 0.07;
        const x = width * (0.5 + 0.38 * Math.sin(t * fx * 2 * Math.PI + i * 1.7));
        const y = height * (0.5 + 0.36 * Math.cos(t * fy * 2 * Math.PI + i * 2.3));
        const r = (260 + hash(i + 3) * 260) * u * (1 + bass * 0.15);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, pal.colors[i % 3] + 'aa');
        g.addColorStop(1, pal.colors[i % 3] + '00');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      break;
    }
    case 'aurora': {
      // 화면 위쪽에 물결치는 빛 띠 3개
      ctx.globalCompositeOperation = 'screen';
      for (let b = 0; b < 3; b++) {
        const baseY = height * (0.22 + b * 0.12);
        const amp = height * (0.06 + b * 0.02) * (1 + bass * 0.3);
        const thick = height * (0.22 - b * 0.04);
        ctx.beginPath();
        const step = width / 48;
        for (let x = 0; x <= width + step; x += step) {
          const y = baseY + Math.sin(x / width * Math.PI * (2 + b) + t * (0.35 + b * 0.12)) * amp + Math.sin(x / width * 9 + t * 0.8 + b) * amp * 0.25;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(width, baseY + thick + amp);
        ctx.lineTo(0, baseY + thick + amp);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, baseY - amp, 0, baseY + thick + amp);
        g.addColorStop(0, pal.colors[b] + '00');
        g.addColorStop(0.35, pal.colors[b] + '77');
        g.addColorStop(1, pal.colors[b] + '00');
        ctx.fillStyle = g;
        ctx.fill();
      }
      break;
    }
    case 'stars': {
      // 깊이가 다른 별들이 옆으로 흐르며 반짝인다(가까운 별일수록 빠르고 큼)
      const n = 220;
      for (let i = 0; i < n; i++) {
        const depth = 0.25 + hash(i * 3) * 0.75;
        const x = ((hash(i * 3 + 1) * width + t * 26 * depth * u) % width + width) % width;
        const y = hash(i * 3 + 2) * height;
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (0.8 + depth) + i));
        ctx.globalAlpha = tw * (0.4 + depth * 0.6);
        ctx.fillStyle = i % 9 === 0 ? pal.colors[i % 3] : '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, (0.6 + depth * 1.8) * u * (1 + bass * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // 아래쪽 은은한 빛
      const g = ctx.createLinearGradient(0, height * 0.55, 0, height);
      g.addColorStop(0, pal.colors[0] + '00');
      g.addColorStop(1, pal.colors[0] + '33');
      ctx.fillStyle = g;
      ctx.fillRect(0, height * 0.55, width, height * 0.45);
      break;
    }
    case 'grid': {
      // 지평선을 향해 다가오는 레트로 격자 + 지평선 노을
      const hy = height * 0.56;
      const sky = ctx.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, pal.base);
      sky.addColorStop(1, pal.colors[1] + '66');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, hy);
      const sunR = height * 0.16 * (1 + bass * 0.08);
      const sun = ctx.createLinearGradient(0, hy - sunR, 0, hy);
      sun.addColorStop(0, pal.colors[0]);
      sun.addColorStop(1, pal.colors[1]);
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(width / 2, hy, sunR, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pal.colors[2];
      ctx.lineWidth = Math.max(1, 2 * u);
      ctx.shadowColor = pal.colors[2];
      ctx.shadowBlur = 12 * u;
      ctx.globalAlpha = 0.8;
      for (let i = -14; i <= 14; i++) { // 세로선은 소실점으로 모인다
        ctx.beginPath();
        ctx.moveTo(width / 2 + i * width * 0.012, hy);
        ctx.lineTo(width / 2 + i * width * 0.11, height);
        ctx.stroke();
      }
      const phase = (t * 0.6) % 1;
      for (let k = 0; k < 12; k++) { // 가로선은 앞으로 다가오며 간격이 넓어진다
        const z = (k + phase) / 12;
        const y = hy + (height - hy) * z * z;
        ctx.globalAlpha = 0.25 + 0.6 * z;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;
    }
    case 'gradient': {
      // 세 색이 천천히 도는 큰 그라디언트
      const a = t * 0.15;
      const r = Math.hypot(width, height) / 2;
      const cx = width / 2, cy = height / 2;
      const g = ctx.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      g.addColorStop(0, pal.colors[0]);
      g.addColorStop(0.5, pal.colors[1]);
      g.addColorStop(1, pal.colors[2]);
      ctx.globalAlpha = 0.55 + bass * 0.2;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      break;
    }
  }
  ctx.restore();
}
