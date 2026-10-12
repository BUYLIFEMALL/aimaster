"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Microscope,
  Upload,
  HelpCircle,
  Sliders,
  Sparkles,
  Sun,
  Moon,
  FlaskConical,
  Wand2,
} from "lucide-react";
import {
  MODES,
  TARGET_IMAGE_MODELS,
  type AnalysisRecord,
  type DnaMode,
  type TargetImageModel,
  type PaletteColor,
} from "@/lib/dna/types";
import { ACCEPT_ATTR, fileToResizedDataUrl, extractPaletteFromDataUrl } from "@/lib/dna/imageFile";
import { useDna } from "@/components/dna/AnalysisProvider";
import { HelpGuideModal } from "@/components/dna/HelpGuideModal";
import { StudioScanOverlay } from "@/components/dna/StudioScanOverlay";
import { StudioPalette } from "@/components/dna/StudioPalette";
import { StudioDnaBars } from "@/components/dna/StudioDnaBars";
import { StudioCameraLighting } from "@/components/dna/StudioCameraLighting";
import { StudioReportView } from "@/components/dna/StudioReportView";
import { EnginePicker, ErrorNote } from "@/components/dna/ui";

const MOCK_PALETTE: PaletteColor[] = [
  { hex: "#06B6D4", percent: 35 }, // 시안 (Cyan)
  { hex: "#3B82F6", percent: 25 }, // 블루 (Blue)
  { hex: "#8B5CF6", percent: 20 }, // 바이올렛 (Violet)
  { hex: "#EC4899", percent: 12 }, // 핑크 (Pink)
  { hex: "#F59E0B", percent: 8 },  // 앰버 (Amber)
];

const MOCK_DNA_BARS = [
  { label: "MINIMALISM", percent: 95 },
  { label: "STUDIO LIGHTING", percent: 90.5 },
  { label: "E-COMMERCE QUALITY", percent: 98 },
];

const MOCK_KEYWORDS = [
  "PRODUCT PHOTOGRAPHY",
  "WHITE BACKGROUND",
  "STUDIO LIGHTING",
  "3/4 VIEW",
  "MATTE TEXTURE",
  "MINIMALIST",
  "COMMERCIAL",
];

