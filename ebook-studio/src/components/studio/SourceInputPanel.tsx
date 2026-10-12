"use client";

import React, { useState } from "react";
import { Sparkles, FileText, Upload, RefreshCw, ArrowRight, BookOpen, Check } from "lucide-react";
import { EbookProject, WritingMode } from "@/lib/types";

interface SourceInputPanelProps {
  project: EbookProject;
  onUpdateProject: (updates: Partial<EbookProject>) => void;
  onNextStep: () => void;
  apiKey: string;
  selectedModel: string;
}

const PRESET_SAMPLES = [
  {
    name: "AI 시대의 비즈니스 리더십",
    title: "통찰하는 기계, 질문하는 리더",
    subtitle: "AI 시대, 리더의 새로운 역할을 탐구하다",
    author: "김지훈",
    text: `# 제1장. 지시하는 관리자에서 질문하는 리더로
인공지능이 경영의 영역으로 들어오면서 리더의 역할도 달라지고 있습니다. 과거에는 데이터를 분석하고 정답을 제시하는 사람이 리더였다면, 이제는 어떤 문제를 풀어야 하는지 근본적인 질문을 던지는 사람이 리더입니다.

## 기술 도입보다 중요한 관점의 전환
도구를 도입하기 전에 팀의 일하는 방식과 문제 해결 방식을 다시 정의해야 합니다. 도구는 수단일 뿐이며, 혁신의 본질은 구성원들이 스스로 사고하고 문제를 탐색하는 문화에 있습니다.

## 핵심 역량
1. 올바른 질문을 던지는 프레이밍 역량
2. AI가 제시한 결과물을 비판적으로 검토하는 분별력
3. 실패를 두려워하지 않는 실험 문화 구축`,
  },
  {
    name: "퇴근 후 1시간 나만의 지식 창업",
    title: "1인 크리에이터의 디지털 출판 전략",
    subtitle: "평범한 직장인이 월 100만원 부수입을 만드는 시스템",
    author: "박서연",
    text: `# 제1장. 왜 지금 디지털 전자책인가
우리가 가진 지식과 경험은 누군가에게는 수십 시간을 아껴주는 귀중한 자산입니다. 종이책 출판의 높은 문턱을 넘어, 웹과 PDF로 독자에게 직접 다가가는 새로운 퍼블리싱의 시대가 열렸습니다.

## 첫 걸음: 나만의 타겟 독자 찾기
모두를 위한 글은 아무에게도 닿지 않습니다. 과거 3년 전의 나 자신에게 들려주고 싶은 노하우부터 정리해보세요.

## 핵심 실행 단계
1. 흩어진 메모와 업무 노하우 모으기
2. 독자의 문제를 해결하는 목차 10개 설계
3. 웹 링크 하나로 독자에게 즉시 전달되는 전자책 배포`,
  },
];

