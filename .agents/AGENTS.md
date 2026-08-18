# 🛡️ Agent Execution Guidelines & Safety Rules

## 1. Autonomous Actions (자율 진행 허용)
다음 작업은 사용자 사전 승인 없이 자율적으로 진행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (npm/pip 등)
- 로컬 테스트 및 빌드 실행

## 2. Mandatory Approval Rules (사전 승인 필수 작업)
다음 6가지 작업은 실행하기 전에 **반드시 사용자에게 사전 확인 및 승인**을 받으셔야 합니다:
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포**
4. **데이터베이스 마이그레이션 또는 데이터 삭제**
5. **환경변수와 API 키 변경**
6. **유료 API 호출**
