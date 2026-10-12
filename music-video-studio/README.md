# 뮤직비디오 스튜디오 (music-video-studio) — v1.01

주제·장르로 가사를 쓰고, 가사를 장면으로 나눈 스토리보드를 만들어 **장면별 이미지(나노바나나)와 Veo 영상 클립**까지 만드는 프로그램입니다.
참고 도구: Google Flow "뮤직비디오 만들기 V3"(공유 도구). 화면·옵션을 실제 Chrome으로 확인해 AIMaster 규칙(통합 로그인·권한, 흰색 베이스, 표준 사이드바, 회원 본인 키)에 맞춰 새로 만들었습니다.

- 주소: https://music-video-studio.buylife.xyz (Vercel 프로젝트 `music-video-studio`, 팀 buylife)
- 카테고리 멀티미디어, FREE 배지(프로그램 자체는 무료). **AI 호출은 모두 회원 본인 Gemini 키**(서버에서만 사용, 폴백 없음)이며 영상 비용은 본인 계정에 청구됩니다.

## 단계
1. **음악·가사**(`/music`): 주제+장르 10종 → 제목·Suno 스타일·가사(복사 버튼), 직접 붙여 넣기, 설정 내보내기/불러오기/새로 시작
2. **스토리보드**(`/storyboard`): 장면 수 1~8, 추가 묘사, 기본 화풍 8종, 참고 이미지 최대 3장 → 장면별 가사 + 영문 촬영 묘사(수정 가능)
3. **장면 제작**(`/scenes`): 장면별 Image/Video, 전체 생성, Veo 모델(Lite/Fast/Standard)·길이 4/6/8초·심리스 루프·16:9/9:16, 예상 비용 확인창, ZIP 저장
4. **API키등록·플랫폼연동**(`/settings`): Gemini 키 등록(마스킹 표시)

## 구조
- `src/lib/music/{presets,types,prompts,veo,project}.ts` 순수 함수(프롬프트·파서·Veo 요청/응답·비용·검증) — `npm test`(17개)
- `src/lib/ai/{llm,gemini}.ts` 서버 호출(Gemini 텍스트 `gemini-3.7-flash`, 이미지 `gemini-3.1-flash-image` + sharp로 JPEG 축소)
- `src/app/api/music/{lyrics,storyboard,image}` 텍스트·이미지, `video/{start,status,download}` Veo 비동기 작업(시작 → 8초마다 확인 → 서버가 본인 키로 내려받아 스트리밍)
- 상태: `ProjectProvider`(글은 localStorage 자동 저장, 이미지·영상은 메모리에만 — 내려받아 보관)

## Veo 규격(문서 확인 2026-10-12, ai.google.dev/gemini-api/docs/veo)
`POST /v1beta/models/{veo-3.1-lite|fast|}-generate-preview:predictLongRunning` → 작업 이름 → `GET /v1beta/{name}` 반복 → `response.generateVideoResponse.generatedSamples[0].video.uri` → 키 헤더로 내려받기. 이미지 입력은 `image.inlineData`, 루프는 `lastFrame`(같은 이미지)로 구현하고 이때 8초로 고정. 내려받기 주소는 `generativelanguage.googleapis.com`만 허용(SSRF 방지).
요금(초당, 720p·오디오 포함): Lite $0.05 / Fast $0.10 / Standard $0.40 (`presets.ts` `VEO_MODELS`, 바뀌면 같이 수정).

## 작업 기록·남은 일
- v1.01 (2026-10-12): 신규 제작·등록·배포. 라이브 Chrome(member 계정)에서 1·3단계 화면, 비용 확인창, 안내 문구 확인.
- **실제 AI·Veo 생성은 검증하지 못했습니다**(회원 본인 키 필요, Veo는 유료). 첫 사용 시 확인할 것: ① `gemini-3.7-flash`/`gemini-3.1-flash-image` 모델 응답 ② Veo 요청 본문(특히 `durationSeconds` 숫자 형식, `lastFrame` 루프) ③ 4.5MB 응답 제한 안에서의 영상 내려받기(스트리밍 프록시) ④ Lite 모델 ID 사용 가능 여부.
- 화풍 목록: Flow에서 5종(Cinematic·Anime·Oil Painting·Watercolor·Cyberpunk)만 확인, 나머지 3종은 추가분. 장면 수·길이 선택지는 Veo 문서 기준.
- 등록 SQL: `supabase/migrations/0001_register_program.sql`
