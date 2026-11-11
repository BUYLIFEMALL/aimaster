| 2026-11-12 | `shorts-onestop-studio` v1.49 | 첫 30일 정리(11-12 03:30) 결과 확인 — 지운 것 0건(예상대로), 30일 넘은 행 0개 남음 | 운영 DB 읽기 전용 조회 |
# 영상

- 담당: Claude Code(윈도우) `claude-win-video`
- 맡은 폴더: `ai-video-studio/` · 공용 `ai-video-*` 기준 코드 · 영상 합치기 공용화(`video-edit-composer` 예정) · `infinite-loop-video/` · 내 PC 렌더러 영상 쪽(`video-to-gif/local-renderer` 영상 명령)
- 카테고리: 유튜브·멀티미디어(영상)
- 주력 업무: 영상 연동 레퍼런스·영상 합치기·무료 브라우저/내 PC 렌더
- 마지막 갱신: 2026-11-12 `claude-win-video` (shots v1.48 배포)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| — | 없음 | — | — |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `ai-video-studio` | Vidu Q3 Turbo 5초 실생성 재확인(약 360원) — 코드·배포 완료, 주인님 2026-11-11 「작업만 해놔 나중에 충전하고 할께」 | 보류 — 주인님 2026-11-11 「당장 필요한 기능은 아니니 테스트는 나중에 필요해지면」(요청함 충전 항목 닫음). 필요해지면 충전·실행 직전 승인 | `ai-video-studio/docs/PLAN_20261111_RUNWAY_VIDU_DIRECT.md` |
| `ai-image-studio`·`music-video-studio` | 공용 `ai-video-client` 사본(Runway·Vidu 코드, 화면 변화 없음) 미배포 대기 | 각 프로그램 다음 배포 | `docs/PENDING_DEPLOYS.md` |
| `shots` | **v1.48 배포 완료(2026-11-12)**: 대본·주제 후보 행 30일 정리 적용. 다음 날 03:30 정리 결과(대본 2·후보 10 예상) 확인만 남음 | 2026-11-13 확인 | `shots/docs/IMPROVEMENTS.md` 맨 위 |
| `shorts-onestop-studio`·`music-video-studio` | 공용 「내 자료함」 음악 합치기 검토(영상 스튜디오 v1.35 결과 참고, 가사 시간 등 원본 정보는 유지) — 필수 아님 | 다음에 그 프로그램을 손댈 때 | `docs/MEMBER_LIBRARY.md`, `ai-video-studio/docs/PLAN_20261111_MEMBER_LIBRARY_MUSIC.md` §3 |
| 영상 프로그램 6개 | 서버 지역 서울(`icn1`) 설정 완료 — 각 프로그램 다음 배포 때 반영, 배포 뒤 `x-vercel-id` 확인 | 각 프로그램 다음 배포 | `docs/PENDING_DEPLOYS.md` |
| `shorts-onestop-studio` | V3 2단계(상품 사진 배경·외형 일치 점검) | 이커머스 담당의 사진 주소 형식 답 | `shorts-onestop-studio/docs/PLAN_20261106_V3_PRODUCT_SHORTS.md` §3 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-11-11 | `ai-video-studio` v1.35 | 영상 합치기 배경음악을 「내 자료함」으로(AI 음악 스튜디오·Suno·무료음악 한 목록, 옛 편집 호환), 서버 서울 반영 확인 | 빌드 1회 `ai-video-studio-5qu1otlm0` |
| 2026-11-11 | 영상 6개 서버 지역 | 측정: DB 서울, 함수 미국 동부(iad1) → 주인님 「서울로, 다음 배포 때 함께」로 `vercel.json` `regions: ["icn1"]` 6개 설정 | 빌드 0 |
| 2026-11-11 | 구글 연결 매뉴얼 | 공용 매뉴얼 글 2개 다시 씀(앱 게시·확인되지 않은 앱·오류 대처), 유튜브 떡상·유튜브 댓글 문구·링크(미배포), 블로그·워크스페이스 담당께 요청 파일 | 빌드 0 |
| 2026-11-11 | `youtube-viral-studio` v1.28 | 이름 「AI 유튜브 떡상 분석 자동화」(주인님 선택) + 쇼츠/일반 영상 표시·7일 끊김 안내·다시 연결 버튼. 시험 계정 실제 연결·지표 확인, 구글 앱 프로덕션 게시(주인님) | 빌드 1회 `youtube-viral-studio-j7cm0leh3` |
| 2026-11-11 | `youtube-viral-studio` v1.27 | V6 「📈 내 채널 진짜 지표」 — 회원 본인 구글 앱 연결(공용 연결 재사용), 분석 API 7개 보고서·숫자 힌트, 설정·매뉴얼, 운영 DB 연동 목록 analytics 추가, 시험 38. 인스타 쪽은 인스타 담당께 요청 | 빌드 1회 `youtube-viral-studio-mi4tyfu7t` |
| 2026-11-11 | `ai-video-studio` v1.34 | v1.28 리뉴얼 회귀 수정(사진·비율 값 이름·응답 읽기·모델 고르기 칸) + 운영 DB `avs_generations` 업체 제한에 runway·vidu 추가. 실생성: Runway gen4_turbo 5초 완성 ✅, Vidu는 크레딧 부족 거절(정상 안내) | 빌드 1회 `ai-video-studio-dm0t0thdn` · 생성 $0.25 |
| 2026-11-11 | `ai-video-studio` v1.33 | Runway(gen4.5·gen4_turbo)·Vidu(viduq3-turbo·pro) 직접 연동 — 운영 DB 키 허용 목록, 공용 기준 코드·사본 4곳 동기화, 매뉴얼 2건, 시험 109, 운영 ego 설정·탭 확인. 실생성은 키 등록 대기 | 빌드 1회 `ai-video-studio-63uwl0qzd` |
| 2026-11-11 | 미배포 3건 연속 배포 | `ai-video-studio` v1.32(Claude haiku-5-5) · `youtube-viral-studio` v1.26(메뉴 이름) · `music-video-studio` v1.29(장면 맞춤 사본) — 각 운영 화면 버전 확인. V1 소리 확인(원본 소리 렌더 -21.6dB, 0원) | 빌드 3회 |
| 2026-11-11 | 남은 일 정리 | `ai-video-studio` 구간 고르기 Claude `claude-haiku-5-5`(생각 끔·effort low, 관리자 키 시험 1회 정상, 미배포) · `insta_auto_poster` 담당께 whisper 종료 대비 메모 · 쇼츠 낱말 시각 플랜(2027-01-05 재점검) | 없음 |
| 2026-11-10 | `shorts-onestop-studio` v1.48 | 레퍼런스 받아쓰기 모델 선택(Gemini 3.8 Flash 기본·Flash Lite·OpenAI gpt-transcribe) + 「문장 다듬기로」 조사, 운영 ego 7.5초 확인, 시험 53 | 빌드 1회 `shorts-onestop-studio-5tr3q3m40` |
| 2026-11-10 | `ai-video-studio` v1.31 | 받아쓰기 모델 선택(Gemini 3.8 Flash 기본·Flash Lite·Whisper) — Claude는 음성 입력 없음·OpenAI는 시각 주는 모델이 whisper-1뿐(공식 문서), 긴 소리는 5분씩 조용한 곳에서 잘라 Gemini에. 운영 ego: 해설 받아쓰기 22.3초·긴 영상→쇼츠 18.8초 정상. 시험 108 | 빌드 1회 `ai-video-studio-1e670xxcf` |
| 2026-11-10 | 무료음악 → 쇼츠 5단계(엔진 꺼짐 3분) | 해당 없음으로 닫음 — 엔진이 꺼지면 보내기 메뉴가 꺼져 누를 수 없음(앞단 차단), 이 PC 50곡은 음원이 다른 PC에 있어 엔진 켜져도 메뉴 꺼짐. 엔진 끄지 않음, 비용 0. 시험 요청서 결과 칸 | 없음 |
| 2026-11-10 | 시험 계정 실제 확인(2순위) | ego·본인 키 각 1회: 원스톱 AI 대본 15.8초·「문장 다듬기」 10.2초 정상, 영상 스튜디오 일본어판 번역 5.5초·`Noto Sans JP` 자막 정상. 해설 받아쓰기는 시험 계정 OpenAI 429(잔액)로 못 함. 원스톱 「문장 다듬기으로」 조사 오류 찾아 수정(미배포 대기) | 없음(시험만) |
| 2026-11-10 | `youtube-viral-studio` v1.25 | 🤝 협업 크리에이터 찾기(A4) — 채널·영상 설명의 공개 연락처(이메일·전화·SNS·주소·웹사이트) 카드·CSV·즐겨찾기, 공용 엔진 사본 그대로·추가 할당량 0, 시험 30. 운영 ego 「캠핑」 1회: 31채널·102유닛·7개 | 빌드 1회 `youtube-viral-studio-lpfk3r7hp` |
| 2026-11-10 | `shots` v1.47 | 무료음악 곡을 같은 영상에 다시 보내도 곡 목록·파일이 쌓이지 않게(제목·길이 같으면 기존 곡 선택, 새 파일 지움) `f39885773`, 시험 18 통과. 시험 계정 영상 `06cfbbe7…` 시험 곡 1개 삭제(주인님 승인), 쇼츠 원스톱 시험 대본 배경음악은 그대로 | 빌드 1회 `shots-bdcid4dpl` |
| 2026-11-10 | `shorts-onestop-studio` v1.47 · shots v1.46 | 무료음악(v1.63) 곡 → 배경음악 실물 시험 통과(마스터 Admin PC): 쇼츠 1~4단계(받기→`/render`→③ 칸 저장→MP4 19.1초, 배경음악 평균 -25.2dB 측정), shots 6~8단계(받기→영상에 넣기→원래 곡으로 되돌림). 5단계(엔진 꺼짐 3분 안내)는 생략·미검수. 요청함 a20367c7 닫음 | 없음(시험만) |
| 2026-11-10 | `ai-video-studio` v1.30 | 백로그 3차(장면 맞춤·후처리 3종·내 영상 올리기) + 개선 4건 `a077f865c`(업스케일 1920×1080 안 배율·배경 제거 안내·멈춘 올리기 정리·편집본/내 프롬프트 예외 계정 표시), 시험 102, 운영 ego 확인 | 빌드 1회 `ai-video-studio-a8imcacg9` |
| 2026-11-09 | `shots` v1.46 무료음악 곡 받기(D-6) | 받기 화면 `/fms-bgm`(`shs-ready`) → 곡 받기 → 영상 고르기 → 회원 폴더 업로드 → 곡 저장·선택 `5c15584c5`, 운영 흉내 시험 통과·시험 곡 삭제·원래 곡 복원 | 빌드 1회 `shots-q0kp69yjy` |
| 2026-11-09 | `shorts-onestop-studio` v1.47 D-4 수정 + V7 | 받기 전용 `/fms-bgm`(격리 헤더 없음) → sessionStorage → `/render` `989c7bc1c`, V7 장면 구간·48시간 안내·해시태그 3단 `a97a9de74`, 운영 헤더·3단 표시 확인 | 빌드 1회 `shorts-onestop-studio-1w4ozq084` |
| 2026-11-09 | `shorts-onestop-studio` 무료음악 곡 받기(무료음악 백로그 D-4) | `/render#fms=` → `sos-ready` → `fms-audio` 받아 배경음악으로(출처·보낸 창 확인), 업로드 상한 15MB, tsc·시험 42 통과, ego 운영 확인 | v1.46 배포(`shorts-onestop-studio-jukcy51cw`) |
| 2026-11-06 | `shorts-onestop-studio` V2 각색 강도 | 내 대본 「✨ AI로 다듬기」 3단(맞춤법만·문장 다듬기·구성까지 새로), 회원 키 1회, 줄 수 유지, 되돌리기, 시험 40개·빌드 통과 | v1.45 배포(`shorts-onestop-studio-f1i2zbcg1`) |
| 2026-11-06 | `ai-video-studio` V2 해설 교차편집 | `/narrate` — 해설 녹음+촬영본 → 받아쓰기 → 문장마다 컷 배치 → 영상 합치기(해설 소리 칸), 실행 기록 `narration-cut`, 시험 93개·빌드 통과 `42f743503` | v1.29 배포(`ai-video-studio-op4n162e7`) |
| 2026-11-06 | `ai-video-studio` V2 언어판 | 「🌐 언어판 만들기」(영·일·중·베, 회원 키 번역, 언어별 글꼴, 권리 기록) + 공용 `renderTrace` 사본 등록으로 기준·사본 어긋남 해소, 시험 89개·빌드 통과 | v1.29 배포(`ai-video-studio-op4n162e7`) |
| 2026-11-06 | `ai-video-studio` v1.28 | EDL·실행 기록 정리는 디자인 세션의 v1.28 배포(`ai-video-studio-j0ao4kzka`)에 함께 나감, DB 버전 v1.28로 맞춤 | 배포(다른 세션) |
| 2026-11-06 | `video-to-gif` v1.26 · `shorts-onestop-studio` v1.44 | 승인 빌드 2회(`video-to-ddad3w65y`·`shorts-onestop-studio-4gt4hlp2d`) — V4+V5 / V3 1단계 배포, DB·확장 ZIP 버전 맞춤, 운영에서 V5 지우기 1회 확인 | 배포 |
| 2026-11-06 | `video-to-gif` V5 | 「🧽 내 영상 일부 지우기」 `/erase` — ffmpeg.wasm `delogo`, 사각형 최대 3곳, 60초·100MB, 권리 체크 2개, `own_content_rights_log` 기록(넣기 정책 운영 적용) `d71f6be9e` | v1.26 배포 |
| 2026-11-06 | `ai-video-studio` V2 일부 | 컷 목록(EDL) 내보내기 `944338e0c`, 실행 기록 표 `own_content_rights_log` 운영 적용·30일 정리 `7adc0e000` | 미배포 |
| 2026-11-06 | `ai-video-studio` v1.27 | V1 「긴 영상 → 쇼츠」 배포 `ai-video-studio-bg1c1uy1t` — 운영에서 받아쓰기·구간 3개·영상 합치기·MP4 17.9초 끝까지 확인(관리자 계정 본인 키) | 배포 |
| 2026-11-06 | V1 사전 검증 | 한국어 리뷰 2분 6초: 받아쓰기 98.4%·문장 경계 정확·낱말 시각 최대 0.7초 오차·구간 3개(준비 멘트 제외), 실제 비용 약 22원 | —(저장소 밖) |
| 2026-11-06 | `shorts-onestop-studio` V3 1단계 | 상품 홍보(15초 6비트) 구성·상품 정보 칸·과장 금지 규칙·`#product-name=` 받기 `ea6bdead1` | 미배포 대기(v1.44) |
| 2026-11-06 | `video-to-gif` V4 | 화면에서 바로 녹화(최대 15초) → 대기열 `a0f04a3da` | 미배포 대기(v1.26) |
| 2026-11-03 | `shots` v1.45 | DUP-4 + API 키 안내 문구 배포(승인 빌드 1회 `shots-bl2l6rixx`), 크롬 v1.45·「미게시」 배지 확인 — 「확인 필요」·확인 창은 채널 연결 회원 화면에서 확인 남음 | 배포 |
| 2026-10-29 | `shots` DUP-4 | 유튜브·인스타 업로드 중복 방지(서버 선점·불확실 유지·재발송 확인 창) `7da2cb688` | v1.45로 배포 |
| 2026-10-26 | 맥미니 v1.25 재측정 | 기본 `cpu` 4.2~4.4초·형식 확인 1초 정상(PLAN §18) — 맥 막힘 해결 확인. `gpucanvas`도 크롬 재시작 직후 2.6초라 기본값은 `cpu` 유지 | — |
| 2026-10-26 | `ai-video-studio` v1.25 | 맥 렌더 막힘 해결: GPU 2D 캔버스 원인 확정(맥미니 플래그 시험) → 맥은 메모리 쪽 캔버스 기본·형식 확인 적용·6초 제한 실제로 끝남 | 배포 |
| 2026-10-25 | `ai-video-studio` v1.24 | 맥 인코더 35초 대기 대책: `?render=realtime`·인코더 대기열 trace·막힘 안내 15초·정리 새로고침 안내 | 배포 |
| 2026-10-25 | `ai-video-studio` v1.23 | 맥 렌더 3단계: `?render=trace|nopace|htmlcanvas`·멈추기 3초 보장·30초 막힘 안내(맥미니 v1.22 재측정 반영) | 배포 |
| 2026-10-25 | `ai-video-studio` v1.22 | 맥 렌더 2단계: 맥 소프트웨어 디코딩 기본·`?render=` 스위치·`msPerFrame` 진단·「멈추는 중…」·남은 시간 수정 | 배포 |
| 2026-10-24 | `ai-video-studio` v1.21 | 영상 만들기 진단 1단계·갤러리 서명 한 번에·화질 균형 | 배포 |
| 2026-10-24 | 내 PC 렌더러 1.30 맥판 | 맥미니 실물 확인 모두 통과(터미널 8경우+loop, 크롬 화면 3곳) — 로드맵 「맥 확인 남음」 지움 | — |
| 2026-10-24 | `ai-video-studio` | 갤러리 「작게 줄이기(720)」 화질 → 「균형」(주인님 결정, 시험 55·tsc) | 미배포 대기 |
| 2026-10-24 | 운영 DB | 요청함 마이그레이션 0044 실행(주인님 승인), 작업 결과 4건·해 줄 일 3건 요청함에 올림 | — |
| 2026-10-24 | `ai-video-studio` v1.20 | 게시판 진행 중 배지(디자인 리뉴얼 배포에 함께 실림) — 운영 확인 0.06초 표시·2.4초 갱신 | 배포 |
| 2026-10-24 | `ai-video-studio` v1.19 | 관리자 계정 화면 편집 확인(고치기·숨기기·다시 공개, 되돌림, DB 24개 대조 0) | — |
| 2026-10-24 | 지침 | 맥미니 역할 = 맥용 프로그램 개발·실물 테스트(플레이북 §0, CLAUDE.md 원칙 18) | — |
| 2026-10-24 | `ai-video-studio` v1.19 | 영상 프롬프트 게시판 A안(관리자 편집 + 내 프롬프트, 운영 DB 표 2개) | 배포 |
| 2026-10-24 | 내 PC 렌더러 | 맥 실물 확인 절차·합성 시험 영상(`MAC_CHECK.md`), 렌더러 없을 때 화면 확인 | — |
| 2026-10-24 | `ai-video-studio` v1.18 | 갤러리 카드 「⚡ 내 PC로」 GIF·작게 줄이기 | 배포 |
| 2026-10-24 | 실행기 1.30 · `ai-video-studio` v1.17 | `normalize`·`compress` + 영상 합치기 연결 | 배포 |
| 2026-10-24 | 실행기 1.20 · `infinite-loop-video` v1.08 | 내 PC 렌더러 단계 A `loop` | 배포 |
| 2026-10-24 | `infinite-loop-video` v1.07 | 소리 없는 영상 실패 수정 | 배포 |

