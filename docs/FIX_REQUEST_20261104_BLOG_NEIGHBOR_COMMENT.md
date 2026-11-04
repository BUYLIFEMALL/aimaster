# 수정 요청 — `blog-neighbor-care` 확장: 댓글 0개 글에서 댓글 작업이 멈춤 (2026-11-04, 맥미니 → 윈도우 blog 세션)

작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini]
받는 쪽: 윈도우 `blog` 역할 세션 (`blog-neighbor-care` 담당, 이 폴더 미커밋 작업 중이라 맥미니는 코드를 고치지 않음)
주인님 지시: 「윈도우 세션에 확장 수정 요청해」(2026-11-04)
요청함 결과 기록: `06f6a907-e673-4e27-9871-2abeaafc5708`

## 1. 무슨 일이 있었나 (실제 시험, 맥미니 ego lite · 확장 v1.13 · 기기 `5888b26d`)
- 대상: `https://blog.naver.com/buylifeacademy/223406907419` (댓글 0개, 같은 글 공감 시험은 성공)
- 웹 쪽 준비는 모두 통과: 문장 생성(`claude-sonnet-5`) → 초안 저장 → 검토 완료 → 기기 허용 `like`·`comment` → 서버가 작업을 넘겨줌
- 확장 팝업 「현재 탭 실행 연결」 2회 모두: **「확인 필요 · 현재 작업 화면을 하나로 확인하지 못했습니다. 자동으로 다시 등록하지 않습니다.」**
  - 2회째는 주인님이 「댓글 쓰기」를 미리 눌러 입력 상자를 펼친 상태였다(입력 상자·「등록」 버튼은 보임, 댓글 목록은 비어 있음)
- 결과: **댓글 등록 안 됨(확실)** — 첫 확인(inspect) 단계에서 멈춤. 작업은 웹 기록에 「검토 완료 · 실행 전」으로 남아 있음 → 수정 뒤 **AI 재생성 없이 그대로 재시험 가능**

## 2. 원인 (코드로 확인, 실물 DOM은 미확인)
- `extension/work-dom.mjs` `snapshot()` 댓글 분기: `rows=list('commentRow',one('commentList'))`
- `one()`은 `list()`가 **보이는 요소**(`getClientRects().length>0`)만 세어 정확히 1개가 아니면 `fail()`
- 프로필 `docs/naver-dom-profile.v1.json`: `commentList` = `.u_cbox_content_wrap > .u_cbox_list`
- 댓글 0개 글은 `ul.u_cbox_list`가 **비어 있어 크기 0 → 보이지 않음으로 걸러짐 → 0개 → fail** → inspect가 `{unavailable:true}` → `work-bridge.mjs`의 「하나로 확인하지 못했습니다」
- 댓글이 있는 글에서만 시험됐다면(`tests/naver-real-profile.test.mjs`) 이 경우가 빠졌을 가능성

## 3. 고쳐 주실 것 (제안 — 판단은 담당 세션)
1. **댓글 0개 = 빈 목록으로 처리**: 댓글 영역(예: 입력 상자 `commentInput` 하나가 보이고, `commentPageLink` 0개)이 확인되면 `commentList`가 비어 있거나 크기 0이어도 `rows=[]`, `duplicate=false`로 진행. 단 「목록이 아직 안 열림」과 「정말 0개」를 구분할 근거(예: 네이버 댓글 수 표시 `0`, 또는 `.u_cbox_list`가 DOM에 존재하고 자식 0개)를 함께 확인해 fail-closed를 유지
2. `verify` 단계도 같은 규칙(등록 뒤에는 목록이 생기므로 기존 로직으로 확인되는지 시험)
3. **팝업 오류 문구를 원인별로**: 「댓글 목록을 찾지 못했습니다」 / 「허용이 꺼져 있습니다」 / 「지금 탭이 대상 글이 아닙니다」 등 (공감 시험 때 「입력값을 확인해 주세요」도 원인이 「탭이 글이 아님」이었음)
4. 시험: `tests/work-dom.test.mjs`에 「댓글 0개(빈 `ul`) + 입력 상자 펼침」 고정 화면 추가, 기존 시험 통과

## 4. 함께 고려할 개선 (급하지 않음)
- 문장 생성 실패 원인(AI 오류 / 품질 검사 탈락 / 저장 실패)을 화면·기록에 구분 — 지금은 `MESSAGE_UNCONFIRMED` 502 하나로만 남아 원인을 알 수 없음(1차 `claude-haiku-4-5` 실패)
- 팝업 「Edge 탭」 문구 → 「브라우저 탭」(ego·크롬에서도 씀)

## 5. 지켜 주실 것
- 버전 `v1.14`, manifest·ZIP·DB(`programs.version`·`extension_version`) 함께, `node scripts/check-extension-release.mjs blog-neighbor-care` OK
- **빌드·배포는 1회라도 주인님 승인 먼저**, 동시 빌드 금지
- `public/downloads/blog-neighbor-care-extension-v1.10.zip` 변경(현재 미커밋 상태)은 원인만 확인하고 건드리지 않음
- 30일 열외·12월 모델 교체도 이 프로그램은 미적용 — 같은 배포에 넣을지 판단(`docs/PLAN_20261103_MODEL_MIGRATION_DEC.md` 묶음 B)

