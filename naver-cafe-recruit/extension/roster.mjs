// 모드 A-1 명단 모으기(순수 함수, node 시험 가능). 실물: docs/DOM_CHECK_20261105.md §2·§3.
// 게시판 목록의 글쓴이 칸에서 닉네임·등급만 읽는다. 아이디·회원 번호·링크는 다루지 않는다.

/** 주소에서 카페 번호·게시판 번호를 찾는다(새 구조 /cafes/<번호>/menus/<번호>, 옛 구조 ArticleList.nhn?search.clubid=&search.menuid=). */
export function boardFromUrl(url) {
  const u = decodeURIComponent(String(url || ""));
  const neu = /\/cafes\/(\d{1,15})\/menus\/(\d{1,15})/.exec(u);
  if (neu) return { cafeId: neu[1], boardId: neu[2] };
  if (/ArticleList\.nhn/i.test(u)) {
    const club = /search\.clubid=(\d{1,15})/.exec(u), menu = /search\.menuid=(\d{1,15})/.exec(u);
    if (club) return { cafeId: club[1], boardId: menu ? menu[1] : "" };
  }
  return null;
}

/** 등급 아이콘 안 숨은 글 「멤버등급 : 새싹」 → 「새싹」. */
export function parseGrade(text) {
  const m = /멤버\s*등급\s*:\s*(.+)/.exec(String(text || ""));
  return m ? m[1].trim().slice(0, 50) : undefined;
}

/** 읽은 줄을 서버로 보낼 모양으로: 공백 정리·빈칸/긴 닉네임 빼기·같은 닉네임 한 번·내 닉네임 빼기·최대 50줄. */
export function cleanRows(rows, ownNickname) {
  const out = [], seen = new Set(), own = String(ownNickname || "").trim();
  for (const r of rows || []) {
    const nickname = String(r?.nickname || "").replace(/\s+/g, " ").trim();
    if (!nickname || nickname.length > 40 || seen.has(nickname) || (own && nickname === own) || r?.notice) continue;
    seen.add(nickname);
    const row = { nickname };
    if (r.member_grade) row.member_grade = String(r.member_grade).slice(0, 50);
    out.push(row);
    if (out.length >= 50) break;
  }
  return out;
}

/** 탭 제목 「바이라이프 : 네이버 카페」 → 「바이라이프」. */
export function cafeNameFromTitle(title) {
  return String(title || "").replace(/\s*[:|\-–]\s*네이버\s*카페\s*$/i, "").trim().slice(0, 100) || undefined;
}
