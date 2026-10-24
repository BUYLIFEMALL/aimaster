# G-1 인수인계 — AI 문서 챗봇

2026-10-24 · Codex 윈도우 `codex-win-20261024-docbot-g1`.

**미배포: v1.07 유지.** 새 공급자 선택·공용 키·답변 중단을 구현하고 로컬 검사/DB 준비를 마쳤습니다. 실회원 키 등록·공급자 실제 응답·Edge UI 검수는 남아 있습니다. **G-1 전체 완료 아님**, G-2~G-5 미착수입니다.

- 기준 부품은 `src/lib/compatibleChat/`, 같은 사본을 Prompt에 둡니다. 기준만 수정하고 범위 동기화합니다.
- 문서 파싱·1024차원 임베딩·기존 조각/권한·보관 기간은 유지합니다. 새 공급자 일반 대화는 「내 문서 참고」를 끄면 Upstage를 요구하지 않습니다.
- 키 등록 API와 화면은 Prompt의 FREE 회원도 같은 공용 표에 접근할 수 있도록 각 앱 기존 설정에서 같은 부품을 사용합니다.
- 운영 DB ref `esgxyikcnnvmlhygjkth`, 마이그레이션 `20261024065908_g1_compatible_chat_keys` 적용 완료. 회원 키 DML 없음.
- 검사: 65개 시험(두 앱 사본 포함), 양쪽 타입·순차 로컬 빌드 통과. 새 공급자 실제 API 0회·Vercel 빌드 0회.
- 다음: Edge를 직접 앞에 띄워 `http://localhost:4311/settings` 로그인→본인 키→동일 키 재사용/답변/중단/기존 문서 검색 확인. 실제 배포는 원래 G-1~G-4 묶음 계획에 포함합니다.

[공통 상세 결과·DB 증거·제한·비용·다음 단계](../../docs/analysis-autogemma-starter-20261024/G1_IMPLEMENTATION_20261024.md) · [이번 단계 플랜](PLAN_20261024_G1_COMPATIBLE_CHAT.md).
