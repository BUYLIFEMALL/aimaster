import { StepPreparing } from "@/components/views/StepPreparing";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() {
  return <StepPreparing eyebrow="STEP 5" title="발행 계획" intro="채널 단계와 분야에 맞춘 업로드 일정을 만들고 여러 편을 이어서 제작합니다." items={["채널 단계별 전략과 날짜별 업로드 일정", "분야별 추천 업로드 시간대", "일정의 주제 여러 개를 골라 순서대로 일괄 제작"]} />;
}
