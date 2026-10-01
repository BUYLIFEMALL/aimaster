# AIMaster AI 모델 연동·운영 표준

모든 서브프로그램에서 이미지 생성 모델과 추론·본문 생성 모델을 추가하거나 교체할 때 이 문서를 공통 기준으로 사용한다. 모델 선택 UI를 만들기 전에 이 문서와 해당 공급사의 공식 모델 목록을 함께 확인한다.

## 1. 변경 전 필수 확인

1. 공급사 공식 문서에서 정확한 API 모델 ID, 지원 엔드포인트, 안정 상태(Stable / Preview / Deprecated)를 확인한다.
2. 모델 ID를 추측하거나 ChatGPT·Claude 앱 이름을 API 모델 ID처럼 등록하지 않는다.
3. 실제 생성 요청은 회원이 `API키등록·플랫폼연동`에 등록한 **본인 키**로만 수행한다. 운영자 키 폴백은 금지한다.
4. 새 모델은 사용자 키로 짧은 검증 요청을 실행할 수 있어야 한다. 권한·지역·결제 등으로 이용할 수 없으면 UI에서 성공처럼 보이게 하지 말고 원문 오류를 안내한다.
5. Preview 모델은 이름에 `Preview`를 표시하고, 기본값으로 지정하지 않는다.
6. Deprecated / retired 모델은 신규 선택지에 추가하지 않고, 기존 설정은 안정 모델로 마이그레이션한다.

## 2. 모델 선택 UI 공통 규칙

- 플랫폼 선택과 모델 선택을 분리한다. 플랫폼을 바꾸면 그 플랫폼의 안전한 기본 모델로 모델 선택값을 즉시 바꾼다.
- 선택 모델명은 섹션 제목에도 동적으로 표시한다. 예: `본문 생성모델 · Gemini 3.8 Flash`.
- 모델 설명에는 용도만 간결히 적고, 가격·속도·성능을 사실처럼 단정하지 않는다. 최신 가격은 공식 문서 링크 또는 공급사 콘솔에서 확인하도록 한다.
- 이미지 생성 모델과 본문·추론 모델은 별도 상태와 별도 선택기로 관리한다. 이미지 모델을 바꿨다고 본문 모델이 바뀌면 안 된다.
- 모델 목록은 공급사별 레지스트리 파일로 관리한다. 임의 문자열을 UI 컴포넌트에 직접 하드코딩하지 않는다.

## 3. 권장 레지스트리 구조

```ts
type ModelOption = {
  provider: "openai" | "anthropic" | "gemini";
  value: string;
  label: string;
  category: "reasoning" | "text" | "image";
  lifecycle: "stable" | "preview";
  endpoint: "responses" | "chat-completions" | "messages" | "generate-content" | "images";
};
```

공급사별 어댑터는 자기 API 형식에 맞게 요청을 만든다. 특히 최신 OpenAI 모델은 Responses API 중심으로 제공될 수 있으므로, 기존 Chat Completions 호출에 모델명만 추가하지 말고 공식 지원 엔드포인트를 먼저 확인한다.

## 4. 현재 검증 대상 모델군

아래 목록은 모델을 추가할 때 우선 확인할 현재 모델군이다. 실제 사용 가능 여부는 각 회원의 API 키 권한과 공급사 계정 상태를 한 번 더 확인해야 한다.

| 공급사 | 본문·추론 모델군 | 이미지 모델군 | 구현 주의사항 |
| --- | --- | --- | --- |
| OpenAI | GPT-6 Astra, GPT-6.1 Sol, GPT-6 Luna, GPT-5.6 Sol/Terra/Luna, GPT-5.x, GPT-4.1 | GPT-Image 계열 | 최신 GPT-6 계열은 공식 지원 엔드포인트를 확인한 뒤 어댑터를 선택한다. |
| Anthropic | Claude Haiku 4.5, Sonnet 5, Opus 5, Fable 5 | 해당 없음 | Messages API와 JSON 출력 검증을 사용한다. |
| Google Gemini | Gemini 3.5 Flash-Lite, 3.5/3.6/3.7/3.8 Flash, 3.1 Pro Preview | Nano Banana 계열 | `models.list` 결과와 `generateContent` 지원 여부를 확인한다. |

이미지 모델의 인물 기본 묘사는 한국인 또는 동아시아인으로 설정한다. 해외 실존 인물·특정 국가 배경이 콘텐츠에 꼭 필요할 때만 예외로 한다.

## 5. 검수·배포 체크리스트

- [ ] 공식 문서에서 모델 ID와 수명 상태를 재확인했다.
- [ ] API 어댑터와 JSON/이미지 응답 파싱이 해당 모델 엔드포인트와 맞다.
- [ ] 사용자 본인 키만 조회하며 키가 없을 때 등록 안내를 반환한다.
- [ ] 모델 선택 → 생성 요청 payload → 저장된 결과까지 회귀 테스트를 추가했다.
- [ ] 실제 키 검증은 해당 회원 키 또는 별도 테스트 키로 최소 1회 수행했다. 유료 대량 호출은 금지한다.
- [ ] 모델·이미지 변경을 포함한 공개 배포는 해당 프로젝트 버전, 문서, 배포 산출물을 함께 갱신했다.

## 6. 공식 확인 경로

- OpenAI: https://developers.openai.com/api/docs/models
- Anthropic: https://docs.anthropic.com/en/docs/about-claude/model-deprecations
- Gemini: https://ai.google.dev/gemini-api/docs/models
