# 배포 키트용 KIT/PROMPTS.md 를 코드(src/lib/ai/generator.ts·src/types/planner.ts)에서 다시 뽑는다. 사용: python scripts/build-kit-prompts.py <프로그램 폴더>
import io, re, sys
root = sys.argv[1]
gen = io.open(root + "/src/lib/ai/generator.ts", encoding="utf-8").read()
types = io.open(root + "/src/types/planner.ts", encoding="utf-8").read()

def sys_prompt(fn):
    body = gen[gen.index(f"export async function {fn}"):]
    s = body.index("const systemPrompt = `") + len("const systemPrompt = `")
    e = body.index("`;", s)
    return body[s:e]

def user_prompt(fn):
    body = gen[gen.index(f"export async function {fn}"):]
    s = body.index("userPrompt = `") + len("userPrompt = `")
    e = body.index("`;", s)
    return body[s:e]

modes = re.findall(r'^\s+(\w+): "([^"]+)",$', gen[gen.index("const modeInstructions"):gen.index("const systemPrompt", gen.index("const modeInstructions"))], re.M)
personas = re.findall(r'name: "([^"]+)",\s*badge: "([^"]+)",.*?tonePrompt: "([^"]+)"', types, re.S)

out = []
w = out.append
w("# AI 프롬프트 정리 — ALLA AI (Threads AI 기획 자동화)\n")
w("> 이 프로그램이 AI에게 보내는 지시문(프롬프트)을 한곳에 모았습니다. **실제로 동작하는 원문은 코드 파일이 기준**이고, 이 문서는 배포판을 만들 때 코드에서 자동으로 뽑은 사본입니다.")
w("> 프롬프트를 고치고 싶으면 아래 표의 **코드 파일**을 고친 뒤, 패키지 설치마법사를 다시 실행(업데이트 모드)하거나 `npx vercel@latest deploy --prod`로 다시 올리면 내 사이트에 반영됩니다.\n")
w("## 1. 어디에 무엇이 있나\n")
w("| 기능 | 코드 파일 · 함수 | AI에 넘기는 값 | AI가 돌려주는 형식 |")
w("|---|---|---|---|")
w("| 오늘의 주제 10개 추천 | `src/lib/ai/generator.ts` · `suggestTopicsAI` | 선택한 분야(카테고리) 또는 직접 입력한 키워드 | JSON `{topics:[{id,topic,hookPreview,whyItWorks}]}` |")
w("| 글 세트 생성(대표 글 + 첫 문장 유형 5가지) | `src/lib/ai/generator.ts` · `generateThreadPlanAI` | 주제, 실전 기획 템플릿(상품·내 경험·타깃·역할·참고할 터진 글), 추가 요청, 페르소나, 첨부 사진/영상 | JSON `{topic,hook,hookType,whyHookWorks,content,cta,followUpIdeas[5],hookVariants[5]}` |")
w("| 원클릭 다시 쓰기 7종 | `src/lib/ai/generator.ts` · `rewriteThreadPlanAI` | 지금 글(첫 문장·본문·댓글 질문) + 고른 방향 | 글 세트와 같은 JSON(훅 대안은 유지) |")
w("| 상황별 페르소나 7종 | `src/types/planner.ts` · `PLANNER_PERSONAS`(`tonePrompt`) | 글 세트 생성 지시문 맨 앞에 「지정된 글쓴이 페르소나」로 붙음(`src/lib/actions/planner.ts`) | — |")
w("| 업종/타깃 카테고리 10개 | `src/lib/constants/categories.ts` · `TARGET_CATEGORIES` | 주제 추천의 분야 이름 | — |")
w("| 랜덤 썰·3초 무드 픽 주제 풀 | `src/lib/constants/luckyTopics.ts` | 소재 없이 눌렀을 때 고르는 주제(AI 호출 전 화면에서 선택) | — |")
w("| 글과 함께 만드는 이미지 프롬프트 | `src/lib/ai/generator.ts` · `planImagePromptsAI` | 주제·첫 문장·본문, 장수(1~2) | JSON `{prompts:[영어 프롬프트]}` → 끝에 「인물은 한국인·글자/로고 금지」 규칙을 붙여 이미지 AI로(`src/lib/ai/postImage.ts` · `finalizeImagePrompt`) |")
w("| 이미지 모델 목록 | `src/lib/ai/imageModels.ts` | 나노바나나(Gemini 키) `nanobanana-2-2k` 기본, GPT Image(OpenAI 키) `gpt-image-2` | — |")
w("| AI 모델 목록·기본 모델 | `src/lib/ai/models.ts` | OpenAI `gpt-4.1` · Claude `claude-sonnet-5` · Gemini `gemini-3.7-flash`가 기본 추천 | — |")
w("| 사진/영상 번호 표현 지우기(후처리) | `src/lib/ai/generator.ts` · `cleanMediaMetaPhrases` | AI 결과에서 「1번째 사진」「영상 3초」 같은 말을 정리 | — |")
w("")
w("## 2. 공통 원칙(모든 프롬프트에 들어 있음)\n")
w("- 4~6줄, 1~2문장마다 빈 줄 · 친한 언니/친구 반말(존댓말·교과서 문체 금지) · `;;` `...` `??` `ㅠㅠ` 같은 스레드 감정 부호")
w("- 본문에 **상품명·브랜드명 금지**(「이거」「가성비템」으로 호기심 유도) · **마지막 줄은 댓글을 부르는 질문**")
w("- 황금 4단계: **멈추게 하기 → 공감 쌓기 → 반전 한 방 → 질문 던지기**")
w("- 4대 심리(공감·손해회피·호기심·반전), 5가지 첫 문장 유형(자책형·부정 명령형·리얼 썰형·논쟁형·반전형)")
w("- 없는 경험·효과를 지어내지 않기, 참고 글 문장을 그대로 베끼지 않기, 사진/영상 번호·매체 지칭 금지")
w("- AI 응답은 항상 JSON으로 받아 화면에 나눠 보여 줍니다(OpenAI `response_format: json_object`, Gemini `responseMimeType: application/json`, Claude는 지시문으로 JSON 요청).")
w("")
w("## 3. 고칠 때 주의\n")
w("- JSON 예시 부분(`반드시 아래 JSON …으로만 응답해` 아래)의 **칸 이름은 바꾸지 마세요** — 화면 코드가 그 이름으로 읽습니다.")
w("- `${topic}`처럼 `${ }`로 감싼 부분은 프로그램이 값을 채워 넣는 자리입니다. 지우거나 이름을 바꾸지 마세요.")
w("- 말투·예시 글(레퍼런스)·금지 규칙은 자유롭게 바꿔도 됩니다. 내 분야의 실제로 반응이 좋았던 글을 레퍼런스로 넣으면 결과가 더 내 스타일에 가까워집니다.")
w("- 고친 뒤 `npm run build`로 오류가 없는지 확인하고 올리세요.")
w("")
w("## 4. 다시 쓰기 7종 방향 (`rewriteThreadPlanAI` · `modeInstructions`)\n")
w("| 코드 이름 | 지시 내용 |")
w("|---|---|")
for k, v in modes:
    w(f"| `{k}` | {v} |")
