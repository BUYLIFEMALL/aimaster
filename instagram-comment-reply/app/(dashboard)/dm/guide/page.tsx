import { redirect } from "next/navigation";

// 2026-10-20 v1.24 — DM 매뉴얼은 통합 매뉴얼(/guide)로 합쳐졌다. 예전 주소·북마크는 그쪽으로 보낸다.
export default function DmGuideRedirect() {
  redirect("/guide");
}
