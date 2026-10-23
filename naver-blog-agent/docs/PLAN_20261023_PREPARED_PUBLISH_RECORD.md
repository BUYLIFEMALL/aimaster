# 준비 모드로 보낸 글의 「직접 발행 결과」 기록 — 개발 플랜 (v2.15 후보, 2026-10-23)

- 작성: Claude Code(윈도우) 블로그 전담 `claude-win-20261023-blog2`
- 상태: **구현·v2.15 배포 완료(2026-10-23, 주인님 「진행해」 승인, 빌드 1회). 남은 것: 실제 자동 감지 확인 1건(주인님 직접 발행)**
- 근거 지침: 루트 `docs/BLOG_AUTOMATION_COMPLETION_POLICY.md`(발행 결과 확인·기록까지가 완성 기준)

## 문제
- 진행 방식 「준비」(`execution_mode=prepare`)로 보낸 글은 확장이 편집기 입력·발행 설정까지만 하고 `/api/extension/finish`에 `prepared`를 보고한다(`extension/background.js` 345~348행 → 85행).
- 회원이 그 탭에서 직접 「발행」을 눌러도 아무도 감지하지 않아 보관함에 「발행 전 준비 완료」로 남고 글 주소·발행 시각이 비어 있다.
- 서버 `finish`는 `status='publishing'`인 글만 바꾼다 — 준비 완료(`prepared`) 뒤에는 결과를 받을 길이 없다. 원고 저장 경로(`src/lib/postSaveHandler.ts` 18행)도 `published`를 막는다(확장 결과로만 기록 — 이 원칙은 유지).
- 2026-10-23 실제 1건(원고 `ee52e188`)은 승인받아 운영 DB를 손으로 고쳤다.

## 지금 있는 것(재사용)
- 확장은 준비가 끝난 탭을 `preparedEditorTabs`(`{id, taskId, blogId, title, preparedAt}`)로 기억하고, 탭이 닫히면 지운다(`forgetTab`).
- 발행 확인 명령 `published`(`extension/editor.js` 283행): 탭 주소가 `blog.naver.com/<블로그>/<글번호>` 또는 `PostView.naver?blogId=&logNo=`이고, 편집기가 닫혔고, 화면 제목이 원고 제목과 같을 때만 `complete`와 글 주소를 돌려준다. 자동 발행 모드가 이미 이 명령으로 결과를 확인하고 있다.
- 탭 변경 감시 `chrome.tabs.onUpdated`(`background.js` 492행)가 있다.

## 방법 — A 자동 감지 + B 직접 입력(둘 다)

### A. 확장이 준비 탭의 발행을 스스로 감지(주 경로)
1. `chrome.tabs.onUpdated`에서 `preparedEditorTabs`에 있는 탭이 로딩을 마치면, 주소가 글 보기 주소일 때만 `published` 명령(제목 확인)을 실행한다. 몇 번(최대 약 10초) 다시 확인한다 — 네이버가 새 주소에 이전 글을 잠깐 보여 주는 경우 대비(기존 자동 발행 루프와 같은 `refreshUrl` 처리).
2. 확인되면 새 서버 경로 `POST /api/extension/prepared-published` `{taskId, postUrl}`(확장 토큰)로 보고하고, 서버 확인을 받은 뒤에만 그 탭을 `preparedEditorTabs`에서 뺀다. 보고 실패는 보관해 다음 연결 때 다시 보낸다(기존 `pendingResult`와 같은 방식, 결과 유실 방지).
3. 확장은 **아무 버튼도 누르지 않는다**(최종 발행은 회원). 읽기와 보고만 한다.

### B. 보관함에서 직접 입력(보조 경로)
- 확장이 감지하지 못한 경우(브라우저를 껐다 켬, 다른 PC·휴대폰에서 발행, 예약 발행, 옛 확장)를 위해 「발행 전 준비 완료」 카드에 **「직접 발행했어요」** 버튼 → 글 주소 입력 → 같은 서버 규칙으로 기록.
- 예약 발행은 주소가 아직 없으므로 B에서 「예약 시각」 입력은 이번 범위에서 빼고, 발행된 뒤 주소로 기록하도록 안내한다.

### 서버 규칙(A·B 공통, `src/lib/preparedPublish.ts` 한 곳)
- 본인 글(`user_id`)·`status='prepared'`·진행 방식 `prepare`일 때만 → `status='published'`, `post_url`, `published_at=지금`, 실행 기록 단계 `published`(메시지 「회원 직접 발행 확인」 / 「회원이 주소 입력」).
- 주소는 `https://blog.naver.com/<그 원고의 blog_id>/<숫자>` 또는 `PostView.naver?blogId=<blog_id>&logNo=<숫자>`만 받는다(다른 블로그·다른 사이트 거절). 저장은 `https://blog.naver.com/<blog_id>/<글번호>` 한 모양으로.
- 같은 주소로 다시 보내면 성공으로 응답(중복 보고 안전), 다른 주소면 409.
- A(확장)는 확장 토큰, B(화면)는 로그인+프로그램 권한(`checkProgramAccessApi`). 두 경로 모두 `dynamic`·`fetchCache` 선언.
- DB 칸 추가 없음(기존 `status`·`post_url`·`published_at`·`research_summary` 사용).

## 범위 밖
- 예약 발행의 자동 감지(준비 탭이 글 주소로 바뀌지 않음), 네이버 글 실제 공개 여부 원격 확인(`blog.naver.com`은 브라우저 도구 제한), 이미 「준비 완료」로 남은 다른 옛 글 일괄 정리.

## 구현 순서
1. 서버 `src/lib/preparedPublish.ts`(주소 검사·상태 변경) + 시험.
2. `POST /api/extension/prepared-published`(확장) · `POST /api/posts/[id]/prepared-published`(화면).
3. 확장 `background.js` 감지·보고·재보고 + 시험(`test:extension-tabs`/`test:extension-results`에 추가).
4. 보관함 카드 「직접 발행했어요」 입력(`src/app/(dashboard)/queue/page.tsx` 979행 근처).
5. 미배포 대기 중인 팝업 수정(폭 480px·버튼 한 줄)과 함께 **v2.15** — `lib/version`·manifest·ZIP·DB(`version`·`extension_version`) 같이.

## 검수
1. 무료: `tsc`, 기존 시험 전체 + 새 시험(주소 검사·상태 조건·중복 보고·다른 블로그 거절·감지 루프 가짜 탭).
2. 배포 뒤 웨일: 보관함 카드 「직접 발행했어요」 버튼·입력 오류 문구 화면 확인(실제 기록은 하지 않음).
3. 실제 자동 감지 확인은 **주인님 승인 1건**: 시험 원고 1개를 준비 모드로 보내고 주인님이 네이버에서 직접 비공개 발행 → 보관함이 「발행 완료」+주소로 바뀌는지 확인(`blog.naver.com`은 브라우저 도구로 열리지 않아 주인님이 발행 클릭).

## 비용
| 항목 | 횟수 | 계정 | 대략 |
|---|---|---|---|
| Vercel 빌드(v2.15 배포) | 1회 | 팀 `buylife` | 배포 1회분(승인 필요) |
| AI 호출 | 0회 — 원고 생성 없이 기존 원고로 시험 | — | 없음 |
| 회원 부담 | 없음 | — | 없음 |

## 버전·배포
- v2.15 한 번에(팝업 수정 + 이 기능). 회원은 「ZIP 다시 받기 → 덮어쓰기 → `whale://extensions` 새로고침」 필요(A는 새 확장부터, B는 화면만으로 바로).
