import { TextMerge } from "@/components/files/TextMerge";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function Page() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">3 · 텍스트 합치기</p>
        <h1>텍스트 합치기</h1>
        <p>여러 텍스트 파일을 원하는 순서와 구분자로 한 파일에 합칩니다. 파일은 서버로 보내지 않고 이 브라우저 안에서만 처리합니다.</p>
      </div>
      <TextMerge />
    </>
  );
}
