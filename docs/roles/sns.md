# SNS (AI Influencer 개발)

- 담당: Claude Code(윈도우 메인 PC `GT1_Mega`) `claude-win-20261118-sns` · 호칭 Claude(SNS)
- 맡은 폴더: `ai-influencer-studio/`(공식 표시명 「AI Influencer」), 분석 문서 `docs/analysis-ai-influencer-20261118/`
- 재사용 대상(다른 담당 폴더, 읽기 전용·협의 후 사본): `ai-video-studio/`(Movie), `shorts-onestop-studio/`(Movie)
- 카테고리: 인스타·SNS
- 주력 업무: 실사형 가상 인물 이미지·쇼츠 자동 제작(W00~W09) 설계·구현
- 지정: 2026-11-18 주인님 직접 지시(호칭·개발 담당). Master 작업표 등록은 Master 몫
- 마지막 갱신: 2026-11-18 (claude-win-20261118-sns)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| AI Influencer | W01-A1 OFF 소스 묶음 첫 단계 완료표 정리 → 다음 「보관 정리 연결」 단위 배정 대기 | 2026-11-18 | 완료표 W00_BASELINE §14-A·B |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| AI Influencer | 상위 모델 품질 비교(P0) | 프로그램 완성 후 최종 테스트 때 진행(주인님 결정 2026-11-18). 개발 중은 저렴한 모델 | W00_BASELINE §6 |
| AI Influencer | `cleanupOldPosts` 보관 예외 | `insta-posting` 기준 담당 수정 | W00_BASELINE §8 |
| AI Influencer | 원본 저장 운영 ON | 선행 조건 15개 미해결(W00_BASELINE §14-B) — 특히 일반 회원 30일 보관 정리 실행자 미구현이라 ON 차단. migration·버킷·실 통합 검증은 별도 승인 | W00_BASELINE §14-B |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-11-18 | AI Influencer(미배포, 스위치 off) | W01-A1 원본 자산 OFF 소스 묶음: SQL 초안(a29ffd287, 미적용)·paths·store(19ea5eab5)·생성 연결(1525cd92d)·조회(403fca68e) — 자체 123/123·격리 대역 15/15·Mac 지정 검수 수락. 실 DB·저장소·업로드 0 | 미배포 대기 |
| 2026-11-18 | AI Influencer(미배포) | W01c 참고 이미지 형식 경계·사전 거절(d4386242b) — Mac PASS·Master 수락 | 미배포 대기 |
| 2026-11-18 | AI Influencer(미배포) | W01b 히스토리 자동 정리 보관 예외·엄격 판정(efeaca0c8) — Mac PASS·Master 수락 | 미배포 대기 |
| 2026-11-18 | AI Influencer(미배포) | W01a seed 오표시 문구 4곳(5b9018d50) — Mac PASS·Master 수락 | 미배포 대기 |
| 2026-11-18 | AI Influencer v1.26(변경 없음) | W00 격차 10개·기능 구분·공통 계약·P0 조건 — Mac 검수 PASS(6e781cafa)·Master 수락 | 해당 없음 |

## 다음 첫 단계
1. Master가 배정할 「보관 정리 연결」 단위(일반 회원 30일 정리 실행자·ready 자산의 만료 전이·retention_exempt 제외)의 경로·계약을 받는다. 그 전까지 migration 적용·버킷·ON·실 업로드는 하지 않는다.

## 주인님께 여쭐 것
- 개발 중 기능 시험에 쓸 시험 계정(`buylifemall@naver.com`)의 Gemini·fal 키 등록 여부(실제 생성 시험이 필요해질 때)
