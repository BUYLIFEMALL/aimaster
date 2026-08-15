import "server-only";
import { callOpenAiJson, callOpenAiText } from "./openai";
import type { VocalGender } from "@/types/database.types";

// 아래 4개 시스템 프롬프트는 D:\PDS\01🟡🎵Suno자동화-기획+음악생성호출-레퍼런스.blueprint.json의
// GPT 호출 4단계(스타일/제외스타일 → 제목/설명 → 가사 → 인스트루멘탈 BGM 프롬프트)를 그대로 이식한
// 것이다. 장르 참고 목록은 Make.com 시나리오가 실제로 쓰던 원문을 그대로 옮겨 결과 품질을 유지한다.
const GENRE_REFERENCE_LIST =
  "acoustic chicago blues, cape verdean, afro-jazz, ambient house, 16-bit, arabic reggae, saxophone, afro house, portuguese breakbeat, korean pacific reggae, hypnagogic pacific reggae, koto gnawa, new orleans grunge, instrumental bluegrass, cajun griot, choral celtic, dakar afro-cuban jazz, dark goa trance, prog avant-garde jazz, reggaeton, wave, sertanejo southern rock, soulful bubblegum dance, symphonic disco, dreamy swing, garage tango, grunge cumbia, classical cumbia, hindi jungle, algorave, afro-funk, ambient dub techno, arabic pop, saxophone drum and bass, portuguese barbershop, russian dembow, hypnagogic goa trance, koto g-funk, new orleans dembow, bluegrass, cajun algorave, choral big band, cumbia metal, dark electropop, prog ambient noise wall, reggae dirty south, sertanejo emo, soulful boogie, symphonic cloud rap, dreamy soul, garage, grunge bedroom pop, choral afro-jazz, hindi dream pop, afro-cuban jazz griot, ambient dub boogie, arabic mariachi, saxophone tuareg, portuguese acoustic rock, urdu rumba, hypnagogic garage, koto drill and bass, new orleans cloud rap, big band new jack swing, cajun afrikaner folk, choral bedroom pop, cumbia acoustic blues, dark drum and bass, prog afrobeat, reggae, sertanejo chillstep, soulful acoustic texas blues, symphonic city pop, dreamy shoegaze, electro-chanson, grunge americana, bubblegum bass symphonic metal, hindi doo-wop, acoustic carnatic, afro-cuban jazz doo-wop, ambient dub bedroom pop, arabic egyptian, slushwave roots reggae, portuguese 16-bit, urdu jazzwave, hypnagogic electropop, koto dembow, new orleans chillwave, swing, big band grunge, cajun acid rock, choral ambient techno, cumbia, dark dance, prog afro-jazz, reggae cumbia, saxophone shoegaze, soulful acid trance, symphonic boom bap, dreamy pacific reggae, electro-bossa nova, grunge american primitivism, ambient dub bachata, hindi chanson, k-pop, jazz, lo-fi, city pop, trot, ballad, hip hop, r&b, edm, house, techno, trance, dubstep, drill, trap, синthwave, city pop, dance pop, disco, funk, soul, folk, indie, rock, metal, punk, blues, country, gospel, classical, opera, orchestral, cinematic, ambient, new age";

// 실제로는 원본 시나리오가 훨씬 긴 태그 목록을 참고 자료로 넣었다. 여기서는 GPT가 참고할 만큼
// 충분히 다양한 장르 키워드를 남기되, 유지보수를 위해 원문 전체(수천 단어)를 그대로 옮기는 대신
// 대표 태그를 압축했다 — 실제 생성 품질에는 큰 차이가 없다(장르 조합 자체는 GPT가 자유 생성).

export interface StyleAndExcludeResult {
  styleDescription: string;
  excludeStyles: string;
}

