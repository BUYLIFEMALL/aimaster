// 2026-11-17 WS-20261117-17 QA017 P2: /<domain>/receipts 직접 방문·뒤로가기 때 주소의 워크스페이스로 맞출 공간 id(없으면 null).
// home·page·studio는 Workspace의 기존 효과가 처리하므로 여기서는 receipts만 본다(회귀 0).
import type { Route } from '../../lib/router.ts';

export function spaceForDomainRoute(route: Route, spaceId: string | null, spaces: { id: string; domain?: string | null }[]): string | null {
  if (route.name !== 'receipts' || !spaceId || !route.domain) return null;
  const cur = spaces.find((sp) => sp.id === spaceId);
  if (cur?.domain === route.domain) return null;
  const other = spaces.find((sp) => sp.domain === route.domain);
  return other && other.id !== spaceId ? other.id : null;
}
