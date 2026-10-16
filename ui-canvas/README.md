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


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.06)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.07 (ui-canvas)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
