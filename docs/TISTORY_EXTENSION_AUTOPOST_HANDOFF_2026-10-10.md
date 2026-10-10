# 티스토리 자동 포스팅 업그레이드 — 인수인계 (tistory-auto-blog v1.57 ~ v1.59, 2026-10-10)

> 대상: `tistory-auto-blog`(티스토리(원문)생성 자동화, https://tistory-auto-blog-pearl.vercel.app)와 그 크롬 확장 `tistory-auto-blog/extension/`.
> 목표: **BLOG에서 최종 글을 완성해 "티스토리 입력기로 보내기"를 누르면, 확장이 알아서 티스토리 새 글에 발행 직전까지 입력한다.** 최종 저장·발행은 회원이 직접 누른다.
> 이식 원본: `ai-auto-blog`의 같은 개선 — [`BLOG_EXTENSION_AUTOPOST_HANDOFF_2026-10-10.md`](BLOG_EXTENSION_AUTOPOST_HANDOFF_2026-10-10.md). 이 문서는 **티스토리에서 달라진 점과 이식 과정**만 정리한다.
> 티스토리 고유 장애 이력·금지 사항: `tistory-auto-blog/docs/OPERATIONS_HANDOFF.md`(9절에 이번 구조 변경 요약). 버전별 상세: `tistory-auto-blog/AGENTS.md`.

## 1. 이식 전후 비교 (v1.56 → v1.59)

| 구분 | v1.56 (이식 전) | v1.59 (지금) |
|---|---|---|
| 시작 | 사이드패널에서 글 선택 → "입력" 버튼 | 보내면 **30분 안에 자동 시작** |
| 실행 위치 | 사이드패널 페이지(1,359줄 한 파일, 패널을 닫으면 중단) | **백그라운드 작업기** + core/engine/adapter 분리 |
| 서버 | 글 목록 API + 단순 상태 보고 | `task`(대기 글 가져가기), 실행 번호·3분 임대·45초 하트비트, 결과 검사(409/멱등/`success·persisted·status`) |
| 결과 보고 | 한 번 보내고 실패해도 무시 | 서버 저장 확인까지 보관·재보고(입력은 재실행하지 않음) |
| 시작 화면 | 회원이 직접 연 탭에서 시작 | **항상 새 탭**(`<블로그>.tistory.com/manage/newpost`), 로그인 대기·본인 블로그 확인·빈 편집기 2초 안정 확인 |
| 카테고리·태그·발행 설정 | 사이드패널에 직접 입력 | **BLOG에서 글마다 선택해 글과 함께 전송**(카테고리는 확장이 읽어 준 목록) |
| 알림 | 없음 | 크롬 알림(발행 직전 준비 완료·입력 완료·입력 중단) |
| 시험 | 배너 시험 3개 | 확장 55개 + 서버 34개 |

## 2. 처리 과정

| 버전 | 내용 | DB |
|---|---|---|
| v1.57 | **서버**: 자동 입력 큐(`/api/extension/task`, `heartbeat`, 강화된 `input-result`), `utils/extensionTask.ts`, `utils/tistoryPublish.ts`(발행 설정 검증), 보내기 API가 `{publish}` 저장·실행 보호 | `tistory_posts`에 `tistory_run_id`, `tistory_lease_expires_at`, `tistory_publish` 3칸 추가(주인님 승인, `supabase/migrations/0002_…`) |
| v1.58 | **웹**: 글 보기 화면의 발행 설정 패널(`components/TistoryPublishPanel.tsx`: 카테고리·공개/비공개·댓글·홈주제·현재/예약), 마지막 설정을 기본값으로(`GET /api/posts/tistory-publish-default`) | 없음 |
| v1.59 | **확장**: 입력 코드를 사이드패널 → 작업기로 이전, 사이드패널 정리, 알림, 이미지 사전 확인, 카테고리 목록 읽기(`web-bridge.js`), 설정 화면·보내기 안내 문구 갱신, 죽은 offscreen 코드 삭제 | 없음 |

## 3. 핵심 설계 결정

1. **검증 방식은 BLOG와 다르다.** BLOG는 문서 단위 "정확 비교"를 쓰지만, 티스토리는 TinyMCE가 HTML을 재구성(공백·`&nbsp;`·엔티티·태그)하므로 문서 전체의 문자열 완전 일치는 정상 입력을 실패로 오판한다(실제 장애: 29개 중 7개 중단). 그래서 **원문 문단마다 앞·뒤 48자 조각을 본문에서 찾고(`TistoryCore.verificationSamples/matchTextBlocks`) 제목·목록·인용·표·링크 같은 의미 구조가 남았는지(`expectedStructure`)** 확인한다. 이 규칙은 `OPERATIONS_HANDOFF.md` 3절 원칙 3과 같다.
2. **입력 함수는 새로 쓰지 않고 그대로 옮겼다.** `tistory-adapter.js`의 TinyMCE MAIN world `insertContent`, 이미지 붙여넣기(PNG 변환+90초 확인), 태그 칩 확인, 신뢰된 포인터 클릭(공개 범위·홈주제), 발행 설정 적용, 저장 원본 동기화는 v1.56 `sidepanel.js`에서 **함수 본문을 코드로 추출해 옮긴 것**(생성 시 화면 갱신 `$("inputStatus")`만 상태 알림 `say`로 교체)이라 실제 화면에서 확인된 동작이 바뀌지 않았다. 입력 순서·검증·중지 판단만 `tistory-engine.js`가 맡는다.
3. **같은 단계를 재입력하지 않는다**(예외: 서식 블록 텍스트가 통째로 사라진 경우 그 블록 글자 1회 복구 — 기존 동작). 부분 입력된 글은 발행하지 않고 BLOG에서 다시 보내 새 빈 글에서 입력한다.
4. **보호글(비밀번호)은 자동 입력에서 제외**(주인님 결정): 비밀번호를 DB·확장 저장소에 두지 않기 위해서다. 서버가 거절하고 화면에 안내한다. 필요하면 티스토리에서 직접 보호로 바꾼다.
5. **홈주제는 기본 목록에서 고른다**: 빈 새 글에서는 티스토리가 발행 설정창을 열지 않아 실제 목록을 읽을 수 없다. 입력 때 현재 티스토리 목록과 **정확히 일치하는 항목만** 선택하고, 없으면 선택하지 않고 `completed`+경고로 남긴다.
6. **카테고리는 번호 없이 이름(`aria-label`)으로만** 구분된다. 카테고리 목록은 확장이 새 탭에서 `#category-btn` 목록을 읽어 주며(선택·발행 없음), 불러온 목록에 없는 선택은 해제한다.
7. **이미지는 입력 전에 작업기가 주소를 확인**(HEAD→안 되면 GET)해 사라진 이미지(보관 30일 경과)는 건너뛰고 경고한다.
8. **옛 확장(v1.56 이하) 호환**: 글 목록 API와 실행 번호 없는 `input-result` 보고는 그대로 동작한다(새 큐는 v1.59부터).

## 4. 주의사항

- **최종 `#publish-btn`은 어디에서도 찾거나 누르지 않는다.** 시험(`tests/extension-adapter.test.cjs`)이 어댑터·엔진·작업기 소스에서 이 선택자가 없음을 검사한다.
- 확장 운영 규칙(루트 `CLAUDE.md` 원칙 10): 버전 올리기 = `utils/version.ts` → 빌드(ZIP·manifest 자동) → DB `programs.version·extension_version·extension_download_url` 갱신 → `node scripts/check-extension-release.mjs tistory-auto-blog`로 `OK` 확인. 배포: `cd tistory-auto-blog && vercel deploy --prod --yes --scope buylife`.
- 회원 PC의 확장은 자동 업데이트되지 않는다 — "ZIP 다시 받기 → 기존 폴더에 덮어쓰기 → `chrome://extensions` 새로고침 → 사이드패널에서 **블로그 이름 저장**"을 안내한다. 블로그 이름을 저장하기 전에는 자동 입력이 시작되지 않는다.
- 어댑터의 편집기 안 주입 함수(TinyMCE·태그 칩·발행 설정창)는 가짜 화면으로 시험할 수 없다 — **실제 티스토리 화면 확인이 필수**다. 이 환경의 브라우저 도구는 외부 로그인 서비스 접근이 막혀 실제 검증은 주인님 PC에서만 가능하다.
- 입력 속도(CDP 한 글자씩 70~170ms)는 §20 봇 탐지 회피 규칙이므로 덩어리 입력으로 바꾸지 않는다.
- DB 스키마·환경변수·비밀 키 변경·유료 호출·회원 대신 최종 발행은 사전 승인 사항.

## 5. 아직 확인되지 않은 것 (주인님 PC 실제 시험 필요)

1. 새 탭 시작: `https://<블로그>.tistory.com/manage/newpost/?type=post&returnURL=…`이 로그인된 계정에서 빈 글쓰기 화면으로 열리는지, 로그인이 필요한 경우 복귀가 되는지.
2. **임시저장 이어쓰기 대화상자**: 티스토리가 이를 네이티브 확인창으로 띄우면 화면 조사가 응답하지 않는다 — 작업기는 "확인 대화상자" 안내를 띄우고 최대 5분 기다린다(회원이 취소를 눌러 빈 새 글로 시작). 실제 동작 확인 후 필요하면 자동 처리를 추가한다(선택자를 추측하지 말 것).
3. 자동 시작(30분 창)·완료 알림·카테고리 불러오기·글별 발행 설정(비공개/댓글/홈주제/예약) 적용.
4. 이어받은 후속 후보: 에이전트(`naver-blog-agent`)와의 공용 엔진화는 `SHARED_NAVER_ENGINE_PROPOSAL_2026-10-10.md` 참고(티스토리는 별도 편집기라 어댑터만 다름).

## 6. 시험 명령

```bash
cd tistory-auto-blog
npm run test:extension       # 규칙 9·엔진 16·어댑터 14·작업기 16 (55개)
npm run test:extension-api   # 서버 API 34개(가져가기·임대·하트비트·보내기·발행 설정 검증·기본값·옛 확장 호환)
npm run test:update-banner   # 새 버전 안내 3개
npx tsc --noEmit && npm run build   # 빌드가 ZIP·manifest를 현재 버전으로 자동 생성
node ../scripts/check-extension-release.mjs tistory-auto-blog
```
