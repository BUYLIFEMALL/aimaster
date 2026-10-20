# BLC-03 사진·방문 메모 후기 — v2.03 릴리스 검수

2026-10-21 Codex(윈도우), 주인님 ‘계속 작업진행’ 요청. 대상 **AIMaster 운영 ref `esgxyikcnnvmlhygjkth`**. [사전 플랜](PLAN_20261021_BLC03_PHOTO_REVIEW.md). BLC-02 `49c6fd62`·증거 `ec0f6305`를 보존하고 사진 후기 기능만 추가합니다.

## 구현 범위

- 사진 준비 영역에서 장소/주제·방문 메모·사진별 설명을 입력하고 사진 입력 지원 모델로 후기 초안을 만듭니다. 기존 일반 글 생성 모델과 같은 선택값이며 다른 모델로 자동 전환하지 않습니다. 사진 생성·일반 글 생성·기존 원고 저장/발행 동작은 그대로입니다.
- 첫 호출에는 사진과 ID만 전달해 관찰/불확실성을 기록합니다. 다음 호출에는 ID가 검증된 관찰과 회원 메모/설명을 분리해 초안을 요청합니다. 사진 1~6장 순서를 보존하고 문단별 근거를 표시합니다. AI의 사실성을 보장하는 장치는 아니므로 항상 직접 검수 필요 상태로 표시합니다.
- 새 `/api/photo-review`: 기존 회원 권한 판정 → 입력/중복/대표/지원 모델 검증 → 본인 경로 검증 → 선택 공급사의 공용 본인 키 조회 → 비공개 버킷·실제 생성일+30일·실제 MIME/바이트 재검증 → 요청 내 바이트로 AI 호출. 사용자 외부 URL 다운로드·운영자/환경변수 키·다른 공급사 폴백·생성 캐시·DB 원고 쓰기 없음. 사진은 장당 4MB, 분석 합계 12MB입니다.
- 최대 2회 AI 호출, 각 75초 제한·자동 재시도 0. 사진 읽기는 각각 20초, 전체 처리 중단 신호 220초·서버 최대 300초입니다. 실제 Storage 메타데이터 조회가 지연되면 AI 호출 전에 중단 신호를 재확인합니다. 취소가 이미 진행된 공급사 비용을 되돌린다고 안내하지 않습니다.
- 입력 변경/사진 취소/순서·설명·대표 변경/모델 변경/화면 이탈 시 이전 결과를 버립니다. 늦은 성공은 화면에 복원하지 않습니다. 결과는 화면에서 근거 대조와 복사만 제공하며 **보관함·편집·확장 연결은 BLC-04 미구현**입니다. 새로고침/이동 시 사진 선택·메모·초안이 사라집니다.
- 사용 안내에 메타정보·개요·4단계 시각 카드/상세·규칙 복사·팁/주의·회원 설정 직링크를 추가했습니다. 모델/키 등록을 중복 구현하지 않습니다.

## 검수·비용