export default function AnalyzePage() {
  const { record, setRecord, engine } = useDna();
  const [image, setImage] = useState<string | null>(null);
  const [imagePalette, setImagePalette] = useState<PaletteColor[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<DnaMode>("replicate");
  const [mutationLevel, setMutationLevel] = useState<number>(30);
  const [includeImageTag, setIncludeImageTag] = useState<boolean>(true);
  const [targetModel, setTargetModel] = useState<TargetImageModel>("gemini-3.1-flash-image-preview");
  const [guidance, setGuidance] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);
  const [drag, setDrag] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isDark, setIsDark] = useState(false); // 플랫폼 표준: 기본 흰색 베이스 (Clean White Studio)
  const [refineFeedback, setRefineFeedback] = useState("");
  const [refineBusy, setRefineBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRefine = async () => {
    if (!record || !refineFeedback.trim()) return;
    setRefineBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, feedback: refineFeedback, engine }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || "보정하지 못했습니다."), { needKey: !!data.needApiKey });
      setRecord(data.record as AnalysisRecord);
      setRefineFeedback("");
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : "보정하지 못했습니다.",
        needKey: (e as { needKey?: boolean }).needKey,
      });
    } finally {
      setRefineBusy(false);
    }
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setRecord(null); // 새 이미지를 선택하면 이전 분석 결과를 리셋해 새 이미지 색상이 즉시 노출되도록 보장
    try {
      const resized = await fileToResizedDataUrl(file);
      setImage(resized);
      setFileName(file.name);
      // 이미지를 선택하자마자 브라우저 캔버스에서 실제 색상 팔레트 5개를 즉시 추출하여 실시간 반영
      const pal = await extractPaletteFromDataUrl(resized);
      if (pal && pal.length > 0) {
        setImagePalette(pal);
      }
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "이미지를 읽지 못했습니다." });
    }
  };

  const analyze = async (overrideGuidance?: string, overrideMutation?: number) => {
    if (!image && !record?.imageUrl) return;
    const effectiveImage = image || record?.imageUrl;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: effectiveImage,
          mode,
          guidance: overrideGuidance !== undefined ? overrideGuidance : guidance,
          mutationLevel: overrideMutation !== undefined ? overrideMutation : mutationLevel,
          includeImageTag,
          targetModel,
          engine,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || "분석하지 못했습니다."), { needKey: !!data.needApiKey });
      setRecord(data.record as AnalysisRecord);
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : "분석하지 못했습니다.",
        needKey: (e as { needKey?: boolean }).needKey,
      });
    } finally {
      setBusy(false);
    }
  };

  const shownImage = image ?? record?.imageUrl ?? null;
  const currentPalette = record?.palette ?? imagePalette ?? MOCK_PALETTE;
  const currentDnaBars = record?.result.dna?.length
    ? record.result.dna.map((d) => ({ label: d.label, percent: d.score }))
    : MOCK_DNA_BARS;
  const currentKeywords = record?.result.keywords?.length ? record.result.keywords : MOCK_KEYWORDS;
  const currentScore = record?.result.matchRate ?? 96.5;

  const mutationStage =
    mutationLevel <= 30
      ? { label: "안정 (원본 스타일 충실)", desc: "원본 스타일 엄격 보존, 미세 질감 개선만", color: "text-cyan-700 border-cyan-200 bg-cyan-50" }
      : mutationLevel <= 70
        ? { label: "조화 (스타일 변형·응용)", desc: "구도 유지, 아트스타일·조명 적극 변형", color: "text-purple-700 border-purple-200 bg-purple-50" }
        : { label: "파격 (과감한 재해석)", desc: "핵심 축만 유지, 대담하고 새로운 재해석", color: "text-rose-700 border-rose-200 bg-rose-50" };

  const containerTheme = isDark
    ? "bg-[#090e1a] text-slate-100 min-h-screen -m-3 sm:-m-5 md:-m-6 p-4 sm:p-6"
    : "bg-slate-50/50 text-slate-900 min-h-screen -m-3 sm:-m-5 md:-m-6 p-4 sm:p-6";

  const cardTheme = isDark
    ? "bg-[#0b1329] border-slate-800 text-slate-100"
    : "bg-white border-slate-200/90 text-slate-900 shadow-xs";

  return (
    <div className={`transition-colors duration-200 ${containerTheme}`}>
      <HelpGuideModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* 1. 상단 스튜디오 헤더 바 */}
      <header className={`mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-3.5 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-cyan-50 text-cyan-700 border-cyan-200 shadow-2xs"}`}>
            <Microscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-base sm:text-lg font-black tracking-wide ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                이미지 스타일 분석기
              </h1>
            </div>
            <p className="text-[11px] text-slate-500">
              이미지 한 장으로 카메라·조명·팔레트·스타일을 정밀 분석하여 마스터 프롬프트를 추출합니다
            </p>
          </div>
        </div>

        {/* 우측 퀵 컨트롤 (도움말, 테마 스위치, 테스트 바로가기) */}
        <div className="flex items-center gap-2">
          {record && (
            <Link
              href="/test"
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800 hover:bg-cyan-100 transition shadow-2xs"
            >
              <FlaskConical className="h-3.5 w-3.5 text-cyan-600" />
              <span>3단계 결과 테스트</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <HelpCircle className="h-3.5 w-3.5 text-cyan-600" />
            <span className="hidden sm:inline">도움말</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-2xs transition"
            title="스튜디오 테마 전환"
          >
            {isDark ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-slate-600" />}
            <span className="hidden sm:inline">{isDark ? "화이트 모드" : "다크 스튜디오"}</span>
          </button>
        </div>
      </header>

      {/* 2. 메인 3단 스튜디오 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_300px] xl:grid-cols-[330px_minmax(0,1fr)_350px] 2xl:grid-cols-[360px_minmax(0,1fr)_380px] gap-4 xl:gap-5 items-start">
        {/* ========================================================= */}
        {/* [좌측 컬럼] 소스 선택 / 카메라 / 조명 / 시스템 가이던스 */}
        {/* ========================================================= */}
        <aside className="space-y-4">
          {/* 카드 1: 이미지 소스 선택 */}
          <div className={`rounded-xl border p-4 shadow-sm backdrop-blur-xs transition-colors ${cardTheme}`}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-sm">📤</span>
              <h2 className={`text-xs font-bold tracking-wide uppercase ${isDark ? "text-cyan-400" : "text-slate-900"}`}>
                이미지 소스 선택
              </h2>
            </div>

            {/* 업로드 드롭존 */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                void pick(e.dataTransfer.files?.[0]);
              }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3.5 text-center transition ${
                drag
                  ? "border-cyan-500 bg-cyan-50/60"
                  : isDark
                    ? "border-slate-700/80 bg-slate-900/60 hover:border-cyan-500/60 hover:bg-slate-900"
                    : "border-slate-300 bg-slate-50/80 hover:border-cyan-500 hover:bg-slate-100/70"
              }`}
            >
              {shownImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shownImage}
                  alt="업로드된 이미지 미리보기"
                  className="max-h-36 rounded-md object-contain shadow-xs"
                />
              ) : (
                <div className="py-2.5">
                  <Upload className={`mx-auto h-6 w-6 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />
                  <p className="mt-1.5 text-xs font-bold text-slate-800">클릭 또는 파일 끌어다 놓기</p>
                  <p className="text-[10.5px] text-slate-500">JPG · PNG · WebP (최대 5MB)</p>
                </div>
              )}
              {fileName && (
                <p className="max-w-full truncate text-[10.5px] font-mono font-semibold text-cyan-700">{fileName}</p>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={(e) => void pick(e.target.files?.[0])}
              />
            </div>

            {/* 메인 버튼: 이미지 시퀀싱 시작 */}
            <button
              type="button"
              disabled={(!image && !record?.imageUrl) || busy}
              onClick={() => void analyze()}
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2.5 text-xs sm:text-sm font-black tracking-wide shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>{busy ? "이미지 시퀀싱 중..." : "이미지 시퀀싱 시작"}</span>
            </button>
            {error && <div className="mt-2.5"><ErrorNote message={error.message} needKey={error.needKey} /></div>}
          </div>

          {/* 카드 2 & 3: 카메라 & 렌즈, 조명 시퀀싱 */}
          <StudioCameraLighting
            camera={record?.result.camera}
            lighting={record?.result.lighting}
            isDark={isDark}
            isAnalyzing={busy}
          />

          {/* 카드 4: 시스템 가이던스 */}
          <div className={`rounded-xl border p-4 shadow-sm backdrop-blur-xs transition-colors space-y-3.5 ${cardTheme}`}>
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⚙️</span>
                <h2 className={`text-xs font-bold tracking-wide uppercase ${isDark ? "text-cyan-400" : "text-slate-900"}`}>
                  시스템 가이던스
                </h2>
              </div>
              {/* 첨부 이미지 제공 체크박스 + 툴팁 */}
              <div className="relative group flex items-center gap-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold">
                  <input
                    type="checkbox"
                    checked={includeImageTag}
                    onChange={(e) => setIncludeImageTag(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                  />
                  <span className={isDark ? "text-slate-300 group-hover:text-cyan-400" : "text-slate-700 group-hover:text-cyan-700"}>
                    첨부 이미지 제공
                  </span>
                </label>
                <div className="relative">
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black cursor-help transition ${
                      isDark ? "bg-slate-800 text-slate-300 hover:bg-cyan-900 hover:text-cyan-200" : "bg-slate-200/80 text-slate-600 hover:bg-cyan-100 hover:text-cyan-800"
                    }`}
                    title="기능 안내 보기"
                  >
                    ?
                  </span>
                  {/* 호버 안내 툴팁 카드 */}
                  <div className="absolute right-0 top-6 z-40 hidden w-72 rounded-xl border border-slate-200 bg-white p-3 text-[11px] leading-relaxed text-slate-700 shadow-xl group-hover:block">
                    <p className="font-bold text-cyan-700 mb-1 flex items-center gap-1">
                      <span>🖼️</span> [첨부 이미지] 제공 기능이란?
                    </p>
                    <p className="text-slate-600">
                      체크 시 프롬프트에 <strong>&apos;[첨부 이미지]&apos;</strong> 태그가 자동 삽입됩니다. 
                      Midjourney, Gemini, ChatGPT 등 이미지 생성 AI에 프롬프트를 입력할 때 <strong>원본 사진을 파일로 함께 첨부</strong>하면, 
                      AI가 원본의 구도·조명·화풍을 100% 스타일 앵커로 직접 참조하여 완벽한 스타일 전이(Style Transfer)를 수행합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 모드 토글 (유전자 복제 vs 유전자 변이) */}
            <div className={`grid grid-cols-2 gap-1 rounded-xl p-1 border ${isDark ? "bg-black/30 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                    mode === m.value
                      ? isDark
                        ? "bg-cyan-500 text-slate-950 shadow-xs"
                        : "bg-white text-slate-900 shadow-xs"
                      : isDark
                        ? "text-slate-400 hover:text-white"
                        : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* 변형 모드 전용: 변형 강도 슬라이더 */}
            {mode === "mutate" && (
              <div className={`rounded-xl border p-3 space-y-2 animate-in fade-in duration-200 ${isDark ? "border-purple-800/60 bg-purple-950/20" : "border-purple-200 bg-purple-50/50"}`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1 text-purple-800">
                    <Sliders className="h-3.5 w-3.5 text-purple-600" />
                    변형 강도
                  </span>
                  <span className="font-mono text-xs font-extrabold text-purple-700">{mutationLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={mutationLevel}
                  onChange={(e) => setMutationLevel(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-purple-200 rounded-full appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border ${mutationStage.color}`}>
                    {mutationStage.label}
                  </span>
                </div>
              </div>
            )}

            {/* 타겟 모델 선택 */}
            <div>
              <label className={`block mb-1 text-[11px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                타겟 이미지 모델
              </label>
              <select
                className={`w-full rounded-xl border text-xs px-3 py-2 font-medium ${
                  isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                }`}
                value={targetModel}
                onChange={(e) => setTargetModel(e.target.value as TargetImageModel)}
              >
                {TARGET_IMAGE_MODELS.map((tm) => (
                  <option key={tm.value} value={tm.value}>
                    {tm.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 사용자 추가 지침 인풋 */}
            <div>
              <label className={`block mb-1 text-[11px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                추가 분석 지침 (선택)
              </label>
              <textarea
                className={`w-full h-20 rounded-xl border p-2.5 text-xs font-mono resize-none ${
                  isDark
                    ? "bg-[#060a17] border-cyan-950/60 text-cyan-300 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-hidden"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                }`}
                value={guidance}
                maxLength={800}
                onChange={(e) => setGuidance(e.target.value)}
                placeholder=">> 예: '조명과 표면 질감을 집중 분석', '따뜻한 감성 톤으로 추출' 등 자유 입력"
              />
            </div>

            {/* AI 엔진 선택 */}
            <div className={`pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
              <EnginePicker label="분석 AI" />
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* [중앙 메인 컬럼] 스마트 스캔 이미지 뷰어 & 심층 리포트 */}
        {/* ========================================================= */}
        <main className="space-y-4">
          {/* 상단: 스마트 스캔 이미지 뷰어 */}
          <div
            className={`relative flex min-h-[360px] sm:min-h-[420px] max-h-[500px] items-center justify-center overflow-hidden rounded-2xl border p-4 shadow-xs transition-colors ${
              isDark ? "bg-[#060b18] border-slate-800/80" : "bg-slate-100/70 border-slate-200/90"
            }`}
          >
            {shownImage ? (
              <div className="relative flex max-h-[460px] w-full items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shownImage}
                  alt={record?.result.titleKo || "분석 대상 이미지"}
                  className={`max-h-[440px] w-auto max-w-full rounded-xl object-contain shadow-sm transition-all duration-700 ${
                    busy ? "brightness-50 scale-[1.02]" : "brightness-100 scale-100"
                  }`}
                />
                {/* AI 정밀 스캔 십자선 그리드 & 타겟 앵커 링 & 스캔 레이저 오버레이 */}
                <StudioScanOverlay
                  aspectRatio={record?.aspectRatio || "1:1"}
                  active={true}
                  isScanning={busy}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-center text-slate-500 py-12">
                <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border ${isDark ? "bg-cyan-950/30 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600 shadow-2xs"}`}>
                  <Microscope className="h-8 w-8" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-cyan-400 animate-ping opacity-60" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {busy ? "AI가 이미지의 시각적 유전자를 정밀 스캔하고 있습니다…" : "이미지를 업로드하면 DNA 스캔이 시작됩니다"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    좌측에서 이미지를 선택하고 [이미지 시퀀싱 시작]을 눌러주세요.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 하단: 분석 리포트 본문 (타이틀, 청사진, 스타일, 팁, 프롬프트 EN/KO) */}
          {record ? (
            <StudioReportView record={record} isDark={isDark} />
          ) : (
            <div className={`rounded-xl border p-8 text-center text-xs text-slate-500 ${cardTheme}`}>
              <p className="font-bold text-slate-700">분석된 프롬프트 리포트 대기 중</p>
              <p className="mt-1 text-slate-400">
                이미지 분석이 완료되면 구조적 청사진과 마스터 프롬프트가 이곳에 출력됩니다.
              </p>
            </div>
          )}
        </main>

        {/* ========================================================= */}
        {/* [우측 컬럼] 미학적 팔레트 / 스타일 DNA / 일치 확률 / 키워드 */}
        {/* ========================================================= */}
        <aside className="space-y-4">
          {/* 카드 1: 미학적 팔레트 */}
          <StudioPalette
            palette={currentPalette}
            isDark={isDark}
          />

          {/* 카드 2 & 3 & 4: 스타일 DNA, 아이덴티티 일치 확률, 추출된 키워드 */}
          <StudioDnaBars
            dnaBars={currentDnaBars}
            reproducibility={currentScore}
            keywords={currentKeywords}
            isDark={isDark}
          />
        </aside>
      </div>

      {/* 3. 하단 추론 인터페이스 바 (미세 보정 & 3단계 결과 테스트 바로가기) */}
      <footer className={`mt-5 rounded-2xl border p-4 shadow-xs transition-colors ${cardTheme}`}>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* 브랜드 / 엔진 */}
          <div className="flex items-center gap-3 shrink-0">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-sm shadow-2xs ${isDark ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-cyan-600 text-white"}`}>
              AI
            </div>
            <div>
              <p className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400">
                PROMPT ENGINE / STUDIO
              </p>
              <p className={`text-xs font-black ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                AIMaster 이미지 스타일 분석기
              </p>
            </div>
          </div>

          {/* 중앙 추론 인터페이스 (미세 보정 입력창) */}
          <div className="flex-1 max-w-3xl">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className={`text-[11px] font-bold tracking-wider uppercase ${isDark ? "text-cyan-400" : "text-slate-800"}`}>
                ◎ 추론 인터페이스 (실시간 미세 보정)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled={!record || refineBusy}
                value={refineFeedback}
                onChange={(e) => setRefineFeedback(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleRefine()}
                placeholder={record ? "스타일 보정을 위한 피드백 입력 (예: '조명을 더 따뜻하게', '배경을 단순하게')..." : "분석 완료 후 보정 피드백을 입력할 수 있습니다..."}
                className={`flex-1 rounded-xl border px-3.5 py-2 text-xs transition ${
                  isDark
                    ? "bg-black/40 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-cyan-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-cyan-600"
                } outline-hidden`}
              />
              <button
                type="button"
                disabled={!record || !refineFeedback.trim() || refineBusy}
                onClick={() => void handleRefine()}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  !record || !refineFeedback.trim() || refineBusy
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs"
                }`}
              >
                {refineBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                <span>미세 보정 요청</span>
              </button>
            </div>
          </div>

          {/* 우측 결과 테스트 바로가기 버튼 */}
          <div className="shrink-0 flex items-center justify-end">
            <Link
              href="/test"
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition shadow-2xs ${
                record
                  ? "bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100"
                  : "bg-slate-100 border-slate-200 text-slate-400 pointer-events-none"
              }`}
            >
              <FlaskConical className={`h-4 w-4 ${record ? "text-cyan-600" : "text-slate-400"}`} />
              <span>3단계 결과 테스트</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