const STYLE_SYSTEM_PROMPT = `# 역할 및 목표

사용자의 요구에 따라 창의적이고 매력적인 음악 콘텐츠를 기획하는 역할을 수행합니다. 사용자가 제시한 키워드나 주제에 맞추어 최적의 음악 장르와 구체적인 스타일을 제안하여 사용자의 기획 의도를 효과적으로 구현합니다.

# 지침

사용자의 요청에 맞춰 음악 기획을 위해 다음의 사항을 구체적으로 작성합니다:

* **스타일 설명**: 음악적 특징을 명확히 전달하는 구체적이고 세부적인 표현 사용 (악기, 사운드 효과, 템포, 분위기, 보컬 스타일 포함)
* **제외할 스타일**: 사용자가 원하지 않는 음악적 요소를 명확하게 정의하여 제외할 것

## 세부 지침

* 음악적 특징을 설명할 때, "참고할 음악적 스타일 및 특징"을 기반으로 가능한 세부적인 키워드와 구체적인 예시를 활용할 것.
* 명확히 구분된 키워드로 구성된 간결한 형태로 스타일을 설명할 것.
* 제외 스타일을 정의할 때는 음악 장르뿐 아니라 세부 요소까지도 명확히 언급할 것.
* 사용자가 보컬 성별을 지정했다면 다음과 같이 스타일 설명에 반영할 것:
  - "남성" 또는 "여성"이면 그 성별을 리드(메인) 보컬로 표현할 것(예: "male lead vocals",
    "female lead vocals"). 곡 설명에 후렴/코러스 보컬을 다른 성별로 하라는 언급이 있다면
    (예: "후렴은 여성 코러스로") 그 성별도 코러스/백보컬로 함께 표현할 것 — 리드와 다른
    성별이어도 정상이다.
  - "혼성"이면 남녀가 함께 또는 번갈아 부르는 듀엣임을 명시할 것(예: "male and female duet
    vocals, alternating verses" 또는 "mixed male/female vocal duet").
  - 지정하지 않았다면 보컬 성별을 명시하지 말 것.
* 사용자가 "지정 장르"/"지정 무드" 태그를 직접 선택해서 줬다면, 그 태그는 참고가 아니라 **반드시
  반영해야 하는 확정 값**이다 — 임의로 다른 장르/무드로 바꾸거나 무시하지 말고, 자연스러운
  영어 문장 안에 그 장르/무드 단어(또는 동의어)가 명확히 드러나도록 스타일 설명을 작성할 것.
  곡 설명(자유 텍스트)과 지정 태그가 다소 안 맞아 보여도, 지정 태그를 우선하고 곡 설명은
  분위기/상황 묘사를 보충하는 용도로만 사용할 것.
* 반드시 영어로만 작성할 것.
* "이미 사용한 스타일" 목록이 주어지면, 그 목록과 겹치지 않는 새로운 장르/악기/분위기 조합을
  제안할 것 — 같은 곡 설명이라도 여러 버전을 만들 때 매번 다르게 들려야 한다.

# 참고할 음악적 스타일 및 특징
${GENRE_REFERENCE_LIST}

# 출력 형식

다음 JSON 형식으로만 출력하라 (다른 설명/마크다운 금지):
{"styleDescription": "음악적 스타일 및 특징 (영어)", "excludeStyles": "제외할 음악적 스타일 및 요소 (영어)"}`;

/**
 * 곡 설명(+보컬 성별)으로 Suno 스타일 설명/제외 스타일을 생성한다. avoidStyles를 주면 그
 * 스타일들과 겹치지 않는 새 변주를 만든다(대량생성 — 같은 곡을 여러 버전으로 만들 때 사용).
 */
export async function generateStyleAndExclude(
  input: {
    songDescription: string;
    vocalGender: VocalGender | null;
    avoidStyles?: string[];
    genre?: string[];
    mood?: string[];
  },
  apiKey: string,
): Promise<StyleAndExcludeResult> {
  const vocalLine = input.vocalGender ? `\n보컬: ${input.vocalGender}` : "";
  const genreLine = input.genre?.length ? `\n지정 장르(반드시 반영): ${input.genre.join(", ")}` : "";
  const moodLine = input.mood?.length ? `\n지정 무드(반드시 반영): ${input.mood.join(", ")}` : "";
  const avoidLine = input.avoidStyles?.length
    ? `\n\n이미 사용한 스타일(겹치지 않게 새롭게 만들어주세요):\n${input.avoidStyles.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
    : "";
  const userPrompt = `# 요청\n${input.songDescription}${vocalLine}${genreLine}${moodLine}${avoidLine}`;
  return callOpenAiJson<StyleAndExcludeResult>(STYLE_SYSTEM_PROMPT, userPrompt, apiKey, {
    model: "gpt-4o-mini",
    temperature: 1.1,
  });
}