## 6. 배포 뒤 재시험 (맥미니가 함)
- 주인님이 ego에서 확장 ZIP 다시 받기 → 덮어쓰기 → 새로고침
- 남아 있는 「검토 완료 · 실행 전」 댓글 작업으로 같은 글에서 1회만 실행(AI 비용 없음), 결과 불확실하면 재실행 금지

## 7. 처리 결과 (2026-11-04, 윈도우 [역할: blog] `claude-win-blog`)
- **v1.14 운영 배포 완료** — 배포 `blog-neighbor-care-7g86hwk6k` Ready, DB `version`·`extension_version` v1.14, `check-extension-release` OK, 라이브 ZIP 해시가 로컬과 같음
- 3-1 반영: 빈 목록은 「숨김 아닌 목록 정확히 1개 + 자식 요소 0개 + 입력 상자 1개 보임」일 때만 인정, 그 외는 그대로 멈춤. 추가로 찾은 문제: 같은 판정 때문에 댓글 열기 버튼이 **이미 펼친 댓글 칸을 다시 눌러 닫을 수 있었음** → 같은 함수로 막음(2회째 시험 실패의 원인일 가능성, 실물 미확인)
- 3-2: `verify`는 등록된 내 댓글(작성자·본문·번호)이 목록에 생겨야만 성공 — 0개 인정으로 성공이 되지 않음(NR20에서 확인)
- 3-3: 원인별 문구 — 「대상 글의 댓글 목록을 확인하지 못했습니다…」 / 「대상 글 본문 전체를…」 / 「로그인한 네이버 계정이 작업 계정과 다릅니다」 / 「지금 탭이 작업 대상 글이 아닙니다…」. 「허용이 꺼져 있습니다」는 서버 허가 단계라 이번에 넣지 않음. 확장 안내의 「Edge」→「브라우저」
- 3-4: `tests/naver-real-profile.test.mjs` NR20(0개+입력 펼침→등록·확인, 열기 버튼 안 누름)·NR21(입력 없음·내용 있는 크기 0 목록·다른 글 → 멈춤과 원인 코드), 전체 348 통과
- 4번(문장 생성 실패 원인 구분)·12월 모델 교체·30일 열외는 넣지 않음 → 개선 원장에 남김
- **재시험 요청(맥미니)**: 확장 ZIP 다시 받기 → 덮어쓰기 → 새로고침(팝업에 v1.14) → 남은 「검토 완료 · 실행 전」 작업 1회. 댓글 칸은 펼쳐 둬도 되고 접혀 있어도 됨

## 8. 맥미니 재시험 결과 (2026-11-04 19:59~20:02, ego · 확장 v1.14)
- 확장 팝업 v1.14 확인 → 대상 글 탭에서 「현재 탭 실행 연결」 1회 → **댓글 등록 성공**(네이버 화면 댓글 0→1, 18:47 표기, 검토한 문장 그대로)
- 웹 「작업 대기·결과 기록」: `댓글 · buylifeacademy · 성공 확인`(글 223406907419). 팝업은 「검토 완료된 실행 대상이 없습니다」(작업 소진). 다시 실행하지 않음
- 공감·댓글 모두 실물 시험 통과. 요청함 결과 `d64f4347`
- 참고: 시험 계정 기록에 「자료 보관 기한 2026-11-26」이 보임 — 30일 열외가 이 프로그램에 아직 미적용(개선 원장에 기록된 남은 일과 같음)

## 9. 추가 요청 — 30일 보관 열외 적용 (2026-11-04 주인님 결정, **11-26 전**)
- 주인님(채팅): 「블로그랑 똑같은데? 단 관리자 계정과 테스트 계정은 열외가 되어야지」 → **보관 기간 연장 지정은 하지 않음.** 일반 회원은 다른 블로그 프로그램과 같이 30일, `profiles.retention_exempt = true`(관리자·시험 계정)만 열외
- 지금 상태: 시험 계정 작업 기록에 「자료 보관 기한 2026-11-26」 표시 → 그날부터 오늘 시험 기록(공감·댓글 문장 등)이 정리되기 시작함
- 고칠 곳(코드로 확인): `src/lib/cleanup.ts`가 매일 03:20 부르는 정리 RPC 12개(`bnc_message_dispatch`·`bnc_reader_dispatch`·`bnc_analysis_dispatch`·`bnc_neighbor_import_dispatch`·`bnc_work_cleanup`·`bnc_execution_result_dispatch`·`bnc_engagement_cleanup`·`bnc_extension_context_cleanup`·`bnc_extension_execution_cleanup`·`bnc_accept_cleanup`·`bnc_post_cleanup`·`bnc_monitor_dispatch`)에서 열외 회원 제외. 화면의 30일 조회 숨김·「보관 기한」 표시도 열외 회원은 「무기한 보관」으로
- 기준: [`docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md`](PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md) (코드에 이메일 적지 않음, 회원 격리·RLS 그대로)
- 12월 모델 교체(묶음 B)와 같은 배포에 넣으면 빌드 1회로 끝남. 빌드는 주인님 승인 먼저
- 이번 요청은 맥미니가 기록만 했고 코드는 건드리지 않음
