# 뮤직 플레이어 자동화 (music-player) — 로직 및 기능 개선과제 (IMPROVEMENTS.md)

> **상시 기록 원장 (2026-10-16 주인님 지시):** 앞으로 작업 중 발견한 개선사항도 이 파일에 이어서 기록합니다. 8개 제안의 상태·관련 파일·다음 첫 단계·검수 기준은 [후속 개선 인수인계](IMPROVEMENT_HANDOFF_20261016_BACKLOG.md)에 정리했습니다. 현재 모두 **제안(미구현)**이며 구현 승인을 뜻하지 않습니다. 처리 시 원장과 인수인계의 상태·증거를 함께 갱신합니다. [공통 기록 지침](../../docs/IMPROVEMENT_HANDOFF_POLICY.md).

> 본 문서는 Antigravity가 UI/UX 디자인 개편(v1.04)을 진행하면서 코드 및 사용자 경험을 분석하여 도출한 **향후 프로그램 로직, 기능, 사용자 편의성 개선 과제 목록**입니다.
> Claude Code 또는 Codex가 후속 작업 시 이 문서를 바탕으로 고도화 기능을 이어받아 구현할 수 있습니다.


> **2026-10-16 Codex v1.05 처리:** BUG #1 수정과 저장된 곡 정보 복구·수동 인코딩 선택 구현, 코드/DB v1.05 운영 배포·일반 회원 검수 완료. 아래 원인/제안 코드는 당시 이력이며 현재 구현은 엄격한 디코딩·서유럽 보존·수동 재선택을 포함합니다. 8가지 신규 기능은 후속 제안으로 유지합니다. 실제 배포 결과는 [개선 인수인계](IMPROVEMENT_HANDOFF_20261016.md).

---

## 0. 긴급 버그 수정 과제 (Bug Fix)

### 🚨 [BUG #1] 구형 국내 MP3 음원의 곡명/아티스트 한글 깨짐 (EUC-KR / CP949 모지바케 현상)
- **증상**: 10cm의 곡을 추가했을 때 제목이 `³»´«¿ì„ º¸¿©` 처럼 깨져서 표시됨.
- **근본 원인**:
  - `src/lib/player/id3.ts`의 `decode(bytes, enc)` 함수에서 `enc === 0`일 때 무조건 `new TextDecoder("iso-8859-1")`로 디코딩함.
  - 과거 멜론, 벅스, 소리바다, 알송 등 국내 음원 유통사/인코더에서 생성된 구형 MP3 파일들은 ID3v2 인코딩 플래그 `enc`를 `0`(ISO-8859-1)으로 기재해 두고, 실제 바이트 데이터는 **EUC-KR(CP949) 한글 2바이트**로 기록함.
  - 예: `0xB3 0xBB` ("내") ➔ Latin-1으로 각각 읽혀 `³` (0xB3) + `»` (0xBB)가 됨. `³»´«¿ì„ º¸¿©` = **10cm의 "내 눈에 보여" (도깨비 OST)** 원문 바이트임!
- **해결 방안 (즉시 적용 코드)**:
  `src/lib/player/id3.ts`의 `decode` 함수를 다음과 같이 개선하면 브라우저 내장 `TextDecoder("euc-kr")`를 통해 100% 정상 한글로 디코딩됨:
  ```ts
  function decode(bytes: Uint8Array, enc: number): string {
    try {
      let label = "iso-8859-1";
      let data = bytes;
      if (enc === 1) {
        if (data[0] === 0xff && data[1] === 0xfe) { label = "utf-16le"; data = data.subarray(2); }
        else if (data[0] === 0xfe && data[1] === 0xff) { label = "utf-16be"; data = data.subarray(2); }
        else label = "utf-16le";
      } else if (enc === 2) {
        label = "utf-16be";
      } else if (enc === 3) {
        label = "utf-8";
      } else {
        // enc === 0: ISO-8859-1 지정이지만 국내 음원은 EUC-KR(CP949) 바이트가 대다수
        const hasHighByte = data.some((b) => b >= 0x80);
        if (hasHighByte) {
          try {
            // 1. UTF-8 시도 (fatal: true로 깨짐 감지)
            const utf8 = new TextDecoder("utf-8", { fatal: true }).decode(data);
            return utf8.replace(/\0+$/g, "").replace(/\0/g, " ").trim();
          } catch {
            // 2. UTF-8 실패 시 EUC-KR(CP949)로 복원
            try {
              const euckr = new TextDecoder("euc-kr").decode(data);
              return euckr.replace(/\0+$/g, "").replace(/\0/g, " ").trim();
            } catch {
              label = "iso-8859-1";
            }
          }
        }
      }
      return new TextDecoder(label).decode(data).replace(/\0+$/g, "").replace(/\0/g, " ").trim();
    } catch {
      return "";
    }
  }
  ```

---

## 1. 우선순위 높은 핵심 기능 개선 과제

