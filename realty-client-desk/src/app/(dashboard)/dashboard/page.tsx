import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const count = async (build: (q: any) => any) => (await build(db.from("realty_desk_clients").select("id", { count: "exact", head: true }).eq("user_id", user.id))).count ?? 0; // eslint-disable-line @typescript-eslint/no-explicit-any
  const [all, active, week, ad] = await Promise.all([
    count((q) => q),
    count((q) => q.eq("status", "상담 중")),
    count((q) => q.gte("created_at", weekAgo)),
    count((q) => q.not("ad_consent_at", "is", null).is("ad_optout_at", null)),
  ]);
  const { count: links } = await db.from("realty_desk_intake_links").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true);

  const cards = [
    { label: "전체 관심고객", value: all },
    { label: "상담 중", value: active },
    { label: "최근 7일 새 고객", value: week },
    { label: "광고 문자 동의", value: ad },
  ];
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHero badge="🏠 대시보드" title="AI 중개사무소 고객관리" description="매수·임대 관심고객을 동의와 함께 모으고 조건별로 정리해요. 내 매물 연결·문자 안내·일정 알림은 다음 단계에서 열려요." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="mx-kpi">
            <p className="text-xs text-mx-muted">{c.label}</p>
            <p className="mt-1 text-2xl font-black text-mx-text">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mx-card space-y-2 p-5 text-sm text-mx-text">
        <h2 className="mx-section-title">🚀 시작하기</h2>
        <p>1. <Link href="/intake" className="text-mx-link underline">고객 접수 링크</Link>를 만듭니다{links ? ` (지금 받는 중 ${links}개)` : ""}.</p>
        <p>2. 링크를 문자·블로그·명함 QR에 붙여 공유합니다.</p>
        <p>3. <Link href="/clients" className="text-mx-link underline">관심고객</Link>에서 접수된 조건과 동의 기록을 확인하고, 전화 고객은 직접 넣습니다.</p>
        <p className="text-xs text-mx-muted">⚠️ 사무소 개인정보 처리방침에 「고객 명부 보관: Buylife」 「문자 발송: SOLAPI(본인 계정)」를 적어 주세요. 이 안내는 참고용이며 법률 자문이 아니에요.</p>
      </div>
    </div>
  );
}