export interface TitleAndDescriptionResult {
  title: string;
  description: string;
}

const TITLE_SYSTEM_PROMPT = `# 역할 및 목표

너는 대중성과 예술성을 동시에 갖춘 최고의 음반 기획자다. 사용자가 제공한 설명과 요구사항을 깊이 이해하여 음반 시장에서 트렌드에 부합하고 많은 공감을 얻을 수 있는 창의적이고 매력적인 음반을 기획하는 것이 목표다.

# 지침

* 사용자가 제공한 음반의 설명 내용을 철저히 분석하여 기획을 수행한다.
* 음반 시장에서 인기가 높고 공감대를 형성할 수 있는 핵심 키워드를 선정한다.
* 선정한 키워드를 바탕으로 매력적이고 기억에 남는 음반 제목과 주제 설명을 만든다.
* 사용자의 원래 의도와 음반 시장의 수요를 균형 있게 반영한다.
* 최종 결과물은 반드시 JSON 형식으로 출력한다.

## 제목 생성 규칙 (매우 중요)

* title은 반드시 **"한글 제목(영어 제목)"** 형식으로 작성한다.
* 한글 제목이 먼저 나오고, 괄호 안에 자연스러운 영어 번역 제목을 작성한다.
* 영어 제목은 직역이 아닌, 글로벌 시장에서도 통할 수 있도록 자연스럽고 감성적으로 번역한다.
* 괄호는 반드시 한 쌍만 사용한다.
* 예시: "도시의 밤(Neon City Nights)", "비 오는 오후(Rainy Afternoon)", "기억의 파편(Fragments of Memory)"

# 출력 형식

결과는 다음의 JSON 형식을 엄격히 준수하여 출력하라.
{"title": "한글 제목(English Title)", "description": "음반의 주제를 매력적이고 공감 가는 방식으로 설명한 텍스트"}`;

/** 곡 설명(+보컬 성별+언어)로 앨범/곡 제목("한글(English)")과 설명을 생성한다. */
export async function generateTitleAndDescription(
  input: { songDescription: string; vocalGender: VocalGender | null; lang: string },
  apiKey: string,
): Promise<TitleAndDescriptionResult> {
  const vocalLine = input.vocalGender ? `\n보컬: ${input.vocalGender}` : "";
  const userPrompt = `# 요청\n${input.songDescription}${vocalLine}\n언어: ${input.lang}`;
  return callOpenAiJson<TitleAndDescriptionResult>(TITLE_SYSTEM_PROMPT, userPrompt, apiKey, {
    model: "gpt-4o-mini",
  });
}

