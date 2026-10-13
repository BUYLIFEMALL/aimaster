// 시험 전용 모의 Google Drive v3 서버. 실제 Google이 아니므로 이 모의 결과를 "실제 Drive 연동 성공"으로 보고하지 않는다.
import { createHash } from "node:crypto";

export function createDriveMock({ token = "mock-token", account = { permissionId: "acct-1", emailAddress: "me@example.test", displayName: "시험 계정" }, pageSize = 1000 } = {}) {
  const files = new Map();
  let seq = 0, clock = Date.parse("2026-10-13T00:00:00Z");
  const tick = () => new Date((clock += 1000)).toISOString();
  const log = [];
  const failures = [];
  files.set("root", { id: "root", name: "My Drive", mimeType: "application/vnd.google-apps.folder", parents: [], trashed: false, modifiedTime: tick(), content: "" });

  const publicFile = f => ({ id: f.id, name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime, md5Checksum: f.md5Checksum, parents: f.parents, trashed: f.trashed });
  const md5 = s => createHash("md5").update(s).digest("hex");
  const out = (status, obj, headers = {}) => ({ status, headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(obj) });
  const err = (status, reason, message = reason, headers) => out(status, { error: { code: status, message, errors: [{ reason }] } }, headers);
  const unq = s => s.replace(/\\'/g, "'").replace(/\\\\/g, "\\");

  function add({ name, mimeType = "text/markdown", parents = ["root"], content = "" }) {
    const f = { id: `f${++seq}`, name, mimeType, parents: [...parents], trashed: false, modifiedTime: tick(), content, md5Checksum: mimeType === "application/vnd.google-apps.folder" ? undefined : md5(content) };
    files.set(f.id, f); return f;
  }
  function parseMultipart(contentType, body) {
    const boundary = /boundary=(.+)$/.exec(contentType)?.[1];
    const parts = body.split(`--${boundary}`).slice(1, -1).map(p => p.replace(/^\r\n/, "").replace(/\r\n$/, ""));
    const split = p => { const i = p.indexOf("\r\n\r\n"); return p.slice(i + 4); };
    return { meta: JSON.parse(split(parts[0])), content: split(parts[1]) };
  }

  async function handle(method, urlStr, headers, body) {
    const url = new URL(urlStr);
    const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    log.push({ method, path: url.pathname, query: Object.fromEntries(url.searchParams), body });
    const hit = failures.findIndex(x => x.n > 0 && (!x.match || x.match(method, url)));
    if (hit >= 0) { const x = failures[hit]; x.n--; return x.status === "throw" ? "throw" : err(x.status, x.reason, x.reason, x.headers); }
    if (h.authorization !== `Bearer ${token}`) return err(401, "authError", "Invalid Credentials");
    const p = url.pathname;
    const fileId = /\/files\/([^/]+)$/.exec(p)?.[1] && decodeURIComponent(/\/files\/([^/]+)$/.exec(p)[1]);

    if (method === "GET" && p === "/drive/v3/about") return out(200, { user: account });
    if (method === "GET" && p === "/drive/v3/files") {
      const qq = url.searchParams.get("q") ?? "";
      const parent = /'((?:\\'|[^'])*)' in parents/.exec(qq)?.[1];
      const name = /name='((?:\\'|[^'])*)'/.exec(qq)?.[1];
      const mime = /mimeType='([^']*)'/.exec(qq)?.[1];
      let rows = [...files.values()].filter(f => f.id !== "root" && !f.trashed
        && (!parent || f.parents.includes(unq(parent))) && (name === undefined || f.name === unq(name)) && (!mime || f.mimeType === mime));
      const size = Math.min(Number(url.searchParams.get("pageSize")) || 1000, pageSize);
      const start = Number(url.searchParams.get("pageToken") || 0);
      const next = start + size < rows.length ? String(start + size) : undefined;
      rows = rows.slice(start, start + size);
      return out(200, { files: rows.map(publicFile), nextPageToken: next });
    }
    if (method === "GET" && fileId) {
      const f = files.get(fileId);
      if (!f) return err(404, "notFound");
      if (url.searchParams.get("alt") === "media") return { status: 200, headers: { "content-type": "text/markdown" }, body: f.content };
      return out(200, publicFile(f));
    }
    if (method === "POST" && p === "/drive/v3/files") {
      const meta = JSON.parse(body);
      if (!files.has(meta.parents?.[0])) return err(404, "notFound");
      return out(200, publicFile(add({ name: meta.name, mimeType: meta.mimeType, parents: meta.parents })));
    }
    if (method === "POST" && p === "/upload/drive/v3/files") {
      const { meta, content } = parseMultipart(h["content-type"], body);
      if (!files.has(meta.parents?.[0]) || files.get(meta.parents[0]).trashed) return err(404, "notFound");
      return out(200, publicFile(add({ name: meta.name, mimeType: meta.mimeType, parents: meta.parents, content })));
    }
    if (method === "PATCH" && p.startsWith("/upload/drive/v3/files/")) {
      const f = files.get(fileId); if (!f) return err(404, "notFound");
      const { meta, content } = parseMultipart(h["content-type"], body);
      if (meta.name) f.name = meta.name;
      f.content = content; f.md5Checksum = md5(content); f.modifiedTime = tick();
      const rm = url.searchParams.get("removeParents"), ad = url.searchParams.get("addParents");
      if (rm) f.parents = f.parents.filter(x => x !== rm);
      if (ad && !f.parents.includes(ad)) f.parents.push(ad);
      return out(200, publicFile(f));
    }
    if (method === "PATCH" && fileId) {
      const f = files.get(fileId); if (!f) return err(404, "notFound");
      const rm = url.searchParams.get("removeParents"), ad = url.searchParams.get("addParents");
      if (rm) f.parents = f.parents.filter(x => x !== rm);
      if (ad && !f.parents.includes(ad)) f.parents.push(ad);
      f.modifiedTime = tick();
      return out(200, publicFile(f));
    }
    return err(400, "badRequest", `mock does not support ${method} ${p}`);
  }

  /** fetch 호환 함수 (Node 단위 시험용) */
  const fetchImpl = async (url, init = {}) => {
    const r = await handle(init.method ?? "GET", String(url), init.headers ?? {}, init.body);
    if (r === "throw") throw new TypeError("network down");
    return new Response(r.body, { status: r.status, headers: r.headers });
  };

  return {
    token, account, files, log, fetchImpl, handle, add,
    /** 이후 n번의 요청을 실패시킨다. status "throw"는 네트워크 오류 */
    failNext(n, status, reason = "backendError", { match, headers } = {}) { failures.push({ n, status, reason, match, headers }); },
    clearFailures() { failures.length = 0; },
    /** Drive 쪽에서 내용이 바뀐 것을 흉내 낸다 */
    edit(id, content) { const f = files.get(id); f.content = content; f.md5Checksum = md5(content); f.modifiedTime = tick(); return f; },
    trash(id) { files.get(id).trashed = true; },
    remove(id) { files.delete(id); },
    byName(name) { return [...files.values()].filter(f => f.name === name); },
    count(method, pathPart) { return log.filter(r => r.method === method && r.path.includes(pathPart)).length; },
    resetLog() { log.length = 0; },
  };
}
