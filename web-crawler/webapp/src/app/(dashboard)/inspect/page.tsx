import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { PageHero } from "@/components/ui/PageHero";
import { InspectWorkspace } from "@/components/inspect/InspectWorkspace";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 「🔎 한 페이지 분석」(2026-10-21 병합 A — 옛 Website Scraper 기능)
export default async function InspectPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const providers = [...(await getRegisteredProviders(supabase, user.id))];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHero
        badge="🔎 한 페이지 분석 · 옛 Website Scraper"
        title="페이지 하나를 바로 해부하고 표로"
        description="주소를 넣으면 제목·소제목·본문 목록·표·링크·이미지·메타데이터를 탭으로 나눠 보여 줍니다. 화면에서 원하는 영역을 직접 눌러 그 부분만 가져오고, 반복 목록은 본인 AI 키로 순번·제목·링크·썸네일 표로 정리해 CSV·이미지 ZIP으로 받습니다."
        tip="공개 페이지만 분석합니다. 로그인이 필요하거나 화면을 그린 뒤 내용을 불러오는 사이트는 일부만 보일 수 있어요. 여러 페이지를 반복 수집하려면 「새 작업 만들기」를 쓰세요."
      />
      <InspectWorkspace providers={providers} />
    </div>
  );
}
