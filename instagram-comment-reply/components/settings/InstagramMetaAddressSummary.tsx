import { CopyAddress } from "@/components/settings/CopyAddress";
import { INSTAGRAM_REDIRECT_NEW, INSTAGRAM_REDIRECT_OLD } from "@/lib/oauthRedirect";

// 2026-10-17: 회원이 본인 Meta 앱(Instagram 로그인 API)에 넣어야 할 값을 메뉴 위치별로 한곳에 모아 보여준다(주소마다 복사 버튼).
// 같은 카드가 instagram-comment-reply·instagram-dm-reply에 있다(INSTA 포스팅 v1.14와 같은 형식). DM은 웹훅 주소를 함께 넘긴다.
export function InstagramMetaAddressSummary({ webhookUrl }: { webhookUrl?: string } = {}) {
  const oldRedirect = INSTAGRAM_REDIRECT_OLD();
  const oldHost = new URL(oldRedirect).host;
  let n = 0;
  const no = () => "①②③④⑤⑥"[n++];
  return (
    <div className="rounded-2xl border-2 border-ig-primary/30 bg-ig-primary/10 p-4 shadow-sm">
      <h2 className="text-sm font-bold text-ig-text">🧭 내 Meta 앱에 등록할 주소 한눈에 보기</h2>
      <p className="mb-3 text-xs text-ig-muted">
        Meta 개발자 센터(developers.facebook.com › 내 앱)에서 아래 위치에 그대로 붙여넣고, 각 화면의 [저장]을 꼭 눌러주세요.
        <br />
        기존 주소는 지우지 말고 새 주소를 &quot;추가&quot;합니다.
      </p>
      <ol className="space-y-4 text-xs text-ig-text">
        <li className="space-y-1.5">
          <p className="font-semibold">{no()} 앱 설정 › 기본 설정 › 앱 도메인</p>
          <CopyAddress value="buylife.xyz" />
          {!oldHost.endsWith("buylife.xyz") && <CopyAddress value={oldHost} />}
        </li>
        <li className="space-y-1.5">
          <p className="font-semibold">
            {no()} 이용 사례 › 맞춤 설정 › Instagram 로그인이 포함된 API 설정 › 4. Instagram 비즈니스 로그인 설정 › OAuth 리디렉션 URI
          </p>
          <CopyAddress value={INSTAGRAM_REDIRECT_NEW} />
          {oldRedirect !== INSTAGRAM_REDIRECT_NEW && <CopyAddress value={oldRedirect} />}
        </li>
        {webhookUrl && (
          <li className="space-y-1.5">
            <p className="font-semibold">{no()} (DM 답변을 쓸 때) 같은 화면의 웹훅 구성 단계 › 콜백 URL (주소 1개만 등록)</p>
            <CopyAddress value={webhookUrl} />
            <p className="text-ig-muted">
              확인 토큰과 구독할 항목(messages)은 <a href="/dm/settings" className="font-semibold text-ig-link underline">DM 답변 설정 › 🔌 DM 웹훅 설정</a>에 있습니다.
            </p>
          </li>
        )}
        <li className="space-y-1">
          <p className="font-semibold">{no()} 이 화면에 넣을 앱 ID</p>
          <p>
            ② 화면 맨 위의 <b>Instagram 앱 ID · Instagram 앱 시크릿 코드</b>를 아래 칸에 넣습니다.
            <br />
            앱 대시보드 맨 위의 &quot;앱 ID&quot;(Facebook 앱 ID)를 넣으면 &quot;Invalid platform app&quot; 오류가 납니다.
          </p>
        </li>
        <li className="space-y-1">
          <p className="font-semibold">{no()} 본인 인스타그램 계정을 테스터로 추가</p>
          <p>
            앱 역할 › 역할에서 본인 인스타그램(비즈니스·크리에이터) 계정을 Instagram 테스터로 추가합니다.
            <br />
            그다음 인스타그램 › 설정 › 웹사이트 권한 › 앱 및 웹사이트 › 테스터 초대에서 수락해야 연결됩니다.
          </p>
        </li>
      </ol>
    </div>
  );
}
