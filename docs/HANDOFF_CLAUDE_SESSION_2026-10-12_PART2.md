# 인수인계 — Claude Code 세션 2026-10-12 후반 (이미지 변환 · 웹툰 · 카드뉴스 · 뮤직비디오)

앞부분(올인원·SEO 스튜디오·메인 사이트 등)은 `docs/HANDOFF_CLAUDE_SESSION_2026-10-12.md`, 이미지 변환 스튜디오 상세는 `docs/HANDOFF_CLAUDE_IMAGE_CONVERT_STUDIO_2026-10-12.md`에 있습니다. 이 문서는 그 뒤에 한 작업을 한곳에 모았습니다. 모든 작업은 커밋·푸시·프로덕션 배포·DB 버전 반영까지 끝났고, **남은 미완료 코드 작업은 없습니다**(아래 "다음에 할 일"은 새 작업).

## 1. 이번 구간 결과 요약
| 프로그램 | 버전 | 한 일 | 커밋 | 라이브 |
|---|---|---|---|---|
| 이미지 변환 스튜디오 `image-convert-studio` | v1.04 | Imagic 분석 후 신규(변환·업스케일·콜라주, 브라우저 처리, KO/EN). pica 웹 워커 멈춤 수정(v1.02), 일본어 삭제(v1.03), 한국어 사용 안내 교체(v1.04) | `7c85503a` `c914f245` `b43ee383` | image-convert-studio.buylife.xyz |
| AI 웹툰 자동화 `ai-webtoon-studio` | v1.06 | Flow "AI 웹툰 스튜디오 PRO"와 대조해 아트 스타일 6종 추가(총 11종) | `714105b9` | ai-webtoon-automation.buylife.xyz |
| INSTA Cardnews 자동화 `cardnews-studio` | v1.06 | Flow "Carousel Pro" 옵션 1:1 대조 → 빠져 있던 카드 아이콘 추가(24종, AI 선택·장별 변경·크기/위치), 무드 이름 임팩트형→볼드형 | `489b2adc` | cardnews-studio.buylife.xyz |
| 뮤직비디오 자동화 `music-video-studio` (구 "뮤직비디오 스튜디오") | v1.02 | Flow "뮤직비디오 만들기 V3" 분석 후 신규(가사 → 스토리보드 → 장면 이미지 → Veo 영상). 회원 본인 Gemini 키 전용 | `0e82fcd1` | music-video-studio.buylife.xyz |

## 2. 중복 점검 결과(중요 — 새 프로그램을 만들기 전에 반드시 확인)
같은 참고 자료로 이미 만들어진 프로그램이 이 세션에서 계속 발견됐습니다. **참고 URL을 받으면 코드를 짜기 전에 `programs` 테이블과 저장소 폴더부터 대조하세요.**
- `seo-thumbnail-pro`(AI 유튜브 썸네일 프로, Antigravity가 2026-10-11 배포) = 참고 사이트 seo-thumbnail-pro-99gg.vercel.app. "SEO 썸네일 자동화"를 새로 만들려다 중복으로 확인되어 **주인님 요청으로 중단**했습니다(분석 메모: 원본 JS 번들에서 확인한 구조는 3열 화면, 분석 `gemini-3-flash-preview`, 이미지 `gemini-3.1-flash-image-preview` 16:9, 사용량 모니터·테마 전환 있음. 기존 프로그램에는 사용량 모니터·테마 전환·"자동채우기로 이동" 연결이 없음. 보강 여부는 미결정).
- Flow 프로젝트(192d5316…)의 공유 도구 4개: 웹툰 PRO = `ai-webtoon-studio`, Carousel Pro/Basic = `cardnews-studio`, 뮤직비디오 V3 = (일부) Suno 계열 + 신규 `music-video-studio`.

