// Google Identity Services(토큰 모델) — 회원 본인의 Google Cloud 앱(Client ID)과 본인 계정으로만 연결한다.
// 접근 토큰은 메모리에만 두고 저장·기록·백업하지 않는다. 범위는 drive.file(이 앱이 만든 파일만)로 제한한다.
import { DriveError } from "./api";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GIS_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID_PATTERN = /^[0-9]+-[a-z0-9_]+\.apps\.googleusercontent\.com$/i;

interface TokenResponse { access_token?: string; expires_in?: number | string; scope?: string; error?: string; error_description?: string }
interface TokenClient { requestAccessToken(overrides?: { prompt?: string }): void }
interface GoogleAccounts { oauth2: {
  initTokenClient(config: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: { type?: string }) => void }): TokenClient;
  revoke(token: string, done?: () => void): void;
} }
declare global { interface Window { google?: { accounts?: GoogleAccounts } } }

export const isValidClientId = (value: string) => CLIENT_ID_PATTERN.test(value.trim());

let token: { value: string; expiresAt: number } | null = null;

/** 유효한 접근 토큰. 없거나 곧 만료되면 재연결을 요구한다(백그라운드에서 몰래 새로 받지 않음) */
export function currentToken(): string {
  if (!token || token.expiresAt - Date.now() < 30_000) { token = null; throw new DriveError("AUTH", "Google 연결이 만료되었습니다. 다시 연결해 주세요."); }
  return token.value;
}
export const hasToken = () => !!token && token.expiresAt - Date.now() > 30_000;
export const clearToken = () => { token = null; };

function loadGis(): Promise<GoogleAccounts> {
  if (typeof window === "undefined") return Promise.reject(new DriveError("INVALID", "브라우저에서만 연결할 수 있습니다."));
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts);
  return new Promise((resolve, reject) => {
    const fail = () => reject(new DriveError("NETWORK", "Google 로그인 도구를 불러오지 못했습니다. 인터넷 연결이나 광고 차단 설정을 확인해 주세요."));
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const script = existing ?? Object.assign(document.createElement("script"), { src: GIS_SRC, async: true });
    script.addEventListener("load", () => (window.google?.accounts?.oauth2 ? resolve(window.google.accounts) : fail()));
    script.addEventListener("error", fail);
    if (!existing) document.head.appendChild(script);
  });
}

/** 사용자 클릭에서 호출해야 한다(팝업 차단 방지). 성공하면 메모리에 토큰을 보관 */
export async function connectGoogle(clientId: string, prompt = ""): Promise<void> {
  if (!isValidClientId(clientId)) throw new DriveError("INVALID", "Google Client ID 형식이 올바르지 않습니다. '숫자-문자.apps.googleusercontent.com' 형태입니다.");
  const google = await loadGis();
  await new Promise<void>((resolve, reject) => {
    const client = google.oauth2.initTokenClient({
      client_id: clientId.trim(), scope: DRIVE_SCOPE,
      callback: r => {
        if (r.error || !r.access_token) {
          reject(new DriveError("AUTH", r.error === "access_denied" ? "Google 연결 권한을 허용하지 않았습니다." : `Google 연결에 실패했습니다. ${r.error_description ?? r.error ?? ""}`.trim()));
        } else if (!(r.scope ?? "").split(" ").includes(DRIVE_SCOPE)) {
          reject(new DriveError("FORBIDDEN", "'Google Drive 파일 접근' 권한을 허용해야 문서를 올릴 수 있습니다. 다시 연결하며 해당 항목을 체크해 주세요."));
        } else {
          token = { value: r.access_token, expiresAt: Date.now() + (Number(r.expires_in) || 3600) * 1000 };
          resolve();
        }
      },
      error_callback: e => reject(new DriveError("AUTH", e.type === "popup_closed" ? "연결 창이 닫혔습니다. 다시 시도해 주세요." : e.type === "popup_failed_to_open" ? "팝업이 차단되었습니다. 이 사이트의 팝업을 허용한 뒤 다시 시도해 주세요." : "Google 연결 중 문제가 생겼습니다.")),
    });
    client.requestAccessToken({ prompt });
  });
}

/** Google 쪽 접근 권한도 해제를 요청한다(실패해도 이 기기의 토큰은 지운다) */
export async function disconnectGoogle(): Promise<void> {
  const t = token?.value;
  token = null;
  if (t && typeof window !== "undefined" && window.google?.accounts?.oauth2) await new Promise<void>(r => { try { window.google!.accounts!.oauth2.revoke(t, () => r()); } catch { r(); } setTimeout(r, 3000); });
}