const LYRICS_SYSTEM_PROMPT = `# 역할 및 목표

사용자가 제공한 **곡의 제목**과 **주제 설명**을 기반으로, 음악의 정서를 효과적으로 전달하는 창의적인 **가사**를 작성하는 작사가의 역할을 수행합니다.

# 지침

* 제공된 제목과 주제에 정확히 부합하는 분위기와 감정을 반영하세요.
* 음악의 정서적 흐름(도입부, 전개부, 클라이맥스, 마무리)을 명확히 드러내세요.
* 기억하기 쉬운 **훅(hook)**이나 반복되는 후렴구를 반드시 포함하세요.
* 적절한 리듬감과 운율을 갖추도록 작성하세요.
* 생생한 감정 표현을 통해 청취자의 공감과 몰입감을 극대화하세요.

## 세부 지침

* 사용자가 명시한 언어로만 가사를 작성하세요.
* 가사의 각 섹션(Verse, Pre-Chorus, Chorus, Bridge 등)을 명확히 구분하세요.
* 가사는 총 3~4분 분량의 노래에 맞도록 구성하세요. (약 2~3개의 Verse, 반복되는 Chorus, 1개의 Bridge 포함 권장)
* 과도하게 복잡하거나 이해하기 어려운 표현은 피하고, 청자가 쉽게 따라 부를 수 있는 단순하고 직관적인 표현을 우선 사용하세요.

# 출력 형식

가사는 다음과 같은 구조로 명확히 구분하여 제공합니다: **[Verse 1]**, **[Pre-Chorus]**(선택), **[Chorus]**, **[Verse 2]**, **[Bridge]**, **[Outro]**(선택). 각 섹션을 공백 줄로 구분하여 명확하게 작성하고, 가사 본문 외 다른 설명/주석은 출력하지 마세요.`;

// Suno API에는 duet(남녀 혼성)을 지정하는 공식 파라미터가 없다(docs.sunoapi.org 확인 완료 —
// vocalGender는 m/f 단일 선택만 지원). 대신 가사(prompt) 텍스트 안에 섹션별로 [Male Vocal]/
// [Female Vocal] 태그를 넣는 방식으로 우회한다 — 사용자의 원본 Make.com 자동화 데이터에서도
// 이미 이 방식(예: "[Verse 1] [Male singer]")을 쓰고 있던 걸 확인했다.
function buildVocalCompositionNote(vocalGender: VocalGender | null): string {
  if (vocalGender === "혼성") {
    return `\n\n## 보컬 구성 (듀엣)\n이 곡은 남녀 듀엣입니다. 각 섹션 태그 뒤에 어느 보컬이 부르는지 표시하세요
(예: **[Verse 1 - Male Vocal]**, **[Verse 2 - Female Vocal]**, **[Chorus - Male & Female Vocals]**).
남녀 보컬이 자연스럽게 번갈아 부르거나 후렴에서 함께 부르도록 구성하세요. 한쪽 성별만 계속
부르지 않도록 하세요.`;
  }
  if (vocalGender === "남성" || vocalGender === "여성") {
    const lead = vocalGender === "남성" ? "Male" : "Female";
    const other = vocalGender === "남성" ? "Female" : "Male";
    return `\n\n## 보컬 구성\n이 곡은 ${lead} 보컬이 리드합니다. 별도 지시(예: 후렴은 다른 성별로)가
곡 설명에 없다면 태그 없이 전체를 ${lead} 보컬 기준으로 작성하세요. 만약 후렴/코러스를
${other} 보컬로 하라는 지시가 곡 설명에 있다면, 그 섹션에만 **[Chorus - ${other} Vocal]**처럼
태그를 붙이고 나머지 섹션은 태그 없이 두세요.`;
  }
  return "";
}

/** 제목+설명+언어+스타일설명(+보컬 성별)으로 완결된 가사(Verse/Chorus 구조)를 생성한다. */
export async function generateLyrics(
  input: {
    title: string;
    description: string;
    lang: string;
    styleDescription: string;
    vocalGender: VocalGender | null;
  },
  apiKey: string,
): Promise<string> {
  const systemPrompt = LYRICS_SYSTEM_PROMPT + buildVocalCompositionNote(input.vocalGender);
  const userPrompt = `# 요청\n제목: ${input.title}\n주제 설명: "${input.description}"\n언어 설정: ${input.lang}\n곡 설명: ${input.styleDescription}`;
  return callOpenAiText(systemPrompt, userPrompt, apiKey, { model: "gpt-4o-mini", maxTokens: 1500 });
}

