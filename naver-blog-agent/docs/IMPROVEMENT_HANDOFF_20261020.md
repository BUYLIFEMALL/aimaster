# 인수인계 2026-10-20 — v1.95 랭킹 글감·홈판형 글·간격 예약·쇼핑 커넥트 링크 (Claude Code, 윈도우)

- 프로그램: https://naver-blog-agent.buylife.xyz (v1.95)
- 플랜: [`PLAN_20261020_HOMEFEED_TREND_SCHEDULE.md`](PLAN_20261020_HOMEFEED_TREND_SCHEDULE.md)
- 커밋: `4d29dcc7`(기능) + 문서 커밋 / 배포: `naver-blog-agent-bii7slceg-buylife.vercel.app` Ready(프로덕션)
- DB(ref `esgxyikcnnvmlhygjkth`): `programs.version`·`extension_version` = v1.95, `check-extension-release.mjs naver-blog-agent` → OK (확장 코드 변경 없음, manifest·ZIP만 버전 동기화)

## 배경
주인님이 `D:\PDS\Naver Blog AI-Setup-0.1.0.exe`(Electron+Playwright, Gemini 전용 네이버 블로그 자동발행 앱)를 새 프로젝트로 할지 분석 요청 → 정적 분석(실행 안 함) 결과 약 70%가 기존 기능과 겹쳐 새 프로그램 대신 부족한 4개만 이 프로그램에 흡수(주인님 「4개 모두 진행」 승인). 원본 코드는 옮기지 않음. **가져오지 않은 것**: 원문 기사·남의 블로그 이미지 재사용(저작권), 네이버 ID/PW 저장·헤드리스 다계정 자동 로그인(보안·봇 탐지 §20), 앱 내장 라이선스 키.

## 바뀐 파일
| 파일 | 내용 |
|---|---|
| `src/lib/naverRanking.ts`(신규) | 연예 `api-gw.entertain.naver.com/ranking/most-viewed`, 스포츠 `api-gw.sports.naver.com/news/articles/popular`, 경제 `news.naver.com/main/list.naver?sid1=101`. 본문은 `…/news/article/{oid}/{aid}` JSON 또는 `#dic_area`. 고정 호스트만, 리다이렉트 금지, 텍스트만(이미지 제외), 100자 미만 기사 건너뜀 |
| `src/app/api/collector/route.ts` | `action:"ranking"` → 기존 `structureBlogCandidates`(회원 본인 AI 키). 글감 `method`는 `http`, 출처 `네이버 ○○` |
| `src/app/(dashboard)/collector/page.tsx` | URL 탭 안 랭킹 버튼 3개 |
| `src/lib/ai/articleFormats.ts`(신규) + `pipeline.ts` | `articleFormat: standard|homefeed`. 홈판형 규칙을 기획·작성 프롬프트에 덧붙임(프로그램 고유 문구, 원본 앱 프롬프트 미사용) |
| `src/lib/shoppingLinks.ts`(신규) + `pipeline.ts` + `api/generate` | 링크 검증(네이버 쇼핑 호스트·https·최대 5개) → AI 단계 뒤 코드로 삽입 + 대가성 문구 |
| `src/lib/extensionBridge.ts` | 확장 작업 만들 때 쇼핑 링크가 있고 문구가 없으면 맨 앞에 다시 붙임 |
| `src/lib/scheduleSlots.ts`(신규) + `postSaveHandler.ts` | 간격 예약 시각 배정·저장 검사(20분 이후, 10분 단위). PUT이 `is_reserved`/`scheduled_at` 허용, `is_reserved:false`면 시각 비움. 저장 버전 계산 항목은 바꾸지 않음(열린 화면 충돌 방지) |
| `src/app/(dashboard)/queue/page.tsx` | 일괄 전송 「바로 / 간격 예약」, 목록 순서대로 배정, ⏰ 배지 |
| 테스트 | `test:ranking`(LIVE=1이면 실제 네이버 호출), `test:homefeed`, `test-queue-confirmation.cjs`에 간격 예약 1건 추가, 기존 테스트 2곳 준비값만 보충 |

## 검수
- 로컬: `tsc --noEmit` 0, `npm run build` 성공, 전체 `test:*` 통과(post-review 57/57 포함), 실제 네이버 랭킹 3종 본문 수집(LIVE).
- 운영 크롬(관리자 계정): 사이드바 v1.95, 「연예 많이 본 뉴스」 → 운영 서버에서 수집 성공·글감 4건 생성(출처 「네이버 연예 많이 본 뉴스」), 생성 화면 「글 구성」·「쇼핑 커넥트 링크」 칸 표시 확인.
- 비용: 글감 정리 AI 1회(관리자 본인 키, 기본 모델). 원고 생성은 아래 이유로 호출 전 중단(비용 0).

