// Google Drive v3 REST 클라이언트(브라우저·Node 공용, fetch 주입 가능). 회원 본인의 OAuth 토큰만 사용한다.
// 원칙: 모든 응답의 HTTP 상태를 확인하고, 확인된 성공만 성공으로 돌려준다. 실패를 성공처럼 보고하지 않는다.
export type DriveErrorCode = "AUTH" | "FORBIDDEN" | "NOT_FOUND" | "RATE" | "SERVER" | "NETWORK" | "INVALID";
export class DriveError extends Error {
  constructor(public code: DriveErrorCode, message: string, public status?: number) { super(message); this.name = "DriveError"; }
}

export interface DriveFile { id: string; name: string; mimeType: string; modifiedTime: string; md5Checksum?: string; parents?: string[]; trashed?: boolean }
export const FOLDER_MIME = "application/vnd.google-apps.folder";
export const ROOT_FOLDER_NAME = "마크다운 문서 자동화";
const FIELDS = "id,name,mimeType,modifiedTime,md5Checksum,parents,trashed";
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export interface DriveApiOptions {
  getToken: () => string | Promise<string>;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
}
const q = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

function describe(status: number, reason: string, message: string): DriveError {
  if (status === 401) return new DriveError("AUTH", "Google 연결이 만료되었거나 취소되었습니다. 다시 연결해 주세요.", status);
  if (status === 403) {
    if (/accessNotConfigured|SERVICE_DISABLED/i.test(reason + message)) return new DriveError("FORBIDDEN", "내 Google Cloud 프로젝트에서 Google Drive API가 사용 설정되어 있지 않습니다. 매뉴얼의 API 사용 설정 단계를 확인해 주세요.", status);
    if (/rateLimit|quota/i.test(reason)) return new DriveError("RATE", "Google 요청 한도에 걸렸습니다. 잠시 후 다시 시도해 주세요.", status);
    return new DriveError("FORBIDDEN", "Google Drive 접근 권한이 없습니다. 연결할 때 'Drive 파일 접근'을 허용했는지, 테스트 사용자로 등록되어 있는지 확인해 주세요.", status);
  }
  if (status === 404) return new DriveError("NOT_FOUND", "Drive에서 파일 또는 폴더를 찾을 수 없습니다.", status);
  if (status === 429) return new DriveError("RATE", "Google 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", status);
  if (status >= 500) return new DriveError("SERVER", "Google 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.", status);
  return new DriveError("INVALID", `Drive가 요청을 거절했습니다(${status}). ${message}`.trim(), status);
}