| 항목 | 결과·근거 |
|---|---|
| 전체 회귀 | **176/176** 통과(기존 158 + 후기 18). [명령·해시](evidence/blc03-photo-review/release-checks.json) |
| 후기 회귀 | 실제 검증/서버 경로/AI 요청/클라이언트 모듈 실행. 비로그인·타 회원·외부 URL·경로 조작·중복/초과·만료·키 없음·미확인 모델 차단, 원본 바이트/ID·6장 순서·응답 오류·근거 오류·재시도 0·취소/입력 변경/늦은 응답 확인. [결과](evidence/blc03-photo-review/regression.txt) |
| 기존 확장 | 모의 42개·브리지·발행·모델 선택 스크립트 통과. 확장 실행 코드는 변경하지 않고 릴리스 번호/ZIP만 동기화 |
| 정적 검사 | 타입·ESLint·로컬 운영 빌드 통과. 기존 guide의 미사용 BookOpen/ShieldCheck 경고 2개만 유지 |
| 실제 로컬 HTTP | v2.03, `/api/photo-review`·기존 사진 경로 무인증 401·no-store. [증거](evidence/blc03-photo-review/local-http.json) |
| 실제 회원 생성 | **미실행**. 현재까지 유료 AI 호출 0·사진 생성 0·원고 저장/최종 발행 0. 시험 예정 모델은 [공식 가격](https://developers.openai.com/api/docs/models/gpt-4o-mini)을 확인한 기존 지원 항목 중 저비용 GPT-4o-mini, 실제 생성 1번(최대 2회 API)부터 |
| Edge 상태 | 실제 창 2884854 유지. 좁은 516px에서 BLC-02 바로가기 제목이 상단 메뉴 아래에 보이는 [접힌 화면](evidence/blc03-photo-review/blc02-anchor-narrow-collapsed.png)을 확인. native ExpandCollapsePattern으로 펼침/파일 선택 항목 확인한 [트리](evidence/blc03-photo-review/blc02-anchor-narrow-expanded-tree.txt). 펼친 화면은 다른 터미널에 가려져 픽셀 미확인. Windows가 포커스 전환을 거부하고 Orca 키보드는 window_not_focused. 주소 값 설정은 가능하지만 이동 실행은 아직 미확인. 사용자에게 Edge 포그라운드 클릭을 비동기로 요청했으며 코드 검수를 계속함 |

입력 지원은 [OpenAI 사진 입력](https://developers.openai.com/api/docs/guides/images-vision)·[Claude 사진 입력](https://platform.claude.com/docs/en/build-with-claude/vision)·[Gemini 사진 이해](https://ai.google.dev/gemini-api/docs/image-understanding)와 기존 앱 모델 목록을 대조했습니다. 현재 OpenAI GPT-4.1/4o/4o-mini/6-astra, Claude Haiku 4.5, Gemini 3.1 Pro Preview만 사진 후기에서 확인된 목록으로 제공합니다. 나머지를 비전 불가능하다고 단정하지 않고 ‘미확인’으로 안내합니다. 기존 일반 글 모델 목록은 바꾸지 않았습니다. 프로바이더 간 요청 형식은 올인원 `llm.ts`도 참고했지만 서버의 회원 키/비공개 사진/중단/로그 미노출에 맞춰 프로그램 내부 전용 호출로 구현했습니다. 공용 OpenAI 파라미터 사본은 그대로 재사용했습니다.

## 릴리스 상태·다음 첫 단계

**v2.03 운영 배포·버전 동기화 완료, 실제 회원 생성 검수는 로그인 대기입니다.** 코드 `1812bf7f` 커밋/원격 푸시, Vercel `dpl_5LXFFLqas2kyfer2VD8SEjXPVpfd` inspect Ready·공식 도메인 연결 확인. https://naver-blog-agent-2b71w0srg-buylife.vercel.app . 운영 DB ref `esgxyikcnnvmlhygjkth`의 해당 프로그램 메타데이터만 갱신, DB/확장 manifest/라이브 ZIP v2.03 일치(오류/경고 0). [운영 공개 검사](evidence/blc03-photo-review/production-release.json): 버전 200·사진 후기 포함 무인증 보호 6경로 401·이전 임시 HTML 404. DB 스키마/정책·키/환경변수·회원 권한 변경 없음. 이 프로그램만 1회 배포했습니다.

후속 Edge 상태: 해당 Edge 창만 잠시 맨 위로 올려 터미널 가림을 해소했습니다. 현재 앱 탭만 native InvokePattern으로 새로고침하자 **기존 로그인 세션을 확인하지 못해 `/login?redirect=%2Fdashboard#private-photo-input` 이동**을 확인했습니다. 시험 회원 이메일 `buylifemall@naver.com`만 입력하고 비밀번호는 입력/조회하지 않았습니다. 주인님에게 실제 Edge 로그인을 비동기로 요청했습니다. 임시 ‘항상 위’ 설정은 해제하고 1433×1399 일반 창으로 유지했으며 다른 네이버 준비 탭을 변경하지 않았습니다. 자체 로컬 서버는 종료했습니다. [실회원 검수 상태](evidence/blc03-photo-review/production-member-checks.json).

**BLC-03 전체 운영 완료로 표시하지 않습니다.** 실제 AI 호출/회원 후기 생성·복사·입력 변경 시 초안 해제·운영 매뉴얼/좁은 화면 검수는 미실행입니다. 지금까지 유료 AI/사진 생성/후기 원고 저장/최종 발행 모두 0회입니다. BLC-02 접힌 제목과 실제 펼침 트리 확인을 새 후기 기능 검수 완료로 확대하지 않습니다.

다음은 Edge 포그라운드에서 실제 지정 회원(`buylifemall@naver.com`) 세션 확인 → 작은 시험 사진 1장·GPT-4o-mini로 초안 1번 → 관찰/회원 메모/확인 필요·복사·입력 변경 시 결과 해제·좁은 화면·사용 안내 확인입니다. 유료 호출 전 본인 키 등록 여부를 확인하며 없으면 대체하지 않습니다. 비밀번호는 주인님이 직접 입력합니다. BLC-04는 이 항목 운영 검수 후 플랜부터 진행합니다. 적용 스킬: 기존 computer-use 제어 절차, React 검수 스킬. 운영 회원 키 정책을 우선하며 새 키/개인 환경변수 파일을 만들지 않았습니다.

https://naver-blog-agent.buylife.xyz
