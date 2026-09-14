/**
 * 문항은 전부 자체 제작이다 — 공식 MBTI(Myers-Briggs Type Indicator)는 The Myers-Briggs
 * Company의 등록상표이자 저작권이 있는 검사이므로 실제 문항을 그대로 가져다 쓰지 않는다.
 * 다만 융(Jung) 심리유형론에 기반한 4개 이분지표(E/I, S/N, T/F, J/P) 개념 자체는 학계에
 * 공개된 일반적인 분류 체계라 자유롭게 참고할 수 있다.
 *
 * 각 문항은 한쪽 극(pole)으로만 진술되고, 응답자는 5점 리커트 척도(1=전혀 아니다 ~
 * 5=매우 그렇다)로 동의 정도를 표시한다.
 *
 * 두 가지 검사를 제공한다:
 * - QUICK_QUESTIONS: 지표당 5문항 × 4지표 = 20문항(축약판, /test) — 빠르게 해보고 공유하는 용도
 * - FULL_QUESTIONS: 지표당 15문항 × 4지표 = 60문항(정식판, /test/full) — QUICK_QUESTIONS를
 *   그대로 포함하고 지표당 10문항씩 추가한 상위 집합이다. 실제 심리검사에서도 단축판이
 *   정식판 문항의 부분집합인 경우가 흔한 설계 방식이라 이를 따랐다. 문항이 많을수록
 *   한두 개 애매한 응답의 영향이 줄어 신뢰도는 높아지지만 완주율은 낮아지므로, 두 버전을
 *   병행 제공해 사용자가 선택하게 한다(README "정식판 vs 축약판" 참고).
 */

export type Dimension = "EI" | "SN" | "TF" | "JP";

/** 문항에 동의(높은 점수)할수록 가리키는 쪽 극. */
export type Pole = "E" | "N" | "F" | "P";

export interface Question {
  id: number;
  dimension: Dimension;
  pole: Pole;
  text: string;
}

// 지표별 5문항(축약판에 그대로 쓰이는 핵심 문항).
const E_CORE: Question[] = [
  { id: 1, dimension: "EI", pole: "E", text: "새로운 사람들과 함께 있으면 오히려 에너지가 채워진다." },
  { id: 2, dimension: "EI", pole: "E", text: "생각을 말로 꺼내면서 정리하는 편이다." },
  { id: 3, dimension: "EI", pole: "E", text: "낯선 모임에서도 먼저 다가가 말을 거는 편이다." },
  { id: 4, dimension: "EI", pole: "E", text: "주말에 약속이 있어야 오히려 활기가 돈다." },
  { id: 5, dimension: "EI", pole: "E", text: "여럿이 함께 일할 때 아이디어가 더 잘 떠오른다." },
];

const N_CORE: Question[] = [
  { id: 6, dimension: "SN", pole: "N", text: "구체적인 사실보다 숨은 의미나 가능성에 더 끌린다." },
  { id: 7, dimension: "SN", pole: "N", text: "미래의 모습을 상상하는 걸 자주 즐긴다." },
  { id: 8, dimension: "SN", pole: "N", text: "세부 사항보다 전체 그림을 먼저 파악하는 편이다." },
  { id: 9, dimension: "SN", pole: "N", text: "새로운 아이디어나 이론에 관심이 많은 편이다." },
  { id: 10, dimension: "SN", pole: "N", text: "익숙한 방식보다 색다른 방법을 시도해보고 싶다." },
];

const F_CORE: Question[] = [
  { id: 11, dimension: "TF", pole: "F", text: "결정할 때 논리보다 사람들의 마음을 먼저 헤아린다." },
  { id: 12, dimension: "TF", pole: "F", text: "누군가 힘들어하면 내 일처럼 마음이 쓰인다." },
  { id: 13, dimension: "TF", pole: "F", text: "옳고 그름보다 관계의 조화를 더 중요하게 여긴다." },
  { id: 14, dimension: "TF", pole: "F", text: "칭찬 한마디에 하루 기분이 좌우되곤 한다." },
  { id: 15, dimension: "TF", pole: "F", text: "갈등이 생기면 서로의 감정을 먼저 다독이려 한다." },
];

const P_CORE: Question[] = [
  { id: 16, dimension: "JP", pole: "P", text: "계획을 세우기보다 상황에 맞춰 유연하게 움직인다." },
  { id: 17, dimension: "JP", pole: "P", text: "마감이 닥쳐야 오히려 집중이 잘 되는 편이다." },
  { id: 18, dimension: "JP", pole: "P", text: "일정이 갑자기 바뀌어도 크게 스트레스받지 않는다." },
  { id: 19, dimension: "JP", pole: "P", text: "정해진 틀보다 즉흥적인 선택이 더 편하다." },
  { id: 20, dimension: "JP", pole: "P", text: "여행 갈 때 빼곡한 일정표보다 즉흥적인 동선을 선호한다." },
];

export const QUICK_QUESTIONS: Question[] = [...E_CORE, ...N_CORE, ...F_CORE, ...P_CORE];

