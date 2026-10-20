"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Copy, NotebookPen } from "lucide-react";

const steps = [
  { title: "사진 준비", text: "콘텐츠 생성의 ‘내 사진 준비’를 펼치고 본인 사진 1~6장·대표·순서·설명을 정리하세요.", detail: "JPEG·PNG·WebP, 장당 4MB·합계 12MB 이하. 모든 사진이 준비 완료여야 실행됩니다. 다른 사람의 사진이나 개인정보는 사용 전에 확인하세요." },
  { title: "경험과 모델", text: "장소/후기 주제와 직접 경험한 내용을 적고 사진 입력 지원 모델을 선택하세요.", detail: "가격·방문일·맛은 직접 확인한 내용만 입력합니다. 메모를 비우면 사진 관찰 중심으로 씁니다. 선택 공급사의 본인 API 키가 필요하며 다른 키나 모델로 자동 교체하지 않습니다." },
  { title: "초안 만들기", text: "‘사진 후기 초안 만들기’를 누르면 사진 관찰 후 회원 메모에 근거해 글을 씁니다.", detail: "선택한 공급사로 사진이 전송됩니다. 최대 2회 AI 호출 비용이 발생하고 사진 생성은 하지 않습니다. 입력을 바꾸거나 중단하면 늦은 결과는 표시하지 않습니다. 이미 진행한 호출은 비용이 발생할 수 있습니다." },
  { title: "저장·편집·검수", text: "근거를 대조하고 ‘원고로 저장·이어서 편집’을 누르세요. 기존 편집·보관함·직접 검수·확장 준비로 이어집니다.", detail: "사진은 순서·대표·원래 만료를 보존합니다. 원본 텍스트에서 본문과 사진 위치 표시를 편집하고 저장한 최종 원고를 직접 확인 완료해야 전송할 수 있습니다. 수정하면 재검수가 필요합니다. 새 원고는 발행 전 준비가 기본이며 최종 발행은 직접 확인합니다." },
];
const rule = "사진 1~6장 · JPEG/PNG/WebP · 장당 4MB/합계 12MB · 본인 비전 모델/키 · 원본·메모 직접 검수 · 저장 후 최종 검수 · 확장 준비";

export default function PhotoReviewGuide() {
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState("");
  return <section aria-labelledby="photo-review-guide-title" className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 p-4 sm:px-6"><h2 id="photo-review-guide-title" className="flex scroll-mt-20 items-center gap-2 text-base font-bold text-emerald-950"><NotebookPen className="h-5 w-5" aria-hidden="true" />사진·방문 메모로 후기 초안</h2><span className="inline-flex items-center gap-1 text-xs text-emerald-800"><Clock className="h-3.5 w-3.5" aria-hidden="true" />약 2~4분 · AI 호출 비용</span><Link href="/#private-photo-input" className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">사진 후기 화면 열기 ↗</Link></div>
    <div className="space-y-4 p-4 sm:p-6">
      <div className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 p-5 text-white"><p className="text-lg font-bold">보이는 장면과 내가 겪은 경험을 나누어 씁니다.</p><p className="mt-2 text-sm text-emerald-50">사진 관찰 → 메모 기반 초안 → 근거 대조. 없는 맛·가격·방문 경험을 AI가 추측하지 않았는지 직접 확인하세요.</p></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="사진 후기 단계 선택">{steps.map((item, index) => <button key={item.title} type="button" aria-pressed={index === step} onClick={() => setStep(index)} className={`rounded-xl border p-3 text-left ${index === step ? "border-emerald-500 bg-emerald-50 text-emerald-950" : "border-slate-200 text-slate-600"}`}><span className="mb-2 block text-xs font-bold text-emerald-700">STEP {index + 1}</span><span className="text-sm font-semibold">{item.title}</span></button>)}</div>
      <div className="rounded-xl border border-slate-200 p-4" aria-live="polite"><h3 className="font-bold text-slate-900">{step + 1}. {steps[step].title}</h3><p className="mt-2 text-sm text-slate-700">{steps[step].text}</p><p className="mt-2 text-xs leading-relaxed text-slate-500">{steps[step].detail}</p></div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><code className="break-words text-xs text-slate-700">{rule}</code><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(rule); setNotice("사진 후기 규칙을 복사했습니다."); } catch { setNotice("복사하지 못했습니다. 규칙을 직접 선택해 주세요."); } }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"><Copy className="h-3 w-3" aria-hidden="true" />규칙 복사</button><span role="status" className="w-full text-xs text-slate-600">{notice}</span></div>
      <p className="rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">💡 사진 설명과 방문 메모에 직접 확인한 내용을 적으면 근거를 대조하기 쉽습니다. 사진 후기 모델은 일반 글 생성 모델 선택에도 반영됩니다.</p>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">⚠️ 저장 전 이동·새로고침하면 초안이 사라집니다. 저장 완료 안내를 확인하고 보관함에서 다시 열어 보세요. 사진 미리보기 만료는 새로 조회하며 본문에 임시 주소를 붙이지 마세요. 목록 제거는 파일 즉시 삭제가 아니며 업로드 사진은 원래 등록일 기준 30일 후 정리됩니다. 실패 시 자동 재호출하지 않으므로 공급사 사용량을 먼저 확인하세요.</p>
      <Link href="/settings" className="inline-flex rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800">내 API 키·연동 설정 열기 ↗</Link>
    </div>
  </section>;
}
