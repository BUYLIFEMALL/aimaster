# AI 무료 이미지 자동화 (`free-image-studio`)

용도를 고르고 설명을 여러 줄 맡기면 **내 PC가 그림을 그려 폴더에 모아 주는** AIMaster 서브프로그램입니다. 그림은 회원 PC의 로컬 엔진이 그리므로 그림 생성에는 API 키와 유료 호출이 필요 없습니다.

**상태(2026-11-19)**: 기초 단계 — 뼈대·접근 판정·고지·문서만 있습니다. 미배포, 메인 사이트 미등록, 의존성 미설치.

| 항목 | 내용 |
|---|---|
| 대상 | 블로그·상품·썸네일용 그림이 여러 장 필요한 회원 |
| 기술 | Next.js 16 · React 19 · Tailwind 4 · Supabase(공용 DB, 새 표 없음) · 로컬 엔진(`free-music-studio/engine`) |
| 지금 있는 것 | 이용 권한 판정, 로그인, 좌측 메뉴·모바일 접는 메뉴, 저작권 고지, 저장공간 위젯 한 줄 |
| 앞으로 | 엔진 연결 → 시작하기·만들기·작업 기록 → 한글→영문 AI 변환(선택, 회원 본인 키) → 매뉴얼 |
| 버전 | `v1.01`(미배포) |
| 주소 | 미정(예정 `free-image-studio.buylife.xyz`, 운영 등록 단계에서) |

- 개발 지침: [`AGENTS.md`](AGENTS.md)
- 개발 플랜: [`../docs/analysis-free-image-automation-20261119/P1_WEB_PLAN.md`](../docs/analysis-free-image-automation-20261119/P1_WEB_PLAN.md)
- 남은 일: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) · 개선 제안: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)

## 환경변수(배포 단계에서 등록, 지금은 없음)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(없으면 `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `SUPABASE_SECRET_KEY`(없으면 `SUPABASE_SERVICE_ROLE_KEY`). AI 키는 등록하지 않습니다 — 회원 본인 키만 씁니다.

## 시험

```bash
node --test tests/*.test.mjs
```
