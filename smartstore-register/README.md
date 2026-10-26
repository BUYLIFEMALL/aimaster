# 스마트스토어 상품등록 자동화 (`smartstore-register`)

AI 상세페이지 자동화로 만든 상품을, 회원 본인 크롬의 확장이 스마트스토어센터 「상품 등록」 화면에 칸마다 대신 채워 넣는 등록 도우미입니다.

- 주소(배포 후): https://smartstore-register.buylife.xyz
- 개발 인수인계(7대 항목·남은 일): [`AGENTS.md`](AGENTS.md)
- 실행: `npm install` → `npm run dev`(포트 3032) · 시험 `npm test` · 빌드 `npm run build`
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(또는 `_ANON_KEY`), `SUPABASE_SECRET_KEY`(또는 `_SERVICE_ROLE_KEY`), `CRON_SECRET`
