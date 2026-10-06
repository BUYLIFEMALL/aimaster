"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";
import {
  deleteMemberCredential,
  disconnectThreadsAccount,
  saveMemberCredentials,
  startThreadsOAuth,
} from "./web-actions";

type Provider = "openai" | "perplexity" | "youtube_api_key" | "coupang_access_key" | "coupang_secret_key" | "threads_app_id" | "threads_app_secret";
type SavePayload = {
  openaiKey?: string;
  youtubeApiKey?: string;
  perplexityKey?: string;
  coupangAccessKey?: string;
  coupangSecretKey?: string;
  threadsAppId?: string;
  threadsAppSecret?: string;
};
type ConnectedAccount = { id: string; username: string | null; tokenExpiresAt: string | null };

const PROVIDER_FIELD: Record<Provider, keyof SavePayload> = {
  openai: "openaiKey",
  youtube_api_key: "youtubeApiKey",
  perplexity: "perplexityKey",
  coupang_access_key: "coupangAccessKey",
  coupang_secret_key: "coupangSecretKey",
  threads_app_id: "threadsAppId",
  threads_app_secret: "threadsAppSecret",
};

const GUIDES = [
  ["1c5c24e2-15d4-49b8-b907-0ac6843dee3a", "OpenAI API 키 발급받기"],
  ["343996d3-8c77-455d-9bd4-54bcd47a34cd", "Threads 계정 연동하기"],
  ["117ffedb-c554-458a-9b92-e9ed6ee33988", "쿠팡 파트너스 API 발급받기"],
  ["1df95d8b-6a27-4de0-b1d9-8bbc218534ad", "Perplexity API 키 발급받기"],
] as const;

