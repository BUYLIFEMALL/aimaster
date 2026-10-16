import { StepPreparing } from "@/components/views/StepPreparing";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() {
  return <StepPreparing eyebrow="STEP 1" title="주제·대본" intro="카테고리와 주제를 고르면 AI가 인트로·카드·아웃트로 대본을 만듭니다." items={["카테고리·세부 주제 칩으로 쇼츠 주제 8개 추천", "내 키워드·참고 문서(기사·자료)를 근거로 대본 작성", "톤 5종 × 형식 5종(리스트·하우투·꿀팁·비교·스토리), 카드 3~8장", "내 대본을 한 줄씩 장면으로 바꾸기, 카테고리별 내 작성 지침"]} />;
}
