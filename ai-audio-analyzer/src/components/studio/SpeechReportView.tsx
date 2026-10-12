"use client";

import React, { useState } from "react";
import {
  Users,
  Clock,
  Smile,
  Copy,
  Check,
  FileText,
  Search,
  MessageSquare,
  HelpCircle,
  Activity,
  CheckSquare,
  Volume2,
  Share2,
} from "lucide-react";
import { SpeechAnalysisResult } from "@/lib/types";

interface SpeechReportViewProps {
  data: SpeechAnalysisResult;
  onReset: () => void;
}

export default function SpeechReportView({ data, onReset }: SpeechReportViewProps) {
  const [activeTab, setActiveTab] = useState<"visual" | "document">("visual");
  const [docType, setDocType] = useState<"minutes" | "interview">("minutes");
  const [docFocus, setDocFocus] = useState<"action" | "flow">("action");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [copiedTrans, setCopiedTrans] = useState(false);

  // 화자별 발언 횟수 계산
  const speakerCounts = data.fullTranscription.reduce((acc, cur) => {
    acc[cur.speaker] = (acc[cur.speaker] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalLines = data.fullTranscription.length || 1;

  // 마크다운 문서 자동 생성 로직
  const generateDocumentMarkdown = () => {
    const today = new Date().toISOString().split("T")[0];
    if (docType === "minutes") {
      return `# 📋 회의록 (Meeting Minutes)
**일시:** ${today}
**재생 시간:** ${data.technicalInfo.duration}
**참석자:** ${data.speakerAnalysis.map((s) => `${s.name}(${s.role})`).join(", ")}
**회의 요약:** ${data.summary}

---

## 🎯 핵심 결정 사항 및 실행 과제 (Action Items)
${
  data.actionItems.length > 0
    ? data.actionItems.map((a, i) => `${i + 1}. [ ] **${a.task}** (담당: ${a.assignee || "미정"}, 마감: ${a.dueDate || "미정"})`).join("\n")
    : "- 특별한 실행 과제 없음"
}

---

## 💬 주요 안건 및 질문
${
  data.keyQuestions.map((q, i) => `${i + 1}. **${q.question}** (질문자: ${q.asker})\n   - 맥락: ${q.context}`).join("\n")
}

---

## 👥 화자별 주요 기여도
${
  data.speakerAnalysis.map((s) => `- **${s.name}** (${s.role}): ${s.keyContribution} (화법: ${s.style})`).join("\n")
}

---

## 🔍 종합 통찰 및 시사점
${data.overallInsights}
`;
    } else {
      return `# 🎙️ 인터뷰 결과 보고서 (Interview Analysis Report)
**일시:** ${today}
**인터뷰 대상:** ${data.speakerAnalysis.map((s) => `${s.name}(${s.role})`).join(", ")}
**소요 시간:** ${data.technicalInfo.duration}
**전체 개요:** ${data.summary}

---

## 💡 주요 논점 및 핵심 질문
${
  data.keyQuestions.map((q, i) => `### Q${i + 1}. ${q.question} (by ${q.asker})\n- **맥락 및 답변 요약:** ${q.context}`).join("\n\n")
}

---

## 🎭 인터뷰이 성향 및 감정 흐름
- **전체 감정 톤:** ${data.sentimentAndTone.overall}
- **화자 전환 시 분위기:** ${data.sentimentAndTone.speakerChanges}
- **비언어적 특성:** 속도(${data.nonVerbalElements.speedAndRhythm}), 휴지기(${data.nonVerbalElements.pauses}), 추임새(${data.nonVerbalElements.fillerWords})

---

## 📌 주요 제언 및 통찰
${data.overallInsights}
`;
    }
  };

  const handleCopyDoc = () => {
    const md = generateDocumentMarkdown();
    navigator.clipboard.writeText(md);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  const handleCopyTrans = () => {
    const text = data.fullTranscription.map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedTrans(true);
    setTimeout(() => setCopiedTrans(false), 2000);
  };

  const filteredTranscription = data.fullTranscription.filter(
    (t) =>
      t.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 상단 핵심 KPI 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
            <Users size={14} className="text-indigo-600" />
            <span>총 화자 수</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {data.technicalInfo.speakers || data.speakerAnalysis.length || 1}명
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {data.speakerAnalysis.map((s) => s.name).join(", ")}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
            <Clock size={14} className="text-blue-600" />
            <span>재생 시간</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {data.technicalInfo.duration || "측정 완료"}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            언어: {data.technicalInfo.language || "한국어"}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
            <Smile size={14} className="text-emerald-600" />
            <span>감정 및 톤</span>
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {data.sentimentAndTone.keyTone || "안정적"}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {data.sentimentAndTone.overall}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
            <Volume2 size={14} className="text-amber-600" />
            <span>음질 선명도</span>
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {data.technicalQuality.clarity || "우수"}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {data.acousticEnvironment.backgroundNoise || "깨끗함"}
          </p>
        </div>
      </div>

      {/* 종합 요약 배너 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={14} className="text-indigo-600" />
            <span>전체 대화 핵심 요약</span>
          </h3>
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            새 오디오 분석
          </button>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed font-medium">
          {data.summary}
        </p>
      </div>

      {/* 2대 뷰 탭 전환 버튼 */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("visual")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "visual"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Activity size={14} />
            <span>시각적 인텔리전스 리포트</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("document")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "document"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <FileText size={14} />
            <span>비즈니스 문서 생성 (회의록·인터뷰)</span>
          </button>
        </div>
      </div>

      {/* 탭 1: 시각적 대시보드 */}
      {activeTab === "visual" && (
        <div className="space-y-6">
          {/* 화자 점유율 & 프로파일링 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 화자 점유율 카드 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} className="text-indigo-600" />
                <span>화자별 발언 점유율</span>
              </h4>

              <div className="space-y-3 pt-2">
                {Object.entries(speakerCounts).map(([speaker, count], idx) => {
                  const percent = Math.round((count / totalLines) * 100);
                  const colors = ["bg-indigo-600", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"];
                  const color = colors[idx % colors.length];

                  return (
                    <div key={speaker} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-slate-700 font-bold">{speaker}</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {count}회 ({percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full transition-all duration-500`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 화자별 심층 프로파일링 (2열 차지) */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Smile size={14} className="text-indigo-600" />
                <span>화자별 심층 프로파일링</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {data.speakerAnalysis.map((speaker, i) => (
                  <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{speaker.name}</span>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        {speaker.role}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold">화법 스타일: </span>
                      <span className="text-[11px] text-slate-700">{speaker.style}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold">핵심 기여도: </span>
                      <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed">
                        {speaker.keyContribution}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 주요 질문 및 실행 과제 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 핵심 질문 & 논점 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle size={14} className="text-blue-600" />
                <span>주요 질문 및 논점 ({data.keyQuestions.length}건)</span>
              </h4>
              <div className="space-y-2.5 pt-1">
                {data.keyQuestions.map((q, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Q{i + 1}. {q.question}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2 font-normal">by {q.asker}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{q.context}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 실행 과제 (Action Items) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare size={14} className="text-emerald-600" />
                <span>결정 사항 & 실행 과제 ({data.actionItems.length}건)</span>
              </h4>
              <div className="space-y-2 pt-1">
                {data.actionItems.length > 0 ? (
                  data.actionItems.map((a, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-2.5 text-xs">
                      <div className="w-4 h-4 rounded border border-slate-300 bg-white mt-0.5 shrink-0 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="font-bold text-slate-800">{a.task}</div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>담당자: <strong className="text-slate-600">{a.assignee || "미정"}</strong></span>
                          <span>기한: <strong className="text-slate-600">{a.dueDate || "미정"}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">특별한 실행 과제가 없습니다.</div>
                )}
              </div>
            </div>
          </div>

          {/* 주제별 키워드 태그 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">주요 주제 및 키워드</h4>
            <div className="flex flex-wrap gap-2 pt-1">
              {data.topicsAndKeywords.map((tk, i) => (
                <div key={i} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                  <span className="font-bold text-indigo-700">{tk.topic}:</span>
                  <div className="flex items-center gap-1">
                    {tk.keywords.map((k, j) => (
                      <span key={j} className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600 text-[11px]">
                        #{k}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 타임라인 전체 전사 로그 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  타임라인별 전문 전사 기록 ({data.fullTranscription.length}문장)
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="화자 또는 대화 검색..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-44"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyTrans}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                >
                  {copiedTrans ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>전체 복사</span>
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar divide-y divide-slate-100 p-2 text-xs">
              {filteredTranscription.map((item, idx) => (
                <div key={idx} className="p-3 hover:bg-slate-50/70 transition-colors flex items-start gap-3">
                  <span className="font-mono text-[11px] text-slate-400 shrink-0 w-12 text-center pt-0.5">
                    {item.timestamp || "00:00"}
                  </span>
                  <div className="flex-1 space-y-0.5">
                    <span className="font-bold text-indigo-700 block text-xs">{item.speaker}</span>
                    <p className="text-slate-800 leading-relaxed text-xs">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 탭 2: 비즈니스 문서 생성 */}
      {activeTab === "document" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">비즈니스 보고서 자동 생성기</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                대화 데이터를 분석하여 표준 양식의 마크다운 보고서로 즉시 변환합니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as "minutes" | "interview")}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-hidden"
              >
                <option value="minutes">📋 회의록 (Meeting Minutes)</option>
                <option value="interview">🎙️ 인터뷰 결과 보고서</option>
              </select>

              <button
                type="button"
                onClick={handleCopyDoc}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                {copiedDoc ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedDoc ? "복사 완료!" : "마크다운 복사"}</span>
              </button>
            </div>
          </div>

          {/* 마크다운 텍스트 뷰어 */}
          <div className="p-5 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[550px] overflow-y-auto custom-scrollbar select-text">
            {generateDocumentMarkdown()}
          </div>
        </div>
      )}
    </div>
  );
}
