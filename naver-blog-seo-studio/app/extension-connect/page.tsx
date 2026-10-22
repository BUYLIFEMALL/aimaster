import { redirect } from "next/navigation";
import { checkProgramAccessApi, PROGRAM_SLUG } from "@/lib/access";
import ExtensionConnectButton from "@/app/settings/ExtensionConnectButton";
import { StudioSidebar } from "@/components/studio/StudioSidebar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 2026-10-23: 확장 사이드패널 「자동 연결」 버튼이 여는 화면. 로그인 → 연결 코드 자동 발급 → 확장에 전달 → 확장이 탭을 닫는다.
export default async function ExtensionConnectPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const auto = from === "extension";
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    if (access.status === 401) redirect(`/login?redirect=${encodeURIComponent(`/extension-connect${auto ? "?from=extension" : ""}`)}`);
    redirect(`https://www.buylife.xyz/programs/${PROGRAM_SLUG}`);
  }
  return (
    <main className="settings-layout">
      <StudioSidebar email={access.user.email ?? ""} active="settings" />
      <section className="settings-card">
        <div className="eyebrow">Chrome 확장</div>
        <h1>확장 프로그램 연결</h1>
        <p className="lede">버튼 한 번으로 이 계정 전용 연결 코드를 만들어 이 브라우저의 SEO 스튜디오 확장에 바로 넣습니다. 코드를 복사하거나 붙여 넣을 필요가 없습니다.</p>
        <ExtensionConnectButton auto={auto} />
      </section>
    </main>
  );
}
