# 블로그 전담 세션 인수인계 (2026-10-24, 컴퓨터 재부팅 전)

- 넘기는 세션: Claude Code(윈도우, 메인 크롬) 블로그 전담 `claude-win-20261023-blog2`
- 받는 세션: 재부팅 뒤 이어서 작업할 블로그 전담 세션. 시작할 때 이 문서 → [`docs/HANDOFF_20261023_BLOG_SESSION.md`](HANDOFF_20261023_BLOG_SESSION.md)(앞 세션 인계) → `naver-blog-agent/docs/IMPROVEMENTS.md` 맨 아래 순서로 읽는다.
- 담당 범위: `ai-auto-blog`, `blog-keyword`, `blog-workroom`, `naver-blog-agent`, `naver-blog-allinone`, `naver-blog-auto-poster_web`(비공개), `naver-blog-seo-studio`, `tistory-auto-blog`, 관련 `blog-content-maker`.
- 작업 브라우저: 메인 크롬(deviceId `3208dd7d-d933-4487-a96f-61fbf8cf69dd`). 웨일 지정은 이전 세션 한정이라 끝났다.
- `docs/ACTIVE_WORK.md`의 `naver-blog-agent/` 줄(세션 `claude-win-20261023-blog2`)은 남겨 두었다 — 이어받는 세션이 자기 세션 이름으로 고친다.
- 재부팅 전 상태: 이 세션의 코드·문서 변경은 **모두 커밋 완료**(미커밋 0). 공용 스테이징에 옛 판으로 남아 있던 A-3 파일 3개는 경로 지정으로 스테이징만 HEAD에 맞췄다(작업 파일은 그대로).

