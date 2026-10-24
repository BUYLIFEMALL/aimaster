// 스펙트럼·필터·화면 효과 그리기 — 2026-10-24 P-0 새로 씀(음악 담당 `claude-win-20261024-music`).
// 이전 스펙트럼·필터 코드는 외부 상용 프로그램 번들에서 옮겨 온 것이어서(권리 점검 docs/analysis-spectrum-studio-pro-20261024/RIGHTS_CHECK_20261024.md)
// 설정 이름(스펙트럼 9종·필터 7종)만 유지하고 소리 나누기·그리기·필터 값을 우리 방식으로 다시 작성했다.
// - 소리 나누기: 주파수 칸(128칸)을 앞에서부터 쓰지 않고 로그 구간(낮은음 촘촘·높은음 넓게)으로 묶어 0~1 세기로 만든다(bandLevels)
// - 미리보기(EditorStudio)와 MP4(video-exporter)가 같은 함수를 쓴다
import { StudioSettings, FilterType } from '@/types/playlist';
import { getPresetColor, drawRoundRect } from './color-utils';

/** CSS 필터 문자열(우리 값). n = 세기 0~1 */
export function getFilterString(filterType: FilterType, intensity: number, bassLevel: number): string {
  const n = Math.max(0, Math.min(1, intensity / 100));
  const f = (x: number) => x.toFixed(3);
  switch (filterType) {
    case 'CINEMATIC':
      return `contrast(${f(1 + 0.25 * n)}) saturate(${f(1 - 0.12 * n)}) brightness(${f(1 - 0.05 * n)}) sepia(${f(0.12 * n)})`;
    case 'VINTAGE':
      return `sepia(${f(0.6 * n)}) saturate(${f(1 - 0.2 * n)}) contrast(${f(1 + 0.06 * n)}) brightness(${f(1 + 0.04 * n)})`;
    case 'NOIR':
      return `grayscale(${f(n)}) contrast(${f(1 + 0.45 * n)}) brightness(${f(1 - 0.08 * n)})`;
    case 'DREAMY':
      return `brightness(${f(1 + 0.14 * n)}) saturate(${f(1 + 0.22 * n)}) blur(${f(0.7 * n)}px)`;
    case 'VIVID':
      return `saturate(${f(1 + 0.65 * n)}) contrast(${f(1 + 0.14 * n)})`;
    case 'CYBERPUNK':
      return `hue-rotate(${Math.round(150 * n)}deg) saturate(${f(1 + 0.7 * n)}) contrast(${f(1 + 0.18 * n)})`;
    case 'PSYCHEDELIC': {
      // 저음이 셀수록 색이 더 돈다
      const turn = Math.round((bassLevel / 255) * 240 * n);
      return `hue-rotate(${turn}deg) saturate(${f(1 + n)}) contrast(${f(1 + 0.12 * n)})`;
    }
    case 'NONE':
    default:
      return '';
  }
}

