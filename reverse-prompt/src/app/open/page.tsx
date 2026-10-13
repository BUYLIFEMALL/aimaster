import { redirect } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 프로그램 진입점: 로그인·이용 권한을 확인한 뒤 분석 화면으로 보낸다. */
export default async function OpenPage() {
  await requireProgramAccess();
  redirect("/analyze");
}