w("")
w("## 5. 상황별 페르소나 7종 (`src/types/planner.ts` · `tonePrompt`)\n")
for name, badge, tone in personas:
    w(f"### {name} — {badge}\n")
    w("```text\n" + tone + "\n```\n")
w("## 6. 원문 — 주제 추천 (`suggestTopicsAI`)\n")
w("**시스템 지시문**\n\n```text\n" + sys_prompt("suggestTopicsAI") + "\n```\n")
w("**사용자 지시문**\n\n```text\n" + user_prompt("suggestTopicsAI") + "\n```\n")
w("## 7. 원문 — 글 세트 생성 (`generateThreadPlanAI`)\n")
w("`${personaPrompt ? …}` 자리에는 고른 페르소나가, `${mediaGuideline}` 자리에는 사진/영상을 첨부했을 때만 시각 자료 분석 지침이 들어갑니다(같은 함수 위쪽 `mediaGuideline`).\n")
w("**시스템 지시문**\n\n```text\n" + sys_prompt("generateThreadPlanAI") + "\n```\n")
w("**사용자 지시문**은 `주제: …` 뒤에 실전 기획 템플릿 입력(상품·경험·타깃·역할·참고할 터진 글), 추가 요청사항, 첨부 자료 안내를 차례로 붙이고 「위 정보를 바탕으로 실전 떡상 스타일의 스레드 글 1세트와 5대 훅 유형별 글 5개를 생성해줘.」로 끝납니다.\n")
w("## 8. 원문 — 다시 쓰기 (`rewriteThreadPlanAI`)\n")
w("**시스템 지시문**\n\n```text\n" + sys_prompt("rewriteThreadPlanAI") + "\n```\n")
w("**사용자 지시문**\n\n```text\n" + user_prompt("rewriteThreadPlanAI") + "\n```\n")
w("## 9. 원문 — 글과 함께 만드는 이미지 프롬프트 (`planImagePromptsAI`)\n")
w("글 AI가 아래 지시문으로 영어 사진 프롬프트를 만들고, 이미지 AI에 보내기 전에 `finalizeImagePrompt`가 「If the scene includes any people, depict them as Korean people by default. No visible text, letters, captions, logos, brand names, or watermarks anywhere in the image.」를 덧붙입니다. 화면의 **프롬프트 보기·고치기**에서 장마다 직접 고칠 수도 있습니다.\n")
w("**시스템 지시문**\n\n```text\n" + sys_prompt("planImagePromptsAI") + "\n```\n")
w("**사용자 지시문**\n\n```text\n" + user_prompt("planImagePromptsAI") + "\n```\n")
io.open(root + "/KIT/PROMPTS.md", "w", encoding="utf-8", newline="\n").write("\n".join(out))
print("modes", len(modes), "personas", len(personas))
