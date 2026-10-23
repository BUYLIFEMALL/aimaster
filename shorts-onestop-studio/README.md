# AI 쇼츠 원스톱 제작 자동화 (shorts-onestop-studio)

주제 한 줄로 대본·배경·음성·자막·음악을 만들어 세로 쇼츠 MP4(1080×1920)로 완성하는 AIMaster 웹 프로그램입니다.

- 운영: https://shorts-onestop-studio.buylife.xyz
- 기술: Next.js 16 · Supabase(AIMaster 공용 DB) · 회원 본인 API 키(`user_api_keys`) · 브라우저 MP4 렌더(예정)
- 왜 이렇게 만들었나: 참고한 설치형 프로그램(윈도우 전용·월 인증·PC별 키 저장)의 기능을 웹으로 옮겨, 어디서나 로그인해 쓰고 키는 AIMaster 한 곳에서 관리하며, 영상은 회원 브라우저에서 만들어 서버 비용을 없앴습니다. 상세: [`../docs/CARD_SHORTS_REFERENCE_ANALYSIS.md`](../docs/CARD_SHORTS_REFERENCE_ANALYSIS.md)
- 진행 상태·운영 정보·규칙: [`AGENTS.md`](AGENTS.md)

## 개발
```bash
npm install
npm run dev     # http://localhost:3066 (루트 .env.local 의 공용 DB 값 필요)
npm run build
vercel deploy --prod --yes --scope buylife
```
