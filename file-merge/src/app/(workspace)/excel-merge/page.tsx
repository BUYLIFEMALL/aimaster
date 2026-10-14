import { ExcelMerge } from "@/components/files/ExcelMerge";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function Page() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">1 · 엑셀 합치기</p>
        <h1>엑셀 합치기</h1>
        <p>여러 엑셀·CSV 파일을 머리글 이름 기준으로 한 표에 이어 붙이거나, 시트를 한 파일에 모읍니다. 파일은 서버로 보내지 않고 이 브라우저 안에서만 처리합니다.</p>
      </div>
      <ExcelMerge />
    </>
  );
}
