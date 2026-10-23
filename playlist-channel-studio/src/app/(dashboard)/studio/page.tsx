import { StudioWorkspace } from "@/components/studio/StudioWorkspace";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  // key를 프로젝트 id로 두면 다른 프로젝트로 이동할 때 상태가 깨끗이 초기화된다
  return <StudioWorkspace key={p ?? "new"} projectId={p && /^[0-9a-f-]{36}$/i.test(p) ? p : undefined} />;
}