### ① 드래그 앤 드롭 재생목록 순서 변경 (Track Reorder / Drag-to-sort)
- **현재 상황**: 정렬 버튼(추가순, 제목순, 아티스트순, 길이순)에 의존하고 있어, 사용자가 원하는 맞춤 순서로 곡을 직접 위아래로 끌어서 배치할 수 없음.
- **개선 방안**: HTML5 Drag and Drop API 또는 경량 순서 변경 로직을 적용하여, 사용자가 원하는 트랙의 핸들을 잡고 드래그하여 재생목록의 순서를 직접 커스텀할 수 있도록 지원 (`queue.ts` 내 사용자 지정 순서 `customIndex` 필드 도입).

### ② 스마트폰/키보드 미디어 세션 API (`navigator.mediaSession`) 연동
- **현재 상황**: 웹 브라우저 창 내부의 단축키(`Space`, `N`, `P` 등)만 반응하며, OS 수준의 미디어 키(키보드의 이전곡/다음곡/재생키)나 스마트폰 잠금화면, 알림창 컨트롤러와 연동되지 않음.
- **개선 방안**:
  ```ts
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.name,
      artist: current.artist || '알 수 없는 아티스트',
      album: current.album || '로컬 앨범',
      artwork: coverOf ? [{ src: coverOf, sizes: '512x512', type: 'image/png' }] : []
    });
    navigator.mediaSession.setActionHandler('play', () => togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => goPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => goNext(true));
  }
  ```
  이를 통해 탭을 백그라운드로 내려두거나 모바일 화면이 꺼져 있어도 잠금화면 및 블루투스 이어폰 제어가 가능해짐.

### ③ 재생목록 다중화 (다중 플레이리스트 및 즐겨찾기)
- **현재 상황**: 단일 `tracks` 스토어 하나만 존재하여 여러 분위기나 장르별로 곡을 나누어 관리할 수 없음.
- **개선 방안**: `playlists` 테이블을 IndexedDB에 추가하고, 각 트랙에 `playlistId` 또는 `favorite: boolean` 속성을 부여하여 '즐겨찾는 곡', '작업용 BGM', '운동 플레이리스트' 등 폴더형 관리가 가능하도록 확장.

---

## 2. 오디오 엔지니어링 및 편의성 고도화 과제

### ④ 부드러운 곡 전환: 크로스페이드(Crossfade) 및 갭리스(Gapless) 재생
- **현재 상황**: 곡이 끝나고 다음 곡으로 넘어갈 때 짧은 오디오 끊김 또는 즉각적인 컷오프가 발생함.
- **개선 방안**: Web Audio API의 `GainNode.linearRampToValueAtTime`을 활용하여 곡이 끝나기 전 마지막 2~3초 동안 서서히 페이드아웃(Fade-out)되고 다음 곡이 부드럽게 페이드인(Fade-in)되는 크로스페이드 옵션(설정 토글) 추가.

### ⑤ 인터랙티브 파형 피크 Seekbar (SoundCloud 스타일 Waveform)
- **현재 상황**: 일반 네온 슬라이더 형태의 시간축 바만 제공됨.
- **개선 방안**: 오디오 버퍼 로드 시 저해상도 파형 피크 데이터(Waveform Peaks, 약 100~200개 샘플)를 추출하여 시크바 배경에 미니 캔버스로 사운드 진폭을 렌더링. 사용자가 곡의 하이라이트(드롭/사비) 구간을 눈으로 보고 원하는 지점을 즉시 클릭할 수 있도록 개선.

### ⑥ 동기화 가사(LRC 파일 및 ID3v2 USLT 태그) 지원
- **현재 상황**: 가사 표시 기능이 없어 오직 사운드와 비주얼라이저만 감상 가능.
- **개선 방안**:
  1. 음원 파일에 내장된 ID3 `USLT`(Unsynchronized Lyric) 태그를 추출하여 앨범아트 하단에 가사 탭 제공.
  2. 동일 디렉터리에 존재하는 `.lrc` 타임스탬프 가사 파일을 자동 감지하여 재생 시간에 맞추어 실시간 노래방 싱크 가사 롤링 기능 추가.

---

## 3. 코드 안정성 및 데이터 관리 개선 과제

### ⑦ 대용량 음원 보관 시 QuotaExceededError 대응 가이드
- **현재 상황**: IndexedDB 용량 부족 시 `unsaved` 플래그로 이번 세션만 유지하고 있으나, 사용자에게 명확한 용량 관리 안내 모달이 다소 간결함.
- **개선 방안**: 브라우저 저장소 사용량이 80%를 초과할 경우 경고 뱃지를 띄우고, 용량이 가장 큰 곡 상위 5개를 추천하여 정리할 수 있는 '스토리지 최적화 마법사' 팝업 제공.

### ⑧ 재생목록 메타데이터 JSON 내보내기/가져오기 (Export/Import)
- **현재 상황**: PC를 변경하거나 시크릿 창을 닫으면 곡 리스트가 이전되지 않음.
- **개선 방안**: 음원 바이너리 파일은 저작권 및 용량상 공유하지 않더라도, 곡명·가수·EQ 프리셋 설정값 일체를 `music-player-backup.json`으로 내보내고 가져오는 백업 기능 추가.
