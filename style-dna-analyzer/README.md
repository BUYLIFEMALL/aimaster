# STYLE DNA ANALYZER

이미지 한 장의 카메라·조명·색상·스타일을 분석해, 그대로 재현하거나 변형할 수 있는 마스터 프롬프트(영어·한국어)로 만들어 주는 AIMaster 서브 프로그램입니다. 자세한 구조·규칙·검수 기록은 `AGENTS.md`를 봅니다.

- 라이브: https://style-dna-analyzer.buylife.xyz
- 스택: Next.js(App Router) + TypeScript + Tailwind + Supabase(공용 DB) — 회원 본인의 Gemini·OpenAI·Claude 키로만 AI를 호출합니다(운영자·다른 회원 키 폴백 없음).
- 명령: `npm run dev`, `npm test`, `npm run build`
- 왜 이렇게 만들었나: 팔레트·색감 일치율은 AI 추측이 아니라 실제 픽셀로 계산하고, AI가 짐작한 값("AI 추정 재현도")은 그렇게 구분해 표시합니다. 분석 결과는 회원별 보관함(`sda_analyses`, RLS owner-only)에 저장되며 원본 이미지는 공개 버킷의 추측 불가능한 경로에 WebP로 보관합니다.
