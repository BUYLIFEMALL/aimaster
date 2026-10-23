import { KeywordsView } from "@/components/views/KeywordsView";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() { return <><div className="page-heading"><p className="eyebrow">STEP 2</p><h1>내 블로그에 맞는 다음 키워드</h1><p>주제와 내 블로그 스타일로 후보를 찾고, 네이버 공식 수치(월간 검색량·블로그 문서수)로 검증해 보관합니다.</p></div><KeywordsView /></>; }
