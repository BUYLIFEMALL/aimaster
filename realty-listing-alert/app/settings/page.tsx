import { requireProgramAccess, PROGRAM_SLUG } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import ExtensionTokenManager from "./ExtensionTokenManager";
import ExtensionConnectButton from "./ExtensionConnectButton";
import ExtensionDownloadCard from "./ExtensionDownloadCard";
import { StudioSidebar } from "@/components/studio/StudioSidebar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// API키등록·플랫폼연동(표준 메뉴명). 1단계: 확장 연결·다운로드. 텔레그램·이메일 연결은 2단계 「받는 방법」에서.
export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: tokens } = await supabase.from("personal_access_tokens").select("id, label, created_at, last_used_at").eq("user_id", user.id).eq("program_slug", PROGRAM_SLUG).is("revoked_at", null).order("created_at", { ascending: false });

  return (
    <main className="settings-layout">
      <StudioSidebar email={user.email ?? ""} active="settings" />
      <section className="settings-card">
        <div className="eyebrow">Settings</div>
        <h1>API키등록·플랫폼연동</h1>
        <p className="lede">이 프로그램은 AI 키 없이 동작합니다. 크롬 확장을 이 계정에 연결하고, 텔레그램은 「받는 방법」에서 회원님 본인 봇으로 연결합니다.</p>
        <div className="settings-divider" />
        <h2>Chrome 확장 연결</h2>
        <p className="lede">확장을 설치한 이 브라우저에서 아래 버튼을 누르면 연결 코드가 자동으로 만들어져 확장에 바로 연결됩니다. 다른 자동화 프로그램의 연결 코드와 따로 관리됩니다.</p>
        <ExtensionConnectButton />
        <p className="token-manual-title">직접 입력용 코드 발급 · 연결된 코드 목록</p>
        <ExtensionTokenManager initialTokens={tokens ?? []} />
        <ExtensionDownloadCard />
        <div className="guide-box"><strong>📖 연동 매뉴얼</strong><p>확장 설치·텔레그램 봇 만들기·감시 대상·예약 순서는 매뉴얼에 그림과 함께 정리돼 있습니다.</p><div className="guide-links"><a href="/guide">연동 & 사용 매뉴얼 열기</a><a href="https://core.telegram.org/bots/tutorial" target="_blank" rel="noreferrer">텔레그램 봇 공식 안내</a></div></div>
      </section>
    </main>
  );
}