## 1. 병합의 뜻 (주인님 정의 — 반드시 지킨다)
「병합이야 좋은 기능만 추가 하는거야」「중복되는건 제외하고 추가되면 좋은 기능을 한쪽으로 기능 개발확장하는 거야」. 원본 프로그램을 닫거나 데이터·권한을 옮기는 일은 병합에 들어가지 않는다.
- 결정된 방향(보고서 [병합/독립 표](analysis-blog-consolidation-20261020/REPORT.md#blog-merge-independent-20261023)): 독립 4개(에이전트·SEO 스튜디오·키워드·티스토리). 묶음 A: BLOG·올인원 → 에이전트 / 묶음 B: 작업실·콘텐츠 → SEO 스튜디오 / 묶음 C: 작업실 키워드 → 키워드.
- 진행 방식: 기능 하나씩 **플랜 보고 → 주인님 「진행해」 → 구현 → 검수 → (모아서) 배포**.

## 2. 묶음 A 진행 현황 (네이버 블로그 에이전트)

| 순서 | 기능 (출처) | 상태 | 근거 |
|---|---|---|---|
| A-1 | 참고 URL 본문 읽기·추가 지시문 (BLOG) | ✅ v2.16 배포 | `src/lib/referenceUrls.ts` |
| A-2 | 주제 관련 최근 뉴스 (BLOG) | ✅ v2.16 배포 `naver-blog-agent-5vxc7vkrv` | `src/lib/topicNews.ts` |
| A-3 | 사진 후기 방문 정보·근거 있는 FAQ (올인원) | ✅ v2.17 배포 | `src/lib/photoReview.ts`, `ai/photoReviewPipeline.ts` |
| A-4 | 화자 직접 입력·내 경험 메모·경험 질문 (올인원) | ✅ v2.17 배포 `naver-blog-agent-bu2m09y4n` | `src/lib/memberVoice.ts`, `api/experience-questions` |
| **A-5** | **본문 이미지를 다른 문단으로 옮기기 (BLOG)** | ⏸ **플랜 커밋 완료(`01682e6b6`), 주인님 승인 대기 — 코드 미수정** | [`PLAN_20261023_MERGE_A5_IMAGE_MOVE.md`](../naver-blog-agent/docs/PLAN_20261023_MERGE_A5_IMAGE_MOVE.md) |
| A-6 | 썸네일에 제목 글자 넣기 (올인원) | ⚪ 플랜 전 | — |
| A-7 | 메모·파일로 주제 입력 (올인원) | ⚪ 플랜 전 | — |

- 권장: A-5·A-6·A-7은 모두 AI 비용이 없으므로 **세 기능을 만든 뒤 v2.18로 한 번에 배포(빌드 1회)**. 버전은 실제 배포 때만 올린다.
- A-5 구현 요점: `src/lib/draftImages.ts`에 `moveImageMarker(content, slot, "up"|"down")` — `[IMAGE INSERT - 설명]` 표시를 한 문단 위/아래로 옮기고, 다른 표시를 지나치면 본문 이미지 목록 순서도 바꾼다(화면·확장은 N번째 표시에 N번째 사진을 끼움, `page.tsx` bodySlotIndex). 결과 이미지 카드에 「▲ 위 문단으로」「▼ 아래 문단으로」 버튼, 저장은 기존 지우기와 같은 `persistImages` 흐름(본문이 바뀌면 검수 표시 초기화).

## 3. 다음 묶음 (A가 끝난 뒤)
- 묶음 B(작업실·콘텐츠 → SEO 스튜디오): AI 최종 검수·최종본, 문체 영구 보관, 분량 조절, 이미지 비율·스타일, 서식 복사, 수정본 이력, 파일 내보내기, SNS 문구.
- 묶음 C(작업실 키워드 → 키워드 프로그램).

## 4. 미배포 대기
- `tistory-auto-blog` 긴 글 분량 보강(`utils/news/lengthPlan.ts`·`generator.ts`, GPT-4.1 실측 3,104자 통과) → 다음 티스토리 배포 v1.92 때 함께. 목록: `docs/PENDING_DEPLOYS.md`.

## 5. 주인님 결정·확인 대기
1. A-5 플랜 승인(「진행해」 또는 「A-5~A-7 묶어서」).
2. 경계 2건: 콘텐츠 메이커 독립 여부, BLOG를 무료 입구로 남길지.
3. v2.15 준비 모드 직접 발행 자동 감지 실제 확인 — 주인님이 준비 모드 원고를 직접 비공개 발행해 주셔야 함(최종 발행 클릭은 주인님).
4. 에이전트 확장 팝업 화면 확인(새 ZIP 받아 덮어쓰기 → `chrome://extensions` 새로고침).
5. BC-05, 자동 연결 ⑨(이전 보고 항목).

## 6. 작업 규칙 메모 (이 세션에서 실제로 걸렸던 것)
- 커밋: `node scripts/commit-paths.mjs "<msg>" <경로>... --as <세션>`, 공용 문서는 `safe-commit.mjs --begin` → 수정 → `safe-commit.mjs`. 푸시 전 `git show --stat HEAD | tail -1`.
- `docs/PENDING_DEPLOYS.md`는 CRLF라 줄 넣기 스크립트는 줄바꿈 종류를 감지해야 한다(한 번 제목 줄에 잘못 들어갔다 바로잡음).
- 시험: `naver-blog-agent/scripts/test-*.cjs`(26개, 모두 통과). 화면 함수를 떼어 실행하는 시험(`test-queue-confirmation`·`test-category-selection`)은 화면에 새 상태값을 넣으면 시험 환경에도 그 값을 넣어야 한다.
- 실제 AI 확인: 루트 임시 스크립트 + `node --env-file=.env.local`, 시험 계정 본인 키(`user_api_keys.provider='openai'`), 끝나면 임시 파일 삭제. 비용은 실행 전에 여쭙는다.
- 배포 전 Vercel 팀 `buylife`에 BUILDING/QUEUED 없는지 확인, 한 번에 하나.

## 7. 다음 첫 단계
1. 이 문서와 `naver-blog-agent/docs/IMPROVEMENTS.md` 맨 아래를 읽는다.
2. `docs/ACTIVE_WORK.md` 줄을 새 세션 이름으로 고친다.
3. 주인님께 A-5 플랜 승인을 다시 여쭙고, 승인되면 A-5 구현부터 시작한다.

프로그램 링크:
https://naver-blog-agent.buylife.xyz
