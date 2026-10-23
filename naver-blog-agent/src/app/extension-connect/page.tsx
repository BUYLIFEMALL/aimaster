import { redirect } from "next/navigation";
import { checkProgramAccessApi } from "@/lib/access";
import { ExtensionConnectButton } from "@/components/extension/ExtensionConnectButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 2026-10-23: 확장 팝업 「자동 연결」 버튼이 여는 화면. 로그인 → 블로그 선택(하나면 자동) → 연결 번호 자동 발급 → 확장에 전달 → 확장이 탭을 닫는다.
// 대시보드 레이아웃은 로그인 뒤 항상 /dashboard로 돌아가므로, 이 화면은 그 밖에 두고 권한을 직접 확인한다.
export default async function ExtensionConnectPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const auto = from === "extension";
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    if (access.status === 401) redirect(`/login?redirect=${encodeURIComponent(`/extension-connect${auto ? "?from=extension" : ""}`)}`);
    redirect("https://www.buylife.xyz/programs/naver-blog-agent");
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900">확장 프로그램 연결</h1>
      <p className="mt-2 mb-6 text-sm text-neutral-500">
        등록한 네이버 블로그를 고르면 연결 번호가 자동으로 만들어져 이 브라우저의 블로그 에이전트 확장에 바로 연결됩니다. 번호를 복사하거나 입력할 필요가 없습니다.
      </p>
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <ExtensionConnectButton auto={auto} />
      </section>
    </main>
  );
}
