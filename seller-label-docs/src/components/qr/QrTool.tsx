"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import type { CornerSquareType, DotType, FileExtension } from "qr-code-styling";
import { Download, ImagePlus, X } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { judgeQrContrast } from "@/lib/qr/contrast";
import { loadLocal, saveBlob, saveLocal } from "@/lib/download";

const STORE_KEY = "sld-qr-v1";

interface QrSettings {
  data: string;
  size: number;
  margin: number;
  dot: DotType;
  corner: CornerSquareType;
  fg: string;
  bg: string;
  ecl: "L" | "M" | "Q" | "H";
}

const DEFAULTS: QrSettings = { data: "https://smartstore.naver.com/", size: 1024, margin: 16, dot: "square", corner: "square", fg: "#111827", bg: "#ffffff", ecl: "H" };

const DOTS: { id: DotType; label: string }[] = [
  { id: "square", label: "네모(가장 잘 읽힘)" },
  { id: "rounded", label: "둥근 네모" },
  { id: "dots", label: "동그라미" },
  { id: "classy", label: "잎사귀" },
  { id: "classy-rounded", label: "둥근 잎사귀" },
  { id: "extra-rounded", label: "아주 둥글게" },
];
const CORNERS: { id: CornerSquareType; label: string }[] = [
  { id: "square", label: "네모" },
  { id: "extra-rounded", label: "둥근 네모" },
  { id: "dot", label: "동그라미" },
];

function urlHint(data: string): string | null {
  const v = data.trim();
  if (!v) return "QR에 넣을 내용을 입력해 주세요.";
  if (/^www\./i.test(v)) return "주소 앞에 https:// 를 붙여야 휴대폰이 바로 연결합니다.";
  if (v.length > 800) return "내용이 길수록 점이 촘촘해져 작게 인쇄하면 읽기 어렵습니다. 짧은 주소를 권장합니다.";
  return null;
}

