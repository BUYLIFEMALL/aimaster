/**
 * 문항은 전부 자체 제작이다 — 공식 MBTI(Myers-Briggs Type Indicator)는 The Myers-Briggs
 * Company의 등록상표이자 저작권이 있는 검사이므로 실제 문항을 그대로 가져다 쓰지 않는다.
 * 다만 융(Jung) 심리유형론에 기반한 4개 이분지표(E/I, S/N, T/F, J/P) 개념 자체는 학계에
 * 공개된 일반적인 분류 체계라 자유롭게 참고할 수 있다.
 *
 * 각 문항은 한쪽 극(pole)으로만 진술되고, 응답자는 5점 리커트 척도(1=전혀 아니다 ~
 * 5=매우 그렇다)로 동의 정도를 표시한다. 지표당 5문항 × 4지표 = 총 20문항(축약판 MVP).
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

export const QUESTIONS: Question[] = [
  // E (외향) — 동의할수록 E, 비동의할수록 I
  { id: 1, dimension: "EI", pole: "E", text: "새로운 사람들과 함께 있으면 오히려 에너지가 채워진다." },
  { id: 2, dimension: "EI", pole: "E", text: "생각을 말로 꺼내면서 정리하는 편이다." },
  { id: 3, dimension: "EI", pole: "E", text: "낯선 모임에서도 먼저 다가가 말을 거는 편이다." },
  { id: 4, dimension: "EI", pole: "E", text: "주말에 약속이 있어야 오히려 활기가 돈다." },
  { id: 5, dimension: "EI", pole: "E", text: "여럿이 함께 일할 때 아이디어가 더 잘 떠오른다." },

  // N (직관) — 동의할수록 N, 비동의할수록 S
  { id: 6, dimension: "SN", pole: "N", text: "구체적인 사실보다 숨은 의미나 가능성에 더 끌린다." },
  { id: 7, dimension: "SN", pole: "N", text: "미래의 모습을 상상하는 걸 자주 즐긴다." },
  { id: 8, dimension: "SN", pole: "N", text: "세부 사항보다 전체 그림을 먼저 파악하는 편이다." },
  { id: 9, dimension: "SN", pole: "N", text: "새로운 아이디어나 이론에 관심이 많은 편이다." },
  { id: 10, dimension: "SN", pole: "N", text: "익숙한 방식보다 색다른 방법을 시도해보고 싶다." },

  // F (감정) — 동의할수록 F, 비동의할수록 T
  { id: 11, dimension: "TF", pole: "F", text: "결정할 때 논리보다 사람들의 마음을 먼저 헤아린다." },
  { id: 12, dimension: "TF", pole: "F", text: "누군가 힘들어하면 내 일처럼 마음이 쓰인다." },
  { id: 13, dimension: "TF", pole: "F", text: "옳고 그름보다 관계의 조화를 더 중요하게 여긴다." },
  { id: 14, dimension: "TF", pole: "F", text: "칭찬 한마디에 하루 기분이 좌우되곤 한다." },
  { id: 15, dimension: "TF", pole: "F", text: "갈등이 생기면 서로의 감정을 먼저 다독이려 한다." },

  // P (인식) — 동의할수록 P, 비동의할수록 J
  { id: 16, dimension: "JP", pole: "P", text: "계획을 세우기보다 상황에 맞춰 유연하게 움직인다." },
  { id: 17, dimension: "JP", pole: "P", text: "마감이 닥쳐야 오히려 집중이 잘 되는 편이다." },
  { id: 18, dimension: "JP", pole: "P", text: "일정이 갑자기 바뀌어도 크게 스트레스받지 않는다." },
  { id: 19, dimension: "JP", pole: "P", text: "정해진 틀보다 즉흥적인 선택이 더 편하다." },
  { id: 20, dimension: "JP", pole: "P", text: "여행 갈 때 빼곡한 일정표보다 즉흥적인 동선을 선호한다." },
];
