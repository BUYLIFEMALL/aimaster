"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ImagePlus, RefreshCw, Sparkles, X } from "lucide-react";
import { DEFAULT_THUMB_SETTINGS, THUMB_FONTS, THUMB_STYLES, type ThumbSettings } from "@/lib/playlist/types";
import { parseTitle } from "@/lib/playlist/validate";
import { CopyButton, ErrorBox, PrimaryButton } from "./common";
import { useAi } from "./useAi";

export interface ThumbData { thumbUrl: string | null; thumbPrompt: string | null; thumbSettings: Partial<ThumbSettings> | null }

const W = 1280;
const H = 720;

/** 글자를 최대 폭에 맞춰 줄바꿈 */
function wrapByWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of Array.from(para)) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        out.push(line.trim());
        line = ch;
      } else line += ch;
    }
    if (line.trim()) out.push(line.trim());
  }
  return out;
}

/** 인물 참고 이미지를 긴 변 1280px 이내 JPEG data URL로 줄인다 */
async function fileToDataUrl(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export function ThumbnailTab({ projectId, title, data, onData }: { projectId: string; genre: string; title: string; data: ThumbData; onData: (d: ThumbData) => void }) {
  const { generate } = useAi();
  const parsed = parseTitle(title);
  const defaultText = parsed ? `${parsed.sentence}\n${parsed.k1} & ${parsed.k2}` : title;

  const [settings, setSettings] = useState<ThumbSettings>({ ...DEFAULT_THUMB_SETTINGS, text: defaultText, ...(data.thumbSettings ?? {}) });
  const [persona, setPersona] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ThumbSettings>(k: K, v: ThumbSettings[K]) => setSettings((s) => ({ ...s, [k]: v }));

  // 저장된 썸네일을 blob으로 받아 캔버스가 오염되지 않게 한다
  useEffect(() => {
    let revoked: string | null = null;
    let alive = true;
    if (!data.thumbUrl) { setImgUrl(null); return; }
    fetch(data.thumbUrl).then((r) => r.blob()).then((b) => {
      if (!alive) return;
      revoked = URL.createObjectURL(b);
      setImgUrl(revoked);
    }).catch(() => alive && setError("저장된 이미지를 불러오지 못했습니다."));
    return () => { alive = false; if (revoked) URL.revokeObjectURL(revoked); };
  }, [data.thumbUrl]);

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgUrl) return;
    const font = THUMB_FONTS.find((f) => f.id === settings.font) ?? THUMB_FONTS[0];
    const px = Math.round(H * settings.size);
    const weight = settings.bold ? Math.max(font.weight, 700) : font.weight;
    try { await document.fonts.load(`${weight} ${px}px "${font.family}"`, settings.text || "가"); } catch { /* 글꼴을 못 받아도 기본 글꼴로 그린다 */ }
    const img = new Image();
    img.onload = () => {
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, W, H);
      if (!settings.text.trim()) return;
      ctx.font = `${weight} ${px}px "${font.family}", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const lines = wrapByWidth(ctx, settings.text, W * 0.86);
      const lineH = px * 1.25;
      const blockH = lines.length * lineH;
      const cy = settings.position === "top" ? blockH / 2 + H * 0.07 : settings.position === "center" ? H / 2 : H - blockH / 2 - H * 0.07;
      // 배경이 밝아도 읽히도록 어두운 띠를 깔고 글자에 그림자·외곽선을 준다
      const g = ctx.createLinearGradient(0, cy - blockH / 2 - 30, 0, cy + blockH / 2 + 30);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, "rgba(0,0,0,0.38)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, cy - blockH / 2 - 30, W, blockH + 60);
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = px * 0.18;
      lines.forEach((ln, i) => {
        const y = cy - blockH / 2 + lineH * (i + 0.5);
        ctx.lineWidth = px * 0.12;
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.strokeText(ln, W / 2, y);
        ctx.fillStyle = settings.color;
        ctx.fillText(ln, W / 2, y);
      });
    };
    img.src = imgUrl;
  }, [imgUrl, settings]);

  useEffect(() => { void draw(); }, [draw]);

  // 글자 설정은 잠시 멈추면 자동 저장
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thumbSettings: settings }) }).catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [settings, projectId]);

  async function run(withFeedback: boolean) {
    setBusy(true);
    setError(null);
    const d = await generate(projectId, "thumbnail", { style: settings.style, persona: persona ?? undefined, feedback: withFeedback ? feedback : undefined });
    setBusy(false);
    if (d.error) return setError(d.error);
    const p = d.project as { thumbUrl: string | null; thumbPrompt: string | null; thumbSettings: Partial<ThumbSettings> | null };
    onData({ thumbUrl: p.thumbUrl, thumbPrompt: p.thumbPrompt, thumbSettings: p.thumbSettings });
    if (withFeedback) setFeedback("");
  }

  async function pickPersona(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("이미지 파일만 올릴 수 있습니다.");
    try { setPersona(await fileToDataUrl(file)); setError(null); } catch { setError("이미지를 읽지 못했습니다."); }
  }

  function download(kind: "png" | "jpg") {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL(kind === "png" ? "image/png" : "image/jpeg", 0.92);
    a.download = `thumbnail.${kind}`;
    a.click();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">스타일</p>
          <div className="grid grid-cols-2 gap-2">
            {THUMB_STYLES.map((s) => (
              <button key={s.id} type="button" onClick={() => set("style", s.id)} className={`rounded-lg border px-2 py-2 text-xs ${settings.style === s.id ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-800" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}>{s.label}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">인물 참고 이미지 (선택)</p>
          {persona ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={persona} alt="참고 이미지" className="h-24 rounded-lg border border-neutral-200 object-cover" />
              <button type="button" onClick={() => setPersona(null)} aria-label="참고 이미지 제거" className="absolute -right-2 -top-2 rounded-full bg-neutral-800 p-1 text-white"><X size={12} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-50"><ImagePlus size={14} />이미지 올리기</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void pickPersona(e.target.files?.[0]); e.target.value = ""; }} />
          <p className="mt-1 text-[11px] text-neutral-400">같은 인물이 썸네일에 나오도록 합니다. 저장되지 않고 이번 생성에만 쓰입니다.</p>
        </div>
        <PrimaryButton busy={busy} onClick={() => run(false)} className="w-full">
          {data.thumbUrl ? <><RefreshCw size={15} />배경 새로 만들기</> : <><Sparkles size={15} />썸네일 배경 만들기</>}
        </PrimaryButton>
        {busy && <p className="text-xs text-neutral-500">이미지 생성은 30초~1분 정도 걸립니다.</p>}
        <ErrorBox message={error} />

        <hr className="border-neutral-200" />
        <p className="text-xs font-bold text-neutral-700">제목 글자</p>
        <label className="block text-xs font-medium text-neutral-500">
          글자 내용
          <textarea value={settings.text} onChange={(e) => set("text", e.target.value.slice(0, 120))} rows={3} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900" />
        </label>
        <label className="block text-xs font-medium text-neutral-500">
          글꼴
          <select value={settings.font} onChange={(e) => set("font", e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-2 text-sm text-neutral-900">
            {THUMB_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-neutral-500">
            크기 {Math.round(settings.size * 100)}
            <input type="range" min={0.05} max={0.15} step={0.01} value={settings.size} onChange={(e) => set("size", Number(e.target.value))} className="mt-1 w-full accent-indigo-600" />
          </label>
          <div className="flex items-end gap-2">
            <label className="text-xs font-medium text-neutral-500">
              색
              <input type="color" value={settings.color} onChange={(e) => set("color", e.target.value)} className="mt-1 block h-9 w-14 cursor-pointer rounded border border-neutral-300" />
            </label>
            <button type="button" onClick={() => set("bold", !settings.bold)} aria-pressed={settings.bold} className={`h-9 w-9 rounded-lg border text-sm font-black ${settings.bold ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-neutral-300 text-neutral-500"}`}>B</button>
          </div>
        </div>
        <div className="flex gap-2">
          {(["top", "center", "bottom"] as const).map((pos) => (
            <button key={pos} type="button" onClick={() => set("position", pos)} className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${settings.position === pos ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-800" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}>
              {pos === "top" ? "위" : pos === "center" ? "가운데" : "아래"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {data.thumbUrl ? (
          <>
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
              <canvas ref={canvasRef} className="block aspect-video w-full" aria-label="썸네일 미리보기" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => download("png")} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"><Download size={15} />PNG 저장</button>
              <button type="button" onClick={() => download("jpg")} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"><Download size={15} />JPG 저장</button>
              {data.thumbPrompt && <CopyButton text={data.thumbPrompt} label="이미지 프롬프트 복사" className="!px-3 !py-2 !text-sm" />}
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="mb-2 text-sm font-bold text-neutral-900">수정 요청</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input value={feedback} onChange={(e) => setFeedback(e.target.value)} onKeyDown={(e) => e.key === "Enter" && feedback.trim() && !busy && run(true)} placeholder="예: 더 어둡게, 창밖에 비가 오게, 인물을 오른쪽으로" className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900" />
                <PrimaryButton busy={busy} disabled={!feedback.trim()} onClick={() => run(true)}>반영해서 다시 만들기</PrimaryButton>
              </div>
            </div>
          </>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white text-sm text-neutral-400">
            스타일을 고르고 &apos;썸네일 배경 만들기&apos;를 누르세요.
          </div>
        )}
      </div>
    </div>
  );
}
