# 플레이리스트 채널 제작 자동화 (`playlist-channel-studio`) — 개선사항 관리 대장 (IMPROVEMENTS.md)

> **규칙 준수**: 모든 CLI는 작업 중 발견한 오류·기능·성능·편의성·디자인 개선사항을 이 문서에 즉시 기록합니다.
> 작업 종료·중단·이관 시 `docs/IMPROVEMENT_HANDOFF_YYYYMMDD.md`를 남기고 상호 연결합니다.

---

## 1. 개선 항목 총괄 현황

| ID | 구분 | 개선 항목 요약 | 우선순위 | 상태 | 최초 발견일 / CLI | 관련 파일 |
|---|---|---|---|---|---|---|
| IMP-PLS-001 | 디자인/사용성 | 텍스트 줄글형 `/guide`를 사이버 네온 다크 콘솔 스타일 비주얼 가이드북으로 전면 개편 | P1 (필수) | **진행 중 (v1.08 반영)** | 2026-10-16 (agy) | `src/app/(dashboard)/guide/page.tsx` |
| IMP-PLS-002 | UI/UX | 사이드바 유틸리티 `📖 연동 & 사용 매뉴얼` 표준화 및 계정 블록 12px 밀착 정렬 | P2 (높음) | **진행 중 (v1.08 반영)** | 2026-10-16 (agy) | `src/components/layout/Sidebar.tsx` |
| IMP-PLS-003 | 기능/편의성 | 생성된 썸네일과 트랙리스트 타임라인을 원클릭으로 텍스트 파일(.txt) 일괄 내보내기 | P2 (높음) | 제안/대기 | 2026-10-16 (agy) | `src/components/studio/` |
| IMP-PLS-004 | 기능 | Suno AI 프롬프트 생성 시 Suno v3.5 vs v4.0 vs v5.0 엔진별 최적화 프리셋 토글 지원 | P2 (높음) | 제안/대기 | 2026-10-16 (agy) | `src/lib/playlist/prompts.ts` |
| IMP-PLS-006 | 기능/품질 | MP4 내보내기의 스펙트럼이 실제 소리가 아니라 sin/cos로 만든 가짜 값(`dummyFreq`) — 미리보기(실제 분석)와 결과가 다름. 디코딩한 소리에서 프레임마다 FFT로 계산(가사영상 `lyric-video-studio/src/lib/render/spectrum.ts` 방식) 권장 | P2 (높음) | **완료 (v1.18)** — 브라우저 분석기와 같은 계산(`audio-spectrum.ts`) + 저음 효과·밝기·필터도 결과에 반영 | 2026-10-21 (Claude Code) | `src/lib/render/video-exporter.ts`·`audio-spectrum.ts` |
| IMP-PLS-011 | 기능/연계 | 커버 배경 「앨범 커버」 스타일(제목·채널명) | P3 | **완료 (v1.22)** | 2026-10-21 (Claude Code) | `SunoImportPanel.tsx` |
| IMP-PLS-012 | 연계 | 완성 MP4 유튜브 바로 올리기(공용 유튜브 연결·챕터 설명) | P2 | **완료 (v1.22)**, 실제 업로드 확인(관리자 채널 비공개 1편, https://youtu.be/mPwlsDllUgk) | 2026-10-21 (Claude Code) | `YoutubeUploadCard.tsx`·`/api/youtube/*` |
| IMP-PLS-014 | 연계 | 배경(앨범 커버) 그림 → 유튜브 썸네일 1280×720 내려받기·업로드 때 자동 지정 | P2 | **완료 (v1.23)**, 관리자 채널 비공개 시험 영상에 실제 지정 200 ok | 2026-10-21 (Claude Code) | `YoutubeUploadCard.tsx`·`/api/youtube/thumbnail`·`lib/youtube/thumbnail.ts` |
| IMP-PLS-013 | 기능 | 유튜브 채널이 여러 개 연결된 회원은 올릴 채널을 고를 수 없음(기본 표시가 2개면 최근 갱신 채널). 카드에 채널 선택 | P3 | **완료 (v1.24)**, 관리자 2채널 선택·전환 확인 | 2026-10-21 (Claude Code) | `youtube/account.ts`·`YoutubeUploadCard.tsx`(공용 `memberIntegrations` 선택 인자 필요 여부 검토) |
| IMP-PLS-009 | 기능/연계 | 음악(SUNO) 자동화 곡 여러 개 + Suno 시간 가사 가져오기 | P2 | **완료 (v1.19)** | 2026-10-21 (Claude Code) | `SunoImportPanel.tsx`·`sunoTracks.ts`·`/api/suno/*` |
| IMP-PLS-010 | 편의성 | Suno 곡 패널에서 곡 커버를 배경 후보로 바로 쓰기(곡 하나짜리 플레이리스트·첫 곡 커버) | P3 | **완료 (v1.20)** — 흐린 확대 커버 + 가운데 원본 1920×1080, 자동·곡별 버튼 | 2026-10-21 (Claude Code) | `SunoImportPanel.tsx`·`MediaCenter.tsx` |
| IMP-PLS-008 | 기능 | MP4 결과에 GIF 스티커가 빠짐(미리보기에만 있음). 움직이는 GIF는 프레임 분해(ImageDecoder)가 필요해 별도 작업 | P3 | **완료 (v1.21)** — ImageDecoder로 장면 분해, 미리보기와 같은 배치 | 2026-10-21 (Claude Code) | `video-exporter.ts`·`ExportStudio.tsx` |
| IMP-PLS-007 | 기능 | 영상 만들기 곡별 가사 층 + 세로 9:16 | P2 | **완료 (v1.17)** | 2026-10-21 (Claude Code) | `lyrics-layer.ts`·`MediaCenter.tsx`·`EditorStudio.tsx`·`ExportStudio.tsx`·`video-exporter.ts` |
| IMP-PLS-005 | 편의성 | 썸네일 Canvas 편집기에서 자주 쓰는 한글 감성 폰트 즐겨찾기(Pin) 기능 | P3 (보통) | 제안/대기 | 2026-10-16 (agy) | `src/components/studio/ThumbnailTab.tsx` |

---

## 2. 상세 개선 내역

### IMP-PLS-001: 사이버 네온 다크 콘솔 스타일 비주얼 가이드북(`/guide`) 전면 개편
- **발견 근거**:
  - 기존 가이드북이 42줄짜리 단순 흰색 텍스트 상자로만 작성되어 있어, 플레이리스트 기획부터 Suno 작곡 프롬프트 복사, 캔버스 썸네일 합성까지의 전체 흐름을 시각적으로 학습하기 어려움.
- **영향 및 기대효과**:
  - 5단계 시각적 파이프라인 인포그래픽, 23종 장르 치트시트, 떡상 노하우 팁, FAQ 4종을 통해 초보자도 5분 만에 첫 플레이리스트 영상을 완벽 기획할 수 있도록 지원.

### IMP-PLS-002: 사이드바 UI 표준화 및 가이드북 접근성 강화
- **발견 근거**:
  - 사이드바 유틸리티 영역에 매뉴얼 링크 명칭이 `사용 안내`로 되어 있어 플랫폼 공통 표준(`📖 연동 & 사용 매뉴얼`)과 어긋남.
- **구현 계획**:
  - `📖 연동 & 사용 매뉴얼`을 유틸리티 상단에 배치하고 계정 블록 마진을 12px로 표준 밀착.

---

## 3. 이관 및 인수인계 연결
- 2026-10-16 인수인계서: [`docs/IMPROVEMENT_HANDOFF_20261016.md`](IMPROVEMENT_HANDOFF_20261016.md)
- 개발 플랜: [`docs/PLAN_20261016_DESIGN_RENEWAL.md`](PLAN_20261016_DESIGN_RENEWAL.md)

## 2026-10-22 Claude Code(윈도우) — 대기: 음악(SUNO) 리믹스 결과 받기 (다음 빌드 때 함께)
- [ ] `?remix=<리믹스 변주 id>`로 음악(SUNO) 리믹스 결과(`music_track_remix_variants`, 회원 본인 것만)를 읽기. **주인님 지시: 따로 배포하지 않고, 이 프로그램을 다음에 다른 작업으로 빌드할 때 함께 넣고 시험한다.** 상세 플랜·시험용 리믹스 번호: [`music/docs/PLAN_20261022_REMIX_SHORTCUTS.md`](../../music/docs/PLAN_20261022_REMIX_SHORTCUTS.md). 음악(SUNO) 리믹스 카드 링크는 두 프로그램 배포 뒤에 켠다.
