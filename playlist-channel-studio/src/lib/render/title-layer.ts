// P-1(2026-10-24) 곡 제목 층 — 곡이 바뀔 때 몇 초 동안 곡 제목(+가수·곡 번호)을 보여 준다.
// 영상 만들기 미리보기(EditorStudio)와 MP4 내보내기(video-exporter)가 같은 함수로 그린다(가사 층 lyrics-layer.ts와 같은 방식).
// 스타일 5종·위치 9칸·표시 시간·글로우는 우리 디자인(외부 원본 값 없음).
import type { StudioSettings, TitlePos } from '@/types/playlist';

const FONT = '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/** 파일 이름에서 확장자·밑줄을 지워 화면용 제목으로 */
export function trackTitle(name: string): string {
  return name.replace(/\.(mp3|wav|m4a|aac|flac|ogg|opus|webm)$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || '제목 없음';
}

export interface TitleInfo {
  title: string;
  artist?: string;
  index: number; // 0부터
  total: number;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  const chars = Array.from(text);
  while (chars.length > 1 && ctx.measureText(chars.join('') + '…').width > maxW) chars.pop();
  return chars.join('') + '…';
}

/** 9칸 위치 → 기준점·정렬·들어오는 방향 */
function anchor(pos: TitlePos, width: number, height: number) {
  const mx = width * 0.06, my = height * 0.08;
  const col = pos[1], row = pos[0];
  const x = col === 'l' ? mx : col === 'r' ? width - mx : width / 2;
  const y = row === 't' ? my : row === 'b' ? height - my : height / 2;
  const align: CanvasTextAlign = col === 'l' ? 'left' : col === 'r' ? 'right' : 'center';
  const vAlign = row === 't' ? 'top' : row === 'b' ? 'bottom' : 'middle';
  const from: [number, number] = col === 'l' ? [-1, 0] : col === 'r' ? [1, 0] : row === 't' ? [0, -1] : [0, 1];
  return { x, y, align, vAlign, from };
}

/**
 * t = 지금 곡 안의 시각(초). 곡 시작부터 titleSeconds 동안만 그린다.
 * 들어올 때 0.5초 미끄러져 들어오고, 끝 0.6초 동안 사라진다.
 */
export function drawTitleLayer(ctx: CanvasRenderingContext2D, width: number, height: number, info: TitleInfo | null, t: number, s: StudioSettings) {
  if (!s.titleEnabled || !info || t < 0) return;
  const dur = clamp(s.titleSeconds, 2, 15);
  if (t > dur) return;
  const enter = easeOut(clamp(t / 0.5));
  const leave = clamp((dur - t) / 0.6);
  const alpha = Math.min(enter, leave);
  if (alpha <= 0) return;

  const u = Math.min(width, height) / 1080;
  const px = s.titleSize * u;
  const small = Math.round(px * 0.42);
  const a = anchor(s.titlePos, width, height);
  const slide = (1 - enter) * 40 * u;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(a.from[0] * slide, a.from[1] * slide);
  ctx.textBaseline = 'alphabetic';

  // 줄 구성: (곡 번호) / 제목 / (가수)
  ctx.font = `800 ${Math.round(px)}px ${FONT}`;
  const maxW = width * 0.62;
  const title = ellipsize(ctx, info.title, maxW);
  const titleW = ctx.measureText(title).width;
  ctx.font = `600 ${small}px ${FONT}`;
  const top = s.titleNumber && info.total > 1 ? `${String(info.index + 1).padStart(2, '0')} / ${String(info.total).padStart(2, '0')}` : '';
  const artist = info.artist ? ellipsize(ctx, info.artist, maxW) : '';
  const lines: { text: string; size: number; weight: number; kind: 'top' | 'title' | 'artist' }[] = [];
  if (top) lines.push({ text: top, size: small, weight: 600, kind: 'top' });
  lines.push({ text: title, size: Math.round(px), weight: 800, kind: 'title' });
  if (artist) lines.push({ text: artist, size: Math.round(px * 0.55), weight: 500, kind: 'artist' });
  const gap = px * 0.28;
  const blockH = lines.reduce((h, l) => h + l.size, 0) + gap * (lines.length - 1);
  ctx.font = `600 ${small}px ${FONT}`;
  const blockW = Math.max(titleW, ...lines.filter((l) => l.kind !== 'title').map((l) => { ctx.font = `${l.weight} ${l.size}px ${FONT}`; return ctx.measureText(l.text).width; }));

  const pad = s.titleStyle === 'card' || s.titleStyle === 'tag' ? px * 0.5 : 0;
  const boxW = blockW + pad * 2 + (s.titleStyle === 'card' ? px * 0.18 : 0);
  const boxH = blockH + pad * 2;
  const boxX = a.align === 'left' ? a.x : a.align === 'right' ? a.x - boxW : a.x - boxW / 2;
  const boxY = a.vAlign === 'top' ? a.y : a.vAlign === 'bottom' ? a.y - boxH : a.y - boxH / 2;

  if (s.titleGlow) {
    ctx.shadowColor = s.titleStyle === 'neon' ? s.titleAccent : 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = (s.titleStyle === 'neon' ? 26 : 14) * u;
  }

  // 바탕
  if (s.titleStyle === 'card') {
    ctx.fillStyle = 'rgba(10, 12, 20, 0.62)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, px * 0.3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = s.titleAccent;
    ctx.fillRect(boxX + px * 0.18, boxY + pad * 0.8, px * 0.09, boxH - pad * 1.6);
  } else if (s.titleStyle === 'tag') {
    ctx.fillStyle = s.titleAccent;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, boxH / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 글자
  const textX = s.titleStyle === 'card' ? boxX + pad + px * 0.18 : boxX + pad;
  ctx.textAlign = 'left';
  let y = boxY + pad;
  for (const l of lines) {
    ctx.font = `${l.weight} ${l.size}px ${FONT}`;
    const w = ctx.measureText(l.text).width;
    const x = a.align === 'left' || s.titleStyle === 'card' ? textX : a.align === 'right' ? boxX + boxW - pad - w : boxX + (boxW - w) / 2;
    y += l.size;
    const main = s.titleStyle === 'tag' ? '#0b0b0f' : s.titleColor;
    const sub = s.titleStyle === 'tag' ? 'rgba(11,11,15,0.75)' : l.kind === 'top' ? s.titleAccent : 'rgba(255,255,255,0.78)';
    if (l.kind === 'title' && s.titleStyle === 'outline') {
      ctx.lineWidth = Math.max(1.5, px * 0.06);
      ctx.strokeStyle = s.titleAccent;
      ctx.strokeText(l.text, x, y - l.size * 0.12);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillText(l.text, x, y - l.size * 0.12);
    } else {
      ctx.fillStyle = l.kind === 'title' ? (s.titleStyle === 'neon' ? '#ffffff' : main) : sub;
      ctx.fillText(l.text, x, y - l.size * 0.12);
    }
    if (l.kind === 'title' && s.titleStyle === 'minimal') {
      // 밑줄이 왼쪽에서 자라난다
      ctx.shadowBlur = 0;
      ctx.fillStyle = s.titleAccent;
      ctx.fillRect(x, y + px * 0.08, w * enter, Math.max(2, px * 0.06));
    }
    y += gap;
  }
  ctx.restore();
}
