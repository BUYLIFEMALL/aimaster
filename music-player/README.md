# 뮤직 플레이어 자동화 (music-player)

내 컴퓨터의 음악 파일을 끌어다 놓아 재생하고, 시각화·8밴드 이퀄라이저로 즐기는 AIMaster 브라우저 뮤직 플레이어입니다. 파일은 서버로 올라가지 않고 회원별 브라우저 저장소에 보관됩니다.

- 운영: https://music-player.buylife.xyz · v1.05 · 인수인계 [AGENTS.md](AGENTS.md) · 계획 [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md)

```bash
npm install
npm run dev     # http://localhost:3021 (공용 Supabase 환경변수 3개 필요, .env.example 참고)
npm test        # 순수 로직 10개
npm run build
vercel deploy --prod --yes --scope buylife   # 수정 때마다 DB programs.version +0.01
```


## 2026-10-16 DB 연동 변수 호환 — v1.03 (music-player)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 v1.05 — 구형 MP3 한글 태그 복구

사전 개발 플랜 제시 후 구형 CP949/EUC-KR 한글 태그 감지와 기존 저장 곡 정보 복구를 구현했습니다. 자동/한국어/서유럽 선택, 원본·커버·ID·순서·재생 설정 보존, 쓰기 실패 안내를 추가했습니다. 자동 20·실제 Edge Player 21·일반 회원 로컬 11 검사와 타입/빌드를 통과했습니다. 배포 상태·사용법·한계·다음 작업은 **[개선 작업 인수인계](docs/IMPROVEMENT_HANDOFF_20261016.md)**를 먼저 읽습니다. 기존 8가지 신규 기능 제안은 별도 후속 작업입니다.
