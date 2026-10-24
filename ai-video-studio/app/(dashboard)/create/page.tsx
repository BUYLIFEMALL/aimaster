import { CreateStudio } from "@/components/studio/CreateStudio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function CreatePage({ searchParams }: { searchParams: { from?: string; preset?: string; mine?: string } }) {
  // ?from=<생성 기록 id> — 갤러리 「이 설정으로 다시 만들기」(v1.11). 다른 기록을 고르면 화면을 새로 그린다
  const from = typeof searchParams.from === "string" && /^[0-9a-f-]{36}$/i.test(searchParams.from) ? searchParams.from : null;
  // ?preset=<게시판 id> — 영상 프롬프트 게시판 「이 설명으로 만들기」(v1.14)
  const preset = typeof searchParams.preset === "string" && /^[a-z0-9-]{3,60}$/.test(searchParams.preset) ? searchParams.preset : null;
  // ?mine=<내 프롬프트 id> — 게시판 「내 프롬프트」 탭(v1.19, 본인만)
  const mine = typeof searchParams.mine === "string" && /^[0-9a-f-]{36}$/i.test(searchParams.mine) ? searchParams.mine : null;
  return <CreateStudio key={from ?? preset ?? mine ?? "new"} fromId={from} presetId={preset} mineId={mine} />;
}
