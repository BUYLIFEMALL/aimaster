# 개발 플랜 — 추가개선 5·6·7 (v1.37 묶음)

- 작성: 2026-10-29 · [역할: realty] Claude Code(윈도우) · 세션 `claude-win-realty-docs`
- 근거: [`IMPROVEMENT_HANDOFF_20261029.md`](IMPROVEMENT_HANDOFF_20261029.md) §6 추가개선 제안 1~3 · 주인님 「진행해」(2026-10-29)
- 운영 DB: ① AIMaster `esgxyikcnnvmlhygjkth`(DB 구조 변경 없음, 버전 칸만)

## 1. 무엇을 하나

| # | 내용 | 바꾸는 곳 | 확장 변경 |
|---|---|---|---|
| 5 | 수집 결과 화면 「📅 지난 주간 리포트」 칸에 **「📝 이번 주 동향 글로 쓰기 ↗」** — 주간 기간(from~to) 안 기록을 웹에서 더해 주제·키워드 생성 | `lib/blogDraft.ts`(`buildWeeklyDraft`), `app/results/StatsDashboard.tsx` | 없음 |
| 6 | 「📝 글로 쓰기」가 갈 곳을 회원이 고름 — **블로그 포스팅 자동화(`ai-auto-blog`) / 티스토리 포스팅 자동화(`tistory-auto-blog`)**. 고른 값은 이 브라우저에 기억(`localStorage`) | `lib/blogDraft.ts`(갈 곳 인자), `StatsDashboard.tsx`(고르기 칸) | 없음 |
| 7 | 실거래 자료가 **이틀 넘게 이어서 없는 단지**는 「실거래 대비」 칸에 「—」 대신 **「최근 6개월 매매 신고 없음 (n일째)」** | 확장 `background.js`(`tradeMissing` 기억·`stats` 응답에 포함), `StatsDashboard.tsx` | 있음 → manifest·ZIP·DB 버전 함께 |

## 2. 설계 메모
- **5**: 주간 리포트 글(`weekly.text`)을 다시 읽지 않고, 확장이 이미 주는 `history`에서 `weekly.from`~`weekly.to` 안 회차의 단지별 `events`(새·내림·오름·내려감)를 더한다. 주제 예: 「2026년 10월 20일~26일 백송건영·백송대림 외 3곳 아파트 매물 주간 동향 — 새 매물 12건, 가격 내림 5건」(120자 상한). 키워드: 단지 이름 최대 3개 + 「{연도} 아파트 주간 시세」.
- **6**: 두 프로그램 모두 `/write/ai-form?topic=&keywords=` 입구가 이미 있다(블로그·티스토리 코드 변경 없음). 기본값은 지금처럼 블로그 포스팅 자동화.
- **7**: `attachTradeGaps`에서 자료 없는 단지 이름 → 처음 없던 시각을 `chrome.storage`(`tradeMissing`)에 기억, 자료가 생기면 지움, 30일 지나면 정리. 웹은 2일 이상이면 문구 표시(하루짜리는 이름 맞추기 실패일 수 있어 「—」 그대로). 회원 PC에만 저장, 서버로 안 보냄.
- 넘기지 않는 것(그대로): 중개사·전화번호·매물 번호·동호수.

## 3. 순서와 검수
1. `lib/blogDraft.ts` 함수 추가·시험(`tests/blogDraft.test.ts`에 주간·티스토리 시험) → `tsc`·전체 시험
2. 확장 `tradeMissing` + 날짜 계산 시험 → 화면 연결
3. 로컬 `npm run build`(무료)
4. 버전 v1.37: `lib/version.ts` · `build-extension-archive` · 마이그레이션 SQL · 배포(동시 빌드 확인 후 1회) · DB `version`·`extension_version` · `check-extension-release` OK
5. 크롬: 운영 화면에서 버튼·고르기 칸 확인(관리자 계정은 통계 표가 안 보이므로 같은 함수로 만든 주소를 열어 블로그·티스토리 화면 채움 확인), 시험 계정 화면 확인은 다음 수집 때

## 4. 비용
| 항목 | 횟수 | 비고 |
|---|---|---|
| Vercel 빌드(매물 알림) | 1회 | **사전 승인 필요** |
| AI·유료 호출 | 0 | 글 생성 버튼은 누르지 않음 |
| DB | 버전 칸 갱신만 | 구조 변경 없음 |

## 5. 회원 안내(배포 뒤)
확장이 바뀌므로 「ZIP 다시 받기 → 기존 폴더 덮어쓰기 → `chrome://extensions` 새로고침」 안내. 확장을 안 바꿔도 5·6은 동작, 7만 새 확장부터.
