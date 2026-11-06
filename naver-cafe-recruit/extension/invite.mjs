// 초대 판정(순수 함수, node 시험 가능). 실물 확인: docs/DOM_CHECK_20261105.md §6.
// 초대 화면에는 「한 달에 최대 300명까지…」·「영리 목적의 광고…」 안내가 늘 떠 있으므로,
// 판정은 「초대하기」를 누른 뒤 새로 나타난 글자(알림창 문구 + 새 줄)만으로 한다.

/** 카페 화면 링크 목록에서 초대 메뉴 주소와 카페 번호를 찾는다(초대 메뉴가 보이는 카페만 대상). */
export function findInvite(hrefs) {
  for (const h of hrefs || []) {
    const m = /(CafeInviteCheck|CafeInvite)\.nhn[^"']*?[?&]clubid=(\d{1,15})/i.exec(decodeURIComponent(String(h)));
    if (m) return { href: String(h), cafeId: m[2] };
  }
  return null;
}

/** 누르기 전 글자와 누른 뒤 글자를 비교해 새로 생긴 줄만 돌려준다. */
export function newLines(before, after) {
  const seen = new Set(String(before || "").split("\n").map((l) => l.trim()).filter(Boolean));
  return String(after || "").split("\n").map((l) => l.trim()).filter((l) => l && !seen.has(l));
}

const LIMITED = /(초대\s*가능\s*인원|한도|초과|더\s*이상\s*초대|초대할\s*수\s*있는\s*인원|일시적으로\s*제한)/;
const FAILED = /(존재하지\s*않|없는\s*아이디|아이디를\s*확인|올바르지\s*않|이미\s*(가입|초대|회원)|탈퇴|초대할\s*수\s*없|차단)/;
const SENT = /(초대(를|가|알림을)?\s*(보냈|완료|전송)|(전송|발송)(되었|했)습니다|보냈습니다)/;

/**
 * 새로 나타난 문구로 결과를 정한다.
 * - limited: 네이버 제한 문구 → 기록하고 그날 멈춤
 * - failed: 그 사람만 안 됨(없는 아이디·이미 회원 등) → 기록하고 다음 사람
 * - uncertain: 결과를 확신할 수 없음 → 「failed(결과 확인 못 함)」으로 기록하고 멈춤(자동으로 다시 보내지 않는다)
 */
export function classify(messages) {
  const text = (messages || []).join("\n").slice(0, 2000);
  if (LIMITED.test(text)) return { result: "limited", detail: firstLine(text, LIMITED) };
  if (FAILED.test(text)) return { result: "failed", detail: firstLine(text, FAILED) };
  if (SENT.test(text)) return { result: "sent", detail: firstLine(text, SENT) };
  return { result: "uncertain", detail: text ? `결과 확인 못 함: ${text.slice(0, 120)}` : "결과 확인 못 함(새 안내 없음)" };
}
function firstLine(text, re) { return (text.split("\n").find((l) => re.test(l)) || text).slice(0, 180); }

// 멈춤 신호(보안문자·로그인 요구·제한). 뜨면 그날 중지 — 우회하지 않는다(PLATFORM_PATTERNS §20).
const STOP = /(자동입력\s*방지|보안\s*문자|captcha|비정상적인\s*(접근|이용)|접근이\s*제한|로그인이\s*필요|로그인\s*후\s*이용)/i;
export function isBlocked(text, url) {
  try { if (new URL(String(url)).hostname === "nid.naver.com") return true; } catch { /* 주소 없음 */ }
  return STOP.test(String(text || ""));
}
