# Spectrum Studio PRO 3.0.0 참고 묶음 P-1~P-6 — 개발 플랜 초안 (2026-10-24)

- 작성: Claude Code(윈도우) `claude-win-dotori`(새 프로그램 분석·플랜 담당) → **구현: 음악 담당 세션**(`claude-win-20261024-music` 줄, 주인님 지시 「음악 담당이 작업을 이어 갈 수 있도록」)
- 상태: **플랜 초안 — 범위·순서·비용 주인님 승인 전.** 병합 방향(독립 개발 안 함 → 이 프로그램에 병합)은 분석 의견으로 제시됨.
- 근거: [분석 보고서](../../docs/analysis-spectrum-studio-pro-20261024/REPORT.md)(§2-1에 코드로 확인한 현재 목록)
- 권리: **기능만 참고.** 원본 효과 수식·프리셋 값·문구·이름을 쓰지 않고 우리 것으로 새로 작성(2026-10-13 「100% 추출 이식」 기록은 별도 재확인 대상 — 보고서 §6-3).
- 대상: AIMaster 운영, DB ref `esgxyikcnnvmlhygjkth`. 현재 v1.28. DB 구조 변경 없음 예상(설정은 기존 프로젝트 저장 형식·브라우저 저장 안에서).

## 현재 코드 위치

| 역할 | 파일 |
|---|---|
| 효과 목록·기본 설정 | `src/data/presets.ts` (`VISUALIZER_OPTIONS` 10 · `FILTER_OPTIONS` 8 · `OVERLAY_OPTIONS` 10 · `PARTY_OPTIONS` 6 · `PARTICLE_OPTIONS` 14 · `DEFAULT_SETTINGS` · `DEFAULT_EXPORT_SETTINGS`) |
| 설정 형식 | `src/types/playlist.ts` (`StudioSettings`·`ExportSettings`·`VisualizerType`) |
| 그리기 | `src/lib/render/canvas-visualizer.ts`(스펙트럼·필터) · `particle-system.ts` · `lyrics-layer.ts` · `gif-frames.ts` · `color-utils.ts` · `audio-spectrum.ts` |
| MP4 출력 | `src/lib/render/video-exporter.ts`(자체 코드 — 공용 `browser-mp4-encoder` 사본 아님) |
| 화면 | `src/components/video/MediaCenter.tsx`(① 준비) · `EditorStudio.tsx`(② 편집) · `ExportStudio.tsx`(③ 출력) · `VideoStudio.tsx` |

## 단계

| 단계 | 기능 | 구현 방향 | 주의 |
|---|---|---|---|
| P-1 | **곡 제목 자동 표시** | 새 `src/lib/render/title-layer.ts`(가사 층 `lyrics-layer.ts` 구조 참고): 곡이 바뀌면 N초(2~15) 표시·페이드, 스타일 4~6종부터(우리 디자인), 한글 폰트는 이미 쓰는 웹폰트 안에서, 9분할 위치·그림자/글로우. 미리보기와 MP4가 같은 그리기 함수 사용 | 곡 제목은 트랙 이름(파일명·가져온 곡 제목). 화면 ② 편집에 「곡 제목」 탭 |
| P-2 | **인코딩 안정화** | `video-exporter.ts`: `VideoEncoder.isConfigSupported`로 하드웨어 가속 → 실패 시 소프트웨어 자동 대체, 품질 프로파일 3(품질/균형(기본)/속도 — 비트레이트·`latencyMode`), 인코더 대기열 역압, 화면 꺼짐 방지(`navigator.wakeLock`), 예상 시간 표시 | 결과가 좋으면 공용 `browser-mp4-encoder`(기준 `shorts-onestop-studio`)에 같은 개선 제안 — 공용 규칙대로 기준만 고치고 `--sync` |
| P-3 | **배경 여러 장 전환** | 배경 이미지 여러 장 + 전환 4종(페이드·디졸브·슬라이드·줌, 랜덤) + 곡별 / N초 간격 전환 | 영상 배경은 기존 동작 유지 |
| P-4 | **AI 없이 움직이는 합성 배경** | 캔버스로 그리는 배경 4~6종부터(빛 구체·오로라·별·그리드 등, 우리 수식), 그라디언트 배경 | AI 배경 비용 없이 쓰는 선택지 — 화면에 「무료 배경」 표시 |
| P-5 | **내 설정 저장·장르 프리셋** | 현재 설정 전체를 이름 붙여 저장·적용·덮어쓰기·삭제·JSON 가져오기/내보내기, 기본값 저장. 장르 시작 프리셋 몇 개(우리 값) | 저장 위치: 기존 프로젝트 저장 방식 우선(회원별), 없으면 브라우저 저장(try/catch) |
| P-6 | 확장 묶음 | 스펙트럼 추가(오실로스코프·미러 글로우 등 2~4종) · 컬러 팔레트 모드 · 파티클별 흐름 방향 · 트레일 · 최대 동시 개수 · 무거운 효과 자동 경감 · 스티커 여러 개 | 브라우저 성능 — 자동 경감과 함께 |

순서 추천: P-1 → P-2 → 배포 → P-3 → P-4 → P-5 → 배포 → P-6(필요 시). 각 단계 커밋은 바로, 배포는 묶어서(작은 수정 모아 배포 규칙).

## 하지 않는 것
- 데스크톱 앱·월간 인증 코드·인터넷 시간 사용 기간 검사(우리는 회원 권한).
- 원본 수식·값·문구 사용.

## 검수
- 무료: `tsc`·빌드·기존 시험.
- 크롬 실제 화면(시험 계정): 짧은 곡 2개로 1080p MP4 1편 — 곡 제목 등장·배경 전환·합성 배경 확인, 하드웨어 가속 켜짐/대체 로그 확인, 세로 9:16도 1편.
- 유튜브 실제 업로드는 하지 않음(필요하면 비공개 1건, 주인님 승인).

## 비용
| 항목 | 횟수 | 계정·키 | 대략 |
|---|---|---|---|
| AI 호출 | 0 (이 묶음은 AI를 쓰지 않음) | — | 없음 |
| Vercel 빌드 | 2회(P-1·P-2 묶음, P-3~P-5 묶음) | 팀 `buylife` | 배포 2회분 |
| 회원 부담 | 없음(브라우저에서 렌더) | — | 없음 |