## 작업 진행 때 참고할 분석·플랜 (분석 담당 `analysis-planning` 작성 — 2026-10-27 다시 읽음)
- **V1~V7 기준 문서**: `docs/analysis-ecommerce-bundle-20261024/HANDOFF_20261024_VIDEO.md` — 절대 지시 D1~D6(영상 기능은 영상 프로그램만 열어도 끝까지 쓸 수 있게, 쇼핑몰 흐름 연결은 선택), V2·V5는 본인 사용 한정 공통 장치 4가지(권리 체크·회원 파일만·실행 기록 30일·고지), 하지 않을 것(남의 영상 다운로드·저작권 표시 제거·중복 탐지 회피·양산 루프·과장 대본·숫자 조작).
- **V1**: 회원 본인 파일 → 회원 본인 키 받아쓰기 → LLM 구간 선택(점수·이유, 회원이 고침) → 무음 제거 → 브라우저 렌더(공용 `browser-mp4-encoder`·영상 합치기 엔진) → SRT·MP4. 첫 단계는 사전 검증 페이지 1회(수십 원, 실행 전 보고).
- **V3**: 15초 6비트 구성·CTA, `shop-detail-page` 「쇼츠로 만들기」(이커머스 E9)에서 넘어오는 **받는 화면과 값 형식은 영상 담당이 정해 이커머스 담당과 맞춘다**(`trending-product-finder/lib/shopDetailLink.ts` 방식, 짧은 값만·원가 제외).
- **V4**: `video-to-gif`에 `getDisplayMedia` 화면 녹화 입력만 추가(최대 15초, PC 전용). **V5**: ffmpeg.wasm `delogo`, 코어 라이선스(LGPL/GPL) 확인 필요.
- **DUP-4**: 기준은 `youtube-auto-reply/lib/comments/post.ts` 46~59행 조건부 선점. 완료 기준 — 불확실하면 자동 재발송 안 함·서버에서 상태 먼저 잡기·같은 대상 재발송은 회원 확인 창·시험은 모의(실발송 1건은 승인 뒤).
- **2026-10-27 Program_dev 묶음**: 영상 관련 새 개발 없음(Movavi 데스크톱 편집기는 제외). 유튜브 A4 「협업 크리에이터 찾기」만 `youtube-viral-studio` 병합 후보(연락처는 채널에 공개 등록된 비즈니스 이메일만, 마케팅 예외 지침 §3 적용).

## 다음 첫 단계
1. 진단 스위치(`?render=`) 정리는 급하지 않음 — 다음 `ai-video-studio` 배포 때 함께 판단(맥 기본 `cpu` 유지)
2. V4 녹화는 주인님 확인 (V1 소리는 11-11 확인 끝: 원본 소리 켬 MP4 AAC 48k 스테레오·평균 -21.6dB, 원본 -21.4dB)
3. 쇼츠 원스톱 음성 자막 낱말 시각: **2027-01-05 재점검**(플랜 `shorts-onestop-studio/docs/PLAN_20261111_WORD_TIMING_AFTER_WHISPER.md`, ElevenLabs는 이미 자체 시각)
4. 남은 일 없음(대기: Vidu 충전 뒤 재확인, 각 프로그램 다음 배포 때 서울 지역·문구 반영 확인). Vidu 재확인은 주인님이 충전 후 말씀하실 때
3. 영상 D는 요청함 「필요 없음」 처리 — 주인님이 다시 말씀하시면 재개

## 주인님께 여쭐 것
- (없음 — V2·V5 결정 2026-11-06 받음)
