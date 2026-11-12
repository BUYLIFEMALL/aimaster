# 플랜 — 음성 파일 받아쓰기 엔진 회원 선택 (2026-11-06, 역할 workspace)

> **현재 상태(2026-11-13 점검)**: ✅ 완료 — 받아쓰기 엔진 회원 선택(자동/OpenAI) v1.22 배포(2026-11-06).

## 배경·결정
- v1.20 U6-B 음성 파일 받아쓰기는 회원 키가 둘 다 있으면 **항상 Gemini**를 썼다(`memberStt.ts` `memberSttMode`: Gemini 우선 → OpenAI). 그래서 시험 계정(`buylifemall@naver.com`, Gemini·OpenAI 키 모두 등록)으로는 OpenAI 경로를 실제로 확인할 수 없었다(`docs/IMPROVEMENTS.md` 「v1.20 운영 확인」).
- 요청함 `c234b28c`(2026-11-06)에서 「OpenAI 키만 있는 계정」 또는 「시험 동안 Gemini를 쓰지 않게 하는 방법」을 여쭈었고, 주인님이 **「진행해」**로 결정. 두 번째 안을 **회원 설정 기능**으로 만들어 시험 계정 그대로 확인한다(다른 프로그램이 같이 쓰는 시험 계정의 Gemini 키를 지우지 않음).

## 범위
1. 서버 `memberStt.ts`: `memberSttMode(preferred?)` — 회원이 OpenAI를 골랐고 OpenAI 키가 있으면 OpenAI, 그 외는 기존 순서(Gemini → OpenAI). `memberSttModes()`로 쓸 수 있는 엔진 목록.
2. 서버 `instructions.ts` `userMeetingPrefs`에 `sttEngine: 'auto' | 'openai'`(`user_settings.settings.meeting_stt_engine`) 추가. `audio.ts`의 `sttProvider`·`sttMaxBytes`·`transcribeUploaded`가 회원 선택을 따른다(Google에 직접 올린 파일은 그대로 Gemini).
3. `meetingStatus` 응답에 `sttModes`(쓸 수 있는 엔진)·`sttEngine`(회원 선택) 추가, `sttMode`·`sttMaxBytes`는 선택 반영값.
4. 화면 설정 메뉴(오른쪽 위 슬라이더)에 「음성 파일 받아쓰기 엔진」 항목 — 키가 둘 다 있을 때만 보임. 하위 메뉴 「자동(Gemini 우선 · 100MB · 화자·시각)」 / 「OpenAI(4MB 이하 · 시각 없음)」, 저장은 기존 `savePref`(회원 설정, 모든 기기 공통). 파일이 너무 클 때 안내도 선택에 맞게.
5. 시험 `memberStt.test.ts`에 선택 반영 2건 추가. 매뉴얼(`/guide`) 음성 단락에 한 줄.

## 하지 않는 것
- 매번 묻는 선택 창(설정 한 번이 자동화 지침에 맞음), 실시간 받아쓰기 엔진(브라우저 Web Speech 그대로), Claude 음성(불가).

## 검수
- 자동 시험 통과 → `npm run build` → 배포 뒤 ego에서 시험 계정으로 설정 「OpenAI」 → 15초 WAV 받아쓰기 → OpenAI 경로 결과(시각 없음·몇 문장 묶음) 확인 → 설정 「자동」으로 되돌림.

## 비용
- Vercel 빌드 1회(배포 승인 필요), OpenAI `gpt-transcribe` 15초 1회(시험 계정 본인 키, 약 $0.01 미만). Gemini 호출 없음.

## 버전·배포
- 미배포 대기 `376c55c7a`(왼쪽 메뉴 v1.21 표시)와 함께 **v1.22**로 배포(코드 `lib/version.ts` + DB `programs.version`).
