import { PageHero } from "@/components/ui/PageHero";
import { ExcelSplit } from "@/components/files/ExcelSplit";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function Page() {
  return (
    <>
      <PageHero
        badge="✂️ STEP 2 · 엑셀 나누기"
        title="엑셀 나누기"
        description="엑셀 파일을 시트별, 특정 열 값별(예: 지역별), 또는 N행씩 여러 파일로 나눠 ZIP으로 저장합니다. 파일은 서버로 보내지 않고 이 브라우저 안에서만 처리합니다."
      />
      <ExcelSplit />
    </>
  );
}
