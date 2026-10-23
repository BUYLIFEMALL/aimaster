"use client";

import { useState } from "react";
import Link from "next/link";

const steps = [
  {title: "수집 경로 선택", text: "떡상 글감 수집에서 URL·공개 RSS/Atom·실시간 검색·쇼츠를 선택합니다.", detail: "로그인이 필요한 피드는 지원하지 않습니다. 웹/RSS 글감 정리에 본인 AI 키가 필요하고 실시간 검색과 쇼츠 검색에는 해당 서비스의 본인 키가 필요합니다."},
  {title: "원문·출처 확인", text: "수집 원문·출처 확인을 펼쳐 제목·요약과 실제 원문을 비교합니다.", detail: "AI 검색 보고서는 사실 자체가 아닙니다. 영상 설명·댓글은 영상 대사나 직접 방문 경험의 증거가 아닙니다. 수집 실패와 서버 저장 실패는 성공으로 표시하지 않습니다."},
  {title: "원고로 연결", text: "글감의 글쓰기 버튼을 눌러 주제·키워드를 채우고 원고를 작성합니다.", detail: "서버가 본인 글감 원문을 다시 읽어 기획·작성·AI 검수에 전달합니다. 제목과 요약을 고쳐도 처음 수집한 원문·출처는 유지합니다. AI 작성에는 별도 호출 비용이 듭니다."},
  {title: "저장 후 대조", text: "보관함에서 원고를 다시 열어 출처·본문을 대조하고 최종 검수합니다.", detail: "글감과 연결한 원고는 처음 수집한 날부터 30일 후 정리합니다. 보관·편집·복사로 기간을 늘리지 않습니다. 새 원고는 발행 전 준비가 기본이며 최종 발행은 직접 확인합니다."},
];
const rule = "본인 서버 글감 · 원문/출처 직접 대조 · 수집일 기준 30일 · 편집/보관으로 연장 없음 · 저장 후 최종 검수";
export default function SourceCollectionGuide() {
  const [step, setStep] = useState(0), [notice, setNotice] = useState("");
  return <section className="overflow-hidden rounded-2xl border border-sky-200 bg-white" aria-labelledby="source-guide-title">
    <div className="flex flex-wrap items-center justify-between gap-3 bg-sky-50 p-5"><h2 id="source-guide-title" className="font-bold text-sky-950">🌐 자료 수집부터 원고 근거까지</h2><span className="text-xs text-sky-800">약 2~4분 · 본인 API 호출 비용</span><Link href="/collector" className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white">글감 수집 열기 ↗</Link></div>
    <div className="space-y-4 p-4 sm:p-6">
      <div className="rounded-xl bg-gradient-to-r from-sky-700 to-indigo-800 p-5 text-white"><p className="text-lg font-bold">원문은 그대로, 글감과 원고는 이어서</p><p className="mt-2 text-sm">회원별 서버 목록에서 선택한 자료를 원고 저장 후에도 다시 확인합니다.</p></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="자료 수집 단계 선택">{steps.map((item, index) => <button key={item.title} type="button" aria-pressed={step === index} onClick={() => setStep(index)} className={`rounded-xl border p-3 text-left ${step === index ? "border-sky-500 bg-sky-50" : "border-slate-200"}`}><span className="block text-xs font-bold text-sky-700">STEP {index + 1}</span><span className="mt-2 block text-sm font-semibold">{item.title}</span></button>)}</div>
      <div className="rounded-xl border border-slate-200 p-4" aria-live="polite"><h3 className="font-bold">{step + 1}. {steps[step].title}</h3><p className="mt-2 text-sm">{steps[step].text}</p><p className="mt-2 text-xs leading-relaxed text-slate-600">{steps[step].detail}</p></div>
      <div className="flex flex-wrap gap-3 rounded-xl bg-slate-50 p-3"><code className="break-words text-xs">{rule}</code><button type="button" onClick={async () => {try {await navigator.clipboard.writeText(rule); setNotice("자료 수집 규칙을 복사했습니다.");} catch {setNotice("규칙을 직접 선택해 복사해 주세요.");}}} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold">수집 규칙 복사</button><span role="status" className="w-full text-xs">{notice}</span></div>
      <p className="rounded-xl bg-sky-50 p-3 text-xs">💡 공개 피드의 본문 일부만 읽습니다. 중요한 날짜·수치·발언은 출처의 전체 글에서 직접 확인하세요.</p>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">⚠️ 과거 브라우저 공용 글감은 소유자를 확인할 수 없어 자동 이관하지 않습니다. 서버 목록을 읽지 못했을 때 다른 회원 캐시로 대체하지 않습니다. 충돌 안내가 나오면 목록을 다시 열어 비교하세요.</p>
      <Link href="/settings" className="inline-flex rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-800">내 API 키·공식 콘솔 안내 열기 ↗</Link>
      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">OpenAI 공식 키 콘솔 ↗</a>
    </div>
  </section>;
}
