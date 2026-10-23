# BLC-03 사진·방문 메모 후기 — v2.03 운영 완료

2026-10-21 Codex(윈도우), 주인님 ‘계속 작업진행’ 요청. 대상 **AIMaster 운영 ref `esgxyikcnnvmlhygjkth`**. [사전 플랜](PLAN_20261021_BLC03_PHOTO_REVIEW.md). BLC-02 `49c6fd62`·증거 `ec0f6305`를 보존하고 사진 후기 기능만 추가합니다.

**최종: v2.03 운영 배포·실제 지정 회원 검수 완료.** 주인님 로그인 후 실제 Edge에서 사진 후기 1번 생성·근거 대조·복사·메모 변경 시 결과 해제·사용 안내·좁은 화면 확인까지 마쳤습니다. 저장·보관함·확장은 예정된 BLC-04 범위이며 현재 미구현입니다. 아래 로그인 대기 이력은 이번 검수로 해소됐습니다.

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
| 실제 회원 생성 | `buylifemall@naver.com` 실제 Edge 로그인·등록된 본인 OpenAI 키. [공식 가격](https://developers.openai.com/api/docs/models/gpt-4o-mini)을 확인한 기존 지원 항목 중 저비용 **GPT-4o-mini, 생성 1번(관찰·작성 2회 API)**. 빨간 계열 단색 시험 PNG 1장·실제 방문/맛/가격 없음 명시·목표 1,000자. 결과에서 해당 경험을 지어낸 문장은 관찰되지 않음. 자료가 적어 짧게 작성됐으며 분량을 채우라고 추가 생성하지 않음. 합성 시험 자료 1건의 확인이며 일반 사진 품질을 보장하는 검수로 확대하지 않음 |
| 근거·복사·입력 변경 | 사진 1 관찰 근거·대표·회원 메모/설명·AI 관찰·알 수 없는 내용·직접 검수 필요 표시 확인. 초안/주의·확인 내용 복사 성공, 복사 텍스트 229자·경고 포함·SHA만 보관. 메모 변경 시 기존 초안/근거 숨김, 추가 생성 없음. [복사 확인](evidence/blc03-photo-review/production-clipboard-check.json) · [입력 변경](evidence/blc03-photo-review/production-input-change-check.json) |
| 실제 Storage/DB | 이번 단계 새 사진 **1개/422바이트**, 원고 새 저장 **0건**(운영 ref `esgxyikcnnvmlhygjkth` 읽기 확인). 목록 취소→0장, 물리 삭제 없음·원래 생성일+30일 유지. AI 사진 생성/최종 발행 0. 실제 모델 토큰·결제 금액은 수집하지 않음 |
| 사용 안내 | STEP 2→3→4 상세 전환·규칙 복사 성공. 사진 후기 바로가기·회원 API 설정 직링크 확인. [단계 확인](evidence/blc03-photo-review/production-guide-step-checks.json) · [데스크톱](evidence/blc03-photo-review/production-guide-desktop.png) · [좁은 화면](evidence/blc03-photo-review/production-guide-narrow.png) |
| Edge 화면 | 실제 창 2884854, **최소 외곽 폭 516px**에서 입력·모델·비용/주의·결과·복사·근거 대조·안내 카드 확인(375px 검수 아님). [입력 화면](evidence/blc03-photo-review/production-form-narrow.png). Orca 캡처가 간헐 실패해 `PrintWindow`로 실제 창을 캡처·열어 확인. 생성 결과 본문/관찰 원문은 Git에 보관하지 않으며 결과 캡처는 확인 후 삭제. 시험 선택/메모/초안 초기화·기존 GPT-4.1 선택 복귀 확인, 임시 항상 위 해제·1433×1399 일반 창 유지. 기존 네이버 준비 탭 변경 없음 |

입력 지원은 [OpenAI 사진 입력](https://developers.openai.com/api/docs/guides/images-vision)·[Claude 사진 입력](https://platform.claude.com/docs/en/build-with-claude/vision)·[Gemini 사진 이해](https://ai.google.dev/gemini-api/docs/image-understanding)와 기존 앱 모델 목록을 대조했습니다. 현재 OpenAI GPT-4.1/4o/4o-mini/6-astra, Claude Haiku 4.5, Gemini 3.1 Pro Preview만 사진 후기에서 확인된 목록으로 제공합니다. 나머지를 비전 불가능하다고 단정하지 않고 ‘미확인’으로 안내합니다. 기존 일반 글 모델 목록은 바꾸지 않았습니다. 프로바이더 간 요청 형식은 올인원 `llm.ts`도 참고했지만 서버의 회원 키/비공개 사진/중단/로그 미노출에 맞춰 프로그램 내부 전용 호출로 구현했습니다. 공용 OpenAI 파라미터 사본은 그대로 재사용했습니다.

## 릴리스 상태·다음 첫 단계

**BLC-03 v2.03 운영 완료.** 코드 `1812bf7f` 커밋/원격 푸시, 배포 후 중간 인수인계 `81c36521`. Vercel `dpl_5LXFFLqas2kyfer2VD8SEjXPVpfd` inspect Ready·공식 도메인 연결 확인. https://naver-blog-agent-2b71w0srg-buylife.vercel.app . 운영 DB ref `esgxyikcnnvmlhygjkth`의 해당 프로그램 메타데이터만 갱신, DB/확장 manifest/라이브 ZIP v2.03 일치(오류/경고 0). [운영 공개 검사](evidence/blc03-photo-review/production-release.json): 버전 200·사진 후기 포함 무인증 보호 6경로 401·이전 임시 HTML 404. DB 스키마/정책·키/환경변수·회원 권한 변경 없음. 이 프로그램만 1회 배포, 이번 실제 회원 검수는 소스 변경이 없어 재배포하지 않았습니다.

재개 전 이력: Edge 새로고침에서 기존 로그인 세션이 확인되지 않아 로그인 화면으로 이동했습니다. 주인님 직접 로그인 후 지정 회원을 확인했고 비밀번호 입력/조회는 하지 않았습니다. 첫 화면은 이전 사진 준비 화면이 남았으나 현재 앱 새로고침 후 v2.03 후기 입력이 표시됐습니다. 새 사진 선택 전 한 번 갱신했으며 시험 중/결과 생성 후에는 새로고침하지 않았습니다. [최종 실회원 검수](evidence/blc03-photo-review/production-member-checks.json).

제어 주의: HTML details는 native ExpandCollapsePattern, 모델 옵션은 Edge 소유 팝업(메인 창 밖)에 있어 desktop UIA에서 이름과 msedge PID를 확인한 뒤 SelectionItemPattern으로 선택했습니다. Orca 옵션 인덱스를 재사용하면 팝업이 닫히며 stale element가 됩니다. 실제 모델 값과 일반 글 모델 표시가 모두 GPT-4o-mini로 바뀐 뒤 생성 버튼을 정확히 한 번만 실행했습니다. 이 제어 문제를 앱의 일반 클릭 결함으로 분류하지 않습니다.

이전 BLC-02의 좁은 화면 바로가기 가림/펼침 잔여도 운영 v2.03에서 확인했습니다. 안내의 사진 후기 화면 링크→`/#private-photo-input`→펼침 후 제목/파일 선택/새 후기 영역이 상단 메뉴 아래에 표시됐습니다. [해시 바로가기·펼침](evidence/blc03-photo-review/production-photo-anchor-expanded.png).

**다음 첫 단계는 BLC-04 플랜**입니다. 현재 후기 결과를 기존 원고 모델·편집기·저장 revision·검수 지문·대기열/확장 준비에 연결할 때 정적 사진 경로/원래 만료·대표/순서·문단 근거를 보존하고 기존 일반 원고를 회귀 검수합니다. 사진 준비/후기 초안은 아직 메모리 상태이며 저장 기능을 완료로 표시하지 않습니다. 다른 공급사/실제 방문 사진 품질·장문 강제 만료·운영 강제 네트워크 실패는 이번 실제 검수 범위가 아닙니다. 적용 스킬: 기존 computer-use 제어 절차·React 검수 스킬. 새 키/개인 환경변수 파일을 만들지 않았습니다.

https://naver-blog-agent.buylife.xyz
