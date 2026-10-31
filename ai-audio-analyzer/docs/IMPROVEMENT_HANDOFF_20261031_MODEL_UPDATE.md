# AI Audio분석 자동화 — Gemini 모델·Suno v6 업데이트 인수인계

- 받는 역할: `music` ([역할 파일](../../docs/roles/music.md))
- 넘긴 세션: `claude-win-sdp` (역할 `ecommerce-image`), 2026-10-31
- 프로그램: https://audio.buylife.xyz · 폴더 `ai-audio-analyzer/` · 현재 v1.13 · 운영 DB ref `esgxyikcnnvmlhygjkth`
- 상태: **조사만 끝남. 코드 수정·시험 호출·배포는 하지 않음.**
- 주인님 지시: 「음악 담당에게 시킬테니까」. 주인님이 화면을 보고 「2.5면 옛날 모델 아니야?」, 「suno는 v6가 최신엔진인데」라고 지적함.
- 아직 주인님 승인 전: 시험 호출과 빌드 비용은 시작 전에 승인받는다.

## 1. 문제 1: Gemini 모델이 옛날 모델

코드에서 `gemini-2.5-flash`를 **4곳**에서 부른다.

| 위치 | 용도 |
|---|---|
| `src/lib/gemini.ts:265` | 음성·음악 자동 판별 |
| `src/lib/gemini.ts:305` | 분석 호출 |
| `src/lib/gemini.ts:370` | 분석 호출 |
| `src/app/api/user-key/route.ts:47` | 회원 키 유효성 확인 |

`gemini.ts` 305·370의 음성·음악 구분은 코드를 열어 확인한다.

구글 공식 문서 확인(모델·종료 일정 문서, 2026-10-22 갱신본, 2026-10-31 읽음):

- 새 프로젝트 권장: `gemini-3.8-flash`, `gemini-3.5-flash-lite`
- 최상위: `gemini-4-argon`
- `gemini-2.5-flash`: 종료 일정은 없고 계속 제공되지만, **과거에 2.5를 쓴 사용자만 접근 가능**
- 음성 전사 전용: `gemini-3.5-transcribe`
- **`gemini-3.8-flash`의 오디오 입력 지원은 목록에 적혀 있지 않음.** 실제 호출로 확인해야 한다.

위험(판단, 실제 새 키로 시험하지 않음): 2.5를 써 본 적 없는 새 회원의 키는 호출이 실패하고, 키 확인도 이 모델을 쓰므로 정상 키가 등록 실패로 나올 수 있다. 그래서 자잘한 수정으로 모아 두지 말고 바로 배포하는 쪽을 주인님께 추천했다.

출처: https://ai.google.dev/gemini-api/docs/models · https://ai.google.dev/gemini-api/docs/deprecations

## 2. 문제 2: Suno 기준이 v5

이 프로그램은 Suno를 호출하지 않고, 음원을 분석해 **Suno에 붙여 넣을 프롬프트 글을 만든다.** 그래서 오류는 나지 않지만 v5 기준 프롬프트가 v6에 쓰이고, 화면도 옛 버전으로 보인다.

| 위치 | 내용 |
|---|---|
| `src/lib/gemini.ts:332`, `:337` | 지시문 「Suno AI v5 프롬프트 엔지니어」, 「v5 God Tier」 |
| `src/components/studio/MusicReportView.tsx:107`, `:113` | 결과 카드 |
| `src/components/studio/AudioAnalyzerApp.tsx:193`, `:249`, `:299` | 본문 |
| `src/components/studio/AudioUploader.tsx:139`, `:240` | 탭, 입력 예시 |
| `src/components/layout/Sidebar.tsx:156`, `:197` | 메뉴 |
| `src/components/guide/GuideModal.tsx:103`, `:109`, `:112` | 안내 창 |
| `src/app/guide/page.tsx:22`, `:45`, `:86`, `:125`, `:210` | 매뉴얼 |
| `src/app/layout.tsx:6` | 페이지 설명 |

