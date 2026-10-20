# 인수인계 — 2026-10-20 v1.67 (Claude Code 윈도우)

프로그램: https://threads-affiliate-poster.buylife.xyz · 원장: [IMPROVEMENTS.md](IMPROVEMENTS.md) 맨 아래

## 한 일
- GPT-5.6·GPT-6 계열로 홍보 글을 만들면 OpenAI가 `max_tokens`를 거부(400)하던 문제 수정: `src/lib/ai/generator.ts`, GPT-4 계열은 기존 그대로, 그 밖은 `max_completion_tokens: 4000`.
- 발견 경위: SEO 스튜디오 v1.75(온도 지정 400) 수정 뒤 GPT-5 계열을 고를 수 있는 19개 프로그램을 점검하다 발견(루트 `docs/HANDOFF.md` 2026-10-20 항목).

## 검수
- tsc 0, `test:naver-key`, build, 배포 `threads-affiliate-poster-mgsqzhmd0` Ready, DB v1.67.
- 크롬(관리자 세션): 수정 전 v1.66에서 오류 재현 → 수정 후 v1.67에서 같은 조건 490자 생성(제휴 고지 포함, 저장 안 함). 비용: 관리자 본인 OpenAI 키 짧은 호출 2회.

## 못 한 것·다음 첫 단계
- 원클릭 「글 & 이미지 생성」·예약 발행 경로는 같은 함수를 쓰지만 이미지 비용 때문에 따로 시험하지 않음.
- 일반 회원 계정 검수 미실시.
- 다음: 모델별 요청 규칙 공용 기준 코드 검토(원장 맨 아래 ① 로직).

## 이어서 — v1.68
- `src/lib/ai/openaiRequestParams.ts`는 공용 기준 코드 사본(기준 naver-blog-seo-studio) — 직접 고치지 않음. 글 모델 선택 칸 응답 지연 안내. 배포 `threads-affiliate-poster-reqa8hqmk` Ready, DB v1.68, 크롬 489자 생성 확인.
