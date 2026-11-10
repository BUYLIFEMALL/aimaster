# AI 11번가 상품 자동등록기

상세페이지에서 만든 상품을 11번가 공식 Seller API로 바로 등록하는 판매자용 자동 등록기입니다.

- 주소: https://elevenst-register.buylife.xyz (v1.01, 비공개)
- 개발 문서: [AGENTS.md](AGENTS.md) · 명세 정리 [docs/API_SPEC_NOTES.md](docs/API_SPEC_NOTES.md) · 플랜 `../docs/PLAN_20261111_ELEVENST_REGISTER.md`
- 로컬: `npm install` → `npm run dev`(포트 3079) · 시험 `npm test` · 검사 `npx tsc --noEmit`
- 환경변수: 공용 Supabase 3개(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) — 등록 스크립트 `../scripts/add-elevenst-register-vercel-env.mjs`
- 회원은 본인 11번가 API 키와 본인 고정 IP(Fixie)만 씁니다. 운영자 키·IP로 대신 보내지 않습니다.