화면 제목의 「Gemini 2.5 Flash」, 「v1.10 Cyber Neon…」 표기도 함께 정리한다. 전체 위치는 다음 명령으로 다시 찾는다.

```bash
grep -rnE "Suno( AI)? v5|v5 God|2\.5|gemini-2" ai-audio-analyzer/src
```

v6 정보: 2026-09-09 출시, v6·v6-wild·v6-mini, 예전 모델은 종료된 것으로 보도됨. 검색 결과와 위키백과로 확인했고 Suno 공식 글(`suno.com/blog/introducing-v6`)은 직접 열지 못했다. **v6 프롬프트 작성법은 아직 조사하지 않았다.**

저장소 참고: `music/docs/SUNOAPI_REFERENCE.md`, `docs/analysis-music-studio-20261023/PLAN.md`, 공용 모듈 `suno-api-client`(V6 지원).

## 3. 플랜(주인님께 제안한 내용)

1. v6 프롬프트 작성법을 공식 자료로 확인한다(v6·v6-wild·v6-mini 차이 포함).
2. 짧은 음성·음악 파일로 `gemini-3.8-flash` 오디오 분석을 시험한다.
3. 통과하면 모델 4곳을 교체한다. 키 확인도 함께 바꾼다.
4. `gemini.ts` 지시문을 v6 기준으로 고치고 화면 문구를 바꾼다. 모델 번호는 화면에 박지 않는 쪽을 권한다.
5. 음원 1개로 프롬프트를 뽑아 내용을 확인한다. 실제 Suno 곡 생성 시험은 곡당 약 $0.06의 별도 호출이므로 필요하면 따로 승인받는다.
6. 시험·타입 검사·빌드 후 v1.14로 배포하고 DB 버전을 맞춘다. 크롬에서 확인한다.
7. 문서 갱신: `AGENTS.md`, 프로그램 비교표, 배포 대기표, 역할 파일, HANDOFF.

`gemini-3.8-flash`가 오디오를 받지 못하면: 음성 전사는 `gemini-3.5-transcribe`를 검토한다. 음악 분석을 대신할 수 있는지는 미확인이므로 주인님께 먼저 알린다.

## 4. 지킬 것

- 회원 기능은 **회원 본인 Gemini 키만** 쓴다. 운영자 키로 대신하지 않는다.
- 이미지 프롬프트 규칙과 별개로, 지시문은 이 프로그램 고유의 것을 유지한다.
- 시험 호출은 필요한 만큼만, 쓴 모델과 횟수를 기록한다.
- 배포 전 미배포 대기 `22c6cda35`(메뉴 계정 위치)가 함께 나가는지 `docs/PENDING_DEPLOYS.md`에서 확인하고 대기 줄을 옮긴다.
- 작업 트리의 `ai-audio-analyzer/next-env.d.ts` 변경은 자동 생성분이다. 커밋 때 섞지 않는다.
- 커밋은 파일 경로를 지정한다. 작업 전 `docs/ACTIVE_WORK.md`를 확인하고 자기 줄을 넣는다.

## 5. 비용 예상

| 항목 | 내용 | 승인 |
|---|---|---|
| Gemini 시험 호출 | 짧은 파일 몇 회, 소액, 등록된 본인 키 | 시작 전 |
| Vercel 빌드 | 1회 | 시작 전 |
| Suno 곡 생성 시험 | 선택, 곡당 약 $0.06 | 필요할 때 별도 |

## 6. 다른 프로그램

`gemini-2.5` 사용 현황은 **이 프로그램만 확인했다.** 같은 접근 제한이 다른 프로그램에도 해당될 수 있으니, 전체 점검이 필요한지 주인님께 여쭌다.

## 7. 다음 첫 단계

1. 주인님께 비용 승인을 받는다.
2. `src/lib/gemini.ts`를 읽고 호출 4곳과 지시문을 확인한다.
3. v6 프롬프트 공식 자료를 확인한다.
