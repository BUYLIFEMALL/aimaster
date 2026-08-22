import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { KeywordForm } from "@/components/keywords/KeywordForm";
import { KeywordRow, type KeywordRowData } from "@/components/keywords/KeywordRow";

export const dynamic = "force-dynamic";
// SerpApi + 여러 도메인 경쟁사 리서치(Perplexity+GPT) + 최종 GPT 분석까지 한 번에 처리하는
// "지금 분석하기" 서버 액션이 기본 함수 제한 시간보다 오래 걸릴 수 있어 넉넉하게 잡아둔다.
export const maxDuration = 120;

export default async function KeywordsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: keywords }, { data: analyses }] = await Promise.all([
    supabase
      .from("competitor_keywords")
      .select("id, keyword, location, is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("competitor_analyses").select("keyword_id").eq("user_id", user.id),
  ]);

  const countByKeyword = new Map<string, number>();
  for (const a of analyses ?? []) {
    countByKeyword.set(a.keyword_id, (countByKeyword.get(a.keyword_id) ?? 0) + 1);
  }

  const keywordList: KeywordRowData[] = (keywords ?? []).map((k) => ({
    id: k.id,
    keyword: k.keyword,
    location: k.location,
    is_active: k.is_active,
    analysisCount: countByKeyword.get(k.id) ?? 0,
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">키워드 분석</h1>
        <p className="text-sm text-gray-500 mt-1">
          키워드를 등록하고 "지금 분석하기"를 누르면 구글 검색결과를 기반으로 경쟁사와 콘텐츠
          전략을 분석해드립니다.
        </p>
      </div>

      <div className="mb-6">
        <KeywordForm />
      </div>

      {keywordList.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🔎</div>
          <p>아직 등록한 키워드가 없습니다. 위에서 키워드를 추가해보세요!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keywordList.map((k) => (
            <KeywordRow key={k.id} keyword={k} />
          ))}
        </div>
      )}
    </div>
  );
}
