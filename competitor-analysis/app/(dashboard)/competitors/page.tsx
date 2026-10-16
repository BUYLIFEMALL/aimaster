import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { CompetitorToggle } from "@/components/keywords/CompetitorToggle";
import { PageHero } from "@/components/layout/PageHero";
import { KpiCard, KpiGrid } from "@/components/dashboard/KpiCard";

export const dynamic = "force-dynamic";

export default async function CompetitorsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: tracked } = await supabase
    .from("user_tracked_competitors")
    .select("domain, note, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 빈 목록이면 임의 문자열로 조회하지 않고 바로 비운다(UUID 컬럼 조회 오류가 빈 목록으로 숨는 문제, 롱테일 v1.06에서 발견).
  const domains = (tracked ?? []).map((t) => t.domain);
  const profiles =
    domains.length > 0
      ? (await supabase.from("competitor_profiles").select("domain, company_name, summary").in("domain", domains)).data
      : [];

  // 이 도메인이 등장했던 내 키워드 목록을 단순 쿼리로 구한다(중첩 조인은 Database 타입에
  // Relationships를 안 채워둬서 타입이 정확히 안 잡히므로).
  const myResults =
    domains.length > 0
      ? (await supabase.from("competitor_serp_results").select("domain, job_id").eq("user_id", user.id).in("domain", domains)).data
      : [];
  const jobIds = Array.from(new Set((myResults ?? []).map((r) => r.job_id)));
  const jobs =
    jobIds.length > 0
      ? (await supabase.from("competitor_serp_jobs").select("id, keyword_id").eq("user_id", user.id).in("id", jobIds)).data
      : [];
  const keywordIdByJobId = new Map((jobs ?? []).map((j) => [j.id, j.keyword_id]));
  const keywordIds = Array.from(new Set(Array.from(keywordIdByJobId.values())));
  const keywordRows =
    keywordIds.length > 0
      ? (await supabase.from("competitor_keywords").select("id, keyword").eq("user_id", user.id).in("id", keywordIds)).data
      : [];
  const keywordTextById = new Map((keywordRows ?? []).map((k) => [k.id, k.keyword]));

  const profileByDomain = new Map((profiles ?? []).map((p) => [p.domain, p]));
  const keywordsByDomain = new Map<string, Set<string>>();
  const appearancesByDomain = new Map<string, number>();
  for (const r of myResults ?? []) {
    if (!r.domain) continue;
    appearancesByDomain.set(r.domain, (appearancesByDomain.get(r.domain) ?? 0) + 1);
    const keywordId = keywordIdByJobId.get(r.job_id);
    const kw = keywordId ? keywordTextById.get(keywordId) : null;
    if (!kw) continue;
    const set = keywordsByDomain.get(r.domain) ?? new Set<string>();
    set.add(kw);
    keywordsByDomain.set(r.domain, set);
  }
  const withProfile = domains.filter((d) => profileByDomain.get(d)?.company_name).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="🏢 내 경쟁사"
        title="내 경쟁사 모아 보기"
        description="키워드 분석 결과에서 「경쟁사로 표시」를 눌러 둔 도메인을, 어떤 키워드에 몇 번 등장했는지와 함께 모아 보여 드립니다."
        tip="여러 키워드에 자주 등장하는 도메인일수록 내 분야의 핵심 경쟁사일 가능성이 높아요."
      />

      <KpiGrid>
        <KpiCard icon="🏢" label="표시한 경쟁사" value={domains.length} />
        <KpiCard icon="🧾" label="회사 정보 있음" value={withProfile} tone="green" />
        <KpiCard icon="🔍" label="관련 키워드" value={keywordIds.length} tone="amber" />
        <KpiCard icon="📈" label="총 노출 횟수" value={(myResults ?? []).length} tone="muted" />
      </KpiGrid>

      {!tracked || tracked.length === 0 ? (
        <div className="mx-card py-16 text-center">
          <p className="text-5xl">🏢</p>
          <p className="mt-4 text-sm text-mx-muted">아직 경쟁사로 표시해 둔 도메인이 없습니다. 분석 결과에서 표시해 보세요.</p>
          <Link href="/analyses" className="mx-btn-primary mt-4">
            📋 분석 결과 보러 가기
          </Link>
        </div>
      ) : (
        <div className="mx-card p-4">
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="mx-table min-w-[720px]">
              <thead>
                <tr>
                  <th>회사 · 도메인</th>
                  <th>요약</th>
                  <th>노출된 키워드</th>
                  <th className="text-right">노출</th>
                  <th className="text-right">표시</th>
                </tr>
              </thead>
              <tbody>
                {tracked.map((t) => {
                  const profile = profileByDomain.get(t.domain);
                  const keywords = Array.from(keywordsByDomain.get(t.domain) ?? []);
                  return (
                    <tr key={t.domain}>
                      <td>
                        <p className="font-bold">{profile?.company_name ?? t.domain}</p>
                        <p className="font-mono text-xs text-[#93c5fd]">{t.domain}</p>
                      </td>
                      <td className="max-w-[320px]">
                        <p className="line-clamp-3 text-xs text-mx-muted">{profile?.summary ?? "—"}</p>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {keywords.length > 0 ? (
                            keywords.map((k) => (
                              <span key={k} className="mx-chip-blue px-2 py-0.5 text-[11px]">
                                {k}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-mx-muted">—</span>
                          )}
                        </div>
                      </td>
                      <td className="text-right tabular-nums">{appearancesByDomain.get(t.domain) ?? 0}회</td>
                      <td className="text-right">
                        <CompetitorToggle domain={t.domain} tracked />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
