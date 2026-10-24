import ComingSoonPage from "@/components/ComingSoonPage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function Page() {
  return <ComingSoonPage active="delivery" icon="📨" title="받는 방법" desc="회원님 본인 텔레그램 봇으로 요약과 엑셀 파일을 받고, 파일 형식을 고릅니다." />;
}
