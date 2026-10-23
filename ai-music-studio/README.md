# AI 음악 스튜디오

여러 음악 생성 AI(Google Lyria·ElevenLabs·Suno·MiniMax·Stable Audio·ACE-Step)를 한 화면에서 골라 노래와 배경음악을 만들고, 같은 설명으로 최대 3개 모델을 나란히 들어 비교하는 AIMaster 서브 프로그램입니다.

- 운영 주소: https://ai-music-studio.buylife.xyz
- 버전: v1.01 (2026-10-23)
- 회원 본인 API 키(Gemini·ElevenLabs·sunoapi.org·fal·Replicate, 가사 쓰기 선택 OpenAI)로 동작하며 비용은 본인 계정에 청구됩니다.

개발자 안내(구조·모델 추가 방법·DB·검수)는 [AGENTS.md](AGENTS.md)를 읽어 주세요. 7대 항목(목적·기술·기능/구조·버전·백로그·연계 아이디어·UI 개선안)은 AGENTS.md와 같은 내용을 따릅니다.

## 로컬 실행
```bash
npm install
npm test        # 단위 시험(무료, 가짜 응답)
npm run build
```
