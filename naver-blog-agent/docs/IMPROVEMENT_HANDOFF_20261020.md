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
3. 스포츠·경제 버튼은 로컬 실호출만 확인(운영 화면 미확인).

## 주의
- 랭킹 주소는 네이버 **비공식** 주소다. 응답 모양이 바뀌면 「형식이 바뀌어 읽지 못했습니다」/「…를 불러오지 못했습니다. URL 수집을 이용해 주세요」로만 실패하고 다른 기능에는 영향 없음.
- 예약 시각은 확장이 10분 단위로 올림하므로 배정도 10분 단위다. 즉시 일괄 전송은 `is_reserved:false`를 함께 보내 이전 예약을 지운다.
