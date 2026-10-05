# 쇼츠 떡상 분석·대본 자동화 (shorts-viral-studio)

유튜브 떡상 쇼츠 **검색 → 바이럴 분석 → 소재 발굴 → 대본 → 이미지·영상·BGM 프롬프트**를 한 흐름으로 만드는 AIMaster 서브프로그램입니다.
인수인계·설계 이유·남은 일은 [`AGENTS.md`](./AGENTS.md)에 자세히 있습니다.

- 라이브: https://shorts-viral-studio.vercel.app
- 버전: v1.02 (`src/lib/version.ts` ↔ 공용 DB `programs.version`)
- 방식: 회원 본인의 **YouTube Data API 키 + AI 키(GPT/Claude/Gemini 중 1개 이상)** 로 동작합니다. 운영자 키는 쓰지 않습니다.
- Gemini 엔진은 공개 쇼츠 영상을 직접 보고 분석하고, GPT·Claude는 제목·지표·댓글 기반 추정으로 분석합니다(화면에 구분 표시).
- 프로젝트는 만든 지 30일 뒤 자동 삭제됩니다(YouTube API 데이터 보관 정책). `.md`로 내보내 보관하세요.

## 개발

```bash
npm install
npm run dev     # http://localhost:3000  (.env.local에 Supabase 3개 값 필요 — 루트 .env.local 참고)
npm run build
```

## 환경변수

| 이름 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 공용 Supabase(`esgxyikcnnvmlhygjkth`) 주소 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 로그인 세션용 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 회원 API 키 저장·조회(`user_api_keys`) |
| `NEXT_PUBLIC_MAIN_SITE_URL` | (선택) 메인 사이트 주소, 기본 `https://www.buylife.xyz` |

## DB

- `svs_projects` — 회원별 프로젝트 저장(RLS 본인만). 마이그레이션: `supabase/migrations/0001_svs_projects.sql`
- 프로그램·요금제·YouTube 키 발급 매뉴얼 등록: `supabase/migrations/0002_register_program_and_guide.sql`
- 키 저장은 공용 `user_api_keys`(provider: `youtube_api_key`, `gemini`, `openai`, `anthropic`)

## 설계 메모

- 원본(튜토리얼 단일 HTML)은 키를 브라우저에 두고 직접 호출했고, 영상을 보지 않고도 컷·렌즈·BGM을 "분석"한 것처럼 보여줬습니다. 이 프로그램은 서버에서 회원 키로 호출하고, Gemini에는 영상 주소를 넘겨 실제 영상을 분석하며, 영상을 볼 수 없는 경우는 "(추정)"으로 정직하게 표시합니다.
- 상세 변경 이유 9가지는 `AGENTS.md`의 "원본 소스에서 바꾼 것과 그 이유"를 참고하세요.