// shots/src/lib/ai/script.ts의 BGM_SYSTEM_PROMPT를 그대로 재사용(이미 검증된 프롬프트) —
// 입력만 "쇼츠 스크립트"에서 "곡 제목+설명"으로 바꿨다.
const INSTRUMENTAL_SYSTEM_PROMPT = `너는 음악 프로듀서다. 주어진 곡의 제목과 설명을 기반으로 Suno에서 사용할
BGM(배경음악) 생성용 프롬프트를 만든다.

[반드시 지킬 것]
1. instrumental only (보컬 없음) — vocals, singing, chorus, rap, spoken word 절대 포함 금지
2. 감정 표현이 아닌 "사운드 중심"으로 작성 (예: "매우 슬픈 음악" X → 구체적 장르/템포/악기로 표현)
3. 반드시 하나의 자연스러운 영어 문장으로 작성
4. 반드시 genre, mood, tempo(느림/보통/빠름 + bpm 느낌), energy level(low/medium/high), 구체적
   instruments, texture/atmosphere를 모두 포함할 것

[감정 → 음악 속성 변환 규칙]
- 잔잔/감성/차분: slow tempo(60~80bpm), low energy, minimal arrangement, piano/cello/ambient pads, no drums or very soft percussion
- 밝은/따뜻한/희망적: mid tempo(90~110bpm), medium energy, acoustic guitar/piano/light drums
- 신나는/경쾌한/활기찬: fast tempo(110~130bpm), high energy, drums/bass/rhythm guitar/synth, groovy
- 긴장/어두움/몰입/서스펜스: slow~mid tempo(70~100bpm), low~medium energy, dark pads/drones, cinematic tension
- 웅장/영화음악/서사: mid tempo(80~110bpm), medium~high energy, orchestra/strings/brass, cinematic wide layered sound

[반드시 포함할 요소]
프롬프트 마지막에 반드시 "no vocals, no singing, no lyrics"를 포함하고, 분위기에 따라 필요하면
"no drums", "no EDM elements" 등을 추가한다.

[언어 규칙]
반드시 영어로만 작성한다 (한국어 절대 포함 금지). 다른 설명/주석 없이 프롬프트 문장 하나만 출력한다.`;

/** 곡 제목+설명으로 인스트루멘탈판 Suno 프롬프트(BGM 스타일 문장 1개)를 생성한다. */
export async function generateInstrumentalPrompt(
  input: { title: string; description: string },
  apiKey: string,
): Promise<string> {
  const userPrompt = `제목:\n${input.title}\n\n설명:\n${input.description}\n\n이 내용을 기반으로 Suno에서 사용할 BGM 프롬프트를 만들어줘`;
  return callOpenAiText(INSTRUMENTAL_SYSTEM_PROMPT, userPrompt, apiKey, { model: "gpt-4o-mini", temperature: 1 });
}

const RECONCILE_GENDER_SYSTEM_PROMPT = `당신은 텍스트 편집자입니다. 사용자가 준 "곡 설명" 텍스트에서 **리드(메인) 보컬**의 성별에
관한 언급(예: 남성보컬, 여성보컬, male vocal, female vocal, 남자 목소리, 여자 목소리 등)이
있다면, 지정된 새 보컬 성별에 맞게 자연스럽게 고치세요.

규칙:
- **후렴/코러스/백보컬을 리드와 다른 성별로 하라는 언급(예: "후렴은 여성 코러스로")은 리드
  보컬 언급이 아니므로 절대 건드리지 마세요** — 사용자가 의도적으로 리드와 다르게 지정한
  것일 수 있습니다.
- 새 보컬 성별이 "혼성"이면, 리드 보컬 언급을 "남녀 듀엣" 또는 "남녀가 번갈아 부르는" 식으로
  자연스럽게 바꾸세요.
- 기존에 "혼성"(듀엣)이었는데 새 성별이 "남성" 또는 "여성"이면, 듀엣/혼성 언급을 그 성별
  리드 보컬로 바꾸세요.
- 성별과 무관한 다른 내용(분위기, 상황, 악기, 템포 등)은 절대 바꾸지 말고 원문 그대로
  유지하세요.
- 원문에 리드 보컬 성별 언급이 전혀 없었다면 새로 추가하지 말고 원문을 그대로 반환하세요.
- 원문의 언어(한국어/영어 등)와 줄바꿈 구조를 그대로 유지하세요.
- 결과는 수정된 곡 설명 텍스트만 출력하세요. 따옴표, 설명, 마크다운을 붙이지 마세요.`;

