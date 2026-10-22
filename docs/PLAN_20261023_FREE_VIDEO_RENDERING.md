# 무료 영상 렌더링 플랜 — FFmpeg·Remotion·기타 플랫폼 연계 (2026-10-23, Claude Code 윈도우)

> 상태: **플랜(분석 완료, 구현 전 — 주인님 승인 대기)**. 대상: ① AIMaster 운영. 코드·DB는 바꾸지 않았다.

## 1. 지금 영상 프로그램 현황 (코드로 확인)

| 프로그램 | 최종 영상 만드는 방식 | 비용 |
|---|---|---|
| `shorts-onestop-studio` | 브라우저 WebCodecs + `mp4-muxer` (공용 기준 `browser-mp4-encoder`) | 무료 |
| `shots` | ① 브라우저에서 만들기(기본, 공용 사본) ② 고급 합성 = **JSON2Video(유료, 회원 키)** | ②만 유료 |
| `lyric-video-studio` | 공용 `browser-mp4-encoder` 사본 | 무료 |
| `playlist-channel-studio` | 자체 WebCodecs + `mp4-muxer` (`video-exporter.ts`, 공용 아님) | 무료 |
| `vinyl-lp-studio` | 자체 WebCodecs + `mp4-muxer` (`media-exporter.ts`, 공용 아님) | 무료 |
| `infinite-loop-video`, `video-to-gif` | `ffmpeg.wasm` 0.12 (브라우저) | 무료 |
| `music-video-studio` | Veo 장면 클립만 만들고 **최종 한 편으로 합치는 기능 없음**(ZIP로 내려받아 캡컷 등에서 편집) | 클립 생성만 유료 |
| `ai-image-studio`·`shots`·`shorts-onestop-studio` `videoProviders.ts` | Kling·Veo 등 **AI가 장면 영상을 새로 만드는 것** | 유료(회원 키) |

**핵심 구분**: FFmpeg·Remotion이 무료로 대신할 수 있는 것은 「이미 있는 이미지·클립·음성·음악·자막을 **한 편으로 합치는 일(렌더링)**」뿐이다. AI 영상 생성(Veo·Kling)·AI 음성(OpenAI TTS·ElevenLabs)은 대신할 수 없다.

→ 렌더링은 이미 대부분 브라우저에서 무료다. 남은 유료 렌더링은 `shots` JSON2Video 하나이고, 빠진 기능은 `music-video-studio` 최종 합치기다.

## 2. 조사한 플랫폼 (2026-10-23 확인)

| 플랫폼 | 성격 | 라이선스/요금 | 우리에게 맞는 쓰임 |
|---|---|---|---|
| **WebCodecs**(브라우저 내장) | 브라우저 하드웨어 인코딩 | 무료 | 지금 엔진. 빠름. 크롬·엣지 94+, 사파리 26+ |
| **Mediabunny** | `mp4-muxer` 작성자의 후속 통합 도구(읽기·쓰기·변환) | MPL-2.0, 상업 사용 무료 | `mp4-muxer` 대체 후보 + 클립 잘라붙이기·변환. 자체 벤치마크상 ffmpeg.wasm보다 훨씬 빠름 |
| **ffmpeg.wasm** | FFmpeg를 브라우저에서 실행 | 무료(LGPL 계열) | WebCodecs로 어려운 일: GIF, 역재생, 필터, 형식 변환. 느리고 메모리 한계 → 짧은 영상만 |
| **Remotion** | React로 영상 템플릿을 짜는 도구. `@remotion/web-renderer`(`renderMediaOnWeb`, 4.0.491부터 안정)로 **브라우저 렌더 가능**, 안쪽은 Mediabunny | **무료는 개인·직원 3명 이하 회사만**(프리랜서·대행사 인원도 합산). 넘으면 회원 렌더 서비스는 「Automators」 렌더당 $0.01, **월 최소 $100**. 브라우저 렌더는 꺼지지 않는 사용량 기록(텔레메트리)이 나감. 회원이 Remotion 코드를 올리게 하는 것은 금지. 5.0에서 약관 일부 변경 예정 | 템플릿이 많고 화면 구성이 복잡한 프로그램(가사·카드뉴스 영상)의 미리보기(Player)+렌더. **라이선스 조건 확인이 먼저** |
| Remotion Lambda / Cloud Run | 서버 대량 렌더 | 회원 본인 AWS/GCP 계정이면 운영자 비용 0 | 긴 영상·예약 자동 렌더가 꼭 필요할 때만(회원 본인 계정, 핵심 원칙 0·4) |
| Motion Canvas / Revideo | Remotion 비슷한 오픈소스(MIT) | 무료 | Remotion 라이선스가 문제될 때 대안. 사용자층이 작아(Revideo 주간 약 3천 내려받기) 유지보수 위험 |
| JSON2Video / Creatomate / Shotstack | 유료 렌더 API | 무료 체험 수 분, 유료 월 $41~50 수준 | 지금처럼 「고급 합성」 선택지로만 유지 |
| 운영자 렌더 서버(오라클 무료 서버·Vercel 함수에 FFmpeg) | 서버 FFmpeg | 무료 등급이 있어도 운영자 자원 | **쓰지 않음** — 운영자 인프라 비용·한도가 생겨 프리미엄 프로그램 문제가 됨(원칙 16) |

