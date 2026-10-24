// P-3(2026-10-24) 배경 이미지 여러 장 전환 — 미리보기(EditorStudio)와 MP4(video-exporter)가 같은 함수로 그린다.
// 어느 배경을 쓰고 전환이 얼마나 진행됐는지는 시간(전체 시각·곡 번호·곡 안 시각)만으로 정해 두 화면 결과가 같다.
// 전환 효과·기본값은 우리 디자인(외부 원본 값 없음).
import type { BgTransition, StudioSettings } from '@/types/playlist';
import { drawCover } from './lyrics-layer';

export const BG_TRANSITIONS: BgTransition[] = ['fade', 'dissolve', 'slide', 'zoom'];
export const MAX_BG_IMAGES = 10;

type Img = CanvasImageSource & { width: number; height: number };

export interface SlideState {
  /** 지금 배경 번호 */
  to: number;
  /** 전환 중이면 이전 배경 번호, 아니면 -1 */
  from: number;
  /** 전환 진행 0~1(전환 중이 아니면 1) */
  p: number;
  /** 이번 전환에 쓸 효과(랜덤이면 전환 번호로 고정해 뽑음) */
  effect: BgTransition;
}

const ease = (x: number) => x * x * (3 - 2 * x);

/**
 * 배경 n장일 때 지금 상태.
 * - track: 곡이 바뀔 때 다음 배경(곡 번호 % n), 곡 시작부터 전환
 * - interval: N초마다 다음 배경, 구간 시작부터 전환
 * T = 이어 붙인 전체 시각(초), trackIdx·trackT = 지금 곡 번호와 곡 안 시각(초)
 */
export function slideState(n: number, s: StudioSettings, T: number, trackIdx: number, trackT: number): SlideState {
  const pickEffect = (k: number): BgTransition => (s.bgTransition === 'random' ? BG_TRANSITIONS[((k * 2654435761) >>> 0) % BG_TRANSITIONS.length] : s.bgTransition);
  if (n <= 1 || s.bgSlideMode === 'off') return { to: 0, from: -1, p: 1, effect: 'fade' };
  const dur = Math.max(0.2, s.bgTransitionSeconds);
  let k: number, since: number;
  if (s.bgSlideMode === 'track') {
    k = Math.max(0, trackIdx);
    since = trackT;
  } else {
    const every = Math.max(dur + 1, s.bgSlideSeconds);
    k = Math.floor(Math.max(0, T) / every);
    since = Math.max(0, T) - k * every;
  }
  const to = k % n;
  if (k === 0 || since >= dur) return { to, from: -1, p: 1, effect: pickEffect(k) };
  return { to, from: (k - 1) % n, p: ease(since / dur), effect: pickEffect(k) };
}

function drawOne(ctx: CanvasRenderingContext2D, img: Img, width: number, height: number, portrait: boolean) {
  if (portrait) drawCover(ctx, img, width, height);
  else ctx.drawImage(img, 0, 0, width, height);
}

/** 배경 이미지들을 상태에 맞게 그린다(필터·밝기는 부르는 쪽에서 ctx.filter로) */
export function drawBackgroundSlides(ctx: CanvasRenderingContext2D, imgs: Img[], width: number, height: number, portrait: boolean, st: SlideState) {
  const cur = imgs[st.to];
  if (!cur) return;
  const prev = st.from >= 0 ? imgs[st.from] : null;
  if (!prev || st.p >= 1) {
    drawOne(ctx, cur, width, height, portrait);
    return;
  }
  const p = st.p;
  switch (st.effect) {
    case 'fade': // 새 배경이 위에서 서서히 나타남
      drawOne(ctx, prev, width, height, portrait);
      ctx.save(); ctx.globalAlpha *= p; drawOne(ctx, cur, width, height, portrait); ctx.restore();
      break;
    case 'dissolve': { // 이전 배경이 어두워졌다가 새 배경이 밝아짐
      const a = ctx.globalAlpha;
      if (p < 0.5) { ctx.globalAlpha = a * (1 - p * 2); drawOne(ctx, prev, width, height, portrait); }
      else { ctx.globalAlpha = a * ((p - 0.5) * 2); drawOne(ctx, cur, width, height, portrait); }
      ctx.globalAlpha = a;
      break;
    }
    case 'slide': // 새 배경이 오른쪽에서 밀고 들어옴
      ctx.save(); ctx.translate(-p * width, 0); drawOne(ctx, prev, width, height, portrait); ctx.restore();
      ctx.save(); ctx.translate((1 - p) * width, 0); drawOne(ctx, cur, width, height, portrait); ctx.restore();
      break;
    case 'zoom': { // 새 배경이 살짝 크게 시작해 제자리로 줄며 나타남
      drawOne(ctx, prev, width, height, portrait);
      const z = 1 + 0.12 * (1 - p);
      ctx.save();
      ctx.globalAlpha *= p;
      ctx.translate(width / 2, height / 2); ctx.scale(z, z); ctx.translate(-width / 2, -height / 2);
      drawOne(ctx, cur, width, height, portrait);
      ctx.restore();
      break;
    }
    default:
      drawOne(ctx, cur, width, height, portrait);
  }
}