export default function QrTool() {
  const [s, setS] = useState<QrSettings>(DEFAULTS);
  const [logo, setLogo] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    setS(loadLocal(STORE_KEY, DEFAULTS));
    setMounted(true);
  }, []);
  useEffect(() => {
    if (mounted) saveLocal(STORE_KEY, s);
  }, [s, mounted]);

  const options = useMemo(
    () => ({
      type: "svg" as const,
      width: s.size,
      height: s.size,
      margin: s.margin,
      data: s.data.trim() || " ",
      image: logo ?? undefined,
      qrOptions: { errorCorrectionLevel: s.ecl },
      imageOptions: { hideBackgroundDots: true, imageSize: 0.3, margin: 4 },
      dotsOptions: { type: s.dot, color: s.fg },
      cornersSquareOptions: { type: s.corner, color: s.fg },
      cornersDotOptions: { color: s.fg },
      backgroundOptions: { color: s.bg },
    }),
    [s, logo],
  );

  useEffect(() => {
    if (!boxRef.current) return;
    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling(options);
      boxRef.current.innerHTML = "";
      qrRef.current.append(boxRef.current);
    } else {
      qrRef.current.update(options);
    }
    const svg = boxRef.current.querySelector("svg");
    if (svg) {
      svg.setAttribute("viewBox", `0 0 ${s.size} ${s.size}`);
      svg.style.width = "100%";
      svg.style.height = "auto";
    }
  }, [options, s.size]);

  const contrast = judgeQrContrast(s.fg, s.bg);
  const hint = urlHint(s.data);
  const set = (patch: Partial<QrSettings>) => setS((p) => ({ ...p, ...patch }));

  async function download(ext: FileExtension) {
    // 저장할 때는 화면 미리보기와 별도로 새로 만든다(PNG·JPG는 실제 픽셀 크기로)
    const q = new QRCodeStyling({ ...options, type: ext === "svg" ? "svg" : "canvas" });
    const blob = await q.getRawData(ext);
    if (blob instanceof Blob) saveBlob(`QR_${new Date().toISOString().slice(0, 10)}.${ext === "jpeg" ? "jpg" : ext}`, blob);
  }

  async function onLogo(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(String(reader.result));
      set({ ecl: "H" });
    };
    reader.readAsDataURL(file);
  }

  const badge = contrast.level === "good" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : contrast.level === "warn" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-rose-300 bg-rose-50 text-rose-800";

  return (
    <div>
      <PageHeader emoji="🔳" title="QR 만들기" description="스토어·리뷰·채널 주소를 QR로 만들고 색과 모양을 꾸밉니다. 한 번 만든 QR은 바뀌지 않는 정적 QR입니다." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <section className="slw-card space-y-3 p-4">
            <label className="block">
              <span className="slw-label">QR에 넣을 주소·글</span>
              <textarea className="slw-field min-h-[70px] font-mono" value={s.data} onChange={(e) => set({ data: e.target.value })} placeholder="https://..." />
            </label>
            {hint && <Notice tone="warn">{hint}</Notice>}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="slw-label">점 모양</span>
                <select className="slw-field" value={s.dot} onChange={(e) => set({ dot: e.target.value as DotType })}>
                  {DOTS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="slw-label">모서리 모양</span>
                <select className="slw-field" value={s.corner} onChange={(e) => set({ corner: e.target.value as CornerSquareType })}>
                  {CORNERS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="slw-label">점 색</span>
                <div className="flex gap-2">
                  <input type="color" className="h-9 w-12 rounded border border-slate-300" value={s.fg} onChange={(e) => set({ fg: e.target.value })} />
                  <input className="slw-field font-mono" value={s.fg} onChange={(e) => set({ fg: e.target.value })} />
                </div>
              </label>
              <label className="block">
                <span className="slw-label">바탕 색</span>
                <div className="flex gap-2">
                  <input type="color" className="h-9 w-12 rounded border border-slate-300" value={s.bg} onChange={(e) => set({ bg: e.target.value })} />
                  <input className="slw-field font-mono" value={s.bg} onChange={(e) => set({ bg: e.target.value })} />
                </div>
              </label>
              <label className="block">
                <span className="slw-label">손상 복원력(오류 정정)</span>
                <select className="slw-field" value={s.ecl} onChange={(e) => set({ ecl: e.target.value as QrSettings["ecl"] })}>
                  <option value="L">낮음 L(7%) — 점이 가장 적음</option>
                  <option value="M">보통 M(15%)</option>
                  <option value="Q">높음 Q(25%)</option>
                  <option value="H">가장 높음 H(30%) — 로고·인쇄 권장</option>
                </select>
              </label>
              <label className="block">
                <span className="slw-label">저장 크기(PNG·JPG 픽셀)</span>
                <select className="slw-field" value={s.size} onChange={(e) => set({ size: Number(e.target.value) })}>
                  <option value={512}>512 × 512</option>
                  <option value={1024}>1024 × 1024(권장)</option>
                  <option value={2048}>2048 × 2048(큰 인쇄)</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="slw-label">바깥 여백: {s.margin}px</span>
                <input type="range" min={0} max={80} value={s.margin} onChange={(e) => set({ margin: Number(e.target.value) })} className="w-full accent-teal-700" />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="slw-btn cursor-pointer">
                <ImagePlus size={14} /> 가운데 로고 넣기
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => { void onLogo(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {logo && (
                <button type="button" className="slw-btn" onClick={() => setLogo(null)}>
                  <X size={14} /> 로고 빼기
                </button>
              )}
              <span className="text-[12px] text-slate-600">로고를 넣으면 손상 복원력을 H로 맞춥니다.</span>
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <section className="slw-card space-y-3 p-4">
            <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-xl border border-slate-200" ref={boxRef} />
            <div className={`rounded-xl border px-3 py-2 text-[13px] ${badge}`}>
              <b>대비 {contrast.ratio} : 1</b> — {contrast.message}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" className="slw-primary" disabled={!!hint && !s.data.trim()} onClick={() => void download("png")}><Download size={14} /> PNG</button>
              <button type="button" className="slw-btn" disabled={!s.data.trim()} onClick={() => void download("jpeg")}>JPG</button>
              <button type="button" className="slw-btn" disabled={!s.data.trim()} onClick={() => void download("svg")}>SVG</button>
            </div>
            <Notice tone="tip">💡 인쇄 전에 휴대폰 카메라로 화면의 QR을 한 번 비춰 보세요. 인쇄 크기는 가로 2cm 이상을 권장합니다. SVG는 크기를 키워도 깨지지 않아 인쇄소에 넘기기 좋습니다.</Notice>
          </section>
        </div>
      </div>
    </div>
  );
}
