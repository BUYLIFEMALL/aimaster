import { CreateStudio } from "@/components/studio/CreateStudio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function CreatePage({ searchParams }: { searchParams: { from?: string } }) {
  // ?from=<생성 기록 id> — 갤러리 「이 설정으로 다시 만들기」(v1.11). 다른 기록을 고르면 화면을 새로 그린다
  const from = typeof searchParams.from === "string" && /^[0-9a-f-]{36}$/i.test(searchParams.from) ? searchParams.from : null;
  return <CreateStudio key={from ?? "new"} fromId={from} />;
}
