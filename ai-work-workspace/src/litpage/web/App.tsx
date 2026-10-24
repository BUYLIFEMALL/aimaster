// Root: auth gate → login/onboarding or the workspace shell; global overlay/tooltip/toast layers.
import { useEffect } from 'react';
import { useSession } from './lib/store/session.ts';
import { navigate, useLocation } from './lib/router.ts';
import { OverlayRoot } from './components/overlay.tsx';
import { TooltipLayer } from './components/Tooltip.tsx';
import { ToastLayer } from './components/Modal.tsx';
import { OnboardingPage } from './features/auth/OnboardingPage.tsx';
import { Workspace } from './features/shell/Workspace.tsx';
import { PublicPage } from './features/page/PublicPage.tsx';
import { PublicFormPage } from './features/database/views/form/PublicFormPage.tsx';
import { SiteRoot } from './features/settings/SiteRoot.tsx';
import { installGlobalShortcuts } from './features/shell/shortcuts.ts';
import { acceptPendingInvite, pendingInvite, rememberInvite } from './features/shell/invite.ts';
import { TeamInvitePage, rememberTeamInvite, takePendingTeamInvite } from './features/shell/access/TeamInvitePage.tsx';
import { installTypingFade } from './lib/store/typing.ts';


function takeAfterLogin(): string | null {
  try {
    const p = sessionStorage.getItem('nc:afterLogin');
    sessionStorage.removeItem('nc:afterLogin');
    return p && /^\/(?![/\\])\S*$/.test(p) && !/^\/(login|signup|onboarding)(?![\w-])/.test(p) ? p : null;
  } catch {
    return null;
  }
}

function rememberAfterLogin(path: string) {
  try {
    sessionStorage.setItem('nc:afterLogin', path);
  } catch {
    
  }
}


const ANONYMOUS_ROUTES = new Set(['login', 'signup', 'public', 'form', 'site']);

export function App() {
  const status = useSession((s) => s.status);
  const { route } = useLocation();

  useEffect(() => {
    void useSession.getState().load();
    installTypingFade();
    return installGlobalShortcuts();
  }, []);

  useEffect(() => {
    // workspace invite links (/invite/<code>) survive the login/onboarding detour
    if (route.name === 'invite') rememberInvite(route.code);
    
    if (route.name === 'teamInvite' && status === 'anonymous') rememberTeamInvite(route.code);
    if ((status === 'ready' || status === 'onboarding') && route.name !== 'teamInvite') {
      const code = takePendingTeamInvite();
      if (code) {
        navigate(`/team-invite/${code}`, { replace: true });
        return;
      }
    }
    if (route.name === 'teamInvite' && (status === 'ready' || status === 'onboarding')) return;
    if (status === 'onboarding' && pendingInvite()) {
      void acceptPendingInvite();
      return;
    }
    if (status === 'anonymous' && !ANONYMOUS_ROUTES.has(route.name)) {
      // invite links keep their own detour (above); the bare root has nothing to come back to
      if (route.name !== 'root' && route.name !== 'invite' && route.name !== 'teamInvite') rememberAfterLogin(location.pathname + location.search + location.hash);
      // 이식판: 원본 로그인·회원가입 화면으로 가지 않는다. 로그인 풀림(401)·권한 없음(403)은 session.ts가 이미
      // 표준 로그인 화면(Next /login)·메인 사이트로 보냈고, 여기 남는 건 서버 오류뿐이라 아래 안내를 보여 준다.
    }
    if (status === 'onboarding' && route.name !== 'onboarding') navigate('/onboarding', { replace: true });
    if (status === 'ready' && (route.name === 'login' || route.name === 'signup' || route.name === 'onboarding')) navigate(takeAfterLogin() ?? '/', { replace: true });
  }, [status, route.name]);

  let body;
  if (route.name === 'public') body = <PublicPage pageId={route.pageId} />;
  else if (route.name === 'form') body = <PublicFormPage viewId={route.viewId} />;
  else if (route.name === 'site') body = <SiteRoot domain={route.domain} />;
  else if (status === 'loading') body = <div className="nc-boot" />;
  else if (status === 'anonymous') body = <ConnectError />;
  else if (route.name === 'teamInvite' && (status === 'ready' || status === 'onboarding')) body = <TeamInvitePage code={route.code} />;
  else if (status === 'onboarding') body = <OnboardingPage />;
  else body = <Workspace />;

  return (
    <>
      {body}
      <OverlayRoot />
      <TooltipLayer />
      <ToastLayer />
    </>
  );
}

/** 이식판: 계정 정보를 불러오지 못했을 때(서버 오류·연결 끊김) — 원본 로그인 화면 대신 다시 시도 안내 */
function ConnectError() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ maxWidth: 360 }}>
        <p style={{ fontSize: 15, marginBottom: 16 }}>워크스페이스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        <button type="button" className="nc-btn primary" onClick={() => location.reload()}>다시 시도</button>
        <p style={{ marginTop: 12, fontSize: 13 }}>
          <a href="/login">로그인 화면으로 가기</a>
        </p>
      </div>
    </div>
  );
}
