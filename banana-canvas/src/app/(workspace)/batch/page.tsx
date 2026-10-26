import { BatchPhotoBoard } from "@/components/batch/BatchPhotoBoard";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function BatchPage() {
  return (
    <>
      <div className="page-heading">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="brand-3d-badge text-[11px] py-0.5 px-2.5">🛒 쇼핑몰 사진 준비</span>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            브라우저에서 처리 · 0원
          </span>
        </div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
          <span>🖼</span>
          <span>사진 일괄 손질</span>
        </h1>
        <p className="text-stone-600 text-[13px] leading-relaxed mt-1">
          상품 사진 여러 장의 <strong>세로 높이를 맞추고</strong>, <strong>로고·문자 워터마크</strong>를 같은 자리에 넣고, <strong>촬영 정보·위치 정보</strong>를 지워 한 번에 받습니다. 사진은 외부 서버로 전송되지 않습니다.
        </p>
      </div>
      <BatchPhotoBoard />
    </>
  );
}