// 정식판에서 지표당 10문항씩 추가되는 문항(핵심 문항과 합쳐 지표당 15문항이 된다).
const E_EXTRA: Question[] = [
  { id: 101, dimension: "EI", pole: "E", text: "처음 만난 사람과도 금방 편해지는 편이다." },
  { id: 102, dimension: "EI", pole: "E", text: "혼자 하는 취미보다 여럿이 함께하는 활동이 더 즐겁다." },
  { id: 103, dimension: "EI", pole: "E", text: "고민이 있으면 누군가에게 털어놓아야 정리가 된다." },
  { id: 104, dimension: "EI", pole: "E", text: "조용한 곳보다 사람이 북적이는 곳에서 활력을 느낀다." },
  { id: 105, dimension: "EI", pole: "E", text: "즉흥적으로 사람들을 만나 어울리는 걸 좋아한다." },
  { id: 106, dimension: "EI", pole: "E", text: "회의나 모임에서 먼저 의견을 꺼내는 편이다." },
  { id: 107, dimension: "EI", pole: "E", text: "전화나 만남 약속이 많을수록 하루가 즐겁다." },
  { id: 108, dimension: "EI", pole: "E", text: "새로운 모임에 초대받으면 일단 가보는 편이다." },
  { id: 109, dimension: "EI", pole: "E", text: "말을 하다 보면 없던 생각도 새롭게 떠오른다." },
  { id: 110, dimension: "EI", pole: "E", text: "긴 침묵보다는 대화가 이어지는 분위기가 더 편하다." },
];

const N_EXTRA: Question[] = [
  { id: 111, dimension: "SN", pole: "N", text: "현재 상황보다 앞으로 어떻게 될지가 더 궁금하다." },
  { id: 112, dimension: "SN", pole: "N", text: "실제 경험보다 아이디어나 이론에 더 끌린다." },
  { id: 113, dimension: "SN", pole: "N", text: "당연하게 여겨지는 것에 '왜?'라는 질문을 자주 던진다." },
  { id: 114, dimension: "SN", pole: "N", text: "비유나 은유로 이야기하는 걸 좋아한다." },
  { id: 115, dimension: "SN", pole: "N", text: "반복적인 일보다 새로운 시도가 있는 일이 더 즐겁다." },
  { id: 116, dimension: "SN", pole: "N", text: "디테일보다 전체적인 흐름과 맥락을 먼저 살핀다." },
  { id: 117, dimension: "SN", pole: "N", text: "공상이나 상상에 빠지는 시간이 많은 편이다." },
  { id: 118, dimension: "SN", pole: "N", text: "기존 방식에 의문을 갖고 다르게 해보고 싶어진다." },
  { id: 119, dimension: "SN", pole: "N", text: "숫자나 사실보다 그 이면의 의미를 먼저 생각한다." },
  { id: 120, dimension: "SN", pole: "N", text: "먼 미래의 가능성을 이야기할 때 눈이 반짝인다." },
];

const F_EXTRA: Question[] = [
  { id: 121, dimension: "TF", pole: "F", text: "논쟁에서 이기는 것보다 서로 감정 상하지 않는 게 더 중요하다." },
  { id: 122, dimension: "TF", pole: "F", text: "다른 사람의 표정 변화를 잘 알아차리는 편이다." },
  { id: 123, dimension: "TF", pole: "F", text: "비판을 할 때도 상대의 기분을 먼저 살피게 된다." },
  { id: 124, dimension: "TF", pole: "F", text: "원칙보다 그 사람의 사정을 먼저 헤아리는 편이다." },
  { id: 125, dimension: "TF", pole: "F", text: "누군가를 위로할 때 자연스럽게 말이 나온다." },
  { id: 126, dimension: "TF", pole: "F", text: "냉정한 지적보다 따뜻한 격려가 더 효과적이라 믿는다." },
  { id: 127, dimension: "TF", pole: "F", text: "결정이 사람들 사이를 갈라놓을까 봐 조심스러워진다." },
  { id: 128, dimension: "TF", pole: "F", text: "슬픈 영화나 이야기에 쉽게 감정이입한다." },
  { id: 129, dimension: "TF", pole: "F", text: "내 손해를 감수하고도 관계를 지키려 한다." },
  { id: 130, dimension: "TF", pole: "F", text: "분위기가 냉랭해지면 먼저 나서서 풀려고 한다." },
];

const P_EXTRA: Question[] = [
  { id: 131, dimension: "JP", pole: "P", text: "여행 짐도 출발 직전에 챙기는 편이다." },
  { id: 132, dimension: "JP", pole: "P", text: "규칙이나 절차보다 그때그때 상황 판단을 더 믿는다." },
  { id: 133, dimension: "JP", pole: "P", text: "할 일 목록을 만들어도 순서대로 하지 않는다." },
  { id: 134, dimension: "JP", pole: "P", text: "약속 시간이 다가와야 움직이기 시작한다." },
  { id: 135, dimension: "JP", pole: "P", text: "여러 가지 일을 동시에 벌여놓는 편이다." },
  { id: 136, dimension: "JP", pole: "P", text: "정해진 루틴보다 그날 기분에 따라 움직이는 게 좋다." },
  { id: 137, dimension: "JP", pole: "P", text: "선택지를 마지막까지 열어두는 걸 선호한다." },
  { id: 138, dimension: "JP", pole: "P", text: "완벽한 계획보다 일단 시작하고 보는 편이다." },
  { id: 139, dimension: "JP", pole: "P", text: "예상치 못한 변수가 생기면 오히려 재미있다고 느낀다." },
  { id: 140, dimension: "JP", pole: "P", text: "정리정돈보다는 필요할 때 찾는 방식이 더 편하다." },
];

/** 4개 지표 문항을 라운드로빈으로 섞어, 같은 지표 문항이 연달아 나오며 패턴이 읽히는 것을 막는다. */
function interleave(groups: Question[][]): Question[] {
  const result: Question[] = [];
  const maxLen = Math.max(...groups.map((g) => g.length));
  for (let i = 0; i < maxLen; i++) {
    for (const group of groups) {
      if (group[i]) result.push(group[i]);
    }
  }
  return result;
}

export const FULL_QUESTIONS: Question[] = interleave([
  [...E_CORE, ...E_EXTRA],
  [...N_CORE, ...N_EXTRA],
  [...F_CORE, ...F_EXTRA],
  [...P_CORE, ...P_EXTRA],
]);
