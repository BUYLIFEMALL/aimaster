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
