# AI 가사영상 자동화 (`lyric-video-studio`) v1.05

https://lyric-video-studio.buylife.xyz

음악 파일과 가사만 넣으면 가사가 흐르는 유튜브(가로 16:9)·쇼츠(세로 9:16) 영상을 브라우저에서 바로 MP4로 만드는 AIMaster 서브 프로그램입니다. 자세한 개발 정보(7대 항목)는 [`AGENTS.md`](AGENTS.md)에 있습니다.

| 항목 | 요약 |
|---|---|
| 1. 목적·대상 | AI 곡·자작곡·커버곡에 가사를 입혀 영상으로 만드는 회원, 음악 채널 운영자 |
| 2. 기술 | Next.js 16 · Canvas 2D · 공용 `browser-mp4-encoder` 사본(WebCodecs + mp4-muxer) · Supabase(로그인·보관함) |
| 3. 기능 | 음악·가사 넣기(.srt/.lrc/붙여넣기) → 탭 싱크 → 프리셋·강조 7종·서체 6종 → 1080p MP4. 보관함 30일 |
| 4. 버전 | v1.05 (2026-10-21) 음악(SUNO) 곡 가져오기·시간 가사 자동 — 이력은 `AGENTS.md` 4절 |
| 5. 남은 일 | 2차: Suno 곡·시간 가사 자동, 노래방 발음, LP / 3차: 플레이리스트, Pexels — [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) |
| 6. 연계 | 음악(SUNO) 자동화 곡 가져오기, 플레이리스트 영상에 가사 층 |
| 7. UI 개선안 | 미리보기에서 가사 위치 끌기, 파형 위 시간 맞추기 |

## 개발
```bash
npm install
npm run dev     # http://localhost:3077 (로그인 쿠키가 없으면 /login)
npm test        # 가사 읽기 시험 6개
npx tsc --noEmit && npm run build
vercel deploy --prod --yes --scope buylife
```
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`(공용 DB, Vercel Production에 등록됨).
- DB: `supabase/migrations/0001_register_lyric_video_studio.sql`(프로그램 등록), `0002_lyric_video_items.sql`(저장 표·RLS·30일 삭제) — 2026-10-21 운영 DB 적용 완료.
