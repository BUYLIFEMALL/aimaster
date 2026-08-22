import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { CompetitorToggle } from "@/components/keywords/CompetitorToggle";

export const dynamic = "force-dynamic";

export default async function CompetitorsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: tracked } = await supabase
    .from("user_tracked_competitors")
    .select("domain, note, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const domains = (tracked ?? []).map((t) => t.domain);
  const domainFilter = domains.length > 0 ? domains : ["__none__"];

  const { data: profiles } = await supabase
    .from("competitor_profiles")
    .select("domain, company_name, summary")
    .in("domain", domainFilter);

  // 이 도메인이 등장했던 내 키워드 목록을 별도 쿼리 2번으로 구한다(중첩 조인은 Database 타입에
  // Relationships를 안 채워둬서 타입이 정확히 안 잡히므로, 단순한 쿼리 2개로 대체).
  const { data: myResults } = await supabase
    .from("competitor_serp_results")
    .select("domain, job_id")
    .eq("user_id", user.id)
    .in("domain", domainFilter);
  const jobIds = Array.from(new Set((myResults ?? []).map((r) => r.job_id)));
  const { data: jobs } = await supabase
    .from("competitor_serp_jobs")
    .select("id, keyword_id")
    .in("id", jobIds.length > 0 ? jobIds : ["__none__"]);
  const keywordIdByJobId = new Map((jobs ?? []).map((j) => [j.id, j.keyword_id]));
  const keywordIds = Array.from(new Set(Array.from(keywordIdByJobId.values())));
  const { data: keywordRows } = await supabase
    .from("competitor_keywords")
    .select("id, keyword")
    .in("id", keywordIds.length > 0 ? keywordIds : ["__none__"]);
  const keywordTextById = new Map((keywordRows ?? []).map((k) => [k.id, k.keyword]));

  const profileByDomain = new Map((profiles ?? []).map((p) => [p.domain, p]));
  const keywordsByDomain = new Map<string, Set<string>>();
  for (const r of myResults ?? []) {
    const keywordId = keywordIdByJobId.get(r.job_id);
    const kw = keywordId ? keywordTextById.get(keywordId) : null;
    if (!r.domain || !kw) continue;
    const set = keywordsByDomain.get(r.domain) ?? new Set<string>();
    set.add(kw);
    keywordsByDomain.set(r.domain, set);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">내 경쟁사</h1>
        <p className="text-sm text-gray-500 mt-1">
          키워드 분석 결과에서 "경쟁사로 표시"를 눌러둔 도메인 목록입니다.
        </p>
      </div>

      {!tracked || tracked.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🏢</div>
          <p>아직 경쟁사로 표시해둔 도메인이 없습니다. 키워드 분석 결과에서 표시해보세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tracked.map((t) => {
            const profile = profileByDomain.get(t.domain);
            const keywords = Array.from(keywordsByDomain.get(t.domain) ?? []);
            return (
              <div key={t.domain} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900">
                      {profile?.company_name ?? t.domain}
                      <span className="ml-2 text-xs font-normal text-gray-400">{t.domain}</span>
                    </p>
                    {profile?.summary && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-3">{profile.summary}</p>
                    )}
                    {keywords.length > 0 && (
                      <p className="text-xs text-blue-600 mt-2">노출된 키워드: {keywords.join(", ")}</p>
                    )}
                  </div>
                  <CompetitorToggle domain={t.domain} tracked />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
