import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/layout/PageHero";
import { KpiCard, KpiGrid } from "@/components/dashboard/KpiCard";
import { ContactForm, PartnerCsvButton, PartnerNotice, PartnerSearchForm, type PartnerRow } from "@/components/partners/PartnerClient";
import { CHANNEL_LABELS, PARTNER_NOTICE_VERSION } from "@/lib/partners/notice";
import { deletePartnerAction } from "@/lib/actions/partners";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 제휴 타깃 찾기(v1.10 초안): 키워드 → 네이버 공식 검색 API로 그 주제 채널 찾기 → 회원이 채널을 열어 공개 연락처를 확인해 적기.
// 30일 지난 행은 RLS가 숨긴다(관리자·시험 계정 열외). 서버는 채널 페이지를 긁지 않는다.
export default async function PartnersPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: consent }, { data: rows }] = await Promise.all([
    supabase.from("competitor_partner_consents").select("notice_version").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("competitor_partner_channels")
      .select("id, keyword, channel_type, name, url, summary, category, address, public_phone, public_email, contact_note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const agreed = !!consent && consent.notice_version >= PARTNER_NOTICE_VERSION;
  const list = (rows ?? []) as PartnerRow[];
  const withContact = list.filter((r) => r.public_phone || r.public_email).length;
  const keywords = new Set(list.map((r) => r.keyword)).size;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHero
        badge="🤝 제휴 타깃 찾기"
        title="키워드로 그 주제 채널 찾기"
        description="공동구매처럼 원하는 주제로 활동하는 블로그·업체·카페·쇼핑몰을 찾고, 그 채널이 홍보하려고 공개해 둔 연락처를 확인해 정리합니다."
        tip="연락처는 검색 결과에 나오지 않습니다. 채널 이름을 눌러 공개 페이지를 열고, 공개돼 있는 전화·이메일만 적어 주세요."
      />

      {!agreed ? (
        <PartnerNotice />
      ) : (
        <>
          <KpiGrid>
            <KpiCard icon="📋" label="담은 채널" value={list.length} />
            <KpiCard icon="📇" label="공개 연락처 적음" value={withContact} tone="green" />
            <KpiCard icon="🔑" label="키워드" value={keywords} tone="muted" />
          </KpiGrid>
          <PartnerSearchForm />
          <div className="mx-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-mx-text">📋 담은 채널 ({list.length})</p>
              <PartnerCsvButton rows={list} />
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-mx-muted">아직 담은 채널이 없습니다. 위에서 키워드로 찾아 보세요.</p>
            ) : (
              <ul className="divide-y divide-mx-border">
                {list.map((r) => (
                  <li key={r.id} className="space-y-2 py-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="rounded bg-mx-surface px-2 py-0.5 text-xs text-mx-muted">{CHANNEL_LABELS[r.channel_type]}</span>
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-mx-text underline-offset-2 hover:underline">{r.name} ↗</a>
                      ) : (
                        <span className="font-semibold text-mx-text">{r.name}</span>
                      )}
                      <span className="text-xs text-mx-muted">#{r.keyword}</span>
                      <form action={deletePartnerAction} className="ml-auto">
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="text-xs text-mx-muted hover:text-mx-danger">삭제</button>
                      </form>
                    </div>
                    {(r.summary || r.category || r.address) && (
                      <p className="text-xs text-mx-muted">{[r.category, r.address, r.summary].filter(Boolean).join(" · ")}</p>
                    )}
                    <ContactForm row={r} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
