# 뮤직 플레이어 자동화 (music-player)

내 컴퓨터의 음악 파일을 끌어다 놓아 재생하고, 시각화·8밴드 이퀄라이저로 즐기는 AIMaster 브라우저 뮤직 플레이어입니다. 파일은 서버로 올라가지 않고 회원별 브라우저 저장소에 보관됩니다.

- 운영: https://music-player.buylife.xyz · v1.01 · 인수인계 [AGENTS.md](AGENTS.md) · 계획 [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md)

```bash
npm install
npm run dev     # http://localhost:3021 (공용 Supabase 환경변수 3개 필요, .env.example 참고)
npm test        # 순수 로직 10개
npm run build
vercel deploy --prod --yes --scope buylife   # 수정 때마다 DB programs.version +0.01
```


## 2026-10-16 DB 연동 변수 호환 — v1.03 (music-player)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
