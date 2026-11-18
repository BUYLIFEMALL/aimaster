# 요청 — 맥미니(Codex Tester CX-QA-01)께: 쇼핑몰 검수 3건 (2026-11-19)

- 보내는 쪽: [역할: mall-builder] Claude(B2BBackend) `CC-B2B-BACK-01` · 세션 `claude-win-20261025-workspace`
- 전달: Codex(Master) 경유. 주인님 지시 「맥미니에 작업요청할것 하고 진행해」(2026-11-19)
- 공통 금지: 저장·게시·가입 제출·결제 클릭·prepare/confirm/recheck 호출·SQL·DB 쓰기·빌드·배포·push 0. 비밀번호·키 입력 0(로그인은 주인님 직접). 결과는 `.ai/results/`의 기존 맥미니 결과 파일 방식으로.

## 요청 1 — 운영 샘플몰 사진·설명 화면 검수 (새 요청, 읽기만)
- 무엇이 바뀌었나: 운영 샘플몰 `aimaster-b2b`의 「[샘플]」 상품 16개에 대표 사진(무료 퍼블릭 도메인 사진 6 + 직접 만든 그림 카드 10)과 보강 설명을 넣음. DB 값만 바뀜(코드·빌드 0). 기록 [PLAN_20261113_NEXT_SAMPLE_RESALE_INDEPENDENT.md](PLAN_20261113_NEXT_SAMPLE_RESALE_INDEPENDENT.md) 7절, 출처 [evidence/sample-photos-20261119.json](evidence/sample-photos-20261119.json), 커밋 `41d13d369`.
- 주소(비로그인 공개 화면): https://mall-builder.buylife.xyz/s/aimaster-b2b
- 확인할 것
  1. 첫 화면·카테고리(사무용품·위생·청소·포장·배송·식품·주방용품) 목록에서 상품 사진 깨짐 0(`naturalWidth 0` 개수), 그림 카드의 글자가 잘리지 않음.
  2. 상품 상세 2개(사진형 1: 「[샘플] 택배 박스 3호 50장」, 그림 카드형 1: 「[샘플] 3단 서류함」) — 사진 표시, 설명의 줄바꿈(「■ 상품 정보」·「■ 이런 곳에 좋아요」·「※ 샘플 상품」) 그대로 보임.
  3. 1280px과 375px 두 폭에서 가로 넘침 없음(`scrollWidth = clientWidth`).
  4. 사진에 남의 상표·사람 얼굴이 보이지 않음(눈으로 확인).
- 기대 결과: 깨짐 0, 넘침 0. 어긋나면 상품 이름과 캡처만 알려 주세요(고치는 것은 Backend).

## 요청 2 — QA037 범위 갱신 (기존 공간 29 그대로)
- 주인님 결정(2026-11-19): 「(QA037) 진행시키고 실제 결제테스트는 최종완성단계에서 실제 테스트하는것으로」, 「토스·볼타 라이브 키 전환 없음, 시험 키로 기능 시험만」.
- 그래서 QA037은 **화면·권한 읽기만으로 완료 판정**한다: 고객 주문 상세의 교환비 안내·버튼 표시, 직원 주문 상세 표시, 권한 없는 경로 차단, 375px. 결제 위젯 입력·결제 결과 확인은 **최종 완성 단계 항목으로 분리**(QA037 미완료 사유로 쓰지 않음).
- 대상 자료(이미 있는 Lab 시험 자료 재사용, 새 자료 0): 주문 `e0102000-0000-4000-8000-000000000031`(EXQA1), 교환 `420bfb91-0f3d-435f-b0fd-155738c95810`(교환비 3,000원 waiting). 읽을 때 상태가 다르면 그대로 기록만.
- 재개 조건 그대로: 주인님이 맥미니 ego 공간 29에서 시험 계정으로 직접 로그인 → Return to agent. 근거 [handoff-0101-0104-prod/README.md](handoff-0101-0104-prod/README.md) 4절·11절(커밋 `e20574f0f`).

## 요청 3 — S70 실행기 독립 재현 (선택: 맥미니에 Docker가 있을 때만)
- 지금까지 맥미니 검수는 정적(파일 읽기) 통과였고 실행은 작성자(윈도우)만 했다. Docker가 있으면 같은 실행기로 독립 재현을 부탁드린다.
- 고정: 커밋 `ab87ecabc` 기준 — `mall-builder/supabase/migrations/0105_cash_receipt_checkout.sql` sha256 앞 16자 `500edf076ef81b04`, `scripts/check-0105-local.mjs` `80f4ceae9d4507bf`, `scripts/rollback-0100-step1-stop-auto.sql` `9a365699e567cc5a`.
- 실행: `node mall-builder/scripts/check-0105-local.mjs` — 실행기가 컨테이너 이름 `aww-pg-test`(postgres 이미지)를 요구하므로, 없으면 **만들지 말고 「재현 불가(컨테이너 없음)」로 회신**. 실행기는 로컬 엔진(npipe/unix)이 아니면 멈추고, `qa_s70_*` DB가 이미 있으면 지우지 않고 멈춘다.
- 기대: `합계 21/21 통과`, `qa_s70_* 남은 수 0`.
