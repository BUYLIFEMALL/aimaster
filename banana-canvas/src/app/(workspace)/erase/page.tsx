import { FreeEraseBoard } from "@/components/erase/FreeEraseBoard";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function ErasePage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">무료 · 내 PC에서 처리</p>
        <h1>🧽 무료 지우기</h1>
        <p>사진 속 글자·작은 물체를 칠하거나 「문구 찾기」로 자동으로 골라 지웁니다. API 키와 비용 없이 내 브라우저에서 계산하고, 사진은 서버에 올라가지 않습니다. 넓은 부분을 새로 그리거나 더 높은 품질이 필요하면 스튜디오의 「AI로 다시 그리기(부분 삭제)」를 쓰세요.</p>
      </div>
      <FreeEraseBoard />
    </>
  );
}
