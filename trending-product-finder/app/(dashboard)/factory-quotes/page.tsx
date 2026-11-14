import { PageHero } from "@/components/ui/PageHero";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { listFactoryProjectsAction } from "@/lib/actions/factoryQuotes";
import { FactoryQuoteStudio } from "@/components/factory/FactoryQuoteStudio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  { title: "상품 이름", desc: "비교할 상품 이름을 적습니다(예: 접이식 캠핑의자)." },
  { title: "견적·대화 넣기", desc: "공장 견적서 PDF·CSV, 위챗 대화 캡처를 끌어다 놓거나 대화를 복사해 붙여 넣습니다." },
  { title: "AI 비교표 만들기", desc: "내 Claude 키로 1번 읽어 공장별 MOQ·단가·샘플비·기간·결제 조건을 한 표로 정리합니다." },
  { title: "질문 보내고 마진 계산", desc: "다음 질문(한·영·중)을 복사해 공장에 보내고, 고른 공장 단가로 「마진 계산 →」을 엽니다." },
];

export default async function FactoryQuotesPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const [registered, { projects, error }] = await Promise.all([getRegisteredProviders(supabase, user.id), listFactoryProjectsAction()]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        badge="🏭 공장 견적 비교"
        title="해외 공장 견적과 위챗 대화를 한 표로"
        description="여러 공장에서 받은 견적서와 대화를 AI가 읽어 공장별 조건 비교표, 아직 확인 안 된 점, 답을 못 받은 질문, 다음에 보낼 질문(한국어·영어·중국어)을 만들어 줍니다."
        tip="원본 파일은 저장하지 않고 분석에만 씁니다. 붙여 넣은 대화와 결과는 내 계정에 30일 보관됩니다."
      />

      <section className="mx-card p-5">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-lg bg-mx-raised p-3">
              <p className="text-xs font-bold text-mx-text">
                {i + 1}. {s.title}
              </p>
              <p className="mt-1 text-[11px] text-mx-muted">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <FactoryQuoteStudio initialProjects={projects} loadError={error ?? ""} hasClaudeKey={registered.has("anthropic")} />
    </div>
  );
}
