"use client";

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import { Sparkles, Copy, Check, Code2, RefreshCw } from 'lucide-react';
import { SaveToProject } from './SaveToProject';

interface AiComponentGeneratorProps {
  hasApiKey?: boolean;
}

export const AiComponentGenerator: React.FC<AiComponentGeneratorProps> = ({ hasApiKey = false }) => {
  const [prompt, setPrompt] = useState('');
  const [componentType, setComponentType] = useState('카드 위젯');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [needKey, setNeedKey] = useState(false);

  const presets = [
    { label: "쿠폰 다운로드 카드", prompt: "모던한 할인 쿠폰 다운로드 카드. 할인율 20% 배지, 유효기간, 원클릭 복사 버튼 포함" },
    { label: "3단계 주문 프로세스 바", prompt: "장바구니 -> 주문서 작성 -> 결제 완료 3단계 진행 상태를 나타내는 반응형 스텝 바" },
    { label: "SaaS 가격 플랜 카드", prompt: "Starter / Pro / Enterprise 3열 반응형 가격 비교 카드. 인기 플랜 하이라이트" },
    { label: "통계 메트릭 위젯", prompt: "월간 매출 성장률(+14.2%)과 추이 그래프가 포함된 세련된 대시보드 통계 카드" },
    { label: "파일 드래그 업로드 존", prompt: "점선 테두리 파일 드래그앤드롭 업로드 영역. 구름 아이콘과 지원 형식 안내 텍스트" },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("요청할 컴포넌트에 대한 설명을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedCode(null);

    try {
      const res = await fetch("/api/ai/component", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, componentType }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.needKey) setNeedKey(true);
        throw new Error(data.error || "컴포넌트 생성에 실패했습니다.");
      }

      setGeneratedCode(data.code);
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Sparkles className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-slate-900">AI 컴포넌트 실시간 생성기</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            원하는 UI 컴포넌트를 자연어로 설명하면, 회원 본인의 Gemini AI가 프로덕션급 React 19 + Tailwind CSS 코드를 자동 작성합니다.
          </p>
        </div>
      </div>

      {/* 추천 프리셋 칩 */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          추천 템플릿 프리셋
        </label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setPrompt(preset.prompt);
                setComponentType(preset.label);
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all cursor-pointer font-medium"
            >
              + {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          컴포넌트 요구사항 상세 설명
        </label>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="예: 모던한 결제 영수증 카드. 주문 번호, 결제 금액, 품목 목록, 상태 뱃지, 영수증 출력 버튼이 포함된 화이트 테마 컴포넌트"
          className="w-full text-sm p-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none resize-none transition-colors"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400">
            * 회원 본인의 Google Gemini API 키를 기반으로 구동됩니다.
          </span>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <Spinner />
                <span>AI 컴포넌트 생성 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>React 컴포넌트 생성</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <Alert variant="danger" message={error} />
      )}
      {needKey && (
        <a href="/settings" className="inline-block text-xs font-bold text-blue-700 underline">API키등록·플랫폼연동에서 본인 Gemini 키 등록하기 →</a>
      )}

      {/* 생성된 코드 결과 뷰어 */}
      {generatedCode && (
        <div className="space-y-3 pt-4 border-t border-slate-100 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">생성된 TSX 소스 코드</span>
            </div>
            <Button
              variant="outline"
              onClick={handleCopy}
              className="!px-3 !py-1 text-xs flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>전체 코드 복사</span>
                </>
              )}
            </Button>
          </div>

          <div className="relative rounded-xl bg-slate-900 p-4 overflow-x-auto text-xs font-mono text-slate-200 custom-scrollbar max-h-96">
            <pre>{generatedCode}</pre>
          </div>

          <SaveToProject code={generatedCode} defaultTitle={componentType} prompt={prompt} />
        </div>
      )}
    </div>
  );
};
