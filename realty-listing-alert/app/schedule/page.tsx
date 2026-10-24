import ComingSoonPage from "@/components/ComingSoonPage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function Page() {
  return <ComingSoonPage active="schedule" icon="⏰" title="예약 설정" desc="예약 켜기/끄기, 수집 간격(10분~24시간), 동작 시간대를 정합니다. 10~50분은 계정 제한 위험 경고가 함께 나옵니다." />;
}
