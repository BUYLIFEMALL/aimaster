import { requireProgramAccess } from "@/lib/access";
import { FeeCalculator } from "@/components/desk/FeeCalculator";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// D5(2026-11-03, v1.06): 중개보수 계산기 — 계산은 화면에서만(저장·외부 호출 없음).
export default async function FeePage({ searchParams }: { searchParams: Promise<{ kind?: string; deal?: string; price?: string; monthly?: string }> }) {
  await requireProgramAccess();
  const sp = await searchParams;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHero badge="💰 중개보수 계산기" title="중개보수 상한 계산" description="거래 종류와 금액을 넣으면 법정 상한요율과 한도로 중개보수를 바로 계산해요. 월세는 보증금 + 월세×100(5천만 원 미만이면 ×70)으로 거래금액을 잡아요." />
      <FeeCalculator initial={sp} />
    </div>
  );
}
