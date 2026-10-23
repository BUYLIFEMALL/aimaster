# 개발 플랜 — 음악 병합 M1: Suno 음악기획 자동화 → 음악(SUNO)자동화 (v1.17~)

> 2026-10-21 Claude Code(윈도우). 근거: [음악 병합 분석](../../docs/analysis-music-consolidation-20261021/REPORT.md) §2 M1. 대상 ① 운영 DB `esgxyikcnnvmlhygjkth`.
> 주인님 승인(2026-10-21): M1 진행·음악(SUNO) 기준, 새 DB 표 2개, Suno 실제 생성 시험 1~2회.

## 1. 현재 구조 차이
| 항목 | 음악(SUNO) `music/` | Suno 음악기획 `suno-music-studio/` |
|---|---|---|
| 프레임워크 | Next 14.2 · React 18 · Tailwind 3 · 서버 액션 | Next 16 · React 19 · Tailwind 4 · API 3개 |
| 기획 엔진 | GPT `gpt-4o-mini` 고정, `lib/ai/musicPrompts.ts` | 3사 선택 `src/lib/studio/ai.ts`·`prompt.ts`·`generation.ts` |
| 데이터 | DB 8표 + Storage | 브라우저 localStorage(곡·앨범·내 Style) |
| 화면 | 메뉴 5개(기획·생성/트랙·리믹스·키·안내) | 한 페이지 8구역(빌더·앨범·프리셋·탐색·댄스·매뉴얼·보관함·대시보드) |
| 테스트 | 없음 | `tests/` 4파일 53개(`node --import tsx --test`) |

방침: `music/`은 Next 14 그대로 두고(업그레이드는 별도 위험), Suno 스튜디오의 **순수 로직(`src/lib/studio/*`, 메타데이터 JSON 4개, 테스트)을 그대로 옮기고**, 화면은 음악(SUNO)의 「사이버 수노 다크 스튜디오」 스타일로 다시 짠다(Tailwind 4 전용 문법은 3에 맞게).

## 2. 단계 (단계마다 빌드·배포·버전 +0.01)
| 단계 | 버전 | 내용 | 검수 |
|---|---|---|---|
| 1 엔진·DB | v1.17 | `lib/studio/` 이관(설정·카탈로그·빌더·워크플로·검증·검색·프롬프트), AI 3사 호출(`callModel`), 설정 화면에 Claude(`anthropic`) 키 칸, API `app/api/studio/generate`·`search`(권한 확인·응답 보호 `apiGuard`), DB 새 표 2개 + RLS, 테스트 이관(`npm test`) | 테스트·빌드·배포, 키 칸 화면 |
| 2 정밀 기획 화면 | v1.18 | 새 메뉴 「🎼 정밀 기획 스튜디오」(`/studio`): 프리셋 461·시대·그룹·무드·보컬/랩 캐스팅·비율, 원하는 항목만 생성·원고 보존·구간 삽입·Style 잠금, 빠른 복사 바, 내 Style(서버 저장), 음악 탐색(웹 검색 출처), 댄스 머신, TXT·JSON 내보내기, **옛 앱 JSON 백업 가져오기 → DB** | 크롬 일반 회원: 곡 1개 기획 저장·재열기(가장 싼 텍스트 모델 1~3회) |
| 3 앨범 + Suno 연결 | v1.19 | 「💿 앨범 기획」(3~12곡 흐름·순차 작사·중지), **「🎵 Suno로 생성」**: 곡/앨범 곡을 `music_plannings` 행으로 만들고 기존 `generateTracksAction`에 「가사 그대로 쓰기」 선택값을 더해 생성(GPT 재작성 없이 기획한 가사·스타일 그대로) → 기존 보관함·후가공으로 이어짐 | 크롬 일반 회원: **Suno 실제 생성 1회**(승인분) — 웹훅 저장·재생까지 |
| 4 옛 앱 정리 | 음악 v1.20 · 스튜디오 v1.12 | `suno-music-studio` 화면을 「음악(SUNO)자동화로 옮겼습니다」 + **내 브라우저 기획 JSON 내려받기** 버튼만 남김(주소 유지), 권한 144명 대조·부여, 카탈로그 `is_active=false`, 음악(SUNO) 이름·설명 갱신, 역량 지도, 문서 | 옛 주소 안내·JSON 받기, 메인 카탈로그 |

메뉴(병합 뒤): ① 정밀 기획 스튜디오 ② 앨범 기획 ③ 빠른 기획(기존 곡 설명 → 자동) ④ 생성·트랙 관리 ⑤ Remix 스튜디오 ⑥ API키등록·플랫폼연동 ⑦ 연동 & 사용 안내.

## 3. DB (승인된 새 표 2개, 회원별 RLS owner-only)
- `music_studio_styles` — 내 Style(이름·Style 문구·제외 문구·태그). 회원이 직접 만든 설정성 자료라 **자동 삭제하지 않음**(삭제는 회원이).
- `music_studio_projects` — 곡/앨범 기획(`kind` song|album, `data` jsonb, 제목, 갱신일). 생성 콘텐츠이므로 **갱신일 기준 30일 자동 삭제**(정리 작업 `app/api/cron/cleanup`, `CRON_SECRET`).
- 기존 `music_*` 표·Storage는 바꾸지 않는다.

## 4. 이번 범위에서 하지 않는 것 (따로 결정)
- 기존 곡(`music_tracks`·Storage 파일)의 30일 자동 삭제 — 회원 곡이 실제로 지워지는 **데이터 삭제**라 주인님 결정 필요.
- `music-audio` 공개 저장소 → 서명 주소 전환(분석 결정 6번 대기). 다만 「파일 목록 훑어보기」 차단은 기존 링크를 끊지 않으므로 단계 1에서 함께 처리 제안.
- 웹훅 검증 보강(D-68-01), Suno v6 선택, Next 16 업그레이드 — 후속.

## 5. 비용
- 개발 시험: 텍스트 생성은 시험 계정 본인 키로 가장 싼 모델(Gemini Flash-Lite 등) 수회. **Suno 실제 생성 1회**(곡 2개 생성·크레딧 사용, 승인분). 주의: 웹훅이 회원 Gemini 키로 앨범 커버(`gemini-3-pro-image` 4K, 장당 약 $0.24)를 자동으로 만들 수 있음.
- 운영 인프라: 새 비용 없음(새 표 2개는 작은 텍스트 행).
