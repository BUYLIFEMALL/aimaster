import { MovedNotice } from "@/components/MovedNotice";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 2026-10-21 병합 A(v1.11): 바나나 캔버스로 옮겨져 이동 안내만 보여 준다.
export default function Page() { return <MovedNotice mode="compose"/>; }
