import { CopyAddress } from "@/components/settings/CopyAddress";
import { THREADS_REDIRECT_NEW, THREADS_REDIRECT_OLD } from "@/lib/oauthRedirect";

// 2026-10-17: 회원이 본인 Meta 앱(Threads API 액세스)에 넣어야 할 값을 메뉴 위치별로 한곳에 모아 보여준다(주소마다 복사 버튼).
// 같은 카드가 threads·threads-affiliate-poster·threads-comment-reply에 있다(INSTA 포스팅 v1.14와 같은 형식).
export function ThreadsMetaAddressSummary({ uninstallUrl, deleteUrl }: { uninstallUrl?: string; deleteUrl?: string } = {}) {
  const oldRedirect = THREADS_REDIRECT_OLD();
  const oldHost = new URL(oldRedirect).host;
  // 독립 배포본(자기 주소 운영)은 그 주소가 앱 도메인이다
  const newHost = new URL(THREADS_REDIRECT_NEW).host;
  return (
    <section className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 shadow-sm">
      <h2 className="text-sm font-bold text-neutral-900">🧭 내 Meta 앱에 등록할 주소 한눈에 보기</h2>
      <p className="mb-3 text-xs text-neutral-700 leading-relaxed">
        Meta 개발자 센터(developers.facebook.com › 내 앱)에서 아래 위치에 그대로 붙여넣고, 각 화면의 [저장]을 꼭 눌러주세요.
        <br />
        기존 주소는 지우지 말고 새 주소를 &quot;추가&quot;합니다.
      </p>
      <ol className="space-y-4 text-xs text-neutral-900">
        <li className="space-y-1.5">
          <p className="font-semibold text-neutral-900">① 앱 설정 › 기본 설정 › 앱 도메인</p>
          <CopyAddress value={newHost.endsWith("buylife.xyz") ? "buylife.xyz" : newHost} />
          {oldHost !== newHost && !oldHost.endsWith("buylife.xyz") && <CopyAddress value={oldHost} />}
        </li>
        <li className="space-y-1.5">
          <p className="font-semibold text-neutral-900">② 이용 사례 › Threads API 액세스 › 맞춤 설정 › 설정 › 리디렉션 콜백 URL</p>
          <CopyAddress value={THREADS_REDIRECT_NEW} />
          {oldRedirect !== THREADS_REDIRECT_NEW && <CopyAddress value={oldRedirect} />}
        </li>
        {(uninstallUrl || deleteUrl) && (
          <li className="space-y-1.5">
            <p className="font-semibold text-neutral-900">③ 같은 화면의 제거 콜백 URL · 삭제 콜백 URL (칸마다 주소 1개)</p>
            {uninstallUrl && (
              <>
                <p className="text-neutral-600 font-medium">제거 콜백 URL</p>
                <CopyAddress value={uninstallUrl} />
              </>
            )}
            {deleteUrl && (
              <>
                <p className="text-neutral-600 font-medium">삭제 콜백 URL</p>
                <CopyAddress value={deleteUrl} />
              </>
            )}
          </li>
        )}
        <li className="space-y-1">
          <p className="font-semibold text-neutral-900">{uninstallUrl || deleteUrl ? "④" : "③"} 이 화면에 넣을 앱 ID</p>
          <p className="text-neutral-700 leading-relaxed">
            ② 화면 맨 위의 <b>Threads 앱 ID · Threads 앱 시크릿 코드</b>를 아래 칸에 넣습니다.
            <br />
            앱 대시보드 맨 위의 &quot;앱 ID&quot;(Facebook 앱 ID)와 다른 값입니다.
          </p>
        </li>
        <li className="space-y-1">
          <p className="font-semibold text-neutral-900">{uninstallUrl || deleteUrl ? "⑤" : "④"} 본인 Threads 계정을 테스터로 추가</p>
          <p className="text-neutral-700 leading-relaxed">
            ② 화면 아래 [Threads 테스터 추가 또는 삭제]에서 본인 Threads 계정을 추가합니다.
            <br />
            그다음 Threads 앱(또는 threads.com) › 설정 › 계정 › 웹사이트 권한 › 초대에서 초대를 수락해야 연결됩니다.
          </p>
        </li>
      </ol>
    </section>
  );
}