export default function WebSetup({
  connectedAccounts: initialAccounts,
  maskedCredentials,
  redirectUri,
}: {
  connectedAccounts: ConnectedAccount[];
  maskedCredentials: Record<string, string>;
  redirectUri: string;
}) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<Provider | null>(null);
  const [removing, setRemoving] = useState<Provider | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [credentials, setCredentials] = useState(maskedCredentials);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState(initialAccounts);

  const save = async (provider: Provider, value: string) => {
    if (!value.trim()) return;
    setSaving(provider);
    setMessage("");
    try {
      const normalized = value.trim();
      await saveMemberCredentials({ [PROVIDER_FIELD[provider]]: normalized } as SavePayload);
      setCredentials((previous) => ({ ...previous, [provider]: maskCredential(normalized) }));
      setEditing(null);
      setMessage("연동 정보를 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "연동 정보 저장에 실패했습니다.");
    } finally {
      setSaving(null);
    }
  };

  const remove = async (provider: Provider) => {
    if (!window.confirm("저장된 연동 정보를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    setRemoving(provider);
    setMessage("");
    try {
      await deleteMemberCredential(provider);
      setCredentials((previous) => {
        const next = { ...previous };
        delete next[provider];
        return next;
      });
      setEditing(null);
      setMessage("연동 정보를 삭제했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "연동 정보 삭제에 실패했습니다.");
    } finally {
      setRemoving(null);
    }
  };

  const connect = async () => {
    setMessage("");
    try {
      const { authorizeUrl } = await startThreadsOAuth();
      window.location.assign(authorizeUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "계정 연결을 시작하지 못했습니다.");
    }
  };

  const disconnect = async (account: ConnectedAccount) => {
    if (!window.confirm("연결된 Threads 계정을 해제할까요? 저장된 초안과 발행 이력은 삭제하지 않습니다.")) return;
    setDisconnecting(true);
    setMessage("");
    try {
      await disconnectThreadsAccount(account.id);
      setConnectedAccounts((previous) => previous.filter((item) => item.id !== account.id));
      setMessage("Threads 계정 연결을 해제했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "계정 연결 해제에 실패했습니다.");
    } finally {
      setDisconnecting(false);
    }
  };

  return <div className="mx-auto max-w-2xl space-y-6">
    <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
      <SectionTitle title="🧵 Threads 계정 연결" description="게시글을 자동으로 게시할 Threads 계정을 연결합니다(OAuth)." />
      <div className="mb-4 space-y-2 text-xs leading-relaxed text-neutral-600">
        <p>Meta 앱이 개발(Development) 모드이면, 앱의 역할 메뉴에서 테스터로 등록한 본인 계정만 연결할 수 있습니다.</p>
        <p><span className="font-semibold text-neutral-800">Meta 앱 대시보드 → 사용 사례 → Threads API 액세스 → 설정</span>의 <span className="font-semibold text-neutral-800">유효한 OAuth 리디렉션 URI</span>에 아래 주소를 한 글자도 바꾸지 않고 추가한 뒤 저장하세요. 웹훅 URL이나 Facebook 로그인 URL 칸에 넣으면 연결되지 않습니다.</p>
        <code className="block break-all rounded bg-neutral-200 px-2 py-1.5 font-medium text-neutral-800">{redirectUri}</code>
        <p>그 다음 역할 메뉴에서 연결할 Threads 계정을 테스터로 추가하고, 앱 ID와 앱 시크릿 코드를 저장한 뒤 연결을 시작하세요.</p>
      </div>
      <div className="space-y-3">
        <CredentialRow provider="threads_app_id" label="Threads 앱 ID (Meta 앱 설정 > 기본 설정 하단의 Threads 앱 ID)" maskedValue={credentials.threads_app_id} editing={editing === "threads_app_id"} saving={saving === "threads_app_id"} removing={removing === "threads_app_id"} onEdit={setEditing} onSave={save} onDelete={remove} />
        <CredentialRow provider="threads_app_secret" label="Threads 앱 시크릿 코드 (기본 설정 하단의 Threads 앱 시크릿 코드)" maskedValue={credentials.threads_app_secret} editing={editing === "threads_app_secret"} saving={saving === "threads_app_secret"} removing={removing === "threads_app_secret"} onEdit={setEditing} onSave={save} onDelete={remove} />
      </div>
      <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-neutral-500">연결된 계정 {connectedAccounts.length ? `(${connectedAccounts.length})` : ""}</p><button className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-[#ffffff] hover:bg-sky-700" onClick={() => void connect()}>Threads 계정 추가 연결</button></div>
          {connectedAccounts.length ? <div className="space-y-2">{connectedAccounts.map((account) => <div key={account.id} className="rounded-lg border border-neutral-200 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-base font-medium text-neutral-900"><CheckCircle2 size={18} className="text-emerald-600" />@{account.username ?? "Threads 계정"}</p>{account.tokenExpiresAt && <p className="mt-1 text-xs text-neutral-500">토큰 만료: {new Date(account.tokenExpiresAt).toLocaleString("ko-KR")}</p>}</div><button className="inline-flex items-center justify-center rounded-lg bg-[#e7000b] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:bg-[#c90009] disabled:cursor-not-allowed disabled:bg-[#f3a0a5]" disabled={disconnecting} onClick={() => void disconnect(account)}>{disconnecting ? "해제 중…" : "연결 해제"}</button></div></div>)}</div> : <p className="text-sm text-neutral-600">앱 ID와 앱 시크릿을 모두 저장한 뒤 첫 Threads 계정을 연결하세요.</p>}
        </div>
      </div>
    </section>

    <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
      <SectionTitle title="AI 콘텐츠 생성" description="콘텐츠 초안 생성에는 회원 본인의 OpenAI API 키를 사용합니다." />
      <CredentialRow provider="openai" label="OpenAI API 키" maskedValue={credentials.openai} editing={editing === "openai"} saving={saving === "openai"} removing={removing === "openai"} onEdit={setEditing} onSave={save} onDelete={remove} />
    </section>

    <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
      <SectionTitle title="화제 글감 검색 (Perplexity)" description="떡상 콘텐츠 수집의 '화제 검색'에 사용할 본인의 Perplexity API 키입니다. 키가 없어도 주소 지정 방식은 쓸 수 있습니다." />
      <CredentialRow provider="perplexity" label="Perplexity API 키 (pplx-...)" maskedValue={credentials.perplexity} editing={editing === "perplexity"} saving={saving === "perplexity"} removing={removing === "perplexity"} onEdit={setEditing} onSave={save} onDelete={remove} />
    </section>

    <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
      <SectionTitle title="YouTube 콘텐츠 소스" description="YouTube 채널과 영상 기반 콘텐츠 수집 작업에 사용할 API 키입니다." />
      <CredentialRow provider="youtube_api_key" label="YouTube Data API 키" maskedValue={credentials.youtube_api_key} editing={editing === "youtube_api_key"} saving={saving === "youtube_api_key"} removing={removing === "youtube_api_key"} onEdit={setEditing} onSave={save} onDelete={remove} />
    </section>

    <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
      <SectionTitle title="쿠팡 파트너스" description="상품 소스와 제휴 콘텐츠 작업에 사용할 Access Key와 Secret Key입니다." />
      <div className="space-y-3">
        <CredentialRow provider="coupang_access_key" label="쿠팡 파트너스 Access Key" maskedValue={credentials.coupang_access_key} editing={editing === "coupang_access_key"} saving={saving === "coupang_access_key"} removing={removing === "coupang_access_key"} onEdit={setEditing} onSave={save} onDelete={remove} />
        <CredentialRow provider="coupang_secret_key" label="쿠팡 파트너스 Secret Key" maskedValue={credentials.coupang_secret_key} editing={editing === "coupang_secret_key"} saving={saving === "coupang_secret_key"} removing={removing === "coupang_secret_key"} onEdit={setEditing} onSave={save} onDelete={remove} />
      </div>
    </section>

    <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-bold text-neutral-900">📖 연동 매뉴얼</h2>
      <p className="mb-4 text-xs text-neutral-500">API 키와 플랫폼 연동 방법을 새 창에서 확인할 수 있습니다.</p>
      <div className="flex flex-wrap gap-2">{GUIDES.map(([id, label]) => <button key={id} onClick={() => window.open(`/guides/${id}`, "_blank", "noopener,noreferrer")} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">{label}<ExternalLink size={13} /></button>)}</div>
    </section>

    {message && <p className="text-sm text-neutral-700" role="status">{message}</p>}
  </div>;
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div className="mb-4"><h2 className="text-sm font-bold text-neutral-900">{title}</h2><p className="mt-1 text-xs text-neutral-500">{description}</p></div>;
}

function CredentialRow({
  provider, label, maskedValue, editing, saving, removing, onEdit, onSave, onDelete,
}: {
  provider: Provider;
  label: string;
  maskedValue?: string;
  editing: boolean;
  saving: boolean;
  removing: boolean;
  onEdit: (provider: Provider | null) => void;
  onSave: (provider: Provider, value: string) => Promise<void>;
  onDelete: (provider: Provider) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const registered = Boolean(maskedValue);

  if (registered && !editing) {
    return <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        <div className="flex gap-3 text-xs font-medium"><button className="text-sky-700 hover:underline" onClick={() => onEdit(provider)}>수정</button><button className="text-red-600 hover:underline disabled:opacity-50" disabled={removing} onClick={() => void onDelete(provider)}>{removing ? "삭제 중…" : "삭제"}</button></div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-sm"><span className="font-mono text-neutral-700">{maskedValue}</span><span className="text-neutral-500">등록됨</span></div>
    </div>;
  }

  return <div className="rounded-lg border border-neutral-200 bg-white p-3">
    <label className="mb-2 block text-sm font-medium text-neutral-800">{label}</label>
    <div className="flex flex-col gap-2 sm:flex-row">
      <input className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400" type="password" autoComplete="off" placeholder={registered ? "새 값을 입력하면 기존 값이 교체됩니다" : `${label} 입력`} value={value} onChange={(event) => setValue(event.target.value)} />
      <div className="flex gap-2"><button className="rounded-lg bg-neutral-800 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={saving || !value.trim()} onClick={() => void onSave(provider, value).then(() => setValue(""))}>{saving ? "저장 중…" : "저장"}</button>{registered && <button className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50" onClick={() => { setValue(""); onEdit(null); }}>취소</button>}</div>
    </div>
  </div>;
}

function maskCredential(value: string) {
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}${"•".repeat(Math.min(10, value.length - 8))}${value.slice(-4)}`;
}
