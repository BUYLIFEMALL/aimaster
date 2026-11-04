# [주인님 지시] blog-neighbor-care 단계 C — C-1 착수 (플랜 승인 완료)

작성: 2026-11-04 맥미니 Claude Code `claude-mac-20261101-blog` · 대상: 윈도우 blog 세션(`claude-win-blog`)

먼저 읽기: [`PLAN_20261104_STAGE_C_AUTOPILOT.md`](PLAN_20261104_STAGE_C_AUTOPILOT.md) §5 맨 위 「주인님 결정」(커밋 `ef85fdad9`) · 루트 `docs/HANDOFF.md` 맨 위

## 결정 3가지 (모두 추천안)
1. **창 선택 조건: 가안** — 대상 탭이 화면에 보이면 이어가고, 가려지면 정독 시계만 멈췄다가 이어서. 누르는 순간 확인은 지금처럼 엄격.
2. **자동 승인**: 공감·답방·받은 신청 수락은 자동, 댓글은 품질 검사 통과 시 자동 + **댓글 하루 상한 기본 3건**으로 시작(10건 상향은 나중에 주인님 확인). 공감 30·수락 10은 그대로.
3. **배포 2회**: 이번은 C-1만. C-2는 맥미니 실물 확인 뒤.

## 이번 작업 = C-1 (플랜 §2 C-1 + C-3 작은 수정 (5)~(9))
- 정독 대기 창 조건 변경(`extension/work-bridge.mjs`)
- 같은 글·같은 동작 작업을 만들 때부터 차단 + 작업 기록에 글 번호 표시
- 대상 글을 프로그램이 열고 실행(기존 순회 기능 재사용)
- 확장 실행 동의는 처음 한 번(범위가 넓어질 때만 다시)
- 작은 수정: 결과 문구 위치, 공감은 「계정·대상 확인」만, 검토 완료 뒤 버튼 정리, 팝업 「Edge」·「운영 기능은 아직 꺼져 있습니다」 문구, 모델 선택지를 `docs/AI_MODEL_CATALOG.md`대로

## 순서
1. 요청함 `45e9aa05` 처리 확인(이미 applied면 그대로)
2. 구현 → 기존 시험 전부 + 새 시험(창 가림·중복 차단·동의 유지) 통과
3. 빌드 1회(플랜 비용표 범위 안 승인). 시작 직전 진행 중인 빌드 확인, 동시 빌드 금지
4. 버전 v1.17: 화면·확장 manifest·ZIP·DB(`version`, `extension_version`) 함께 → `node scripts/check-extension-release.mjs blog-neighbor-care` OK
5. 요청함 report + 채팅 보고. 「처음 설정 ○단계 · 매일 조작 ○번 · 동의 ○번」 전후 수치 포함
6. 맥미니 실물 확인 요청을 `docs/HANDOFF.md` 맨 위에: 공감 1건 + 실행 중 다른 앱 쓰기 + ego 창 가리기

## 지킬 것
- 본인 계정·본인 키, 상한, 결과 불확실 시 재실행 금지, 막히면 멈추고 알림
- 봇 탐지 원칙(`docs/PLATFORM_PATTERNS.md` §20): 숨은 탭에서 누르지 않음
- 데이터 보관 규칙(`blog-neighbor-care/AGENTS.md` 맨 위) 그대로, `public/downloads/blog-neighbor-care-extension-v1.10.zip` 미커밋 변경은 건드리지 않음
- 커밋은 경로 지정(`scripts/commit-paths.mjs`, 공용 문서는 `scripts/safe-commit.mjs`), 커밋 뒤 파일 수 확인
- 끝에 비용 리포트

## 나중에 (이번 범위 아님)
- 「문장 만들기 실패 원인 구분」(지금은 `MESSAGE_UNCONFIRMED` 502 하나로만 남음)은 C-2 시작 때 주인님께 다시 여쭌다.