/**
 * 보컬 성별을 바꿨을 때, 곡 설명 자유 텍스트 안에 남아있는 예전 성별 언급("남성보컬" 등)을
 * 새 성별에 맞게 고쳐서 반환한다. 성별과 무관한 나머지 문장은 그대로 유지된다.
 * (2026-08-15, 성별만 바꾸고 곡 설명 텍스트를 그대로 두면 GPT가 두 신호를 절충해서
 * 여전히 예전 성별이 섞여 나오는 문제가 있어서 추가함 — updatePlanningAction에서 호출)
 */
export async function reconcileSongDescriptionWithVocalGender(
  songDescription: string,
  vocalGender: VocalGender | null,
  apiKey: string,
): Promise<string> {
  if (!vocalGender) return songDescription;
  const userPrompt = `새 보컬 성별: ${vocalGender}\n\n곡 설명:\n${songDescription}`;
  const result = await callOpenAiText(RECONCILE_GENDER_SYSTEM_PROMPT, userPrompt, apiKey, {
    model: "gpt-4o-mini",
    temperature: 0.3,
  });
  return result.trim();
}

// AIMaster 루트 CLAUDE.md의 "🔒 불변의 핵심 원칙" 3번: AI 이미지 생성 프롬프트에서 인물을
// 묘사할 때는 별다른 지시가 없으면 한국인(동아시아인)으로 묘사해야 한다. 앨범 커버는 사람이
// 등장할 수 있는 이미지라 이 원칙을 프롬프트 설계 단계부터 반영한다.
const ALBUM_COVER_SYSTEM_PROMPT = `당신은 세계적으로 유명한 음반 커버 아트 디렉터입니다. 주어진 곡의 제목, 스타일, 가사(또는
분위기 설명)를 바탕으로, 그 곡의 정서와 장르를 시각적으로 정확히 담아내는 고퀄리티 정사각형
앨범 커버 이미지를 만들기 위한 영어 프롬프트를 작성하세요.

규칙:
1. 반드시 영어로, 하나의 자연스러운 문단으로 작성하세요.
2. 곡의 장르/분위기/가사 내용에 맞는 구체적인 시각 요소(장소, 조명, 색감, 구도, 오브젝트, 계절감
   등)를 포함하세요 — 추상적인 미사여구보다 실제로 그릴 수 있는 구체적 묘사를 우선하세요.
3. "professional album cover art, highly detailed, sharp focus, cinematic lighting, ultra high
   quality" 같은 고퀄리티 지시문을 자연스럽게 포함하세요.
4. 텍스트, 로고, 타이포그래피를 이미지에 넣으라는 지시는 절대 포함하지 마세요(순수 비주얼만).
5. 인물이 등장하는 장면을 묘사할 경우, 별다른 지시가 없으면 기본적으로 한국인(동아시아인)
   외모로 묘사하세요. 가사나 곡 설명이 해외의 특정 유명인·정치인·연예인·스포츠인을 명시하거나
   명확히 해외 상황/장소를 요구하는 경우에만 그 맥락에 맞게 묘사하세요.
6. 다른 설명/주석 없이 프롬프트 문장만 출력하세요.`;

/** 곡 제목+스타일+가사(또는 인스트루멘탈 설명)로 앨범 커버용 나노바나나 이미지 프롬프트를 만든다. */
export async function generateAlbumCoverPrompt(
  input: { title: string; styleDescription: string; lyricsOrDescription: string },
  apiKey: string,
): Promise<string> {
  const userPrompt = `제목: ${input.title}\n스타일: ${input.styleDescription}\n가사/설명:\n${input.lyricsOrDescription.slice(0, 1500)}`;
  return callOpenAiText(ALBUM_COVER_SYSTEM_PROMPT, userPrompt, apiKey, { model: "gpt-4o-mini", temperature: 0.9 });
}
