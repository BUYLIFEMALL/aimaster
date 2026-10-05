"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { saveMemberCredentials, startThreadsOAuth } from "./web-actions";

type Provider = "openai" | "youtube_api_key" | "coupang_access_key" | "coupang_secret_key" | "threads_app_id" | "threads_app_secret";
type SavePayload = { openaiKey?: string; youtubeApiKey?: string; coupangAccessKey?: string; coupangSecretKey?: string; threadsAppId?: string; threadsAppSecret?: string };

const PROVIDER_FIELD: Record<Provider, keyof SavePayload> = {
  openai: "openaiKey", youtube_api_key: "youtubeApiKey", coupang_access_key: "coupangAccessKey", coupang_secret_key: "coupangSecretKey", threads_app_id: "threadsAppId", threads_app_secret: "threadsAppSecret",
};

const GUIDES = [
  ["1c5c24e2-15d4-49b8-b907-0ac6843dee3a", "OpenAI API 키 발급받기"],
  ["343996d3-8c77-455d-9bd4-54bcd47a34cd", "Threads 계정 연동하기"],
  ["117ffedb-c554-458a-9b92-e9ed6ee33988", "쿠팡 파트너스 API 발급받기"],
] as const;

export default function WebSetup({ connectedAccount, configuredProviders }: { connectedAccount?: string | null; configuredProviders: string[] }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<Provider | null>(null);
  const [configured, setConfigured] = useState(() => new Set(configuredProviders));

  const save = async (provider: Provider, value: string) => {
    if (!value.trim()) return;
    setSaving(provider); setMessage("");
    try {
      await saveMemberCredentials({ [PROVIDER_FIELD[provider]]: value.trim() } as SavePayload);
      setConfigured((previous) => new Set(previous).add(provider));
      setMessage("연동 정보를 저장했습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "연동 정보 저장에 실패했습니다."); }
    finally { setSaving(null); }
  };

  const connect = async () => {
    setMessage("");
    try { const { authorizeUrl } = await startThreadsOAuth(); window.location.assign(authorizeUrl); }
    catch (error) { setMessage(error instanceof Error ? error.message : "계정 연결을 시작하지 못했습니다."); }
  };

  return <div className="mx-auto max-w-2xl space-y-8">
    <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
      <SectionTitle title="Threads 계정 연결" description="게시물을 발행할 회원님 본인의 Threads 앱과 계정을 연결합니다." />
      <div className="mb-4 space-y-2 text-xs text-neutral-500"><p>Meta Developers에서 회원님 본인 명의의 Threads 앱을 만들고 앱 ID와 앱 시크릿을 등록하세요.</p><code className="block break-all rounded bg-neutral-200 px-2 py-1.5 text-neutral-800">https://www.buylife.xyz/api/threads-content-ops/callback</code></div>
      <div className="space-y-3"><CredentialRow provider="threads_app_id" label="Threads 앱 ID" configured={configured.has("threads_app_id")} saving={saving === "threads_app_id"} onSave={save} /><CredentialRow provider="threads_app_secret" label="Threads 앱 시크릿" configured={configured.has("threads_app_secret")} saving={saving === "threads_app_secret"} onSave={save} /></div>
      <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">{connectedAccount ? <div><p className="text-sm text-neutral-500">연결된 계정</p><p className="mt-1 flex items-center gap-2 text-lg font-medium text-neutral-900"><CheckCircle2 size={18} className="text-emerald-600" />@{connectedAccount}</p></div> : <div><p className="mb-4 text-sm text-neutral-600">앱 ID와 앱 시크릿을 모두 저장한 뒤 Threads 계정을 연결하세요.</p><button className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700" onClick={() => void connect()}>Threads 계정 연결하기</button></div>}</div>
    </section>

    <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
      <SectionTitle title="AI 콘텐츠 생성" description="콘텐츠 초안 생성에 쓰는 회원님 본인의 AI API 키입니다." />
      <CredentialRow provider="openai" label="OpenAI API 키" configured={configured.has("openai")} saving={saving === "openai"} onSave={save} />
    </section>

    <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
      <SectionTitle title="YouTube 콘텐츠 소스" description="YouTube 채널과 영상 기반 콘텐츠 수집 작업에 사용할 API 키입니다." />
      <CredentialRow provider="youtube_api_key" label="YouTube Data API 키" configured={configured.has("youtube_api_key")} saving={saving === "youtube_api_key"} onSave={save} />
    </section>

    <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
      <SectionTitle title="쿠팡 파트너스" description="상품 소스와 제휴 콘텐츠 작업에 사용할 Access Key와 Secret Key입니다." />
      <div className="space-y-3"><CredentialRow provider="coupang_access_key" label="쿠팡 파트너스 Access Key" configured={configured.has("coupang_access_key")} saving={saving === "coupang_access_key"} onSave={save} /><CredentialRow provider="coupang_secret_key" label="쿠팡 파트너스 Secret Key" configured={configured.has("coupang_secret_key")} saving={saving === "coupang_secret_key"} onSave={save} /></div>
    </section>

    <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm"><h2 className="mb-1 text-sm font-bold text-neutral-900">연동 매뉴얼</h2><p className="mb-4 text-xs text-neutral-500">API 키와 플랫폼 연동 방법을 새 창에서 열어 보면서 설정할 수 있습니다.</p><div className="flex flex-wrap gap-2">{GUIDES.map(([id, label]) => <button key={id} onClick={() => window.open(`/guides/${id}`, "_blank", "noopener,noreferrer")} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">{label}<ExternalLink size={13} /></button>)}</div></section>
    {message && <p className="text-sm text-neutral-600">{message}</p>}
  </div>;
}

function SectionTitle({ title, description }: { title: string; description: string }) { return <div className="mb-4"><h2 className="text-sm font-bold text-neutral-900">{title}</h2><p className="mt-1 text-xs text-neutral-500">{description}</p></div>; }

function CredentialRow({ provider, label, configured, saving, onSave }: { provider: Provider; label: string; configured: boolean; saving: boolean; onSave: (provider: Provider, value: string) => Promise<void> }) {
  const [value, setValue] = useState("");
  return <div className="rounded-lg border border-neutral-200 bg-white p-3"><div className="mb-2 flex items-center justify-between gap-3"><label className="text-sm font-medium text-neutral-800">{label}</label><span className={`text-xs font-medium ${configured ? "text-emerald-700" : "text-neutral-400"}`}>{configured ? "등록됨" : "미등록"}</span></div><div className="flex flex-col gap-2 sm:flex-row"><input className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400" type="password" autoComplete="off" placeholder={configured ? "새 값 입력 시 교체됩니다" : `${label} 입력`} value={value} onChange={(event) => setValue(event.target.value)} /><button className="rounded-lg bg-neutral-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={saving || !value.trim()} onClick={() => void onSave(provider, value).then(() => setValue(""))}>{saving ? "저장 중" : "저장"}</button></div></div>;
}