## 3. 추천 구조 — 「브라우저 3층 엔진」

```
[그리기]  지금처럼 각 프로그램의 drawFrame(캔버스)  ─ (선택) Remotion 템플릿
   ↓
[인코딩]  WebCodecs + Mediabunny  (기본, 빠름)
          └ ffmpeg.wasm  (GIF·역재생·필터·형식 변환 등 특수 작업만, 필요할 때만 불러옴)
   ↓
[저장]    회원 PC로 바로 저장(FileSystem 쓰기) 또는 회원 저장소 업로드 → 유튜브/인스타 업로드
```

- 모든 처리는 회원 브라우저에서 → 운영자 서버 비용 0, 회원 비용 0(AI 생성·음성 키 비용만 본인).
- Remotion은 **라이선스 조건이 맞을 때만** 그리기 층에 선택적으로 얹는다. 핵심 엔진은 Remotion에 의존하지 않는다(라이선스·약관 변경 위험 분리).

## 4. 단계별 구현 순서

| 단계 | 할 일 | 대상 | 검수 |
|---|---|---|---|
| 1 | 공용 기준 `browser-mp4-encoder`에 **클립 이어붙이기·자르기**(Mediabunny로 영상 파일 읽기) 추가, `mp4-muxer` → Mediabunny 전환 검토. 기존 사본 3곳 동기화(`check-shared-modules.mjs --sync`) | `shorts-onestop-studio`(기준)·`shots`·`lyric-video-studio` | 같은 입력으로 전환 전후 길이·크기·소리 비교 |
| 2 | 공용 `browser-ffmpeg` 등록 — `infinite-loop-video`의 `getFFmpeg()`(필요할 때만 CDN에서 불러오기)를 기준으로 | `infinite-loop-video`(기준)·`video-to-gif` | 기존 기능 그대로 동작 |
| 3 | **`music-video-studio` 최종 뮤직비디오 합치기**: Veo 클립 + Suno 음악 + 가사 자막 → 한 편 MP4(브라우저, 무료) | `music-video-studio` | 크롬 실제 화면에서 3~4클립 합치기 |
| 4 | `playlist-channel-studio`·`vinyl-lp-studio` 자체 인코더를 공용 기준으로 교체(급하지 않음, 다음 배포 때) | 2개 | 결과 비교 |
| 5 | `shots` JSON2Video는 「고급 합성(유료 선택)」으로 유지. 브라우저 쪽에 남은 차이(자막 애니메이션 등)만 보강 | `shots` | 두 방식 결과 비교 |
| 6 | (선택) **Remotion 시범** — Lab(`labs/`, AIMaster_dev)에서 가사 영상 템플릿 1개로 `renderMediaOnWeb`+Player 시험 → 품질·속도·라이선스 판단 뒤 운영 적용 여부 결정 | Lab 1개 | 화면·속도·파일 비교 |

## 5. 비용

| 항목 | 비용 |
|---|---|
| 렌더링 엔진(WebCodecs·Mediabunny·ffmpeg.wasm) | 없음 |
| Remotion | 직원(프리랜서 포함) 3명 이하면 없음 / 넘으면 월 최소 $100 |
| 개발 시험 — 음성(TTS) | 시험 계정 본인 키, 장면 몇 개(수 원 수준) |
| 개발 시험 — Veo 클립 | 새로 만들지 않고 이미 만든 클립 재사용 → 없음 |
| Vercel 배포 빌드 | 단계별 프로그램당 1회(순차). **실행 전 승인** |
| 회원 부담 | 렌더링 0원(AI 생성·음성은 지금처럼 본인 키) |

## 6. 한계·주의

- 아주 긴 영상(10분 이상)·저사양 PC·휴대폰은 느리거나 메모리 부족 가능 → 파일로 바로 쓰기 + 길이 경고 유지.
- 브라우저 탭을 닫으면 멈춤 → 예약 자동 렌더는 불가(필요하면 회원 본인 클라우드 계정 방식만).
- ffmpeg.wasm 코어는 CDN에서 받으므로 버전 고정 필수(지금 `infinite-loop-video` 방식).
- 외부 배포 키트(수강생)는 개인 사용이라 Remotion 무료 조건에 해당할 가능성이 높으나, 키트 배포 전 다시 확인.

