"use client";

import { useEffect, useRef, useState } from "react";
import { Nanum_Pen_Script } from "next/font/google";
import { Eraser, ImagePlus } from "lucide-react";
import { opaqueBounds, whiteToTransparent } from "@/lib/sign/alpha";

const pen = Nanum_Pen_Script({ weight: "400", subsets: ["latin"], display: "swap" });

export interface SignatureImage {
  dataUrl: string;
  width: number;
  height: number;
}

const COLORS = [
  { id: "#111827", label: "검정" },
  { id: "#1d4ed8", label: "파랑" },
  { id: "#b91c1c", label: "빨강(도장 느낌)" },
];

/** 그림판의 투명하지 않은 부분만 잘라 PNG로 만든다. */
function trimCanvas(src: HTMLCanvasElement): SignatureImage | null {
  const ctx = src.getContext("2d");
  if (!ctx) return null;
  const img = ctx.getImageData(0, 0, src.width, src.height);
  const b = opaqueBounds(img.data, src.width, src.height, 6);
  if (!b) return null;
  const out = document.createElement("canvas");
  out.width = b.w;
  out.height = b.h;
  out.getContext("2d")?.drawImage(src, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
  return { dataUrl: out.toDataURL("image/png"), width: b.w, height: b.h };
}

function DrawPad({ color, onDone }: { color: string; onDone: (s: SignatureImage | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [width, setWidth] = useState(5);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }
  function line(a: { x: number; y: number }, b: { x: number; y: number }) {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        width={900}
        height={300}
        className="w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white"
        style={{ aspectRatio: "3 / 1" }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          last.current = point(e);
          line(last.current, { x: last.current.x + 0.1, y: last.current.y + 0.1 });
        }}
        onPointerMove={(e) => {
          if (!drawing.current || !last.current) return;
          const p = point(e);
          line(last.current, p);
          last.current = p;
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
          onDone(ref.current ? trimCanvas(ref.current) : null);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[13px] text-slate-700">
          펜 굵기
          <input type="range" min={2} max={14} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="accent-teal-700" />
        </label>
        <button
          type="button"
          className="slw-btn"
          onClick={() => {
            const c = ref.current;
            c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
            onDone(null);
          }}
        >
          <Eraser size={14} /> 다시 쓰기
        </button>
      </div>
      <p className="text-[12px] text-slate-600">마우스나 손가락으로 위 칸에 서명하세요. 손을 떼면 바로 반영됩니다.</p>
    </div>
  );
}

function ImageSignature({ onDone }: { onDone: (s: SignatureImage | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [clear, setClear] = useState(true);
  const [threshold, setThreshold] = useState(225);

  useEffect(() => {
    if (!file) return;
    let alive = true;
    void (async () => {
      const bmp = await createImageBitmap(file).catch(() => null);
      if (!bmp || !alive) return onDone(null);
      const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * scale);
      c.height = Math.round(bmp.height * scale);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close();
      if (clear) {
        const img = ctx.getImageData(0, 0, c.width, c.height);
        img.data.set(whiteToTransparent(img.data, threshold));
        ctx.putImageData(img, 0, 0);
      }
      if (alive) onDone(trimCanvas(c));
    })();
    return () => {
      alive = false;
    };
  }, [file, clear, threshold]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      <label className="slw-btn cursor-pointer">
        <ImagePlus size={14} /> {file ? `바꾸기 (${file.name})` : "서명·도장 사진 고르기"}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      </label>
      <label className="flex items-center gap-2 text-[13px] text-slate-700">
        <input type="checkbox" checked={clear} onChange={(e) => setClear(e.target.checked)} /> 흰 바탕 투명하게
      </label>
      {clear && (
        <label className="block text-[13px] text-slate-700">
          투명하게 할 밝기 기준: {threshold}
          <input type="range" min={150} max={250} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full accent-teal-700" />
        </label>
      )}
      <p className="text-[12px] text-slate-600">흰 종이에 쓴 서명을 밝은 곳에서 찍으면 깔끔하게 빠집니다.</p>
    </div>
  );
}

function TextSignature({ color, onDone }: { color: string; onDone: (s: SignatureImage | null) => void }) {
  const [name, setName] = useState("");
  const [font, setFont] = useState<"hand" | "gothic" | "serif">("hand");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const text = name.trim();
      if (!text) return onDone(null);
      const family = font === "hand" ? pen.style.fontFamily : font === "serif" ? '"Batang", "AppleMyungjo", serif' : '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
      const size = 160;
      if (font === "hand") await document.fonts.load(`${size}px ${family}`, text).catch(() => undefined);
      const c = document.createElement("canvas");
      c.width = Math.min(4000, Math.max(400, text.length * size * 1.1));
      c.height = Math.round(size * 1.6);
      const ctx = c.getContext("2d");
      if (!ctx || !alive) return;
      ctx.font = `${font === "gothic" ? "700 " : ""}${size}px ${family}`;
      ctx.fillStyle = color;
      ctx.textBaseline = "middle";
      ctx.fillText(text, 20, c.height / 2);
      if (alive) onDone(trimCanvas(c));
    })();
    return () => {
      alive = false;
    };
  }, [name, font, color]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      <input className="slw-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 또는 상호 (예: 홍길동)" maxLength={30} />
      <div className="flex gap-2">
        {([["hand", "손글씨"], ["gothic", "고딕"], ["serif", "명조"]] as const).map(([id, label]) => (
          <button key={id} type="button" className={font === id ? "slw-primary" : "slw-btn"} onClick={() => setFont(id)}>{label}</button>
        ))}
      </div>
    </div>
  );
}

/** 서명 만들기 3가지(손으로 그리기·서명 사진·이름 글자). 결과는 여백을 잘라낸 투명 PNG. */
export function SignatureMaker({ onChange }: { onChange: (s: SignatureImage | null) => void }) {
  const [mode, setMode] = useState<"draw" | "image" | "text">("draw");
  const [color, setColor] = useState(COLORS[0].id);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={mode === "draw" ? "slw-primary" : "slw-btn"} onClick={() => { setMode("draw"); onChange(null); }}>✍ 손으로 그리기</button>
        <button type="button" className={mode === "image" ? "slw-primary" : "slw-btn"} onClick={() => { setMode("image"); onChange(null); }}>🖼 서명·도장 사진</button>
        <button type="button" className={mode === "text" ? "slw-primary" : "slw-btn"} onClick={() => { setMode("text"); onChange(null); }}>🔤 이름 글자</button>
      </div>
      {mode !== "image" && (
        <div className="flex items-center gap-2 text-[13px] text-slate-700">
          색:
          {COLORS.map((c) => (
            <button key={c.id} type="button" aria-label={c.label} title={c.label} onClick={() => setColor(c.id)} className={`h-6 w-6 rounded-full border-2 ${color === c.id ? "border-teal-600 ring-2 ring-teal-200" : "border-white"}`} style={{ background: c.id }} />
          ))}
        </div>
      )}
      {mode === "draw" && <DrawPad color={color} onDone={onChange} />}
      {mode === "image" && <ImageSignature onDone={onChange} />}
      {mode === "text" && <TextSignature color={color} onDone={onChange} />}
    </div>
  );
}
