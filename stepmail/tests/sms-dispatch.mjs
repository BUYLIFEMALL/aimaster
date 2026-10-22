// 2026-10-23 v1.27 문자(SMS·LMS) 차수 발송 시험 — 실제 lib/dispatch.ts·lib/sms.ts를 묶어 실행하고
// 메일(nodemailer)·문자(SOLAPI) 발송만 가짜로 바꾼다. 네트워크·운영 DB 쓰기·실제 발송 없음.
import assert from "node:assert/strict";
import { build } from "esbuild";

const mocks = {
  "server-only": "export {};",
  "@/lib/email/transport": "export const sendViaSmtpAccount = async (acc, to) => { if (globalThis.fx.failEmail) throw new Error('smtp down'); globalThis.fx.emails.push(to); };",
  "@/lib/solapi/client": "export const sendSms = async (acc, to, text) => { if (globalThis.fx.failSms) throw new Error('sms down'); globalThis.fx.sms.push({ key: acc.api_key, to, text }); };",
};
const bundle = async (entry) => {
  const out = await build({
    entryPoints: [entry], bundle: true, write: false, format: "esm", platform: "node", alias: { "@": "." },
    plugins: [{ name: "mocks", setup(b) {
      b.onResolve({ filter: /.*/ }, (a) => (mocks[a.path] ? { path: a.path, namespace: "mock" } : undefined));
      b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js" }));
    } }],
  });
  return import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
};
const { dispatchCampaign } = await bundle("lib/dispatch.ts");
const sms = await bundle("lib/sms.ts");
const ok = (n) => console.log("PASS", n);

// ── 순수 함수 ──
assert.equal(sms.normalizeMobile("01012345678"), "010-1234-5678");
assert.equal(sms.normalizeMobile("+82 10-1234-5678"), "010-1234-5678");
assert.equal(sms.normalizeMobile(1012345678), "010-1234-5678"); // 엑셀이 앞 0을 지운 숫자
assert.equal(sms.normalizeMobile("02-123-4567"), null);
assert.equal(sms.normalizeMobile(""), null);
ok("핸드폰 번호 정리(010-1234-5678), 일반 전화·빈칸은 null");
const text = sms.buildSmsText(" {닉네임}님 안녕하세요 ", "무료수신거부 080-000-0000", "철수");
assert.equal(text, "(광고) 철수님 안녕하세요\n무료수신거부 080-000-0000");
assert.equal(sms.buildSmsText("{닉네임}님", "거부", null).startsWith("(광고) 고객님"), true);
assert.equal(sms.smsBytes("가a"), 3);
ok("문자 전문: (광고) 머리말·닉네임 치환·수신거부 줄, 바이트 계산");

// ── 발송 ──
function fixture({ channel, solapi = true, smsText = "{닉네임}님 소식", smsOptout = "무료수신거부 080-000-0000", leads }) {
  const fx = { emails: [], sms: [], logs: [], updates: [], failEmail: false, failSms: false };
  const rows = {
    stepmail_campaigns: [{ id: "c1", channel, sms_text: smsText, sms_optout: smsOptout }],
    stepmail_email_drafts: [{ id: "d1", subject: "제목", body_html: "<p>본문</p>" }],
    stepmail_campaign_smtp_accounts: [{ campaign_id: "c1", smtp_account_id: "s1", sort_order: 0 }],
    user_smtp_accounts: [{ id: "s1", smtp_host: "h", smtp_port: 465, smtp_user: "u", smtp_password: "p", from_name: null, is_active: true }],
    user_solapi_accounts: solapi ? [{ user_id: "member-a", api_key: "own-solapi", api_secret: "x", sender_phone: "01000000000", kakao_pf_id: null, rcs_brand_id: null }] : [],
    stepmail_leads: leads,
  };
  fx.client = { from: (t) => {
    const f = []; let limit = Infinity;
    const list = () => (rows[t] ?? []).filter((r) => f.every(([k, v, kind]) => kind === "in" ? v.includes(r[k]) : kind === "notnull" ? r[k] != null : r[k] === v)).slice(0, limit);
    const api = {
      select: () => api, eq: (k, v) => (f.push([k, v]), api), in: (k, v) => (f.push([k, v, "in"]), api),
      not: (k, op, v) => (f.push([k, null, "notnull"]), api), order: () => api, limit: (n) => ((limit = n), api),
      maybeSingle: async () => ({ data: list()[0] ?? null }), then: (r) => r({ data: list(), error: null }),
      insert: async (p) => (fx.logs.push(p), { error: null }),
      update: (p) => ({ eq: async (k, v) => (fx.updates.push({ id: v, ...p }), { error: null }) }),
    };
    return api;
  } };
  globalThis.fx = fx;
  return fx;
}
const lead = (id, phone, extra = {}) => ({ id, user_id: "member-a", email: `${id}@x.com`, phone, nickname: id, status: "new", send_count: 0, ...extra });
const camp = (draft_id = null) => ({ id: "c1", user_id: "member-a", draft_id, target_send_count: 0, quantity_per_run: 10 });

