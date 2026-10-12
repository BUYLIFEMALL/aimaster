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
} from "lucide-react";
import {
  MODES,
  TARGET_IMAGE_MODELS,
  type AnalysisRecord,
  type DnaMode,
  type TargetImageModel,
} from "@/lib/dna/types";
import { ACCEPT_ATTR, fileToResizedDataUrl } from "@/lib/dna/imageFile";
import { useDna } from "@/components/dna/AnalysisProvider";
import { HelpGuideModal } from "@/components/dna/HelpGuideModal";
import { StudioScanOverlay } from "@/components/dna/StudioScanOverlay";
import { StudioPalette } from "@/components/dna/StudioPalette";
import { StudioDnaBars } from "@/components/dna/StudioDnaBars";
import { StudioCameraLighting } from "@/components/dna/StudioCameraLighting";
import { StudioReportView } from "@/components/dna/StudioReportView";
import { EnginePicker, ErrorNote } from "@/components/dna/ui";

const MOCK_PALETTE = [
  { hex: "#FFFFFF", percent: 55.5 },
  { hex: "#1A1A1A", percent: 35.2 },
  { hex: "#333333", percent: 9.3 },
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
  const [isDark, setIsDark] = useState(true); // 스크린샷 원본 기준: 기본 Studio Dark 모드
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setImage(await fileToResizedDataUrl(file));
      setFileName(file.name);
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
  const currentPalette = record?.palette ?? MOCK_PALETTE;
  const currentDnaBars = record?.result.dna?.length
    ? record.result.dna.map((d) => ({ label: d.label, percent: d.score }))
    : MOCK_DNA_BARS;
  const currentKeywords = record?.result.keywords?.length ? record.result.keywords : MOCK_KEYWORDS;
  const currentScore = record?.result.matchRate ?? 96.5;

  const mutationStage =
    mutationLevel <= 30
      ? { label: "Stable (보수적 재현)", desc: "원본 DNA 엄격 보존, 미세 질감 개선만", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40" }
      : mutationLevel <= 70
        ? { label: "Hybrid (구조 하이브리드)", desc: "구도 유지, 아트스타일·조명 적극 변이", color: "text-purple-400 border-purple-800 bg-purple-950/40" }
        : { label: "Chaotic (유전체 카오스)", desc: "핵심 축만 유지, 파격적/추상적 재해석", color: "text-rose-400 border-rose-800 bg-rose-950/40" };

  const containerTheme = isDark
    ? "bg-[#090e1a] text-slate-100 min-h-screen -m-3 sm:-m-5 md:-m-6 p-4 sm:p-6"
    : "bg-slate-50 text-slate-900 min-h-screen -m-3 sm:-m-5 md:-m-6 p-4 sm:p-6";

  const cardTheme = isDark
    ? "bg-[#0b1329]/95 border-slate-800/80 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  return (
    <div className={`transition-colors duration-200 ${containerTheme}`}>
      <HelpGuideModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* 1. 상단 스튜디오 헤더 바 */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Microscope className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wider uppercase">
                스타일 DNA 분석기 <span className="text-cyan-400">V3</span>
              </h1>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                PRO STUDIO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              이미지 한 장으로 카메라·조명·팔레트·스타일 유전자를 100% 해독하는 차세대 생성 프레임워크
            </p>
          </div>
        </div>

        {/* 우측 퀵 컨트롤 (도움말, 테마 스위치, 테스트 바로가기) */}
        <div className="flex items-center gap-2">
          {record && (
            <Link
              href="/test"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 transition shadow-xs"
            >
              <FlaskConical className="h-3.5 w-3.5 text-cyan-400" />
              <span>3단계 결과 테스트</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold border transition ${
              isDark
                ? "bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">도움말</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold border transition ${
              isDark
                ? "bg-slate-900/80 border-slate-700 text-cyan-300 hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-800 hover:bg-slate-100"
            }`}
            title="스튜디오 테마 전환"
          >
            {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-600" />}
            <span className="hidden sm:inline">{isDark ? "라이트 모드" : "스튜디오 다크"}</span>
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
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-center transition ${
                drag
                  ? "border-cyan-400 bg-cyan-950/40"
                  : isDark
                    ? "border-slate-700/80 bg-slate-900/60 hover:border-cyan-500/60 hover:bg-slate-900"
                    : "border-slate-300 bg-slate-50 hover:bg-slate-100"
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
                <div className="py-2">
                  <Upload className={`mx-auto h-6 w-6 ${isDark ? "text-cyan-400" : "text-slate-400"}`} />
                  <p className="mt-1 text-xs font-bold">클릭 또는 파일 끌어다 놓기</p>
                  <p className="text-[10px] text-slate-500">JPG · PNG · WebP (최대 5MB)</p>
                </div>
              )}
              {fileName && (
                <p className="max-w-full truncate text-[10.5px] font-mono text-cyan-400">{fileName}</p>
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
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2.5 text-xs sm:text-sm font-black tracking-wider uppercase shadow-[0_0_15px_rgba(0,240,255,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>{busy ? "DNA 시퀀싱 해독 중…" : "이미지 시퀀싱 시작"}</span>
            </button>
            {error && <div className="mt-2.5"><ErrorNote message={error.message} needKey={error.needKey} /></div>}
          </div>

          {/* 카드 2 & 3: 카메라 & 렌즈, 조명 시퀀싱 */}
          <StudioCameraLighting
            camera={record?.result.camera}
            lighting={record?.result.lighting}
            isDark={isDark}
          />

          {/* 카드 4: 시스템 가이던스 */}
          <div className={`rounded-xl border p-4 shadow-sm backdrop-blur-xs transition-colors space-y-3.5 ${cardTheme}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⚙️</span>
                <h2 className={`text-xs font-bold tracking-wide uppercase ${isDark ? "text-cyan-400" : "text-slate-900"}`}>
                  시스템 가이던스
                </h2>
              </div>
              {/* 첨부 이미지 제공 체크박스 */}
              <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-medium">
                <input
                  type="checkbox"
                  checked={includeImageTag}
                  onChange={(e) => setIncludeImageTag(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                />
                <span className={isDark ? "text-slate-300" : "text-slate-600"}>첨부 이미지 제공</span>
              </label>
            </div>

            {/* 모드 토글 (유전자 복제 vs 유전자 변이) */}
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/30 p-1 border border-slate-800">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`rounded-md px-2 py-1.5 text-xs font-bold transition ${
                    mode === m.value
                      ? "bg-cyan-500 text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* 변이 모드 전용: 변이 강도 슬라이더 */}
            {mode === "mutate" && (
              <div className="rounded-lg border border-purple-800/60 bg-purple-950/20 p-2.5 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1 text-purple-300">
                    <Sliders className="h-3 w-3 text-purple-400" />
                    변이 강도
                  </span>
                  <span className="font-mono text-xs font-extrabold text-cyan-300">{mutationLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={mutationLevel}
                  onChange={(e) => setMutationLevel(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400"
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
              <label className={`block mb-1 text-[10.5px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                타겟 이미지 모델
              </label>
              <select
                className={`w-full rounded-lg border text-xs px-2.5 py-1.5 font-medium ${
                  isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800"
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

            {/* 시스템 지침 터미널 인풋 */}
            <div>
              <label className={`block mb-1 text-[10.5px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                가이던스 오버라이드
              </label>
              <textarea
                className={`w-full h-20 rounded-lg border p-2 text-xs font-mono resize-none ${
                  isDark
                    ? "bg-[#060a17] border-cyan-950/60 text-cyan-300 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-hidden"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-cyan-500"
                }`}
                value={guidance}
                maxLength={800}
                onChange={(e) => setGuidance(e.target.value)}
                placeholder=">> System guidance override..."
              />
            </div>

            {/* AI 엔진 선택 */}
            <div className="pt-1 border-t border-slate-800/50">
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
            className={`relative flex min-h-[360px] sm:min-h-[420px] max-h-[500px] items-center justify-center overflow-hidden rounded-xl border p-4 shadow-sm backdrop-blur-xs transition-colors ${
              isDark ? "bg-[#060b18] border-slate-800/80" : "bg-slate-100 border-slate-200"
            }`}
          >
            {shownImage ? (
              <div className="relative flex max-h-[460px] w-full items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shownImage}
                  alt={record?.result.titleKo || "분석 대상 이미지"}
                  className="max-h-[440px] w-auto max-w-full rounded-lg object-contain shadow-md"
                />
                {/* AI 정밀 스캔 십자선 그리드 & 타겟 앵커 링 오버레이 */}
                <StudioScanOverlay
                  aspectRatio={record?.aspectRatio || "1:1"}
                  active={true}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2.5 text-center text-slate-500 py-12">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-400">
                  <Microscope className="h-8 w-8" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-cyan-400 animate-ping opacity-60" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-300">
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
            <div className={`rounded-xl border p-6 text-center text-xs text-slate-500 ${cardTheme}`}>
              <p className="font-semibold">분석된 프롬프트 리포트 대기 중</p>
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
            dominantName={record ? "미학적\n톤" : "대기 중"}
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
    </div>
  );
}
