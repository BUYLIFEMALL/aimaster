import { MovedNotice } from "@/components/MovedNotice";

// 2026-10-23 병합 A(v1.11): 모든 화면(대시보드·키워드·결과·설정·매뉴얼)은 키워드·경쟁사 분석으로 옮겨졌다는 안내만 보여 준다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DashboardLayout() {
  return <MovedNotice />;
}
