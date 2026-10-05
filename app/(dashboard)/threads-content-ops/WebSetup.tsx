"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { saveMemberCredentials, startThreadsOAuth } from "./web-actions";

export default function WebSetup({ connectedAccount }: { connectedAccount?: string | null }) {
  const [openaiKey, setOpenaiKey] = useState("");
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      await saveMemberCredentials({ openaiKey, threadsAppId: appId, threadsAppSecret: appSecret });
      setOpenaiKey("");
      setAppId("");
      setAppSecret("");
      setMessage("본인 연동 정보를 안전하게 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const connect = async () => {
    setBusy(true);
    setMessage("");
    try {
      const { authorizeUrl } = await startThreadsOAuth();
      window.location.assign(authorizeUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "연결을 시작하지 못했습니다.");
      setBusy(false);
    }
  };

  return <div className="grid gap-4 sm:grid-cols-2">
    <GlassCard>
      <div className="mb-4 flex items-center gap-2"><KeyRound size={18} className="text-gold" /><h2 className="font-bold text-white">AI·Threads 앱 설정</h2></div>
      <div className="space-y-3">
        <input className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" type="password" placeholder="OpenAI API 키 (초안 생성용)" value={openaiKey} onChange={(event) => setOpenaiKey(event.target.value)} />
        <input className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" placeholder="내 Meta Developers Threads 앱 ID" value={appId} onChange={(event) => setAppId(event.target.value)} />
        <input className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" type="password" placeholder="내 Threads 앱 시크릿" value={appSecret} onChange={(event) => setAppSecret(event.target.value)} />
        <button className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-black disabled:opacity-50" disabled={busy || (!openaiKey && !appId && !appSecret)} onClick={() => void save()}>{busy ? "저장 중…" : "내 연동 정보 저장"}</button>
      </div>
      <p className="mt-3 text-xs leading-5 text-subtext">Meta 앱의 유효한 OAuth 리디렉션 URI에 <span className="text-white">https://www.buylife.xyz/api/threads-content-ops/callback</span>을 등록하세요.</p>
    </GlassCard>
    <GlassCard>
      <div className="mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-400" /><h2 className="font-bold text-white">Threads 계정 연결</h2></div>
      {connectedAccount ? <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 size={17} />@{connectedAccount} 연결됨</div><p className="mt-1 text-emerald-100/80">계정별 초안과 발행 이력은 회원님의 공간에만 저장됩니다.</p></div> : <><p className="mb-4 text-sm text-subtext">저장한 회원님의 앱 ID와 시크릿으로만 OAuth 연결을 시작합니다. 운영자 공용 앱은 사용하지 않습니다.</p><button className="rounded-lg border border-gold/50 px-4 py-2 text-sm font-bold text-gold disabled:opacity-50" disabled={busy} onClick={() => void connect()}>내 Threads 계정 연결하기</button></>}
      {message && <p className="mt-3 text-sm text-subtext">{message}</p>}
    </GlassCard>
  </div>;
}
