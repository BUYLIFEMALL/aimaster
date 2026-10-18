# AI 인물사진 자동화 (`portrait-photo`)

https://portrait-photo.buylife.xyz

사진 한 장으로 증명사진·비즈니스 프로필·SNS·시네마틱 화보 인물 사진을 만들고, 국내외 여권·비자 규격 크기로 저장하는 AIMaster 서브 프로그램입니다. 개발 상세는 [`AGENTS.md`](AGENTS.md)를 먼저 읽으세요.

## 7대 핵심 항목
1. **사용 목적·대상**: 사진관에 가기 어려운 개인·구직자·1인 사업자·크리에이터.
2. **기술 스택**: Next.js App Router·TypeScript·순수 CSS, Supabase(공용 인증·권한·선택형 보관함), Google Gemini 이미지(회원 본인 키, 공용 기준 호출 코드 사본), Canvas·IndexedDB, Vercel.
3. **핵심 기능·장단점**: 목적 프리셋 5종과 세부 옵션, 후보 1~4장 비교, 순백 정리, 규격 21종 저장·머리 비율 검사·자르기 조정, 일괄 6장·ZIP. 장점은 원본 서버 미저장·본인 키·공식 출처 규격, 단점은 모델이 머리 비율을 잘 못 따르고 화면 코드가 한 파일에 몰려 있다는 점입니다.
4. **버전**: v1.22 (2026-10-18 디자인 리뉴얼 — 포토 스튜디오 그래파이트 변형). 이력은 `AGENTS.md`.
5. **대기 과제**: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
6. **연계 아이디어**: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) 3절
7. **UI/UX 제안**: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) 2절, 디자인 상세 [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)

## 실행
```bash
npm install
npm run dev
npm test
npm run build
```

## 지킬 것
- 회원 본인 Gemini 키만 사용(폴백 금지), 원본 얼굴 사진은 서버에 저장하지 않음, 공식 서류 통과 보장 문구 금지.
- 최근 인수인계: [`docs/IMPROVEMENT_HANDOFF_20261018.md`](docs/IMPROVEMENT_HANDOFF_20261018.md)
