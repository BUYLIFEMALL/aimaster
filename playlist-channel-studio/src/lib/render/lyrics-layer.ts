// v1.17 가사 층 — 영상 만들기 미리보기(EditorStudio)와 MP4 내보내기(video-exporter)가 같은 함수로 그린다.
// 가사 읽기·시간표는 공용 기준 코드 사본 src/lib/lyrics.ts(`lyric-timing`, 기준 lyric-video-studio).
import { lineAt, timeline, type LyricLine } from '@/lib/lyrics';
import type { StudioSettings, Track } from '@/types/playlist';

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const FONT = '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

/** 곡마다 시간표를 한 번만 정리해 둔다(곡 길이로 마지막 줄 끝을 자름) */
export function trackTimelines(tracks: Track[]): LyricLine[][] {
  return tracks.map((t) => (t.lyrics?.length ? timeline(t.lyrics, t.duration || Infinity) : []));
}

/** 이어 붙인 전체 시각 T → [곡 번호, 곡 안 시각]. 반복(repeat)도 같은 순서로 이어진다 */
export function locate(durations: number[], T: number): [number, number] {
  const pass = durations.reduce((a, b) => a + b, 0);
  if (pass <= 0) return [-1, 0];
  let t = T % pass;
  for (let i = 0; i < durations.length; i++) {
    if (t < durations[i]) return [i, t];
    t -= durations[i];
  }
  return [durations.length - 1, durations[durations.length - 1]];
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let cur = '';
    for (const ch of Array.from(para)) {
      if (ctx.measureText(cur + ch).width > maxW && cur) {
        const sp = cur.lastIndexOf(' ');
        if (sp > 0) { out.push(cur.slice(0, sp)); cur = cur.slice(sp + 1) + ch; } else { out.push(cur); cur = ch; }
      } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out.slice(0, 2);
}

/** 지금 줄(+ 다음 줄 흐리게)을 화면 아래쪽에 그린다. 간주·가사 없음이면 아무것도 그리지 않는다 */
export function drawLyricsLayer(ctx: CanvasRenderingContext2D, width: number, height: number, lines: LyricLine[], t: number, s: StudioSettings) {
  if (!s.lyricsEnabled || !lines.length) return;
  const { index, gap } = lineAt(lines, t);
  if (index < 0 || gap) return;
  const u = Math.min(width, height) / 1080;
  const px = s.lyricsSize * u, maxW = width * 0.86, cx = width / 2;
  const line = lines[index];
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(px)}px ${FONT}`;
  const rows = wrap(ctx, line.text, maxW);
  const rowH = px * 1.25, top = (s.lyricsY / 100) * height - (rowH * rows.length) / 2;
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 16 * u; ctx.shadowOffsetY = 2 * u;
  // 들어올 때 0.25초 동안 살짝 떠오르며 나타난다
  const enter = clamp((t - line.start) / 0.25);
  ctx.globalAlpha = enter;
  const lift = (1 - enter) * 12 * u;
  const p = clamp((t - line.start) / Math.max(0.2, line.end - line.start));
  const widths = rows.map((r) => ctx.measureText(r).width), total = widths.reduce((a, b) => a + b, 0) || 1;
  let used = 0;
  rows.forEach((r, i) => {
    const y = top + rowH * (i + 0.5) + lift;
    ctx.fillStyle = s.lyricsMode === 'color' ? s.lyricsAccent : s.lyricsColor;
    ctx.fillText(r, cx, y);
    if (s.lyricsMode === 'karaoke') { // 부른 만큼 강조색으로 덮어 그린다
      const part = clamp((p * total - used) / widths[i]);
      if (part > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(cx - widths[i] / 2 - 4, y - rowH / 2, widths[i] * part + 4, rowH); ctx.clip();
        ctx.fillStyle = s.lyricsAccent; ctx.fillText(r, cx, y); ctx.restore();
      }
    }
    used += widths[i];
  });
  const next = lines[index + 1];
  if (s.lyricsNext && next) {
    ctx.globalAlpha = 0.45 * enter;
    ctx.font = `600 ${Math.round(px * 0.62)}px ${FONT}`;
    ctx.fillStyle = s.lyricsColor;
    const nr = wrap(ctx, next.text, maxW)[0] ?? '';
    ctx.fillText(nr, cx, top + rowH * rows.length + px * 0.55 + lift);
  }
  ctx.restore();
}

/** 세로 영상에서 배경을 늘이지 않고 잘라 맞춘다 */
export function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, width: number, height: number) {
  const sc = Math.max(width / img.width, height / img.height), w = img.width * sc, h = img.height * sc;
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
}
