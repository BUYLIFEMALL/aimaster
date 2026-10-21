import { MovedNotice } from "@/components/MovedNotice";

// 2026-10-21 병합 B(v1.09): 모든 화면(작업실·매뉴얼·설정)은 AI 글쓰기 에디터로 옮겨졌다는 안내만 보여 준다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DashboardLayout() {
  return <MovedNotice />;
}
