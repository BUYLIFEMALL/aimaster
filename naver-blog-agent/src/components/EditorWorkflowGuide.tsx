"use client";

import { useState } from "react";
import Link from "next/link";

const steps = [
  {title: "생성 범위 선택", text: "콘텐츠 생성 화면의 ‘이번 원고 이미지도 생성’을 확인하세요. 해제하면 글만 생성·저장합니다.", detail: "처음에는 기존처럼 이미지 자동 생성이 켜져 있습니다. 글과 이미지는 각각 본인 모델의 호출 비용이 듭니다. 선택은 현재 화면에만 적용하며 나중에 결과의 이미지 버튼으로 별도 실행할 수 있습니다."},
  {title: "비주얼 편집", text: "원고 편집을 열어 문단·제목·링크·이미지 위치를 확인하고 필요한 부분만 고칩니다.", detail: "기존 서식 도구를 그대로 사용합니다. 내 사진 후기 원고는 원본 텍스트 전용이며 본문 사진의 [IMAGE INSERT - …] 위치 표시를 유지하세요."},
  {title: "모드 이어 편집", text: "비주얼에서 수정한 뒤 코드 모드로 바꾸면 최신 HTML 서식이 이어집니다.", detail: "수정하지 않고 왕복하면 원래 텍스트와 사진 위치 표시가 유지됩니다. HTML의 링크·이미지 태그와 순서를 확인하고, 서식을 유지할 때 태그를 임의로 지우지 마세요."},
  {title: "저장 후 재검수", text: "편집 완료를 눌러 서버 저장 안내를 확인한 뒤 보관함에서 다시 열어 검수합니다.", detail: "저장 실패 시 편집창을 닫지 말고 내용을 보존해 재시도하세요. 수정 후에는 이전 검수가 무효가 됩니다. 발행 전 준비와 최종 발행은 구분해 직접 확인합니다."},
];
const rule = "수정한 서식 보존 · 원본/HTML 모드 대조 · 글만/이미지도 선택 · 저장 안내 확인 · 재열기/최종 검수 · 내 사진 위치 표시 유지";
export default function EditorWorkflowGuide() {
  const [step, setStep] = useState(0), [notice, setNotice] = useState("");
  return <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white" aria-labelledby="editor-workflow-title">
    <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50 p-5"><h2 id="editor-workflow-title" className="font-bold text-indigo-950">✏️ 편집 모드와 생성 범위 선택</h2><span className="text-xs text-indigo-800">약 2분 · 편집 무료 / 생성은 본인 API 비용</span><Link href="/#image-generation-choice" className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-bold text-white">생성 범위 선택 열기 ↗</Link></div>
    <div className="space-y-4 p-4 sm:p-6">
      <div className="rounded-xl bg-gradient-to-r from-indigo-700 to-violet-800 p-5 text-white"><p className="text-lg font-bold">수정한 내용은 이어서, 생성 범위는 직접 선택</p><p className="mt-2 text-sm">서식을 보존해 편집하고 저장한 최종 원고를 다시 확인합니다.</p></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="원고 편집 단계 선택">{steps.map((item, index) => <button key={item.title} type="button" aria-pressed={step === index} onClick={() => setStep(index)} className={`rounded-xl border p-3 text-left ${step === index ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}><span className="block text-xs font-bold text-indigo-700">STEP {index + 1}</span><span className="mt-2 block text-sm font-semibold">{item.title}</span></button>)}</div>
      <div className="rounded-xl border border-slate-200 p-4" aria-live="polite"><h3 className="font-bold">{step + 1}. {steps[step].title}</h3><p className="mt-2 text-sm">{steps[step].text}</p><p className="mt-2 text-xs leading-relaxed text-slate-600">{steps[step].detail}</p></div>
      <div className="flex flex-wrap gap-3 rounded-xl bg-slate-50 p-3"><code className="break-words text-xs">{rule}</code><button type="button" onClick={async () => {try {await navigator.clipboard.writeText(rule); setNotice("편집 규칙을 복사했습니다.");} catch {setNotice("규칙을 직접 선택해 복사해 주세요.");}}} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold">편집 규칙 복사</button><span role="status" className="w-full text-xs">{notice}</span></div>
      <p className="rounded-xl bg-indigo-50 p-3 text-xs">💡 글부터 저장하고 필요할 때 이미지를 생성하면 원고와 이미지 비용을 나누어 확인하기 쉽습니다.</p>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">⚠️ 취소·페이지 이동은 저장되지 않은 편집을 버릴 수 있습니다. 저장 확인 전에 창을 닫지 마세요. 내 사진 원고의 위치 표시·원래 출처와 만료일도 함께 확인하세요.</p>
      <Link href="/settings" className="inline-flex rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-800">내 API 키·모델 연동 안내 열기 ↗</Link>
      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">OpenAI 공식 키 콘솔 ↗</a>
    </div>
  </section>;
}
