import { LoopTool } from "@/components/tool/LoopTool";

export default function StudioPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-neutral-900">무한루프 영상자동화</h1>
      <p className="mb-6 text-sm text-neutral-500">영상에서 가장 자연스럽게 이어지는 구간을 찾아, 끝없이 반복되는 영상으로 만들어 드립니다.</p>
      <LoopTool />
    </div>
  );
}
