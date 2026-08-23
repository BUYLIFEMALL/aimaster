import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SeedForm } from "@/components/seeds/SeedForm";
import { SeedRow, type SeedRowData } from "@/components/seeds/SeedRow";

export const dynamic = "force-dynamic";
// SerpApi + GPT 3단계(연관 키워드 → 롱테일 확장 → 작업 지시 메시지)를 한 번에 처리하는
// "지금 확장하기" 서버 액션이 기본 함수 제한 시간보다 오래 걸릴 수 있어 넉넉하게 잡아둔다.
export const maxDuration = 120;

export default async function SeedsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: seeds }, { data: runs }] = await Promise.all([
    supabase
      .from("longtail_seed_keywords")
      .select("id, keyword, engine, is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("longtail_runs").select("seed_id").eq("user_id", user.id),
  ]);

  const countBySeed = new Map<string, number>();
  for (const r of runs ?? []) {
    countBySeed.set(r.seed_id, (countBySeed.get(r.seed_id) ?? 0) + 1);
  }

  const seedList: SeedRowData[] = (seeds ?? []).map((s) => ({
    id: s.id,
    keyword: s.keyword,
    engine: s.engine,
    is_active: s.is_active,
    runCount: countBySeed.get(s.id) ?? 0,
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">롱테일 키워드 확장</h1>
        <p className="text-sm text-gray-500 mt-1">
          키워드를 등록하고 "지금 확장하기"를 누르면 네이버(또는 구글) 검색결과를 기반으로
          연관·롱테일 키워드와 블로그 작업 지시를 만들어드립니다.
        </p>
      </div>

      <div className="mb-6">
        <SeedForm />
      </div>

      {seedList.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🧩</div>
          <p>아직 등록한 키워드가 없습니다. 위에서 키워드를 추가해보세요!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {seedList.map((s) => (
            <SeedRow key={s.id} seed={s} />
          ))}
        </div>
      )}
    </div>
  );
}
