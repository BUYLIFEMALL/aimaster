import { WriteView } from "@/components/views/WriteView";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page({ searchParams }: { searchParams: Promise<{ research?: string; draft?: string }> }) { const sp = await searchParams; return <><div className="page-heading"><p className="eyebrow">STEP 6</p><h1>글 작성</h1><p>승인한 자료와 내 블로그 스타일로 제목·구성을 만들고, 구간별로 초안을 씁니다. 중간에 멈춰도 쓴 구간은 저장됩니다.</p></div><WriteView researchId={sp.research ?? ""} draftId={sp.draft ?? ""} /></>; }
