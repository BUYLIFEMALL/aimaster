import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { getAiKeyStatus, getWingKeyStatus } from "@/lib/data";
import { AiKeyForm } from "@/components/AiKeyForm";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { CopyBox } from "@/components/CopyBox";
import { WingKeyForm } from "@/components/WingKeyForm";
import { ConnectionTest } from "@/components/ConnectionTest";
import { CategoryCheck } from "@/components/CategoryCheck";
import { WING_FIELDS, WING_LABELS } from "@/lib/coupang/keys";
import { SERVER_IPS } from "@/lib/version";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const user = await requireProgramAccess();
  const [status, aiKeys] = await Promise.all([getWingKeyStatus(user.id), getAiKeyStatus(user.id)]);

  return (
    <div className="space-y-5">
      <PageHeader emoji="🔑" title="API키등록·플랫폼연동" description="쿠팡 WING 키와 AI 키를 한 번 등록합니다. 내 계정에만 저장됩니다." />

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">1. WING 허용 IP 확인</h2>
        <p className="text-sm text-slate-700">
          WING 「추가판매정보 → OPEN API 키 발급 → 연동 정보 수정」에서 연동 방식 <b>「자체개발」</b>, IP 칸에 아래 IP를 하나씩 넣고 그때마다 「추가」를 눌러야 연결됩니다.
          자세한 방법은 <Link href="/guide" className="font-bold text-blue-700 underline">📖 매뉴얼</Link>에 있습니다.
        </p>
        {SERVER_IPS.map((ip, i) => <CopyBox key={ip} label={`IP ${i + 1}`} text={ip} />)}
      </section>

      <section className="slw-card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900">2. 키 등록</h2>
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
        <Notice tone="warn">
          🔒 키는 내 계정에만 저장되고, 화면에는 끝 4자리만 보입니다. 쿠팡 호출은 우리 서버의 고정 IP에서만 나갑니다. 키가 노출됐다면 WING에서 「재발급」한 뒤 여기서 새 키로 바꿔 주세요(키는 최대 6개월 사용).
        </Notice>
      </section>

      <section className="slw-card space-y-2 p-5">
        <h2 className="text-base font-extrabold text-slate-900">3. 연결 시험</h2>
        <p className="text-sm text-slate-600">키와 허용 IP가 맞는지 쿠팡에 직접 물어봅니다. 내 출고지·반품지 목록만 읽고, 쿠팡에 아무것도 만들거나 바꾸지 않습니다.</p>
        <ConnectionTest saved={status.saved} />
      </section>

      <section className="slw-card space-y-2 p-5">
        <h2 className="text-base font-extrabold text-slate-900">4. 카테고리 확인</h2>
        <p className="text-sm text-slate-600">상품명을 넣으면 쿠팡이 추천하는 카테고리와 그 카테고리의 필수 속성·고시 상품군을 읽어 옵니다. 쿠팡에 아무것도 만들거나 바꾸지 않습니다.</p>
        <CategoryCheck saved={status.saved} />
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">5. AI 키(문의 초안·상품 추천)</h2>
        <p className="text-sm text-slate-600">쓰실 AI의 키만 넣으면 됩니다. 문의 초안과 상품 추천 화면에서 플랫폼과 모델을 고를 수 있고, 사용량은 내 키에 청구됩니다. 다른 프로그램에 등록한 키는 그대로 씁니다.</p>
        <AiKeyForm shown={aiKeys} />
      </section>
    </div>
  );
}
