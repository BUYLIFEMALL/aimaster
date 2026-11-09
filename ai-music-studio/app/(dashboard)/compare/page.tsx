import { CreateStudio } from "@/components/studio/CreateStudio";
import { presetFromFmsParam } from "@/lib/fmsPreset";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 무료음악 백로그 D-11(2026-11-09): ?fms=<무료음악 초안 번호>면 같은 제목·스타일·가사로 미리 채운다(자동 생성 없음)
export default async function ComparePage({ searchParams }: { searchParams: { fms?: string } }) {
  const preset = await presetFromFmsParam(searchParams.fms);
  return <CreateStudio key={preset ? `fms-${searchParams.fms}` : "new"} mode="compare" preset={preset} />;
}