## 3. 뮤직비디오 자동화 ↔ Suno 음악기획 자동화 연계(나중 고도화로 확정, 2026-10-12 주인님)
- 겹치는 기능: 가사·제목·Suno 스타일 생성(`/music` 1단계 vs `suno-music-studio`). 겹치지 않는 기능: 스토리보드·장면 이미지·Veo 영상(뮤직비디오 전용), 앨범 기획·곡 보관함·프리셋(Suno 음악기획 전용), 실제 곡 파일 생성(`music-automation` 전용).
- **결정: 지금은 두 프로그램을 그대로 두고, 나중에 두 프로그램을 연계하는 방향으로 고도화한다.** 연계 아이디어(미구현): ① Suno 음악기획 저장곡의 JSON 내보내기를 뮤직비디오 1단계에서 불러오기 ② 뮤직비디오 1단계는 가사 붙여 넣기 중심으로 줄이고 Suno 음악기획으로 안내 ③ 뮤직비디오 `exportJson` 형식과 Suno 음악기획 저장 JSON의 필드 매핑 정의. 두 프로그램은 별도 Vercel 프로젝트·별도 localStorage라 파일(JSON) 연계가 현실적.

## 4. 알아둘 기술 메모
- **pica 웹 워커**: `features: ["js","wasm"]`로만 초기화(번들러에서 `ww`가 응답하지 않아 확대가 멈춤). `docs/ERROR_LESSONS.md` 기록됨.
- **카드 아이콘**: `cardnews-studio/scripts/gen-icons.mjs`가 lucide-react 24종 path를 `src/lib/cardnews/iconData.ts`로 생성(ISC). 캔버스 `Path2D`로 그림. 이전 프로젝트·템플릿은 아이콘 설정이 없어도 기본값으로 열림(`sanitizeStyle`).
- **Veo 규격**(2026-10-12 문서 확인): `predictLongRunning` → 작업 이름 → `GET {name}` 반복 → `response.generateVideoResponse.generatedSamples[0].video.uri` → 키 헤더로 내려받기. 모델 `veo-3.1-lite|fast|(없음)-generate-preview`, 초당 $0.05/$0.10/$0.40(720p). 내려받기 주소는 Google 주소만 허용(SSRF 방지, `isAllowedVideoUri`).
- **Flow 화면 분석 방법**: Flow 도구는 다른 주소의 화면 안에 들어 있어 소스를 못 읽음 → 실제 Chrome에서 드롭다운을 열어 목록을 수집. 목록은 클릭으로 닫아야 하고(Escape 안 먹음), 선택하면 값이 바뀜(화면 로컬일 뿐). 문구 기획(텍스트)은 1회 실행했고 이미지·영상 생성은 하지 않음.
- 새 프로그램 등록 SQL은 DO 블록 대신 일반 구문 2개로 실행(MCP `execute_sql` DO 블록 오류 회피).

## 5. 확인하지 못한 것(다음 사람이 점검)
1. **뮤직비디오 실제 생성**: 가사·스토리보드(`gemini-3.7-flash`)·이미지(`gemini-3.1-flash-image`)·Veo(요청 본문 `durationSeconds` 숫자 형식, `lastFrame` 루프, Lite 모델 ID, 4.5MB 응답 제한 속 스트리밍 내려받기)는 회원 본인 키·유료라 실행하지 못함. 첫 사용 순서: 가사 → 이미지 1장 → Lite 영상 1개(약 560원).
2. **카드뉴스 아이콘 선택 품질**: AI가 장 내용에 맞는 아이콘을 고르는지 실제 문구 생성으로 확인 필요(회원 본인 키).
3. **웹툰 새 스타일 6종**: 실제 이미지 생성으로 결과 확인 필요(영문 태그 튜닝 여지).
4. member 계정에 검수 중 자동 저장된 카드뉴스 테스트 프로젝트("새 카드뉴스", 주제 "매일 1시간 독서의 기적")가 남아 있음 — 대시보드에서 삭제.
5. 관리자 화면(FREE 배지, 썸네일 등)은 member 세션으로 확인 불가.

## 6. 다음에 할 일(새 작업, 우선순위 순)
1. 뮤직비디오 ↔ Suno 음악기획 연계 고도화(위 3번).
2. (완료 2026-10-12) 뮤직비디오 자동화 카탈로그 썸네일 등록 — `0002_thumbnail.sql`.
3. `seo-thumbnail-pro`에 원본에 있는 사용량 모니터·테마 전환 등을 보강할지 주인님 결정.
4. 앞 문서의 이월 항목(올인원 실생성 점검, 도메인 SSO 확대, Supabase Pro 결정 등).
