import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { getAiKeyStatus, getAiModels, getKeyExpiry, getProxyStatus, getWingKeyStatus } from "@/lib/data";
import { KeyExpiryForm } from "@/components/KeyExpiryForm";
import { keyExpiryNotice } from "@/lib/coupang/prefs";
import { AiKeyForm } from "@/components/AiKeyForm";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { ProxyKeyForm } from "@/components/ProxyKeyForm";
import { WingKeyForm } from "@/components/WingKeyForm";
import { ConnectionTest } from "@/components/ConnectionTest";
import { WING_FIELDS, WING_LABELS } from "@/lib/coupang/keys";
import { KeyRound, Shield, PlugZap, Bot, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const user = await requireProgramAccess();
  const [status, aiKeys, proxy, expiry, aiModels] = await Promise.all([
    getWingKeyStatus(user.id),
    getAiKeyStatus(user.id),
    getProxyStatus(user.id),
    getKeyExpiry(user.id).catch(() => ""),
    getAiModels(user.id).catch(() => ({})),
  ]);
  const expiryNotice = keyExpiryNotice(expiry, Date.now());

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="🔑"
        title="API키 등록 &amp; 플랫폼 연동"
        description="쿠팡 WING API 키·Fixie 고정 IP·AI 모델 키를 안전하게 등록합니다. 모든 키는 내 계정에만 저장됩니다."
      />

      {/* 1. 쿠팡 WING 키 등록 섹션 */}
      <section className="lab-card space-y-4 p-5 sm:p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
              <KeyRound size={15} />
            </span>
            <h2 className="text-base font-extrabold text-slate-900">1. 쿠팡 WING Open API 키</h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              status.saved
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
            }`}
          >
            {status.saved ? "✅ 키 등록 완료" : "키 미등록"}
          </span>
        </div>

        {status.saved && (
          <dl className="grid gap-x-4 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs sm:grid-cols-2">
            {WING_FIELDS.map((f) => (
              <div key={f} className="flex gap-2">
                <dt className="w-28 shrink-0 font-bold text-slate-500">{WING_LABELS[f]}</dt>
                <dd className="font-mono text-slate-800 font-semibold">{status.shown[f]}</dd>
              </div>
            ))}
          </dl>
        )}

        <WingKeyForm saved={status.saved} />
        {status.saved && <KeyExpiryForm key={expiry} expiry={expiry} />}
        {status.saved && !expiry && (
          <Notice tone="warn">
            🔑 키 만료일이 아직 설정되지 않았습니다. WING 키 발급일 기준 6개월 뒤 일자를 넣어 두시면 만료 전 알림을 드립니다.
          </Notice>
        )}
        {expiryNotice && <Notice tone="warn">🔑 {expiryNotice.text}</Notice>}
        <Notice tone="tip">
          🔒 키는 내 계정에만 저장되고, 화면에는 끝 4자리만 표시됩니다. 쿠팡 API 호출은 오직 등록된 본인 고정 IP로만 송출됩니다.
        </Notice>
      </section>

      {/* 2. Fixie 고정 IP 프록시 연동 */}
      <section className="lab-card space-y-4 p-5 sm:p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
            <Shield size={15} />
          </span>
          <h2 className="text-base font-extrabold text-slate-900">2. 내 고정 IP 프록시 연동 (Fixie)</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          쿠팡 WING은 보안 정책상 WING에 사전 등록된 고정 IP에서의 요청만 허용합니다. Fixie 프록시 URL을 등록해 고정 IP 통신을 설정하세요.
        </p>

        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
          <li>
            <a href="https://usefixie.com/" target="_blank" rel="noreferrer" className="font-bold text-indigo-700 underline hover:text-indigo-900">
              Fixie 가입 ↗
            </a>
            후 HTTP/HTTPS 프록시 생성 (무료 플랜 월 500회 제공)
          </li>
          <li>
            <a href="https://app.usefixie.com/" target="_blank" rel="noreferrer" className="font-bold text-indigo-700 underline hover:text-indigo-900">
              Fixie 대시보드 ↗
            </a>
            에서 <b>프록시 URL</b> 및 <b>고정 IP 2개</b> 복사
          </li>
          <li>
            프록시 URL을 아래 칸에 등록: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-indigo-700 font-mono">http://fixie:토큰@내주소.usefixie.com:80</code>
          </li>
          <li>
            쿠팡 WING 「추가판매정보 → OPEN API 키 발급」 화면에서 연동 방식 <b>「자체개발」</b> 선택 후 고정 IP 2개 추가
          </li>
        </ol>

        <ProxyKeyForm shown={proxy} />
        <p className="text-[12px] text-slate-500">
          더 자세한 내용은 <Link href="/guide" className="font-bold text-indigo-700 underline hover:text-indigo-900">📖 연동 가이드 매뉴얼</Link>을 확인하세요.
        </p>
      </section>

      {/* 3. WING 연결 시험 */}
      <section className="lab-card space-y-3 p-5 sm:p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
            <PlugZap size={15} />
          </span>
          <h2 className="text-base font-extrabold text-slate-900">3. 연결 시험</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          저장된 WING API 키와 Fixie 고정 IP가 정상인지 쿠팡 서버에 직접 검증합니다. 출고지·반품지 정보만 안전하게 조회하며 기존 데이터는 변경되지 않습니다.
        </p>
        <ConnectionTest saved={status.saved} />
      </section>

      {/* 4. AI 모델 키 등록 */}
      <section className="lab-card space-y-4 p-5 sm:p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
            <Bot size={15} />
          </span>
          <h2 className="text-base font-extrabold text-slate-900">4. AI 모델 키 (Claude · Gemini · OpenAI)</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          상품 추천·옵션 매칭·고객 문의 자동 응답 초안 작성에 사용할 AI 모델 키를 설정합니다. AIMaster 다른 프로그램에 등록된 키를 그대로 공유하여 사용하실 수 있습니다.
        </p>
        <AiKeyForm shown={aiKeys} models={aiModels} />
      </section>
    </div>
  );
}
