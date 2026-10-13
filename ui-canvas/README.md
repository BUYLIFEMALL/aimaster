# UI Canvas 자동화 (ui-canvas)

UI 화면을 드래그로 설계하고, UI 스크린샷에서 AI가 컴포넌트 구조와 디자인 명세를 복원해 PNG·JSON으로 내보내는 AIMaster 서브 프로그램입니다.

- 운영: https://ui-canvas.buylife.xyz · 버전 v1.01 · 인수인계: [AGENTS.md](AGENTS.md) · 계획: [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md)

## 개발

```bash
npm install
npm run dev        # http://localhost:3020 (루트와 같은 Supabase 환경변수 필요: .env.example 참고)
npm test           # 캔버스 모델 단위 테스트
npm run build
```

환경변수는 AIMaster 공용 인증 3개(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)뿐입니다. AI 키는 회원이 설정 화면에서 본인 Gemini 키를 등록하며 서버 환경변수에 두지 않습니다.

## 배포

```bash
vercel deploy --prod --yes --scope buylife   # 프로젝트 buylife/ui-canvas, Git 미연동(CLI 업로드가 표준)
```

배포 후 `programs.version`(DB)과 `src/lib/version.ts`를 같이 올립니다(수정 때마다 +0.01).

## 설계 결정 요약

- 원본의 운영자 키 노출 구조를 버리고 **서버 API + 회원 본인 키**로 재구성했습니다.
- 프로젝트는 DB에 회원별로 저장(자동 저장·충돌 감지)하고, 원본 호환 JSON으로도 내보낼 수 있습니다.
- 흰색 베이스 UI, 한국어 라벨, 표준 사이드바(`API키등록·플랫폼연동`, `연동 & 사용 매뉴얼`).
