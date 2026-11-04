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
