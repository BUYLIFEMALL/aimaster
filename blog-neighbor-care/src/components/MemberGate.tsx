import type { ReactNode } from 'react';
import { authorizeMember } from '../lib/access';
export async function MemberGate({ children }: { children: (userId: string) => ReactNode }) {
  let access;
  try { access = await authorizeMember(); } catch { return <section className="panel"><h1>연결 상태를 확인해 주세요.</h1><p>지금은 회원 정보를 확인할 수 없습니다. 잠시 뒤 다시 열어 주세요.</p></section>; }
  if (!access.allowed) return <section className="panel auth-notice"><div className="eyebrow">회원 확인</div><h1>내 블로그 작업을 이어가세요.</h1><p>{access.error}</p><a className="primary" href="https://www.buylife.xyz/login">AIMaster 로그인 ↗</a></section>;
  return children(access.userId);
}