export function createDriveApi(opts: DriveApiOptions) {
  const f = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)));
  const maxRetries = opts.maxRetries ?? 3;

  async function call(url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const token = await opts.getToken();
      let res: Response;
      try {
        res = await f(url, { method: init.method ?? "GET", headers: { Authorization: `Bearer ${token}`, ...init.headers }, body: init.body });
      } catch {
        if (attempt < maxRetries) { await sleep(400 * 2 ** attempt); continue; }
        throw new DriveError("NETWORK", "Google에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.");
      }
      if (res.ok) return res;
      let reason = "", message = "";
      try { const b = await res.json(); reason = b?.error?.errors?.[0]?.reason ?? b?.error?.status ?? ""; message = b?.error?.message ?? ""; } catch { /* 본문 없음 */ }
      const err = describe(res.status, reason, message);
      if ((err.code === "RATE" || err.code === "SERVER") && attempt < maxRetries) {
        const retryAfter = Number(res.headers.get("Retry-After"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 30) * 1000 : 500 * 2 ** attempt);
        continue;
      }
      throw err;
    }
  }
  async function json<T>(url: string, init?: Parameters<typeof call>[1]): Promise<T> {
    const res = await call(url, init);
    try { return (await res.json()) as T; } catch { throw new DriveError("SERVER", "Google 응답을 해석하지 못했습니다. 다시 시도해 주세요."); }
  }
  const qs = (o: Record<string, string | number | undefined>) => Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");

  function multipart(meta: object, content: string) {
    const boundary = `mdstudio${Math.random().toString(36).slice(2)}${Date.now()}`;
    return {
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: text/markdown; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`,
    };
  }

  return {
    /** 연결된 계정. permissionId를 계정 식별자로 쓴다(이메일은 표시용) */
    async about() {
      const r = await json<{ user?: { permissionId?: string; emailAddress?: string; displayName?: string } }>(`${API}/about?${qs({ fields: "user(permissionId,emailAddress,displayName)" })}`);
      if (!r.user?.permissionId) throw new DriveError("SERVER", "Google 계정 정보를 확인하지 못했습니다. 다시 연결해 주세요.");
      return { accountId: r.user.permissionId, email: r.user.emailAddress ?? "", name: r.user.displayName ?? "" };
    },
    async getMeta(id: string) { return json<DriveFile>(`${API}/files/${encodeURIComponent(id)}?${qs({ fields: FIELDS })}`); },
    async download(id: string): Promise<string> {
      const res = await call(`${API}/files/${encodeURIComponent(id)}?${qs({ alt: "media" })}`);
      return await res.text();
    },
    /** 한 폴더의 직속 항목(휴지통 제외), 여러 쪽을 모두 읽는다 */
    async listChildren(parentId: string): Promise<DriveFile[]> {
      const out: DriveFile[] = [];
      let pageToken: string | undefined;
      for (let page = 0; page < 100; page++) {
        const r = await json<{ files?: DriveFile[]; nextPageToken?: string }>(`${API}/files?${qs({
          q: `'${q(parentId)}' in parents and trashed=false`, fields: `nextPageToken,files(${FIELDS})`, pageSize: 1000, pageToken, spaces: "drive",
        })}`);
        out.push(...(r.files ?? []));
        pageToken = r.nextPageToken;
        if (!pageToken) return out;
      }
      throw new DriveError("INVALID", "Drive 항목이 너무 많아 목록을 모두 읽지 못했습니다.");
    },
    /** 이름이 같은 폴더를 찾는다(이 앱이 만든 항목만 보인다). 가장 먼저 만든 것을 사용 */
    async findFolder(parentId: string | "root", name: string): Promise<DriveFile | null> {
      const r = await json<{ files?: DriveFile[] }>(`${API}/files?${qs({
        q: `name='${q(name)}' and mimeType='${FOLDER_MIME}' and '${q(parentId)}' in parents and trashed=false`, fields: `files(${FIELDS})`, orderBy: "createdTime", pageSize: 10, spaces: "drive",
      })}`);
      return r.files?.[0] ?? null;
    },
    /** v1.17: 폴더 안에서 이름이 같은 파일(폴더 아님)을 찾는다 — 고정 정보 파일용 */
    async findFile(parentId: string, name: string): Promise<DriveFile | null> {
      const r = await json<{ files?: DriveFile[] }>(`${API}/files?${qs({
        q: `name='${q(name)}' and mimeType!='${FOLDER_MIME}' and '${q(parentId)}' in parents and trashed=false`, fields: `files(${FIELDS})`, orderBy: "createdTime", pageSize: 10, spaces: "drive",
      })}`);
      return r.files?.[0] ?? null;
    },
    async createFolder(parentId: string | "root", name: string): Promise<DriveFile> {
      return json<DriveFile>(`${API}/files?${qs({ fields: FIELDS })}`, {
        method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
      });
    },
    async createFile(parentId: string, name: string, content: string, mimeType = "text/markdown"): Promise<DriveFile> {
      const m = multipart({ name, parents: [parentId], mimeType }, content);
      return json<DriveFile>(`${UPLOAD}/files?${qs({ uploadType: "multipart", fields: FIELDS })}`, { method: "POST", ...m });
    },
    /** 내용·이름을 갱신하고 필요하면 폴더를 옮긴다 */
    async updateFile(id: string, name: string, content: string, move?: { from: string; to: string }): Promise<DriveFile> {
      const m = multipart({ name }, content);
      return json<DriveFile>(`${UPLOAD}/files/${encodeURIComponent(id)}?${qs({ uploadType: "multipart", fields: FIELDS, addParents: move?.to, removeParents: move?.from })}`, { method: "PATCH", ...m });
    },
    /** 내용 없이 이름·위치만 바꾼다 */
    async moveFile(id: string, from: string, to: string): Promise<DriveFile> {
      return json<DriveFile>(`${API}/files/${encodeURIComponent(id)}?${qs({ fields: FIELDS, addParents: to, removeParents: from })}`, {
        method: "PATCH", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: "{}",
      });
    },
  };
}
export type DriveApi = ReturnType<typeof createDriveApi>;

/** 오류를 회원에게 보여 줄 문장으로 */
export const driveMessage = (e: unknown) => e instanceof DriveError ? e.message : e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
