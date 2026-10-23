import { ReviewView } from "@/components/views/ReviewView";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page({ searchParams }: { searchParams: Promise<{ draft?: string }> }) { const sp = await searchParams; return <><div className="page-heading"><p className="eyebrow">STEP 7</p><h1>최종 검수</h1><p>보관한 초안을 6개 영역에서 점검하고 직접 수정합니다. 필수 수정이 없을 때 별도 최종본으로 저장합니다(원래 초안은 유지).</p></div><ReviewView draftId={sp.draft ?? ""} /></>; }
