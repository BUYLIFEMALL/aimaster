"use client";

import React from "react";
import { X, ExternalLink, TrendingUp, Sparkles, Compass } from "lucide-react";

interface TrendLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TREND_LINKS = [
  {
    title: "실시간 인기 검색어 모음",
    desc: "구글, 네이트, 줌, 다음 등 포털 통합 실시간 급상승 키워드",
    url: "https://keyzard.org/realtimekeyword",
    badge: "통합",
  },
  {
    title: "시그널 실검 (구. 네이버 실검)",
    desc: "실시간 검색어 순위 제공 및 시간대별 급상승 트렌드",
    url: "https://signal.bz/news",
    badge: "실시간",
  },
  {
    title: "네이버 데이터랩",
    desc: "네이버 공식 검색 트렌드, 쇼핑인사이트, 지역별 검색어 분석",
    url: "https://datalab.naver.com/",
    badge: "네이버공식",
  },
  {
    title: "블로그 수익화 전략",
    desc: "스마트한 IT 생계백서 및 애드포스트 고수익 전략 가이드",
    url: "https://m.blog.naver.com/",
    badge: "수익화",
  },
  {
    title: "대한민국 정책포털 (정책브리핑)",
    desc: "전국 최신 정책 뉴스, 정부 지원금, 복지 혜택 공식 브리핑",
    url: "https://www.korea.kr/",
    badge: "정부공식",
  },
  {
    title: "금융위원회",
    desc: "금융 정책, 대출/금리 지원, 금융소비자보호 최신 보도자료",
    url: "https://www.fsc.go.kr/",
    badge: "금융",
  },
  {
    title: "기획재정부",
    desc: "국가 경제성장 전략, 2026년 세제개편안 및 예산안",
    url: "https://www.moef.go.kr/",
    badge: "경제",
  },
  {
    title: "KDI 한국개발연구원",
    desc: "경제·사회 관련 심층 정책 보고서 및 전문가 경제 전망",
    url: "https://www.kdi.re.kr/",
    badge: "연구보고서",
  },
];

export function TrendLinksModal({ isOpen, onClose }: TrendLinksModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                실시간 트렌드 및 정보 바로가기
              </h2>
              <p className="text-xs text-slate-500">
                블로그 글감과 이슈 키워드를 발굴하는 핵심 포털 및 정부 기관 바로가기
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          {TREND_LINKS.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/30 transition group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {item.title}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-md">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <div className="p-2 text-slate-400 group-hover:text-indigo-600 transition">
                <ExternalLink className="w-4 h-4" />
              </div>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            외부 브라우저 탭으로 안전하게 연결됩니다.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
