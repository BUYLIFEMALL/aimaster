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
| AI Influencer | W01a seed 오표시 문구 4곳 정정 | 2026-11-18 | 5b9018d50 미배포 · Mac 검수 대기 |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| AI Influencer | P0 유료 품질 비교(51건) | 주인님 승인·시험 계정 Gemini/fal 키 확인 | W00_BASELINE §6·§9 |
| AI Influencer | `cleanupOldPosts` 보관 예외 | `insta-posting` 기준 담당 수정 | W00_BASELINE §8 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-11-18 | AI Influencer v1.26(변경 없음) | W00 격차 10개·기능 구분·공통 계약·P0 조건 — Mac 검수 PASS(6e781cafa)·Master 수락 | 해당 없음 |

## 다음 첫 단계
1. 새 표 2개·함수 2개의 PLAN §13·권한 계약 병합을 기다린다(담당 Master 지정). 그 전까지 자산·보관 코드와 migration은 착수하지 않는다. 병합 뒤 W01 본체(W00_BASELINE §12) 배정을 받는다.

## 주인님께 여쭐 것
- P0 품질 비교 유료 실행 승인(시험 계정 본인 키, 이미지 42장·영상 9클립, 예상 약 $8.7·상한 $12)
