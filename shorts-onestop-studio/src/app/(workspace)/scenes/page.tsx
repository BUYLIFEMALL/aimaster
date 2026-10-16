import { StepPreparing } from "@/components/views/StepPreparing";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() {
  return <StepPreparing emoji="🎬" eyebrow="STEP 3" title="장면 편집" intro="인트로·카드·아웃트로를 고치고 바로 미리보기로 확인합니다." items={["장면별 제목·짧은 설명·내레이션 편집", "끌어서 순서 바꾸기·복제·추가(3~8장)", "세이프에어리어(유튜브 화면 가림 영역) 표시", "움직임까지 재생되는 미리보기"]} />;
}
