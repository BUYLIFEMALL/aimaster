"use client";

import { useState } from "react";
import { ACTIVE_PROVIDERS } from "./config";

export function ProviderGuide({ dark = false }: { dark?: boolean }) {
  const [copied, setCopied] = useState<string | null>(null);
  const card = dark ? "border-slate-700 bg-[#11141c]" : "border-slate-200 bg-slate-50";
  return <details className={`rounded-xl border p-3 text-xs ${card}`}>
    <summary className="cursor-pointer font-semibold">📖 새 AI 연결 매뉴얼 · 약 3분</summary>
    <div className="mt-3 space-y-3">
      <div className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 p-3"><b>본인 키로 연결하고 같은 키를 함께 사용합니다</b><p className="mt-1 leading-relaxed">Groq·OpenRouter·Cloudflare 중 하나를 골라 등록하세요. 키 발급·저장만으로 답변 생성이나 과금 요청을 보내지 않습니다.</p></div>
      <ol className="grid gap-2 sm:grid-cols-2">{["① 공식 콘솔에서 본인 키 발급", "② 아래 해당 항목에 저장", "③ 실행 화면에서 공급자·모델 선택", "④ 짧은 질문으로 응답 확인"].map((title) => <li key={title} className={`rounded-lg border p-3 font-medium ${card}`}>{title}</li>)}</ol>
      {ACTIVE_PROVIDERS.map((provider) => <div key={provider.id} className={`space-y-2 rounded-lg border p-3 ${card}`}>
        <b>{provider.name}</b><p className="leading-relaxed">{provider.note}</p>
        <p>콘솔에서 발급한 값은 키 전용 입력란에 저장합니다.{provider.id === "cloudflare" && " Cloudflare는 대시보드의 계정 ID와 Workers AI 권한 토큰을 각각 저장합니다."}</p>
        <div className="flex flex-wrap gap-2"><a href={provider.console} target="_blank" rel="noopener noreferrer" className="rounded-md border border-indigo-400/40 px-2 py-1 font-semibold">공식 콘솔 열기 ↗</a><a href={provider.docs} target="_blank" rel="noopener noreferrer" className="px-2 py-1 underline">공식 한도 확인</a></div>
        <div className="flex min-w-0 flex-wrap items-center gap-2"><code className="break-all">{provider.models[0]}</code><button type="button" className="shrink-0 rounded border px-2 py-1" onClick={async () => {
          try { await navigator.clipboard.writeText(provider.models[0]); setCopied(provider.id); } catch { setCopied("error"); }
        }}>{copied === provider.id ? "복사됨" : "모델 ID 복사"}</button></div>
      </div>)}
      {copied === "error" && <p role="status">복사 권한을 확인하거나 모델 ID를 직접 선택해 복사해 주세요.</p>}
      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">💡 한 프로그램에서 저장한 키는 같은 회원의 다른 프로그램에서도 사용합니다. 문서 검색·PDF 읽기는 별도 Upstage 키가 필요합니다.</p>
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">⚠️ 키·토큰을 채팅이나 템플릿 본문에 붙여 넣지 마세요. 자료는 선택한 답변 공급자에게 전달됩니다. NVIDIA는 운영 이용 조건 확인 전 연결하지 않습니다.</p>
    </div>
  </details>;
}
