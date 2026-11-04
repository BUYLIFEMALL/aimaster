# [주인님 지시 전달] 맥미니 → 윈도우 요청 (2026-11-05)

작성: 맥미니 Claude Code `claude-mac-20261101-blog` [역할: mac-mini] · 대상: 윈도우 blog 세션(`claude-win-blog`) — 1·2번, 나머지는 그 프로그램 담당 세션
먼저 읽기: 루트 `docs/HANDOFF.md` 맨 위 두 항목 · `blog-neighbor-care/docs/PLAN_20261105_STAGE_C2.md`(승인됨)

## 1. `blog-neighbor-care` C-2(v1.18) — 이미 승인·구현 중, 함께 넣을 것
1. **글 제목 표시 수정**(`3256ee05b`, 시험 362 통과 확인됨) → v1.18 배포에 포함
2. 맥미니 발견 (1)(2)(4)(5)(6) → 플랜 §2-5대로(이미 반영됨, 빠진 것 없는지만 확인)
3. 검토 후보(구현 승인 아님 — 넣을지 주인님께 한 줄로 여쭐 것):
   - `IDEA-BNC-DUPCHECK-02` 댓글 직전 화면 중복 확인 + 네이버 제한 알림창이 뜨면 「제한 안내 · 그날 중지」
   - 근거 [`docs/analysis-marketing14-20261027/NBCL_DETAIL_20261105.md`](analysis-marketing14-20261027/NBCL_DETAIL_20261105.md) §9
4. 요청함 `22dd165f`(감시 AI 단가표 옛 모델 이름 교체)는 주인님이 채팅으로 승인 → 처리 후 `done`으로 닫기
5. 빌드 1회(승인 범위), 버전 화면·확장·ZIP·DB 함께, `check-extension-release` OK, 끝나면 요청함 report + 채팅 보고

## 2. v1.18 배포 뒤 맥미니 실물 확인 요청
- `docs/HANDOFF.md` 맨 위에 맥미니 확인 항목을 적어 주세요(시작하기 3단계·통합 동의 1번·자동 공감 1건·다른 앱 쓰기·창 가리기·탭 전환 시 잠시 멈춤·시간대 밖 안내). 검토 완료로 남은 공감 작업 `223437759653`이 있으니 자동 흐름과 겹치지 않는지도.

## 3. 다음 개발 참고 (지금 할 일 아님)
- `blog-neighbor-care` 추가 개발 A-1(방문자 수 범위)·A-2(신청 결과 상태): [`NBBB_DETAIL_20261105.md`](analysis-marketing14-20261027/NBBB_DETAIL_20261105.md) §4·§5에 원본의 방문자 수 자료 주소·결과 6상태 판정 문구 정리
- `IDEA-BNC-URLLIST-01` 대상 글 주소 목록 붙여넣기(검토 대기)

## 4. 다른 담당 세션 몫 (변경 없음, 확인만)
- 30일 열외 26개 프로그램 다음 배포 때 함께(`docs/PENDING_DEPLOYS.md`)
- 12월 모델 교체 묶음 A 4개, 12-05 점검(`docs/PLAN_20261103_MODEL_MIGRATION_DEC.md` §6)

## 지킬 것
본인 계정·본인 키 · 동시 빌드 금지(시작 전 진행 중 빌드 확인) · 커밋은 경로 지정 도우미 · 커밋 뒤 파일 수 확인 · `public/downloads/blog-neighbor-care-extension-v1.10.zip` 미커밋 변경은 건드리지 않음 · 끝에 비용 리포트