## 7. 주인님 결정이 필요한 것

1. 단계 1~5(무료 브라우저 엔진 정리·뮤직비디오 합치기) 진행 여부와 순서
2. ~~Remotion 시범(6단계) 여부 — BUYLIFE 인원(프리랜서 포함)이 3명 이하인지~~ → **확정(2026-10-23 주인님): 개인·3명 이하 회사로 Remotion 무료 라이선스 조건에 해당.**

## 8. Remotion 무료 조건 확정에 따른 변경 (2026-10-23)

- Remotion은 비용 걱정 없이 쓸 수 있다. 6단계(Lab 시범)를 「선택」에서 **정식 단계**로 올리고, 템플릿이 많은 프로그램(가사 영상·카드뉴스→영상·뮤직비디오 자막)의 **그리기 층 + 미리보기(Player)** 에 쓰는 것을 기본 후보로 둔다.
- 그래도 **인코딩 엔진은 Remotion에 묶지 않는다**(WebCodecs+Mediabunny 공용 엔진 유지). 이유: ① 인원이 4명 이상이 되면(프리랜서·대행사 포함) 회원 렌더 서비스는 월 최소 $100 유료로 바뀜 ② 5.0에서 약관 변경 예정 ③ 브라우저 렌더 때 꺼지지 않는 사용량 기록(도메인별 렌더 수)이 Remotion으로 전송됨. Remotion을 빼도 프로그램이 돌아가게 경계를 나눈다.
- 지킬 것: 회원이 Remotion 코드를 직접 올리거나 바꾸게 하는 기능은 만들지 않는다(무료 약관 금지 사항). Remotion을 고쳐 파는 형태도 안 된다.
- 인원이 늘거나 Remotion 5.0으로 올릴 때는 라이선스를 다시 확인한다(이 문서와 `docs/PROGRAM_IDEA_BACKLOG.md`에 기록).

## 9. 최종 추천 플랜 (2026-10-23) — 「잘 돌아가는 건 두고, 없는 것만 Remotion으로」

원칙: 이미 무료로 잘 돌아가는 브라우저 인코더(5개 프로그램)는 다시 짜지 않는다(고장 나지 않은 것을 고치지 않음). 새 가치가 큰 곳에만 Remotion을 처음 도입한다.

| 순서 | 작업 | 이유 | 배포 |
|---|---|---|---|
| A-0 | **Remotion 사전 확인(로컬, 무료)** — `@remotion/web-renderer`의 `renderMediaOnWeb`로 영상 클립 3개 + 음악 + 가사 자막을 브라우저에서 합쳐 보기. 영상 클립·소리가 지원되는지, 속도·메모리 확인 | 브라우저 렌더는 지원 HTML 요소가 제한됨 → 먼저 확인해야 헛개발이 없음 | 없음 |
| A | **`music-video-studio` 최종 뮤직비디오 합치기** — Remotion Player로 미리보기(타임라인·자막 위치 조정), `renderMediaOnWeb`로 MP4. A-0에서 막히면 기존 공용 엔진(캔버스+WebCodecs)으로 같은 기능 구현 | 지금 없는 기능, 회원이 캡컷으로 따로 편집하던 일을 없앰. Remotion의 강점(여러 클립·음악·자막 시간 맞추기)이 가장 잘 맞는 곳 | 1회(승인 후) |
| B | 결과가 좋으면 Remotion 구성 코드를 **공용 기준 코드**(`remotion-mv-composer` 가칭)로 등록 → 다음 후보: `lyric-video-studio` 템플릿 확장, `shorts-onestop-studio` 미리보기 | 검증된 것만 다른 프로그램으로 | 다음 배포 때 함께 |
| C | `infinite-loop-video` ffmpeg.wasm 코드를 공용 `browser-ffmpeg`로 **등록만**(코드 변경 없음) | 문서 정리, 다음 개발 때 재사용 | 없음 |
| 보류 | `mp4-muxer`→Mediabunny 전환, `playlist`·`vinyl` 인코더 교체, `shots` JSON2Video 제거 | 지금 정상 동작. 오류가 나거나 그 프로그램을 고칠 때 함께 | — |

비용: A-0·C 없음 / A 빌드 1회 / 시험은 이미 만든 Veo 클립 재사용(새 유료 생성 없음).

## 출처
- Remotion 라이선스: https://github.com/remotion-dev/remotion/blob/main/LICENSE.md , FAQ https://www.remotion.dev/docs/license/faq
- Remotion 브라우저 렌더: https://www.remotion.dev/docs/client-side-rendering/
- Mediabunny: https://mediabunny.dev/
- 대안 비교: https://www.pkgpulse.com/guides/remotion-vs-motion-canvas-vs-revideo-programmatic-video-2026 , https://motionbox.io/blog/best-json2video-alternatives-in-2026