## 못 한 것과 다음 첫 단계
1. **관리자 계정에 등록된 블로그 계정이 없어** 생성이 「본인 블로그 ID를 선택해 주세요」에서 멈춤 → 블로그가 등록된 테스트 계정(`buylifemall@naver.com`)으로 홈판형 + 쇼핑 링크 1건 생성, 본문에서 문구·링크 위치 확인.
2. 보관함 간격 예약은 원고가 없어 화면 확인 못 함 → 위 원고 2건 비공개 예약 등록 후 확장이 네이버 예약 목록에 올리는지 확인(실제 예약 글 삭제는 주인님 확인 후).
3. ~~스포츠·경제 버튼 운영 화면 미확인~~ → 2026-10-20 확인 완료: 운영 크롬(관리자)에서 스포츠·경제 각각 글감 4건 생성(출처 「네이버 스포츠 인기 뉴스」·「네이버 경제 최신 뉴스」), AI 2회 호출(관리자 본인 키).

## 2026-10-20 오후 테스트 계정 실검수 (v1.96)
- 계정 `buylifemall@naver.com`(블로그 `buylifemall`·`nailnbody`, 본인 키). 크롬 운영 화면.
- **홈판형 + 쇼핑 링크 생성**(연예 랭킹 「솔비」 글감, `gpt-4o-mini`, 이미지 1장, 시험 링크 `https://naver.me/testlink01`): 검수 PASS·본문 1940자·소제목 4개·제목 24자, 대가성 문구 맨 첫 줄 1회, 링크는 첫 소제목 끝(두 번째 소제목 앞) ✅. 원고 `422c467b`(초안, 검수 STALE — 대표 이미지가 붙으며 바뀜, 기존 동작).
- **⚠ 사실 왜곡 발견**: 홈판형 규칙(「자료에 있는 사실만」)에도 `gpt-4o-mini`가 원문에 없는 내용(「지인의 소개로 만났고…」)을 지어냄 → 실존 인물 글이라 회원 확인 기록을 대신 남기지 않고 예약 대상에서 제외. 개선 필요(아래 제안 ①).
- **간격 예약 2건**(검수 확인된 시험 원고 `0591ccb4`·`eeffb40b`, 비공개, 14:10·14:40 = 30분 간격): 일괄 등록 2/0 → DB `is_reserved=true`, `scheduled_at` 05:10Z·05:40Z, `private` 저장 ✅ → 확장이 차례로 가져가 `publishing` → **`prepared`**. 두 원고는 진행 방식이 「발행 전 준비까지만」으로 저장돼 있어 확장이 예약 설정까지 채우고 **최종 「예약 발행」 버튼은 누르지 않음**(의도된 안전 동작). 네이버 예약 목록 등록 여부는 회원이 열린 글쓰기 창에서 최종 버튼을 눌러야 확인 가능.
- **v1.95 버그 → v1.96 수정**: `GET /api/posts`가 `is_reserved`·`scheduled_at`을 응답에서 빼서 ⏰ 예약 배지가 새로고침 뒤 사라짐 → 응답에 두 칸 추가.
- **기존 문제 발견**: 생성 화면 블로그 목록이 서버(`/api/accounts`)가 아니라 브라우저 `nba_accounts_local`에서만 읽힘 → 설정 화면을 열기 전엔 비어 있고, 같은 브라우저에서 계정을 바꾸면 이전 계정 목록이 남을 수 있음(제안 ②).
- **검수 자동화 주의**: 생성 화면 「보관함 저장」·보관함 일괄 전송은 `alert`/`confirm` 창을 띄워 브라우저 자동 조작이 멈춘다 → 검수 탭에서만 `window.confirm/alert`를 바꿔 두고 진행.
- 비용: AI 원고 생성 1회(4단계, `gpt-4o-mini`) + 이미지 1장(NanoBanana 1K), 테스트 계정 본인 키.

### 제안
① 홈판형 글은 작성 뒤 「원문 근거 대조」 단계(blog-workroom `quoteInText`/`copiesSource` 방식)를 넣어 원문에 없는 문장을 표시 ② 생성 화면이 서버 계정 목록을 직접 불러오고, 로그인 계정이 바뀌면 브라우저 캐시를 비우기 ③ `alert`/`confirm`을 화면 안 알림으로 바꾸면 회원 화면도 덜 끊기고 자동 검수도 가능

