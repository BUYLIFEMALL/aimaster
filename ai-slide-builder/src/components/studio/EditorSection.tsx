"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  Upload,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Globe,
  Loader2,
  FileText,
} from "lucide-react";
import { ValidationStatus, PromptFormat, GptParkInputs } from "@/lib/types";
import { parseUploadedFile } from "@/lib/fileParser";

interface EditorSectionProps {
  slideData: string;
  setSlideData: (data: string) => void;
  promptFormat: PromptFormat;
  setPromptFormat: (format: PromptFormat) => void;
  onOpenApiKey: () => void;
  hasApiKey: boolean;
}

export default function EditorSection({
  slideData,
  setSlideData,
  promptFormat,
  setPromptFormat,
  onOpenApiKey,
  hasApiKey,
}: EditorSectionProps) {
  const [validation, setValidation] = useState<ValidationStatus>({ isValid: true, message: "" });
  const [sourceText, setSourceText] = useState("");
  const [activity, setActivity] = useState<"idle" | "parsing" | "analyzing" | "generating">("idle");
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [useWebSearch, setUseWebSearch] = useState(false);

  const [gptParkInputs, setGptParkInputs] = useState<GptParkInputs>({
    topic: "신규 사업/서비스 기획 제안",
    customTopic: "",
    purpose: "승인: 신사업, 예산 등 의사결정",
    customPurpose: "",
    time: "20~30분 (표준 보고)",
    toc: `1. Executive Summary\n2. 제안 배경 (Why)\n3. 핵심 전략 (How)\n4. 세부 실행 계획 (What)\n5. 필요 자원 및 예산\n6. 결론 및 요청`,
    customToc: "",
  });

  const handleGptParkInputChange = (field: keyof GptParkInputs, value: string) => {
    setGptParkInputs((prev) => ({ ...prev, [field]: value }));
  };

  const validateJSON = useCallback((jsonText: string) => {
    if (!jsonText.trim()) {
      setValidation({ isValid: true, message: "JSON 입력 대기 중..." });
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error("slideData는 배열 형식이어야 합니다.");
      }

      const warnings: string[] = [];
      parsed.forEach((slide, index) => {
        if (!slide.type) warnings.push(`슬라이드 #${index + 1}: 'type' 속성이 필요합니다.`);
      });

      if (warnings.length > 0) {
        setValidation({
          isValid: true,
          isWarning: true,
          message: `JSON 형식 정상 (${parsed.length}장의 슬라이드, 경고 있음)`,
          details: warnings.join("\n"),
        });
      } else {
        setValidation({
          isValid: true,
          message: `JSON 형식 정상 (${parsed.length}장의 슬라이드)`,
        });
      }
    } catch (err: any) {
      setValidation({
        isValid: false,
        message: "JSON 형식 오류",
        details: err.message,
      });
    }
  }, []);

  useEffect(() => {
    validateJSON(slideData);
  }, [slideData, validateJSON]);

  const handleFileSelect = async (file: File | null) => {
    if (!file || activity !== "idle") return;
    setError("");

    try {
      setActivity("parsing");
      const parsedContent = await parseUploadedFile(file);

      // 텍스트가 너무 긴 경우 Gemini를 통해 구조적 요약 수행
      setActivity("analyzing");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: parsedContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "파일 분석에 실패했습니다.");
      }

      setSourceText(data.summary || (typeof parsedContent === "string" ? parsedContent : ""));
    } catch (err: any) {
      setError(`파일 처리 오류: ${err.message}`);
    } finally {
      setActivity("idle");
    }
  };

  const handleGenerateClick = async () => {
    if (activity !== "idle") return;

    if (!hasApiKey) {
      onOpenApiKey();
      return;
    }

    let userPrompt: string;
    if (promptFormat === "gpt_park") {
      const { topic, customTopic, purpose, customPurpose, time, toc, customToc } = gptParkInputs;
      const finalTopic = topic === "기타" ? customTopic : topic;
      const finalPurpose = purpose === "기타" ? customPurpose : purpose;
      const finalToc = toc === "기타" ? customToc : toc;

      if (!finalTopic.trim() || !finalPurpose.trim() || !time.trim() || !finalToc.trim()) {
        setError("C-Suite 보고 형식의 필수 입력 필드를 모두 채워주세요.");
        return;
      }

      userPrompt = `
# 입력 데이터
* 발표 주제: ${finalTopic}
* 발표 목적: ${finalPurpose}
* 총 발표 시간: ${time}
* 핵심 목차 (슬라이드 구조):
${finalToc}

# 발표 원고 및 참고 자료:
${sourceText || "주제 및 목차에 맞춰 최고 품질의 대기업 임원 보고용 장표를 생성하세요."}
`;
    } else {
      if (!sourceText.trim()) {
        setError("발표할 내용을 입력하거나 문서를 업로드해주세요.");
        return;
      }
      userPrompt = sourceText;
    }

    setActivity("generating");
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          format: promptFormat,
          useWebSearch,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "슬라이드 생성에 실패했습니다.");
      }

      const jsonString = data.jsonString;
      let slideArray;
      try {
        slideArray = JSON.parse(jsonString);
      } catch {
        setSlideData(jsonString);
        setError("생성된 JSON 형식을 직접 검토 및 보완해주세요.");
        return;
      }

      setSlideData(JSON.stringify(slideArray, null, 2));
    } catch (err: any) {
      setError(`생성 실패: ${err.message}`);
    } finally {
      setActivity("idle");
    }
  };

  const handleCopy = () => {
    if (!slideData) return;
    navigator.clipboard.writeText(slideData).then(() => {
      setCopyStatus("복사 완료!");
      setTimeout(() => setCopyStatus(""), 2000);
    });
  };

  const handleDragEvent = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (activity === "idle") setIsDragging(dragging);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvent(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* 패널 타이틀 */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
        <h2 className="font-bold text-sm tracking-tight flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-white text-blue-600 flex items-center justify-center text-xs font-bold">
            1
          </span>
          <span>슬라이드 데이터 생성</span>
        </h2>
        <span className="text-[11px] font-medium bg-blue-500/40 px-2 py-0.5 rounded-full border border-blue-400/40">
          Gemini 2.5 Flash
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col space-y-4 overflow-y-auto custom-scrollbar">
        {/* 형식 선택 라디오 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            슬라이드 스크립트 형식 선택
          </label>
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-lg border border-slate-200">
            <label
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold cursor-pointer transition ${
                promptFormat === "standard" ? "bg-white text-blue-700 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <input
                type="radio"
                name="format"
                value="standard"
                checked={promptFormat === "standard"}
                onChange={() => setPromptFormat("standard")}
                className="hidden"
              />
              <span>표준 형식</span>
            </label>

            <label
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold cursor-pointer transition ${
                promptFormat === "kimura" ? "bg-white text-blue-700 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <input
                type="radio"
                name="format"
                value="kimura"
                checked={promptFormat === "kimura"}
                onChange={() => setPromptFormat("kimura")}
                className="hidden"
              />
              <span>확장판</span>
            </label>

            <label
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold cursor-pointer transition ${
                promptFormat === "gpt_park" ? "bg-amber-500 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <input
                type="radio"
                name="format"
                value="gpt_park"
                checked={promptFormat === "gpt_park"}
                onChange={() => setPromptFormat("gpt_park")}
                className="hidden"
              />
              <span>C-Suite 보고</span>
            </label>
          </div>
        </div>

        {/* 웹 검색 연동 토글 */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={useWebSearch}
              onChange={(e) => setUseWebSearch(e.target.checked)}
              className="mt-0.5 h-4 w-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
            />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                <Globe size={13} className="text-amber-600" />
                웹 검색으로 최신 정보 반영하기
              </span>
              <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                자료 없이 주제만 입력했거나 최신 통계가 필요할 때 체크하세요. AI가 공신력 있는 웹소스를 검색해 반영합니다.
              </p>
            </div>
          </label>
        </div>

        {/* C-Suite 보고 형식 전용 위젯 */}
        {promptFormat === "gpt_park" ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <Sparkles size={14} className="text-blue-600" />
              <span>대기업 임원 보고용 전략 장표 설정</span>
            </div>

            {/* 주제 */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">1. 발표 주제</label>
              <input
                type="text"
                value={gptParkInputs.topic === "기타" ? gptParkInputs.customTopic : gptParkInputs.topic}
                onChange={(e) => {
                  if (gptParkInputs.topic === "기타") handleGptParkInputChange("customTopic", e.target.value);
                  else handleGptParkInputChange("topic", e.target.value);
                }}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white mb-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="발표 주제 입력"
              />
              <div className="flex flex-wrap gap-1">
                {[
                  "신규 사업/서비스 기획 제안",
                  "분기/반기 실적 보고",
                  "경쟁사 분석 및 대응 전략",
                  "연간 사업 계획 및 목표 설정",
                  "M&A 또는 투자 검토 보고",
                  "기타",
                ].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      handleGptParkInputChange("topic", val);
                      if (val !== "기타") handleGptParkInputChange("customTopic", "");
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      gptParkInputs.topic === val ? "bg-blue-600 text-white font-bold" : "bg-slate-200/80 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* 목적 */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">2. 발표 목적</label>
              <input
                type="text"
                value={gptParkInputs.purpose === "기타" ? gptParkInputs.customPurpose : gptParkInputs.purpose}
                onChange={(e) => {
                  if (gptParkInputs.purpose === "기타") handleGptParkInputChange("customPurpose", e.target.value);
                  else handleGptParkInputChange("purpose", e.target.value);
                }}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white mb-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="발표 목적 입력"
              />
              <div className="flex flex-wrap gap-1">
                {[
                  "승인: 신사업, 예산 등 의사결정",
                  "보고: 현황 공유 및 피드백 요청",
                  "설득: 새로운 전략 공감대 형성",
                  "자원 확보: 인력 및 예산 요청",
                  "기타",
                ].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      handleGptParkInputChange("purpose", val);
                      if (val !== "기타") handleGptParkInputChange("customPurpose", "");
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      gptParkInputs.purpose === val ? "bg-blue-600 text-white font-bold" : "bg-slate-200/80 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* 시간 */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">3. 총 발표 시간</label>
              <div className="flex flex-wrap gap-1.5">
                {["10분 이내 (핵심 요약)", "15분 (압축 보고)", "20~30분 (표준 보고)", "30분 이상 (상세 보고)"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleGptParkInputChange("time", val)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                      gptParkInputs.time === val ? "bg-blue-600 text-white font-bold" : "bg-slate-200/80 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* 목차 */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">4. 핵심 목차 구성 (템플릿 선택)</label>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {[
                  {
                    name: "전략 제안형",
                    val: `1. Executive Summary\n2. 제안 배경 (Why)\n3. 핵심 전략 (How)\n4. 세부 실행 계획 (What)\n5. 필요 자원 및 예산\n6. 결론 및 요청`,
                  },
                  {
                    name: "실적 보고형",
                    val: `1. Executive Summary\n2. 핵심 성과 (KPI) 요약\n3. 세부 실적 분석\n4. 성공 요인(Good) 및 개선점(Bad)\n5. 향후 계획 및 목표`,
                  },
                  {
                    name: "문제 해결형",
                    val: `1. Executive Summary\n2. 문제 정의 (As-Is)\n3. 원인 분석\n4. 해결 방안 (To-Be)\n5. 기대 효과 및 ROI\n6. 결론 및 요청사항`,
                  },
                  {
                    name: "신사업 보고형",
                    val: `1. Executive Summary\n2. 제안 배경 및 기회\n3. 사업/기술 개요\n4. 시장 분석 및 경쟁 환경\n5. 사업 추진 전략\n6. 재무 계획 및 손익 분석 (BEP, ROI)\n7. 결론 및 Next Step`,
                  },
                ].map((tpl) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => handleGptParkInputChange("toc", tpl.val)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      gptParkInputs.toc === tpl.val ? "bg-blue-600 text-white font-bold" : "bg-slate-200/80 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
              <textarea
                value={gptParkInputs.toc}
                onChange={(e) => handleGptParkInputChange("toc", e.target.value)}
                rows={5}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="목차를 한 줄에 하나씩 입력하세요."
              />
            </div>
          </div>
        ) : null}

        {/* 파일 업로더 및 원문 텍스트에어리어 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            발표할 내용 (파일 업로드 또는 직접 입력)
          </label>
          <div
            onDragOver={(e) => handleDragEvent(e, true)}
            onDragLeave={(e) => handleDragEvent(e, false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-5 border-2 border-dashed rounded-xl text-center cursor-pointer transition flex flex-col items-center justify-center mb-2.5 ${
              isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"
            } ${activity !== "idle" ? "cursor-not-allowed bg-slate-100" : ""}`}
            style={{ minHeight: "100px" }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                  e.target.value = "";
                }
              }}
              className="hidden"
              accept=".pdf,.docx,.txt,.md,.csv,.xls,.xlsx"
              disabled={activity !== "idle"}
            />
            {activity === "idle" && (
              <>
                <Upload size={24} className="text-slate-400 mb-1" />
                <p className="text-xs font-semibold text-slate-700">파일을 드래그하거나 클릭하여 업로드</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  지원 형식: DOCX, PDF, TXT, MD, CSV, XLS, XLSX
                </p>
              </>
            )}
            {activity === "parsing" && (
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <span>파일 내용 파싱 중...</span>
              </div>
            )}
            {activity === "analyzing" && (
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                <span>Gemini가 문서의 핵심 구조를 요약 분석 중...</span>
              </div>
            )}
          </div>

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="프레젠테이션으로 만들고 싶은 내용을 입력하세요. 회의록, 기획서, 논문 등을 업로드하면 AI가 자동 요약합니다."
            className="w-full text-xs p-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-y"
            rows={5}
            disabled={activity !== "idle"}
          />
        </div>

        {/* 생성 버튼 */}
        <button
          type="button"
          onClick={handleGenerateClick}
          disabled={activity !== "idle"}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-2"
        >
          {activity === "generating" ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>AI가 22개 레이아웃 기반 프레젠테이션 구성안 생성 중...</span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>🤖 AI로 구성안 만들기</span>
            </>
          )}
        </button>

        {error && (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <hr className="border-slate-200" />

        {/* JSON 코드 에디터 */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-bold text-slate-800">
              생성된 스크립트 (JSON) - 직접 수정 가능
            </label>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!slideData}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition disabled:opacity-50"
            >
              {copyStatus ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copyStatus || "JSON 복사"}</span>
            </button>
          </div>

          <div
            className={`p-2.5 mb-2 rounded-lg border text-xs flex items-center gap-2 ${
              validation.isValid ? "bg-emerald-50/70 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {validation.isValid ? (
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={14} className="text-red-600 shrink-0" />
            )}
            <span className="font-semibold">{validation.message}</span>
          </div>

          <textarea
            value={slideData}
            onChange={(e) => setSlideData(e.target.value)}
            className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-y text-slate-800"
            rows={10}
            placeholder="[ { type: 'title', title: '...' } ]"
          />
        </div>
      </div>
    </div>
  );
}
