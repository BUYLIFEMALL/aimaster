// AIMaster 공통 좌측 메뉴 규격(docs/SIDEBAR_LAYOUT_STANDARD.md)을 원본 litpage 좌측 메뉴에 넣는 부분.
//  - 맨 위: ← 다른 프로그램 보기(메인 사이트 카탈로그 고정) + 프로그램 이름·버전
//  - 메뉴 목록 끝(마지막 메뉴 바로 아래): 📖 연동 & 사용 매뉴얼, 계정 이메일, 로그아웃
import { useSession } from '../../lib/store/session.ts';
import { useCurrentUser } from '../../lib/hooks.ts';
import './aimaster.css';

const PROGRAMS_URL = 'https://www.buylife.xyz/programs';
export const AIMASTER_APP_NAME = 'AI 업무 워크스페이스 자동화';
export const AIMASTER_APP_VERSION = 'v1.04';

export function AimasterSidebarTop() {
  return (
    <div className="aww-sb-top">
      <a className="aww-sb-back" href={PROGRAMS_URL}>
        ← 다른 프로그램 보기
      </a>
      <div className="aww-sb-title">
        <span className="aww-sb-name">{AIMASTER_APP_NAME}</span>
        <span className="aww-sb-version">{AIMASTER_APP_VERSION}</span>
      </div>
    </div>
  );
}

export function AimasterSidebarBottom() {
  const user = useCurrentUser() as { email?: string } | undefined;
  const email = user?.email || (typeof document !== 'undefined' ? document.getElementById('lit-app')?.dataset.memberEmail : '') || '';
  return (
    <div className="aww-sb-bottom">
      <a className="nc-sb-row aww-sb-guide" href="/guide">
        <div className="nc-sb-row-inner">
          <div className="nc-sb-row-icon" aria-hidden>
            📖
          </div>
          <div className="nc-sb-row-label">연동 & 사용 매뉴얼</div>
        </div>
      </a>
      <div className="aww-sb-account">
        <span className="aww-sb-email" title={email}>
          {email}
        </span>
        <button type="button" className="aww-sb-logout" onClick={() => void useSession.getState().logout()}>
          로그아웃
        </button>
      </div>
    </div>
  );
}
