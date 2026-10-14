import { TextSplit } from "@/components/files/TextSplit";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function Page() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">4 · 텍스트 나누기</p>
        <h1>텍스트 나누기</h1>
        <p>긴 텍스트를 글자 수·조각 수·문장 수 기준으로 문단과 문장을 지키며 나눠 ZIP으로 저장합니다. 파일은 서버로 보내지 않고 이 브라우저 안에서만 처리합니다.</p>
      </div>
      <TextSplit />
    </>
  );
}