## v1.97 (같은 날, Claude Code) — 글감 근거 전달·원문 대조·단건 예약·랭킹 점검·홈판형 바로 쓰기·블로그 목록 서버 연동
- 플랜 `PLAN_20261020_SOURCE_GROUNDING_SCHEDULE_UX.md`(6개 승인). 커밋 `3d5473e8`, 배포 `naver-blog-agent-fjw4ly8ic` Ready, DB v1.97·확장 검증 OK. 테스트 `test:homefeed`(근거·대조 2건 추가)·`test:ranking`(점검 1건 추가) 포함 전체 통과.
- 크롬 테스트 계정 검수: 수집 화면 v1.97·랭킹 점 3개 모두 「정상」 / 블로그 캐시를 지운 상태에서 「🏠 홈판형으로 바로 쓰기」 → 홈판형 자동 선택·블로그 2개가 서버에서 채워짐 / 같은 솔비 글감으로 재생성(`gpt-4o-mini`, 이미지 1장): 지난번 「지인 소개로 만남」 같은 지어낸 경위 사라지고 글감의 「마지막 사랑」·「사과 선물」을 사용, 검수가 근거 없는 문장 5개를 찾아 WARN 표시(일부는 「~것 같아요」 의견 문장 — 오탐 경향), 분량 1,415자로 부족(근거가 3문장 요약뿐) / 보관함 발행 설정 「예약 발행」 15:40 저장 → ⏰ 배지·DB 확인 → 「바로 발행」으로 되돌리면 예약 지워짐.
- 비용: 생성 1회 + 이미지 1장(테스트 계정 본인 키). 랭킹 점검은 무료.
- 미배포: 발행 설정 저장 안내 조사 「예약를→예약을」(코드만 반영, 다음 배포 때 함께).
- 다음 제안: 글감에 기사 원문 일부 보관, 원문 대조를 사실 주장 문장으로 좁히기, `alert`/`confirm` 화면 안 알림으로 교체.

## v1.98·v1.99 (같은 날, Claude Code) — 글감 원문 보관·대조 좁히기·화면 안 알림
- 플랜 `PLAN_20261020_SOURCE_TEXT_DIALOGS.md`(A·B·C 승인). 커밋 `96c85140`(v1.98)·`510e3e8d`(v1.99), 배포 `naver-blog-agent-ix6hsuptd` Ready, DB v1.99·확장 OK, 전체 테스트 통과.
- 테스트 이름 변경 대응: 기존 테스트가 가짜 `alert`/`confirm`을 넣던 곳에 `notify`/`askConfirm`을 같은 동작으로 추가. 카테고리 테스트는 확인 창이 비동기가 되며 화면 첫 서버 동기화가 끼어들어 실패 → 실제 화면처럼 첫 동기화가 끝난 뒤 조작하도록 대기 한 줄 추가(기대값 변경 없음).
- 크롬 검수(이번엔 관리자 계정 로그인 상태): v1.98 글감 삭제 버튼 → **화면 안 확인 창** 표시·「취소」로 닫힘·글감 유지 ✅ / 연예 랭킹 수집 → `source_text` 4,000자 저장됐으나 **4개 글감이 같은 묶음 앞부분을 공유**하는 문제 발견 → v1.99에서 글감별 기사 선택 → 스포츠 랭킹 재수집 시 4개가 각자 자기 기사(토트넘·마서영·아시안컵·전예슬, 1,135~1,884자) 보관 ✅. AI 호출 2회(관리자 본인 키).
- 못 한 것: 원문 보관 뒤 홈판형 **재생성 품질 비교**(분량·대조 경고 수) — 관리자 계정은 블로그가 없어 생성 불가. 테스트 계정 로그인 후 1회 필요.

## 주의
- 랭킹 주소는 네이버 **비공식** 주소다. 응답 모양이 바뀌면 「형식이 바뀌어 읽지 못했습니다」/「…를 불러오지 못했습니다. URL 수집을 이용해 주세요」로만 실패하고 다른 기능에는 영향 없음.
- 예약 시각은 확장이 10분 단위로 올림하므로 배정도 10분 단위다. 즉시 일괄 전송은 `is_reserved:false`를 함께 보내 이전 예약을 지운다.
