"use client";

// [글 생성 설정] 박스 맨 아래: 작성자 페르소나 직접 입력 · 사람이 쓴 글처럼 쓰기 · 실제 경험 입력(+ 떠올릴 질문).
// 세 탭(아이디어·키워드·맛집)이 같은 화면을 쓴다. 경험은 회원이 직접 적은 것만 본문에 반영한다(AI가 만들지 않는다).
import React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { MAX_CUSTOM_PERSONA, MAX_EXPERIENCE } from "@/lib/blog/humanVoice";

interface Props {
  customPersona: string;
  setCustomPersona: (v: string) => void;
  humanStyle: boolean;
  setHumanStyle: (v: boolean) => void;
  experience: string;
  setExperience: (v: string) => void;
  hints: string[];
  hintsLoading: boolean;
  onRequestHints: () => void;
  disabled?: boolean;
  experienceTitle?: string;
  experienceHelp?: string;
  experiencePlaceholder?: string;
}

export function HumanStylePanel({
  customPersona, setCustomPersona, humanStyle, setHumanStyle, experience, setExperience, hints, hintsLoading, onRequestHints, disabled,
  experienceTitle = "실제 경험 (선택)",
  experienceHelp = "본문에 녹일 실제 경험·감정·에피소드를 직접 적어 주세요. 적은 내용만 사실로 반영하며, AI가 경험을 대신 만들지 않습니다.",
  experiencePlaceholder = "예: 직접 써 보니 처음 설정이 번거로웠는데, 일주일 지나니 아침 준비 시간이 확실히 줄었다.",
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-900">✍️ 작성자 페르소나 직접 입력 <span className="text-[11px] font-normal text-slate-500">(선택)</span></h4>
        <input type="text" value={customPersona} onChange={(e) => setCustomPersona(e.target.value.slice(0, MAX_CUSTOM_PERSONA))} disabled={disabled} placeholder="예: 30대 카페 블로거, 디저트 전문 / 주말마다 여행하는 직장인" className="mt-2 w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <p className="mt-1 text-[11px] text-slate-500">짧게 자기소개를 적으면 AI가 작성자의 톤·관점을 살려서 글을 씁니다. 위 프리셋과 함께 쓰면 합쳐서 반영됩니다.</p>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-3">
        <label onClick={() => setHumanStyle(!humanStyle)} className="flex items-start justify-between gap-3 cursor-pointer">
          <div>
            <div className="text-sm font-bold text-slate-900">🧑 사람이 쓴 글처럼 쓰기</div>
            <p className="text-[11px] text-slate-600 mt-0.5">문장 길이·리듬을 자연스럽게 섞고, AI식 정리 문구·번역투·똑같은 구조의 반복을 줄여 직접 쓴 글처럼 만듭니다. 제공하지 않은 경험은 지어내지 않습니다.</p>
          </div>
          <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${humanStyle ? "bg-emerald-600" : "bg-slate-300"}`} role="switch" aria-checked={humanStyle}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${humanStyle ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </label>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800">{experienceTitle}</label>
            <button type="button" onClick={onRequestHints} disabled={hintsLoading || disabled} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
              {hintsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} 떠올릴 질문 받기
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-1.5">{experienceHelp}</p>
          <textarea rows={3} value={experience} onChange={(e) => setExperience(e.target.value.slice(0, MAX_EXPERIENCE))} disabled={disabled} placeholder={experiencePlaceholder} className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed" />
          {hints.length > 0 && (
            <div className="mt-2 rounded-lg bg-white border border-indigo-100 px-3 py-2">
              <p className="text-[11px] font-bold text-indigo-700 mb-1">이런 점을 떠올려 보세요 (질문일 뿐이며 글에는 위 칸에 적은 내용만 들어갑니다)</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700">
                {hints.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