export function SourceInputPanel({
  project,
  onUpdateProject,
  onNextStep,
  apiKey,
  selectedModel,
}: SourceInputPanelProps) {
  const [sourceText, setSourceText] = useState(project.rawSourceText || "");
  const [title, setTitle] = useState(project.title || "");
  const [subtitle, setSubtitle] = useState(project.subtitle || "");
  const [author, setAuthor] = useState(project.author || "");
  const [mode, setMode] = useState<WritingMode>("detailed");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setSourceText(content);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
      }
    };
    reader.readAsText(file);
  };

  const handleApplyPreset = (sample: (typeof PRESET_SAMPLES)[0]) => {
    setTitle(sample.title);
    setSubtitle(sample.subtitle);
    setAuthor(sample.author);
    setSourceText(sample.text);
  };

  const handleGenerateOutline = async () => {
    if (!sourceText.trim()) {
      setErrorMsg("전자책으로 만들 원본 문서나 아이디어를 먼저 입력해주세요.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/ai/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          title,
          subtitle,
          author,
          mode,
          apiKey,
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "목차 생성에 실패했습니다.");
      }

      const result = data.result;
      const finalTitle = title || result.title;
      const finalSubtitle = subtitle || result.subtitle;
      const finalAuthor = author || result.author || "AI 작가";

      const newChapters = result.chapters.map((ch: any, idx: number) => ({
        id: `ch-${Date.now()}-${idx}`,
        title: ch.title,
        summary: ch.summary || "",
        content: "",
        takeaways: ch.keyPoints || [],
        questions: [],
      }));

      onUpdateProject({
        title: finalTitle,
        subtitle: finalSubtitle,
        author: finalAuthor,
        rawSourceText: sourceText,
        chapters: newChapters,
      });

      onNextStep();
    } catch (err: any) {
      setErrorMsg(err.message || "오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 상단 소개 배너 */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 p-5 border border-indigo-100 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900">
              STEP 1: 자료 수집 & 목차 기획
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              흩어진 메모, 강의록, 기획서를 넣으면 AI가 당해 연도(2026년) 기준 트렌드를 반영하여 한 권의 책으로 엮어낼 10~15개 장 목차를 자동 설계합니다.
            </p>
          </div>
        </div>

        {/* 샘플 빠른 불러오기 */}
        <div className="mt-4 pt-3 border-t border-indigo-100/60 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400">샘플 프리셋:</span>
          {PRESET_SAMPLES.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(s)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition shadow-2xs"
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* 기본 도서 정보 입력 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1 sm:col-span-1">
          <label className="text-xs font-bold text-slate-700">도서 제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: AI 시대의 리더십 (비워두면 AI 자동 제안)"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          />
        </div>
        <div className="space-y-1 sm:col-span-1">
          <label className="text-xs font-bold text-slate-700">부제 (선택)</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="예: 질문하는 리더의 생존 전략"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          />
        </div>
        <div className="space-y-1 sm:col-span-1">
          <label className="text-xs font-bold text-slate-700">저자 / 작성자</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="예: 홍길동 (또는 팀명)"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          />
        </div>
      </div>

      {/* 3대 정리 모드 선택 */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-800">
          AI 목차 정리 및 집필 방향 (3대 모드)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            {
              id: "detailed" as WritingMode,
              title: "맥락과 사례까지 충실하게",
              desc: "핵심 아이디어를 풍부하게 확장하고 실전 예시와 배경 설명을 살려 알찬 분량으로 구성",
            },
            {
              id: "concise" as WritingMode,
              title: "중요한 내용만 간결하게",
              desc: "군더더기를 걷어내고 핵심 인사이트와 실행 포인트 위주의 브리핑/요약 노트형",
            },
            {
              id: "verbatim" as WritingMode,
              title: "낱말은 그대로, 서식만 다시",
              desc: "원문의 논리와 표현을 최대한 유지하면서 읽기 좋은 챕터와 마크다운 서식으로 재정리",
            },
          ].map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`text-left p-3 rounded-xl border transition ${
                  active
                    ? "bg-indigo-50/70 border-indigo-300 text-indigo-950 shadow-xs ring-1 ring-indigo-400/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{m.title}</span>
                  {active && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {m.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 원문 자료 입력 textarea & 파일 업로드 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800">
            원문 문서 / 아이디어 텍스트
          </label>
          <label className="cursor-pointer flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800">
            <Upload className="w-3.5 h-3.5" />
            <span>TXT / MD 파일 업로드</span>
            <input
              type="file"
              accept=".txt,.md,.text"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <textarea
          rows={10}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="여기에 전자책으로 만들고 싶은 강의안, 기획서, 회의록, 메모, 블로그 글 등을 붙여넣으세요. 최대 20만 자까지 지원됩니다."
          className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
        />
        <div className="flex justify-between items-center text-[11px] text-slate-400">
          <span>* 입력된 자료는 회원님의 Google Gemini API 키로만 안전하게 처리됩니다.</span>
          <span>글자 수: {sourceText.length.toLocaleString()}자</span>
        </div>
      </div>

      {/* 에러 메시지 */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {errorMsg}
        </div>
      )}

      {/* 실행 버튼 */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleGenerateOutline}
          disabled={isGenerating || !sourceText.trim()}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>AI가 최적의 목차를 기획하는 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>AI 목차 설계 & 기획 시작하기</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
