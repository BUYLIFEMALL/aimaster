import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { getAiKeyStatus, getKeyExpiry, getProxyStatus, getWingKeyStatus } from "@/lib/data";
import { KeyExpiryForm } from "@/components/KeyExpiryForm";
import { keyExpiryNotice } from "@/lib/coupang/prefs";
import { AiKeyForm } from "@/components/AiKeyForm";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { ProxyKeyForm } from "@/components/ProxyKeyForm";
import { WingKeyForm } from "@/components/WingKeyForm";
import { ConnectionTest } from "@/components/ConnectionTest";
import { WING_FIELDS, WING_LABELS } from "@/lib/coupang/keys";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const user = await requireProgramAccess();
  const [status, aiKeys, proxy, expiry] = await Promise.all([getWingKeyStatus(user.id), getAiKeyStatus(user.id), getProxyStatus(user.id), getKeyExpiry(user.id).catch(() => "")]);
  const expiryNotice = keyExpiryNotice(expiry, Date.now());

  return (
    <div className="space-y-5">
      <PageHeader emoji="🔑" title="API키등록·플랫폼연동" description="쿠팡 WING 키·내 고정 IP·AI 키를 한 번 등록합니다. 내 계정에만 저장됩니다." />

      <section className="slw-card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900">1. 키 등록</h2>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.saved ? "bg-teal-50 text-teal-800 ring-1 ring-teal-200" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"}`}>
            {status.saved ? "✅ 저장됨" : "아직 없음"}
          </span>
        </div>
        {status.saved && (
          <dl className="grid gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-2">
            {WING_FIELDS.map((f) => (
              <div key={f} className="flex gap-2">
                <dt className="w-28 shrink-0 font-bold text-slate-600">{WING_LABELS[f]}</dt>
                <dd className="font-mono text-slate-800">{status.shown[f]}</dd>
              </div>
            ))}
          </dl>
        )}
        <WingKeyForm saved={status.saved} />
        {status.saved && <KeyExpiryForm key={expiry} expiry={expiry} />}
        {status.saved && !expiry && <Notice tone="warn">🔑 키 만료일이 아직 없습니다. WING 키를 발급한 날에서 6개월 뒤 날짜를 넣어 두면 만료 전에 알려 드립니다.</Notice>}
        {expiryNotice && <Notice tone="warn">🔑 {expiryNotice.text}</Notice>}
        <Notice tone="warn">
          🔒 키는 내 계정에만 저장되고, 화면에는 끝 4자리만 보입니다. 쿠팡 호출은 내 고정 IP로만 나갑니다. 키가 노출됐다면 WING에서 「재발급」한 뒤 여기서 새 키로 바꿔 주세요(키는 최대 6개월 사용).
        </Notice>
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">2. 내 고정 IP 만들기(Fixie)</h2>
        <p className="text-sm text-slate-700">쿠팡은 WING에 등록한 IP에서 온 요청만 받습니다. 이 프로그램 서버는 IP가 바뀌므로, 내 Fixie 계정의 고정 IP를 거쳐 쿠팡에 연결합니다.</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li><a href="https://usefixie.com/" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Fixie 사이트 ↗</a>에서 가입하고 HTTP/HTTPS용 프록시를 만듭니다(무료 요금 Tricycle, 월 500회).</li>
          <li><a href="https://app.usefixie.com/" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Fixie 대시보드 ↗</a>에서 <b>프록시 주소</b>와 <b>고정 IP 2개</b>를 확인합니다.</li>
          <li>프록시 주소를 아래 칸에 넣습니다. 모양: <code className="rounded bg-slate-100 px-1 text-xs">http://fixie:토큰@내주소.usefixie.com:80</code></li>
          <li>WING 「추가판매정보 → OPEN API 키 발급 → 연동 정보 수정」에서 연동 방식 <b>「자체개발」</b>, IP 칸에 고정 IP를 하나씩 넣고 그때마다 「추가」를 누릅니다.</li>
        </ol>
        <ProxyKeyForm shown={proxy} />
        <p className="text-[12px] text-slate-500">자세한 방법은 <Link href="/guide" className="font-bold text-blue-700 underline">📖 매뉴얼</Link>에 있습니다.</p>
      </section>

      <section className="slw-card space-y-2 p-5">
        <h2 className="text-base font-extrabold text-slate-900">3. 연결 시험</h2>
        <p className="text-sm text-slate-600">키와 허용 IP가 맞는지 쿠팡에 직접 물어봅니다. 내 출고지·반품지 목록만 읽고, 쿠팡에 아무것도 만들거나 바꾸지 않습니다.</p>
        <ConnectionTest saved={status.saved} />
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">4. AI 키(문의 초안·상품 추천)</h2>
        <p className="text-sm text-slate-600">쓰실 AI의 키만 넣으면 됩니다. 문의 초안과 상품 추천 화면에서 플랫폼과 모델을 고를 수 있고, 사용량은 내 키에 청구됩니다. 다른 프로그램에 등록한 키는 그대로 씁니다.</p>
        <AiKeyForm shown={aiKeys} />
      </section>
    </div>
  );
}
