# shorts-viral-studio — 원본 대비 갭 분석 (2026-10-11, v1.04 기준)

> 목적: 주인님이 다시 올려주신 원본(`\\Admin\i\!!!@@AI_Vibecoding\유튜브 떡상 쇼츠 검색 부터 분석, 소재찾기, 대본생성까지 한 번에!\index.html`, 남다른AI "Shorts 분석기", 2,270줄 단일 HTML)과 현재 `shorts-viral-studio`를 대조해, 새 프로그램을 따로 만들지 않고 **기존 프로그램을 완성해 출시**(A안)하기 위한 점검이다. 이 작업에서 코드는 바꾸지 않았다.
> 원본 영상: https://www.youtube.com/watch?v=H6NbL37LTIo ("유튜브 떡상 쇼츠 검색 부터 분석, 소재찾기, 대본생성까지 한 번에!", 남다른 AI).

## 1. 결론

**기능은 원본을 빠짐없이 포함하고 있다(오히려 더 많다).** 새 프로그램을 만들 이유가 없고, 남은 일은 ① 권한 판정을 표준으로 교체 ② 도메인 로그인 공유(SSO) ③ 실제 키 검수와 출시(준비중 배지 제거)다.

## 2. 기능 대조표 (원본 → 현재 구현)

| 원본(index.html) | 현재 구현 | 판정 |
|---|---|---|
| 01 Search: 키워드, 프리셋(지금 떡상·작은 채널 대박·급상승·초기화), 게시 기간(from~to), 영상 길이(60/180/5분 초과/전체), 최소 조회수, 최대 구독자 | `SearchStep.tsx` 동일 프리셋·필터. 길이 1분/3분/전체, `regionCode=KR`, 정렬(조회수/관련도/최신) 추가 | ✅ 포함 (5분 초과 옵션은 제외, 쇼츠 분석 목적과 맞지 않아 의도적) |
| 결과 표: Views·Subs·V/S Ratio·Velocity·Outlier·Viral Score, 전체 선택, Analyze Selected | 같은 지표 + 떡상 등급(초대박·대박·떡상·양호), 구독자 비공개는 "판정불가"(원본은 0으로 계산) | ✅ 개선 |
| 02 Analyze: 11대 바이럴 메커니즘, 구간별 타임라인 스토리 전략, 시각 연출·비디오 스타일 DNA, 시청자 반응·결핍 니즈(댓글) | `AnalyzeStep.tsx`, `pipeline.ts`. Gemini는 영상을 직접 보고 분석(`fileData`), 실패·GPT·Claude는 `(추정)` 표기 | ✅ 개선(가짜 분석 제거) |
| 03 Ideate: 6가지 맞춤 쇼츠 아이디어 | `IdeaSteps.tsx` | ✅ |
| 04 Select Topic: 주제·구간별 전개, 추가 기획 피드백 | `IdeaSteps.tsx` | ✅ |
| 05 Script: 목표 길이(10~180초), 나레이션 톤 7종+직접 입력, 타겟 시청자, 생성, 피드백 재생성 | `ScriptStep.tsx` 동일 + 씬별 직접 편집, 한 문장 규칙 검증 | ✅ 개선 |
| 06 Prompts: 마스터 BGM 프롬프트, 씬별 비주얼(Midjourney·AI 비디오) 프롬프트, 프로젝트 .md 저장 | `PromptsStep.tsx`, `lib/export.ts` | ✅ |
| (원본에 없음) | 프롬프트 보관함(`/vault`), 프로젝트 자동 저장(`svs_projects`, 30일), 3엔진(GPT/Claude/Gemini) 모델 선택, 회원별 키 | 추가 |
| 키: 브라우저 localStorage, 브라우저에서 직접 API 호출 | 회원별 서버 저장(`user_api_keys`), 서버에서 호출 | 플랫폼 원칙에 맞춰 변경 |

## 3. 표준 점검에서 나온 문제 (우선순위)

| # | 위치 | 문제 | 영향 | 조치 |
|---|---|---|---|---|
| P1 | `src/lib/access.ts` | 권한 테이블(`profiles`·`programs`·`subscriptions`·`user_program_access`)을 로그인 세션 클라이언트(RLS 적용)로 조회한다. 핵심 규칙은 `createAdminClient()` 사용. | RLS·쿠키 때문에 정상 권한자가 막힐 수 있음(과거 사고 유형) | 루트 표준 판정(`checkProgramAccess` 사본)과 `createAdminClient()`로 교체 |
| P2 | `src/lib/access.ts` 4번째 분기 | 존재하지 않는 컬럼 `profiles.program_access_expires_at`을 조회(DB 확인: 컬럼 없음). 이 분기는 항상 실패해서 사실상 죽은 코드이고, 등급 ≥ 최소 등급 + 사용기간 규칙도 구현되어 있지 않다. | 규칙(`일반 이상 + 사용기간`)과 코드가 다름 | P1과 함께 표준 규칙으로 교체 |
| P3 | `src/lib/supabase/*`, `src/proxy.ts` 없음 | 도메인 로그인 공유(`.buylife.xyz`) 코드가 없다. 주소도 `*.vercel.app`. | 다른 프로그램에서 로그인 후 다시 로그인해야 함 | `cookieDomain.ts` + client/server/proxy 적용, `shorts-viral-studio.buylife.xyz` 연결, `programs.app_url` 갱신(옛 주소 유지) |
| P4 | DB `programs.badges` | `new`·`coming`(준비중) 배지가 남아 있다. 이용 기록 0건. | 카탈로그에 준비중으로 보임 | 실제 키 검수 후 `coming` 제거 |
| P5 | 검수 | 실제 YouTube·AI 키로 1회 실행한 검증이 문서상 "미완"(AGENTS.md). | 운영 중 오류를 모름 | 테스트 계정 본인 키로 6단계 직접 실행(Chrome), 모바일 폭 확인 |
| P6 | `package.json` | version `0.1.0`(화면 표기 `v1.04`와 불일치) | 혼동 | 배포 때 맞춤 |

## 4. 문제가 아닌 것 (확인함)

- 서버 액션 전부(`projects`·`savedPrompts`·`settings`·`svs`)가 `requireProgramAccess()`를 호출하고, 데이터는 `user_id`로 한정되며 테이블은 owner-only RLS다.
- 모든 레이아웃·페이지에 `dynamic = "force-dynamic"` + `fetchCache = "force-no-store"`가 있다.
- 키 provider 이름은 `anthropic`(DB 체크 제약과 일치)이고 모델 ID는 운영 중 `naver-blog-agent` 레지스트리와 같다. 폴백 없이 본인 키만 쓴다.
- Claude 호출 `max_tokens`는 8000이라 `youtube-channel-consultant`에서 겪은 빈 응답(4096) 문제는 해당 없음.

## 5. 진행 순서

1. (이 문서) 갭 분석 — 완료
2. v1.05: 권한 판정 표준 교체(P1·P2) + 자동 검사
3. v1.06: 도메인 로그인 공유(P3)
4. 실제 검수(P5) → 출시(P4, P6)
