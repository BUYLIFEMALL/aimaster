# Claude Code(윈도우) 세션 인수인계 — 2026-10-20 인스타 프로그램 병합·정리

운영 DB `esgxyikcnnvmlhygjkth`(① AIMaster 운영). 모든 DB 변경은 이 ref. 다른 CLI는 이 문서 → 각 프로그램 `docs/IMPROVEMENT_HANDOFF_*.md` 순서로 읽는다.

## 1. 한 일 요약
| # | 작업 | 프로그램·버전 | 상태 |
|---|---|---|---|
| 1 | 공지 ↔ 프로그램 연결: 관리자 「📢 공지」 바로가기, 메인 프로그램 소개 페이지에 관련 공지 | 메인 사이트 | ✅ 배포 |
| 2 | 공지 띠 공용 기준 코드 `program-notice-banner` 신설(첫 적용 웹툰) | ai-webtoon-studio v1.24 | ✅ |
| 3 | 좌측 메뉴 계정 위치(메뉴 바로 아래) 수정 | 웹툰 v1.23 · ebook v1.11 · emotion v1.16 · allinone v1.50 · naver-blog-agent v2.00 | ✅ |
| 4 | 인스타 계열 병합·독립 분석 보고서 | `docs/analysis-insta-consolidation-20261020/REPORT.md` (아티팩트 https://claude.ai/artifact/UFYw5BheNdRyx5BgmbMHjN) | ✅ |
| 5 | **병합 A** 카드뉴스 스튜디오 → INSTA 포스팅 | auto-instagram-posting v1.35~v1.41 · cardnews-studio v1.31~v1.32(이동 전용, 노출 중지) | ✅ |
| 6 | **병합 B** INSTA DM답변 → INSTA 댓글자동화 = 「INSTA 댓글·DM 자동화」 | instagram-comment-reply v1.18~v1.24 · instagram-dm-reply v1.17(이동 전용, 노출 중지) | ✅ |
| 7 | 텔레그램 연동 확인 `allowed_updates` 수정 전파 | threads-comment-reply v1.14 · youtube-auto-reply v1.19 · kakao-auto-posting v1.28 배포 / 5개 코드만 | ✅ / 🟡 다음 배포 |
| 8 | 공지 띠 사본 5곳 | instagram-comment-reply v1.24 · threads-comment-reply v1.15 · youtube-auto-reply v1.20 · kakao-auto-posting v1.29 · auto-instagram-posting v1.42 | ✅ |
| 9 | INSTA 댓글·DM 정리: DM 설정 값, 통합 초보자 매뉴얼, INSTA 포스팅과 같은 다크 템플릿 | instagram-comment-reply v1.24 | ✅ |

## 2. 프로그램별 현재 상태
| 프로그램 | 버전 | 주소 | 핵심 | 인수인계 |
|---|---|---|---|---|
| INSTA 포스팅 자동화 | v1.42 | https://auto-instagram-posting.buylife.xyz | 주제 수집·피드·카드뉴스(4~10장) 디자인·예약/즉시 게시, FREE | `insta_auto_poster/AGENTS.md`, `insta_auto_poster/docs/PLAN_20261020_CARDNEWS_MERGE.md` |
| INSTA 댓글·DM 자동화 | v1.24 | https://instagram-comment-reply.buylife.xyz | 연결 한 번에 댓글·DM 답변 초안, 승인 후 게시·발송, 텔레그램 봇 2개 | `instagram-comment-reply/docs/IMPROVEMENT_HANDOFF_20261020.md` |
| (병합됨) INSTA Cardnews | v1.32 | https://cardnews-studio.buylife.xyz → INSTA `/cardnews` | 화면 이동·API 전달만 | `cardnews-studio/AGENTS.md` |
| (병합됨) INSTA DM답변 | v1.17 | https://instagram-dm-reply.buylife.xyz → `/dm` | 화면 이동·API 전달만 | `instagram-dm-reply/AGENTS.md` |
| Threads 댓글자동화 | v1.15 | https://threads-comment-reply.buylife.xyz | 텔레그램 수정·공지 띠 | 폴더 `AGENTS.md` |
| 유튜브 댓글자동화 | v1.20 | https://youtube-auto-reply.buylife.xyz | 텔레그램 수정·공지 띠 | 폴더 `AGENTS.md` |
| 카카오톡 뉴스레터 | v1.29 | https://kakao-auto-posting.buylife.xyz | 텔레그램 수정·공지 띠 | 폴더 `AGENTS.md` |

독립 유지 결정: AI 인플루언서, AI 웹툰(인스타 게시 엔진만 공용), AI 4컷 만화(사용자 늘면 웹툰 「짧은 형식 모드」 합치기 재검토), YOUTUBE Shots. 블로그 병합은 Codex 담당.

## 3. 주인님 결정 사항(바꾸지 말 것)
- 병합 A·B 모두 요금·권한 그대로(INSTA 포스팅 FREE, 댓글·DM 일반 이상·같은 234명), **회원 본인 계정·본인 API 키 최상위 규칙 유지**.
- 병합 B 이름 「INSTA 댓글·DM 자동화」, 병합 완료 프로그램은 카탈로그 노출 중지.
- INSTA 댓글·DM은 INSTA 포스팅 대시보드 템플릿(「플로우 위저드 스타일 (인스타 바이럴 변형)」)으로.
- DM 봇 토큰은 그대로 사용(재발급 안 함, 주인님 결정).

## 4. 작업 과정 주의사항 (상세 `docs/ERROR_LESSONS.md` 2026-10-20 항목들)
1. **텔레그램**: `getUpdates`에 `allowed_updates=["message"]` 필수. 봇 하나에 웹훅 하나 → 승인 기능이 둘이면 봇 둘.
2. **앱 병합**: `CRON_SECRET` 파생 비밀값이 바뀜 → 옛 앱 기준 텔레그램 웹훅·Meta 웹훅 확인 토큰 재등록. 옛 앱은 `next.config`에 화면 redirect + API rewrite만, 프로젝트·도메인은 유지. DB 변경 전 `programs` 줄 백업(`docs/analysis-insta-consolidation-20261020/backup-programs-before-merge*.json`).
3. **공용 부품**: 형식 정의(`Database`) 있는 프로그램에선 `never` 오류 → 기준 코드에서 해결 후 `--sync`. 배포 직전 「미배포 사본」 목록 확인(공지 띠를 한 번 빠뜨려 재배포함).
4. **테마 전환**: 색상 토큰만 바꾸되 직접 적은 색 grep으로 찾기, 공지 띠 tone 맞추기.
5. **공용 문서**: HANDOFF·ACTIVE_WORK·PROGRAM_IDEA_BACKLOG가 다른 CLI 미커밋이면 내 줄만 `hash-object`+`update-index`로 올림.
6. **검수**: redirect는 `?t=` 붙여 캐시 피해서 확인. 창 최대화로 폭 조절이 안 되면 390px iframe으로 스타일 값 확인(보고에 구분).
7. **윈도우 CLI**: 긴 편집 스크립트는 heredoc 대신 파일로, CRLF 유지.

## 5. 남은 일 (우선순위)
1. (주인님 협조) 실제 고객 DM 왕복 시험 — 다른 계정 → 관리자 인스타 DM → `/dm/conversations`·텔레그램 DM 봇 초안 확인(발송 안 함).
2. INSTA 댓글·DM `/comments`·`/dm/conversations`·`/login` 다크 대비 크롬 점검.
3. 다음 배포 때 함께: 텔레그램 수정 5개(booking-reminder·crm-google-form·longtail-keyword-expander·real_estate_sales·trending-product-finder, 각 `AGENTS.md` 「(미배포)」), 공지 띠(웹툰 형식 보완 포함, 나머지 웹 프로그램은 `docs/SHARED_MODULES.md`).
4. 제안: 텔레그램 연동 공용 모듈화(`docs/SHARED_FEATURE_MAP.md` 10절), INSTA 포스팅 게시 글 → 댓글 모니터링 자동 연결.
5. 옛 `cardnews-studio/`·`instagram-dm-reply/` 폴더 앱 코드 정리 시점 — 주인님 결정 대기(삭제하지 않음).

## 6. 갱신한 공통 문서
`docs/PROGRAM_CAPABILITY_MAP.md`(목록 표 버전 5곳·카드 5개) · `docs/SHARED_FEATURE_MAP.md`(9·10절) · `docs/SHARED_MODULES.md` · `docs/ERROR_LESSONS.md` · `DESIGN.md` 47번 · `docs/PROGRAM_IDEA_BACKLOG.md` · `docs/HANDOFF.md` 맨 위.
