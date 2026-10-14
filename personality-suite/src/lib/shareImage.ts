import type { Report } from "./tests/report";
import type { ScoredResult } from "./tests/types";

// 결과 카드를 브라우저 안에서 PNG로 그린다(서버로 보내지 않는다). 점수·요약만 담고 개인정보는 넣지 않는다.

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
  g.addColorStop(0, "#eef2ff"); g.addColorStop(1, "#ffffff");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#4f46e5"; ctx.fillRect(0, 0, W, 14);

  ctx.fillStyle = "#4f46e5"; ctx.font = `700 34px ${font}`;
  ctx.fillText(testTitle, 80, 130);

  ctx.fillStyle = "#172033"; ctx.font = `800 70px ${font}`;
  wrap(ctx, report.title, W - 160, 2).forEach((l, i) => ctx.fillText(l, 80, 240 + i * 88));

  ctx.fillStyle = "#3730a3"; ctx.font = `600 36px ${font}`;
  wrap(ctx, report.tagline, W - 160, 2).forEach((l, i) => ctx.fillText(l, 80, 440 + i * 52));

  let y = 590;
  const bars: { label: string; pct: number; note: string }[] = [];
  if (result.axes) for (const a of result.axes) bars.push({ label: `${a.poles[0]} / ${a.poles[1]}`, pct: a.firstPct, note: `${a.chosen} 우세` });
  else if (result.traits) for (const t of result.traits.slice(0, 9)) bars.push({ label: t.label, pct: t.score, note: `${t.score}점` });
  const step = Math.min(88, Math.floor(560 / Math.max(bars.length, 1)));
  ctx.font = `600 30px ${font}`;
  for (const b of bars) {
    ctx.fillStyle = "#334155"; ctx.fillText(b.label, 80, y);
    ctx.fillStyle = "#e5e7eb"; ctx.fillRect(330, y - 26, 560, 28);
    ctx.fillStyle = "#4f46e5"; ctx.fillRect(330, y - 26, Math.max(6, (560 * b.pct) / 100), 28);
    ctx.fillStyle = "#64748b"; ctx.font = `500 26px ${font}`; ctx.fillText(b.note, 910, y - 2);
    ctx.font = `600 30px ${font}`;
    y += step;
  }

  ctx.fillStyle = "#475569"; ctx.font = `500 30px ${font}`;
  wrap(ctx, report.summary, W - 160, 4).forEach((l, i) => ctx.fillText(l, 80, Math.max(y + 40, 1090) + i * 44));

  ctx.fillStyle = "#94a3b8"; ctx.font = `500 24px ${font}`;
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
