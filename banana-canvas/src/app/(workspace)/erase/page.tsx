import { FreeEraseBoard } from "@/components/erase/FreeEraseBoard";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function ErasePage() {
  return (
    <>
      <div className="page-heading">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="brand-3d-badge text-[11px] py-0.5 px-2.5">
            ⚡ 0원 초고속 AI
          </span>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            브라우저 로컬 연산 (WebGPU / WASM)
          </span>
        </div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
          <span>🧼</span>
          <span>AI 매직 지우개</span>
        </h1>
        <p className="text-stone-600 text-[13px] leading-relaxed mt-1">
          사진 속 불필요한 글자, 워터마크, 잡티를 브러시로 칠하거나 <strong>「문구 찾기」</strong>로 자동 감지하여 1초 만에 흔적 없이 지웁니다. 외부 API 키나 비용이 일절 발생하지 않으며, 사진이 외부 서버로 전송되지 않아 프라이버시가 안전하게 보호됩니다.
        </p>
      </div>
      <FreeEraseBoard />
    </>
  );
}
