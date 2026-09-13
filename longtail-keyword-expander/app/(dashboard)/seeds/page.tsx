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

  const [{ data: seeds }, { data: runs }, { data: program }] = await Promise.all([
    supabase
      .from("longtail_seed_keywords")
      .select("id, keyword, engine, is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("longtail_runs").select("seed_id").eq("user_id", user.id),
    // 이 프로젝트는 별도 "대시보드" 화면이 없어 이 페이지가 사실상 첫 화면이다 — 요청대로
    // 첫 화면 제목 바로 아래에 메인 페이지 프로그램 소개(programs.short_desc — 이 프로그램은
    // description이 비어있어 short_desc로 대체)를 박스로 보여준다(2026-09-13).
    // AIMaster Database 타입에는 없는 테이블이라(access.ts와 동일한 이유) 제네릭 타입 충돌을
    // 피하기 위해 from()을 느슨한 타입으로 캐스팅한다.
    (supabase as unknown as { from: (table: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from("programs")
      .select("description, short_desc")
      .eq("slug", "longtail-keyword-expander")
      .maybeSingle() as Promise<{ data: { description: string | null; short_desc: string | null } | null }>,
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

      {(program?.description || program?.short_desc) && (
        <div className="mb-6 rounded-2xl border-2 border-gray-200 bg-gray-100 p-5 shadow-sm">
          {program.description ? (
            <div
              className="text-sm leading-relaxed text-gray-700 [&_p]:mb-2 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: program.description }}
            />
          ) : (
            <p className="text-sm leading-relaxed text-gray-700">{program.short_desc}</p>
          )}
        </div>
      )}

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
