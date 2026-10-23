"use client";

import { useState } from "react";
import {
  X,
  Play,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
  AlertCircle,
  FileText,
} from "lucide-react";
import { PromptTemplate, substituteVariables } from "@/types/template";

interface PromptExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: PromptTemplate | null;
  onExecute: (substitutedPrompt: string) => Promise<string>;
  onAutoFill: (title: string, description: string, variables: string[]) => Promise<Record<string, string>>;
}

export function PromptExecuteModal({
  isOpen,
  onClose,
  prompt,
  onExecute,
  onAutoFill,
}: PromptExecuteModalProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !prompt) return null;

  const variables = prompt.variables || [];

  // 변수값 변경 핸들러
  const handleVariableChange = (varName: string, val: string) => {
    setVariableValues((prev) => ({ ...prev, [varName]: val }));
  };

  // AI 자동 채우기
  const handleAutoFill = async () => {
    if (variables.length === 0) return;
    try {
      setIsAutoFilling(true);
      setError(null);
      const generatedValues = await onAutoFill(prompt.title, prompt.description, variables);
      setVariableValues((prev) => ({ ...prev, ...generatedValues }));
    } catch (err: any) {
      setError(err.message || "AI 자동 채우기 중 오류가 발생했습니다.");
    } finally {
      setIsAutoFilling(false);
    }
  };

  // 치환된 완성형 프롬프트
  const substitutedPrompt = substituteVariables(prompt.content, variableValues);

  // 프롬프트 실행
  const handleRunPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsExecuting(true);
      setError(null);
      const result = await onExecute(substitutedPrompt);
      setExecutionResult(result);
    } catch (err: any) {
      setError(err.message || "프롬프트 실행 중 오류가 발생했습니다.");
    } finally {
      setIsExecuting(false);
    }
  };

  // 클립보드 복사
  const handleCopy = () => {
    if (!executionResult) return;
    navigator.clipboard.writeText(executionResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 마크다운 다운로드
  const handleDownload = () => {
    if (!executionResult) return;
    const blob = new Blob([executionResult], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prompt.title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setExecutionResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs">
              <Play size={14} className="fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  {prompt.title}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                  {prompt.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {prompt.description}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 모달 본문 (2열 레이아웃: 변수 입력 & 실행 결과) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 좌측: 변수 입력 폼 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
                <span>변수 입력 ({variables.length}개)</span>
              </h3>

              {variables.length > 0 && (
                <button
                  type="button"
                  disabled={isAutoFilling || isExecuting}
                  onClick={handleAutoFill}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all disabled:opacity-50 cursor-pointer"
                  title="AI가 변수 내용을 자동으로 추천해줍니다"
                >
                  {isAutoFilling ? (
                    <Loader2 size={12} className="animate-spin text-blue-600" />
                  ) : (
                    <Sparkles size={12} className="text-blue-600" />
                  )}
                  <span>AI 자동 채우기</span>
                </button>
              )}
            </div>

            {variables.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                이 프롬프트에는 입력할 동적 변수가 없습니다. 바로 실행하실 수 있습니다.
              </div>
            ) : (
              <form onSubmit={handleRunPrompt} className="space-y-3.5">
                {variables.map((varName) => {
                  const isLongField =
                    varName.toLowerCase().includes("code") ||
                    varName.toLowerCase().includes("content") ||
                    varName.toLowerCase().includes("transcript") ||
                    varName.toLowerCase().includes("requirements");

                  return (
                    <div key={varName} className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        {"{{"} {varName} {"}}"}
                      </label>
                      {isLongField ? (
                        <textarea
                          required
                          rows={3}
                          value={variableValues[varName] || ""}
                          onChange={(e) => handleVariableChange(varName, e.target.value)}
                          placeholder={`${varName} 내용을 입력하세요...`}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
                        />
                      ) : (
                        <input
                          type="text"
                          required
                          value={variableValues[varName] || ""}
                          onChange={(e) => handleVariableChange(varName, e.target.value)}
                          placeholder={`${varName} 입력`}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
                        />
                      )}
                    </div>
                  );
                })}

                {/* 치환된 프롬프트 미리보기 토글 */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                  >
                    {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>치환된 프롬프트 미리보기</span>
                  </button>
                  {showPreview && (
                    <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                      {substitutedPrompt}
                    </div>
                  )}
                </div>

                {/* 실행 버튼 */}
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>AI 응답 생성 중...</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} className="fill-current" />
                      <span>프롬프트 실행</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* 우측: 실행 결과 화면 */}
          <div className="space-y-4 flex flex-col h-full min-h-[350px]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                <span>실행 결과</span>
              </h3>

              {executionResult && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="마크다운 다운로드"
                  >
                    <Download size={13} />
                    <span>MD 저장</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? "복사됨!" : "복사"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 에러 상태 */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1">
                  <p className="font-bold">실행 오류</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* 결과 본문 뷰어 */}
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-y-auto">
              {isExecuting ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <Loader2 size={28} className="animate-spin text-blue-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    Gemini AI가 프롬프트를 실행하고 있습니다...
                  </p>
                  <p className="text-[11px] text-slate-400">
                    변수들이 치환된 맞춤형 답변을 생성 중입니다.
                  </p>
                </div>
              ) : executionResult ? (
                <div className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
                  {executionResult}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-slate-400">
                  <FileText size={28} />
                  <p className="text-xs font-medium">
                    변수를 입력하고 [프롬프트 실행] 버튼을 눌러주세요.
                  </p>
                </div>
              )}
            </div>

            {executionResult && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>결과 지우고 다시 실행</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
