import { ResearchView } from "@/components/views/ResearchView";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page({ searchParams }: { searchParams: Promise<{ keyword?: string }> }) { const sp = await searchParams; return <><div className="page-heading"><p className="eyebrow">STEP 5</p><h1>글 작성 준비</h1><p>검색어를 고르고 그 검색어의 상위 글 5개를 확보해, 근거가 확인된 사전 지식만 정리합니다. 확인·승인한 자료로 초안을 씁니다.</p></div><ResearchView initialKeyword={(sp.keyword ?? "").slice(0, 40)} /></>; }