export function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) {
  const radius = Math.max(width, height) * 0.75;
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, radius * 0.4,
    width / 2, height / 2, radius
  );
  const alpha = (intensity / 100) * 0.85;
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${alpha})`);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// 필름 노이즈 — 노이즈 그림 4장을 한 번 만들어 두고 돌려 쓴다(매 프레임 새로 만들지 않음)
let grainTiles: HTMLCanvasElement[] | null = null;
let grainTick = 0;
function makeGrainTiles(): HTMLCanvasElement[] {
  const tiles: HTMLCanvasElement[] = [];
  for (let t = 0; t < 4; t++) {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d');
    if (!g) break;
    const img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    tiles.push(c);
  }
  return tiles;
}

export function drawFilmGrain(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) {
  if (!grainTiles) grainTiles = makeGrainTiles();
  if (grainTiles.length === 0) return;
  const tile = grainTiles[grainTick++ % grainTiles.length];
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = (intensity / 100) * 0.35;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function drawLightLeaks(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number, timeMs: number) {
  const alpha = (intensity / 100) * 0.45;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = alpha;

  const x = width * 0.5 + Math.sin(timeMs * 0.001) * width * 0.3;
  const y = height * 0.4 + Math.cos(timeMs * 0.0012) * height * 0.25;
  const grad = ctx.createRadialGradient(x, y, 10, x, y, width * 0.5);
  grad.addColorStop(0, 'rgba(255, 120, 40, 0.9)');
  grad.addColorStop(0.5, 'rgba(255, 60, 120, 0.5)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * 주파수 칸(0~255)을 count개 로그 구간으로 묶어 0~1(감도 반영, 최대 1.25) 세기로.
 * 낮은 칸 1%~높은 칸 72% 범위를 쓴다(그 위는 대부분 비어 있음). 소리가 없으면 아주 작은 기본값.
 */
export function bandLevels(freqData: Uint8Array, count: number, sensitivity: number): Float32Array {
  const out = new Float32Array(count);
  const len = freqData.length;
  if (len === 0 || count <= 0) return out.fill(0.02);
  const lo = 0.01, hi = 0.72;
  for (let i = 0; i < count; i++) {
    const a = len * lo * Math.pow(hi / lo, i / count);
    const b = len * lo * Math.pow(hi / lo, (i + 1) / count);
    const from = Math.min(len - 1, Math.floor(a));
    const to = Math.min(len, Math.max(from + 1, Math.ceil(b)));
    let sum = 0;
    for (let k = from; k < to; k++) sum += freqData[k];
    const v = (sum / (to - from) / 255) * sensitivity;
    out[i] = Math.min(1.25, Math.pow(v, 0.85));
  }
  return out;
}

/** 점들을 부드러운 곡선으로 잇는다(중간점 2차 곡선) */
function smoothPath(ctx: CanvasRenderingContext2D, pts: [number, number][], moveFirst = true) {
  if (pts.length === 0) return;
  if (moveFirst) ctx.moveTo(pts[0][0], pts[0][1]);
  else ctx.lineTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
}

export function drawSpectrumVisualizer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  freqData: Uint8Array,
  settings: StudioSettings,
  timeMs: number
) {
  const type = settings.visualizerType;
  if (type === 'NONE') return;

  const count = Math.max(4, settings.barCount);
  const sens = settings.sensitivity / 100;
  const levels = bandLevels(freqData, count, sens);
  const cx = settings.spectrumCentered ? width / 2 : (settings.spectrumX / 100) * width;
  const cy = settings.spectrumCentered ? height / 2 : (settings.spectrumY / 100) * height;
  const amp = height * 0.32 * (settings.spectrumHeight / 100); // 세기 1일 때 높이
  const span = width * (settings.spectrumWidth / 100);
  const left = cx - span / 2;
  const opacity = settings.visualizerOpacity / 100;
  const color = (i: number, n: number) => getPresetColor(settings.colorPreset, settings.primaryColor, i, n, timeMs);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = settings.barThickness;
  ctx.shadowBlur = 10;

  switch (type) {
    case 'BARS': {
      // 기준선에서 위로 솟는 막대
      const slot = span / count;
      const w = Math.max(1, slot * Math.min(1, settings.barWidth / 10));
      for (let i = 0; i < count; i++) {
        const h = Math.max(3, levels[i] * amp);
        ctx.fillStyle = color(i, count);
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        drawRoundRect(ctx, left + slot * i + (slot - w) / 2, cy - h, w, h, Math.min(settings.cornerRadius, w / 2));
        ctx.fill();
      }
      break;
    }
    case 'SYMMETRIC': {
      // 가운데가 저음, 양옆으로 갈수록 고음 — 위아래로 같이 늘어나는 막대
      const half = Math.max(2, Math.floor(count / 2));
      const halfLevels = bandLevels(freqData, half, sens);
      const slot = span / 2 / half;
      const w = Math.max(1, slot * Math.min(1, settings.barWidth / 10));
      for (let i = 0; i < half; i++) {
        const h = Math.max(3, halfLevels[i] * amp);
        ctx.fillStyle = color(i, half);
        ctx.shadowColor = ctx.fillStyle;
        for (const x of [cx + slot * i + (slot - w) / 2, cx - slot * (i + 1) + (slot - w) / 2]) {
          ctx.beginPath();
          drawRoundRect(ctx, x, cy - h / 2, w, h, Math.min(settings.cornerRadius, w / 2));
          ctx.fill();
        }
      }
      break;
    }
    case 'MINI_BARS': {
      // 작은 LED 칸 이퀄라이저 — 세기를 칸 수로 끊어 그린다
      const mw = span * 0.4 + settings.miniBarsWidth;
      const mx = settings.miniBarsCentered ? (width - mw) / 2 : (settings.miniBarsX / 100) * width;
      const my = (settings.miniBarsY / 100) * height;
      const slot = mw / count;
      const w = Math.max(1, slot * 0.72);
      const cell = Math.max(2, settings.miniBarsSize / 8);
      ctx.shadowBlur = 0;
      for (let i = 0; i < count; i++) {
        const cells = Math.max(1, Math.round((levels[i] * settings.miniBarsSize) / cell));
        ctx.fillStyle = color(i, count);
        for (let c = 0; c < cells; c++) ctx.fillRect(mx + slot * i, my - (c + 1) * cell, w, cell * 0.7);
      }
      break;
    }
    case 'CIRCLE': {
      // 원 둘레로 뻗는 선 — 좌우가 거울처럼 같게(위쪽 가운데가 저음)
      const r = settings.circleRadius;
      const reach = amp * 0.45;
      ctx.strokeStyle = color(0, 1);
      ctx.globalAlpha = opacity * 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = opacity;
      for (let i = 0; i < count; i++) {
        const mirror = i < count / 2 ? i : count - 1 - i;
        const lv = levels[Math.min(count - 1, mirror * 2)];
        const ang = -Math.PI / 2 + (i / count) * Math.PI * 2;
        const len = Math.max(2, lv * reach);
        ctx.strokeStyle = color(i, count);
        ctx.shadowColor = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
        ctx.lineTo(cx + Math.cos(ang) * (r + len), cy + Math.sin(ang) * (r + len));
        ctx.stroke();
      }
      break;
    }
    case 'LINE': {
      // 부드러운 한 줄
      const pts: [number, number][] = [];
      for (let i = 0; i < count; i++) pts.push([left + (span * i) / (count - 1), cy - levels[i] * amp]);
      ctx.strokeStyle = color(0, 1);
      ctx.shadowColor = ctx.strokeStyle;
      ctx.beginPath();
      smoothPath(ctx, pts);
      ctx.stroke();
      break;
    }
    case 'WAVEFORM': {
      // 세 겹 물결 — 겹마다 시간에 따라 조금씩 다른 박자로 흔들리고, 뒤 겹일수록 옅고 가늘다
      const layers = [
        { shift: 0, alpha: 1, width: 1, offset: 0, dir: -1 },
        { shift: 0.9, alpha: 0.55, width: 0.65, offset: -0.22, dir: -1 },
        { shift: 1.7, alpha: 0.35, width: 0.5, offset: 0.22, dir: 1 },
      ];
      layers.forEach((L, li) => {
        const pts: [number, number][] = [];
        for (let i = 0; i < count; i++) {
          const wob = 1 + 0.12 * Math.sin(timeMs / 420 + i * 0.35 + L.shift);
          pts.push([left + (span * i) / (count - 1), cy + L.offset * amp + L.dir * levels[i] * amp * 0.8 * wob]);
        }
        ctx.globalAlpha = opacity * L.alpha;
        ctx.lineWidth = Math.max(1, settings.barThickness * L.width);
        ctx.strokeStyle = color(li, 3);
        ctx.shadowColor = ctx.strokeStyle;
        ctx.beginPath();
        smoothPath(ctx, pts);
        ctx.stroke();
      });
      break;
    }
    case 'FILLED_WAVE': {
      // 위는 진하고 아래로 갈수록 투명해지는 채운 물결
      const top = color(0, 1);
      const pts: [number, number][] = [];
      for (let i = 0; i < count; i++) pts.push([left + (span * i) / (count - 1), cy - Math.max(2, levels[i] * amp)]);
      const g = ctx.createLinearGradient(0, cy - amp, 0, cy);
      g.addColorStop(0, top);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.shadowColor = top;
      ctx.beginPath();
      ctx.moveTo(left, cy);
      smoothPath(ctx, pts, false);
      ctx.lineTo(left + span, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = top;
      ctx.lineWidth = Math.max(1, settings.barThickness * 0.6);
      ctx.beginPath();
      smoothPath(ctx, pts);
      ctx.stroke();
      break;
    }
    case 'RADIAL_WAVE': {
      // 저음·중저음·중음·고음 4개 고리가 각자 세기만큼 커진다
      const groups = bandLevels(freqData, 4, sens);
      const gap = Math.max(10, settings.circleRadius * 0.28);
      for (let k = 0; k < 4; k++) {
        const rr = settings.circleRadius + k * gap + groups[k] * amp * 0.25;
        ctx.strokeStyle = color(k, 4);
        ctx.shadowColor = ctx.strokeStyle;
        ctx.lineWidth = 1.5 + groups[k] * 7;
        ctx.globalAlpha = opacity * (1 - k * 0.15);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(4, rr), 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'SPECTRUM_DUAL': {
      // 위로 솟는 막대 + 아래로 옅게 비치는 반사
      const slot = span / count;
      const w = Math.max(1, slot * 0.82);
      ctx.shadowBlur = 0;
      for (let i = 0; i < count; i++) {
        const h = Math.max(2, levels[i] * amp * 0.85);
        ctx.fillStyle = color(i, count);
        ctx.globalAlpha = opacity;
        ctx.fillRect(left + slot * i, cy - h, w, h);
        ctx.globalAlpha = opacity * 0.4;
        ctx.fillRect(left + slot * i, cy + 2, w, h * 0.6);
      }
      break;
    }
  }

  ctx.restore();
}
