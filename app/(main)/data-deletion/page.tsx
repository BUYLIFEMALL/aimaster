import GlassCard from "@/components/ui/GlassCard";

export const metadata = { title: "데이터 삭제 안내 (Data Deletion Instructions)" };

export default function DataDeletionPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const code = typeof searchParams.code === "string" ? searchParams.code.slice(0, 64) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white mb-2">데이터 삭제 안내</h1>
        <p className="text-subtext text-sm">Data Deletion Instructions — AI Master (buylife.xyz)</p>
      </div>

      {code && (
        <GlassCard>
          <p className="text-white text-sm font-bold mb-1">삭제 요청이 접수되어 처리되었습니다.</p>
          <p className="text-subtext text-sm">
            확인 코드 (Confirmation code): <span className="font-mono text-white">{code}</span>
          </p>
          <p className="text-subtext text-xs mt-2">
            Your data deletion request has been received and processed. Contact buylifemall@gmail.com with this code
            for any questions.
          </p>
        </GlassCard>
      )}

      <GlassCard>
        <div className="text-subtext text-sm leading-relaxed space-y-4">
          <section>
            <h2 className="text-white font-bold mb-1">1. 외부 계정 연동으로 저장되는 정보</h2>
            <p>
              Threads·Instagram 등 Meta 계정을 연동하면 서비스는 연동 계정 식별자(사용자 ID·아이디), 게시·검색에
              필요한 액세스 토큰, 이용자가 검색·저장한 게시글 내용과 이용자가 작성·게시한 게시글을 저장합니다.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-1">2. 직접 삭제하는 방법</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                각 프로그램의 <b>API키등록·플랫폼연동</b> 메뉴에서 <b>연결 해제</b>를 누르면 저장된 액세스 토큰과
                연동 계정 정보가 즉시 삭제됩니다.
              </li>
              <li>보관함·게시글 관리 화면에서 저장한 게시글을 개별 삭제할 수 있습니다.</li>
              <li>
                Threads 앱의 <b>설정 → 계정 → 웹사이트 권한</b>에서 이 앱을 제거하면, 서비스가 Meta로부터 알림을 받아
                연동 정보(토큰)를 자동으로 삭제합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-1">3. 전체 데이터 삭제 요청</h2>
            <p>
              회원 탈퇴 또는 전체 데이터 삭제를 원하시면 가입 이메일로 <b>buylifemall@gmail.com</b>에 요청해 주세요.
              본인 확인 후 지체 없이(최대 30일 이내) 삭제하며, 관계 법령에 따라 보관이 필요한 거래 기록은
              개인정보처리방침에 정한 기간 동안만 보관 후 파기합니다.
            </p>
          </section>

          <hr className="border-white/10" />

          <section className="space-y-2">
            <h2 className="text-white font-bold">English</h2>
            <p>
              When you connect a Meta account (Threads, Instagram), we store your account identifier (user ID and
              username), the access token required for publishing and search, post content you search for or save, and
              posts you create or publish through the service.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Click <b>Disconnect</b> in the program&apos;s &ldquo;API키등록·플랫폼연동&rdquo; (API keys &amp;
                platform connection) menu to immediately delete the stored access token and account information.
              </li>
              <li>You can delete saved or created posts individually from the bookmarks and posts pages.</li>
              <li>
                Removing this app in Threads (Settings → Account → Website permissions) notifies us and automatically
                deletes your connection data and token.
              </li>
              <li>
                To delete all of your data or your account, email <b>buylifemall@gmail.com</b> from your registered
                address. We delete it without delay and within 30 days at most.
              </li>
            </ul>
          </section>
        </div>
      </GlassCard>
    </div>
  );
}
