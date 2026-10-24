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
| A-5 | 본문 이미지를 위/아래 **소제목**으로 옮기기 (BLOG) | ✅ v2.18 배포 `naver-blog-agent-mejx4uje3` | `src/lib/draftImages.ts` `moveImageMarker` |
| A-6 | 대표 이미지에 제목 글자 넣기·되돌리기 (올인원) | ✅ v2.18 배포 | `src/lib/thumbnailTitle.ts` |
| A-7 | 메모·텍스트 파일로 글감 만들기 (올인원) | ✅ v2.18 배포 | `src/lib/memoSource.ts`, `api/collector` `memo` |

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

## 8. 2026-10-24 갱신 — 묶음 A 완료
- A-5·A-6·A-7 구현 → v2.18 배포(빌드 1회) → 크롬 확인 완료. 상세: `naver-blog-agent/AGENTS.md` 맨 위, `naver-blog-agent/docs/IMPROVEMENTS.md` 맨 아래.
- 미배포 대기 1건: 글자 넣은 대표 이미지 카드 전체 표시 `9ee3cb3d8`(다음 에이전트 배포 때 v2.19).
- **다음 첫 단계:** 묶음 B(작업실·콘텐츠 → SEO 스튜디오) 기능 하나씩 플랜 보고 → 승인. 먼저 `naver-blog-seo-studio` 작업 중 표·인수인계를 확인한다.
- 주인님 결정 대기는 §5 그대로(경계 2건, v2.15 자동 감지 실제 확인, 확장 팝업 확인, BC-05·자동 연결 ⑨).

## 9. 2026-10-24 갱신 — 묶음 B 진행(SEO 스튜디오 v2.14·v2.15 배포)
- B-1 AI 검수 6영역·필수 지적 발행 차단 / B-2 문체 영구 보관(주인님 A안) / B-3 분량 선택 → v2.14. 「길게」 보강 + B-4 이미지 비율·표현 방식·참고 사진 → v2.15. 상세: `naver-blog-seo-studio/AGENTS.md` 맨 위.
- **다음 첫 단계:** 묶음 B-5(서식 포함 HTML·TXT 복사, 작업실) 플랜 → 이후 B-6 수정본 이력·비교, B-7 MD·HTML 내보내기, B-8 SNS 문구(콘텐츠 메이커).
- 남은 판단: 「길게」는 저가 모델 한계(3,200~3,300자) — 상위 모델 확인(A안)·목표 조정(B안)은 주인님 지시 대기. 이 세션 하단 상태바가 안 보임(Orca 세션이 상태바 명령을 부르지 않음 — `/exit` 후 `claude --resume f46f5aa0-319c-44c3-9fa0-d7bf2a06aa16`로 다시 열면 해결 예상).

## 10. 2026-10-24 갱신 — 블로그 기능 상세 비교표(기준 문서) · 도톨이 D-1~D-4 검토 (세션 `claude-win-20261024-blog3`)
- 재부팅 뒤 이어받은 세션. 작업 브라우저는 **메인 크롬**(deviceId `3208dd7d-d933-4487-a96f-61fbf8cf69dd`) — 주인님 지시로 웨일 대신 크롬.
- **기준 문서:** [`docs/BLOG_FEATURE_MATRIX.md`](BLOG_FEATURE_MATRIX.md) — 블로그 개발·확장 전에 먼저 읽는다. 기능을 배포하면 같은 커밋에서 해당 칸·변경 이력을 고친다(§0 쓰는 법). CLAUDE.md·AGENTS.md·GEMINI.md 블로그 완성 기준 아래에 안내 줄이 있다.
- 비교 분석 보고서: [REPORT 2026-10-24 절](analysis-blog-consolidation-20261020/REPORT.md#blog-compare-20261024) `6b861f6ce`. D 플랜 검토·확장표: `naver-blog-seo-studio/docs/PLAN_20261024_DOTORI_D1_D4.md` 끝 `b26bfcfd7`.
- D 플랜 수정안(승인 대기): ① D-3에 작업실 「제안 반영」 이관 누락분(지적별 버튼)과 검수 2영역 포함 ② D-4 유튜브는 회원 Gemini 영상 읽기(`ai-auto-blog/utils/ai/shortsAnalysis.ts` 방식), 실패 시 붙여넣기 ③ 링크 읽기를 공용 기준 코드 후보 구조로(`safe-fetch` 사본) ④ v2.17에는 D만 ⑤ 비용: 시험 AI 4~6회(약 50~150원) + 유튜브 Gemini 1회(약 10~30원), 빌드 1회.
- **다음 첫 단계:** 주인님 「진행해」 → `docs/ACTIVE_WORK.md`의 `naver-blog-agent/` 줄을 이 세션 이름·`naver-blog-seo-studio/`로 고침 → D-1(어조 강도)부터.
- 주인님 결정 대기: 묶음 C 시작 시점, 경계 2건·BLC-15, 경험 창작형(보류 추천), 올인원 컬러 테마·인터랙티브 요소, 이전 §5 항목.
- 푸시 대기 커밋: `b26bfcfd7`·`6b861f6ce`·이번 기준 문서 커밋(작업 단위로 모아서 푸시).