{ const fx = fixture({ channel: "sms", leads: [lead("a", "010-1111-2222"), lead("b", null)] });
  const r = await dispatchCampaign(fx.client, camp());
  assert.deepEqual(r, { sentCount: 1, failedCount: 0 });
  assert.deepEqual(fx.sms, [{ key: "own-solapi", to: "01011112222", text: "(광고) a님 소식\n무료수신거부 080-000-0000" }]);
  assert.equal(fx.emails.length, 0);
  assert.deepEqual(fx.logs.map((l) => [l.channel, l.status, l.to_phone]), [["sms", "sent", "010-1111-2222"]]);
  assert.deepEqual(fx.updates.map((u) => [u.id, u.send_count]), [["a", 1]]);
  ok("문자 전용: 전화번호 있는 리드에게만 본인 SOLAPI로, 기록 채널 sms, 차수 +1"); }

{ const fx = fixture({ channel: "both", leads: [lead("a", "010-1111-2222"), lead("b", null)] });
  fx.failSms = true;
  const r = await dispatchCampaign(fx.client, camp("d1"));
  assert.deepEqual(r, { sentCount: 2, failedCount: 0 });
  assert.deepEqual(fx.emails, ["a@x.com", "b@x.com"]);
  assert.deepEqual(fx.logs.map((l) => [l.lead_id, l.channel, l.status]), [["a", "email", "sent"], ["a", "sms", "failed"], ["b", "email", "sent"]]);
  assert.equal(fx.updates.length, 2);
  ok("둘 다: 메일만 성공해도 차수 +1, 문자 실패는 따로 기록, 번호 없는 리드는 메일만"); }

{ const fx = fixture({ channel: "both", leads: [lead("a", "010-1111-2222")] });
  fx.failSms = true; fx.failEmail = true;
  const r = await dispatchCampaign(fx.client, camp("d1"));
  assert.deepEqual(r, { sentCount: 0, failedCount: 1 });
  assert.equal(fx.updates.length, 0);
  ok("둘 다 실패하면 차수 그대로·실패 1건"); }

{ const fx = fixture({ channel: "sms", solapi: false, leads: [lead("a", "010-1111-2222")] });
  const r = await dispatchCampaign(fx.client, camp());
  assert.match(r.notice, /SOLAPI/); assert.equal(fx.sms.length + fx.logs.length, 0);
  ok("본인 SOLAPI 계정이 없으면 아무것도 보내지 않고 안내(다른 계정으로 대신 보내지 않음)"); }

{ const fx = fixture({ channel: "sms", smsOptout: " ", leads: [lead("a", "010-1111-2222")] });
  const r = await dispatchCampaign(fx.client, camp());
  assert.match(r.notice, /수신거부/); assert.equal(fx.sms.length, 0);
  ok("수신거부 안내가 비면 발송하지 않음"); }

{ const fx = fixture({ channel: "email", leads: [lead("a", "010-1111-2222")] });
  const r = await dispatchCampaign(fx.client, camp("d1"));
  assert.deepEqual(r, { sentCount: 1, failedCount: 0 });
  assert.equal(fx.sms.length, 0); assert.equal(fx.logs[0].channel, "email");
  ok("기존 이메일 캠페인은 예전처럼 메일만(문자 없음)"); }
// ── 엑셀 가져오기 전화번호 ──
{ const XLSX = await import("xlsx");
  const { parseLeadsWorkbook } = await bundle("lib/leads.ts");
  const book = (aoa) => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "s"); return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }); };
  const withPhone = parseLeadsWorkbook(book([["이메일", "전화번호", "닉네임"], ["A@x.com", "01012345678", "a"], ["b@x.com", "02-123-4567", "b"]]));
  assert.deepEqual(withPhone.map((r) => [r.email, r.phone]), [["a@x.com", "010-1234-5678"], ["b@x.com", null]]);
  const noPhone = parseLeadsWorkbook(book([["이메일", "닉네임"], ["c@x.com", "c"]]));
  assert.equal("phone" in noPhone[0], false);
  ok("엑셀: 전화 열이 있으면 번호 정리(핸드폰 아니면 비움), 전화 열이 없으면 phone 칸 자체를 빼서 기존 번호 유지"); }
console.log("문자 차수 발송 시험 모두 통과");
