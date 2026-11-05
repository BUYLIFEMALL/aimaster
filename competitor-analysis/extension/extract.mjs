// 공개 연락처 추출(순수 함수) — 화면에 보이는 글자에서만. 플랜 PLAN_20261105_PARTNER_FINDER.md 단계 2.
// 우선순위: 핸드폰 > 일반전화(050 안심번호 포함) > 이메일. 종류별 최대 5개. 숨긴 값·내부 응답은 읽지 않는다.
const MOBILE = /(?<!\d)01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g;
const LANDLINE = /(?<!\d)0(?:2|[3-6][1-5]|70|50\d)[-.\s)]?\d{3,4}[-.\s]?\d{4}(?!\d)/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// 예시·자리표시 번호는 버린다(오탐 방지).
const FAKE = /^(010-?0000-?0000|010-?1234-?5678|02-?123-?4567)$/;

const digits = (v) => v.replace(/\D/g, "");
function formatPhone(raw) {
  const d = digits(raw);
  if (d.startsWith("02")) return d.length === 9 ? `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}` : `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.startsWith("050")) return `${d.slice(0, 4)}-${d.slice(4, d.length - 4)}-${d.slice(-4)}`;
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
function uniq(list, max = 5) {
  const out = [];
  for (const v of list) if (!out.includes(v) && out.length < max) out.push(v);
  return out;
}

export function extractContacts(text) {
  const t = String(text || "");
  const mobile = uniq((t.match(MOBILE) || []).map(formatPhone).filter((p) => !FAKE.test(p)));
  const mobileDigits = new Set(mobile.map(digits));
  const landline = uniq((t.match(LANDLINE) || []).map(formatPhone).filter((p) => !FAKE.test(p) && !mobileDigits.has(digits(p))));
  const emails = uniq((t.match(EMAIL) || []).map((e) => e.toLowerCase()).filter((e) => !/\.(png|jpe?g|gif|webp)$/.test(e) && !e.endsWith("@example.com")));
  const primary = mobile[0] ? { contact: mobile[0], type: "mobile" } : landline[0] ? { contact: landline[0], type: "landline" } : emails[0] ? { contact: emails[0], type: "email" } : null;
  return { mobile, landline, emails, primary };
}

// 멈춤 신호(보안문자·로그인 요구·제한 안내). 뜨면 그날 스캔 중지 — 우회하지 않는다.
const STOP = /(자동입력\s*방지|보안\s*문자|captcha|비정상적인\s*(접근|이용)|일시적으로\s*제한|접근이\s*제한|로그인이\s*필요)/i;
export function isBlocked(text) { return STOP.test(String(text || "")); }
