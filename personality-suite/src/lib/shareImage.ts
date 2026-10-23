import type { Report } from "./tests/report";
import type { ScoredResult } from "./tests/types";

// 결과 카드를 브라우저 안에서 PNG로 그린다(서버로 보내지 않는다). 점수·요약만 담고 개인정보는 넣지 않는다.
// v1.23: 화면과 같은 미스틱 미드나잇 퍼플(타로점 토큰) — 배경 #090614, 보라 #a855f7/#c084fc, 금색 #f59e0b.

const W = 1080;
const H = 1350;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    const next = line + ch;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = ch.trim() ? ch : "";
      if (lines.length === maxLines) break;
    } else line = next;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && text.length > lines.join("").length) lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, "…");
  return lines;
}

export function renderShareCard(testTitle: string, report: Report, result: ScoredResult): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const font = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#2a1450"); g.addColorStop(0.5, "#120d24"); g.addColorStop(1, "#090614");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W - 120, 120, 10, W - 120, 120, 420);
  glow.addColorStop(0, "rgba(245,158,11,0.18)"); glow.addColorStop(1, "rgba(245,158,11,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  const top = ctx.createLinearGradient(0, 0, W, 0);
  top.addColorStop(0, "#a855f7"); top.addColorStop(1, "#f59e0b");
  ctx.fillStyle = top; ctx.fillRect(0, 0, W, 14);
  ctx.fillStyle = "rgba(251,191,36,0.55)"; ctx.font = `400 34px ${font}`; ctx.fillText("✦  ✧  ✦", W - 230, 132);

  ctx.fillStyle = "#c084fc"; ctx.font = `700 34px ${font}`;
  ctx.fillText(testTitle, 80, 130);

  ctx.fillStyle = "#f1f5f9"; ctx.font = `800 70px ${font}`;
  wrap(ctx, report.title, W - 160, 2).forEach((l, i) => ctx.fillText(l, 80, 240 + i * 88));

  ctx.fillStyle = "#fbbf24"; ctx.font = `600 36px ${font}`;
  wrap(ctx, report.tagline, W - 160, 2).forEach((l, i) => ctx.fillText(l, 80, 440 + i * 52));

  let y = 590;
  const bars: { label: string; pct: number; note: string }[] = [];
  if (result.axes) for (const a of result.axes) bars.push({ label: `${a.poles[0]} / ${a.poles[1]}`, pct: a.firstPct, note: `${a.chosen} 우세` });
  else if (result.traits) for (const t of result.traits.slice(0, 9)) bars.push({ label: t.label, pct: t.score, note: `${t.score}점` });
  const step = Math.min(88, Math.floor(560 / Math.max(bars.length, 1)));
  ctx.font = `600 30px ${font}`;
  for (const b of bars) {
    ctx.fillStyle = "#cbd5e1"; ctx.fillText(b.label, 80, y);
    ctx.fillStyle = "#1c1536"; ctx.fillRect(330, y - 26, 560, 28);
    const bar = ctx.createLinearGradient(330, 0, 890, 0);
    bar.addColorStop(0, "#a855f7"); bar.addColorStop(1, "#c084fc");
    ctx.fillStyle = bar; ctx.fillRect(330, y - 26, Math.max(6, (560 * b.pct) / 100), 28);
    if (result.axes) { // 화면과 같은 균형 구간(40~60%) 금색 띠
      ctx.fillStyle = "rgba(245,158,11,0.25)"; ctx.fillRect(330 + 560 * 0.4, y - 26, 560 * 0.2, 28);
      ctx.fillStyle = "#f59e0b"; ctx.fillRect(330 + 280 - 1, y - 30, 2, 36);
    }
    ctx.fillStyle = "#94a3b8"; ctx.font = `500 26px ${font}`; ctx.fillText(b.note, 910, y - 2);
    ctx.font = `600 30px ${font}`;
    y += step;
  }

  ctx.fillStyle = "#cbd5e1"; ctx.font = `500 30px ${font}`;
  wrap(ctx, report.summary, W - 160, 4).forEach((l, i) => ctx.fillText(l, 80, Math.max(y + 40, 1090) + i * 44));

  ctx.fillStyle = "#64748b"; ctx.font = `500 24px ${font}`;
  ctx.fillText("AI 종합 성격 진단 · 재미와 자기 이해를 위한 참고용이며 진단이 아닙니다", 80, H - 60);
  return c;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, "image/png");
}
