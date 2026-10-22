// v1.31 — 무료 사진 검색어 「🔤 영어로」: 한국어 글감 주제를 사진 검색에 잘 맞는 영어 단어로 바꾼다(AI 없이 자주 쓰는 단어 사전).
// Pixabay·Pexels는 영어 검색 결과가 훨씬 많다. 사전에 없는 말은 버리고, 하나도 못 찾으면 빈 문자열(화면이 「직접 영어로」 안내).

const DICT: Record<string, string> = {
  // 일상·감정
  아침: "morning", 저녁: "evening", 밤: "night", 주말: "weekend", 휴식: "relax", 일상: "daily life", 행복: "happy", 감성: "mood",
  힐링: "healing", 위로: "comfort", 사랑: "love", 가족: "family", 친구: "friends", 연애: "couple", 결혼: "wedding", 아기: "baby",
  육아: "parenting", 엄마: "mother", 아빠: "father", 반려견: "dog", 강아지: "puppy", 고양이: "cat", 반려동물: "pet", 혼자: "alone",
  // 장소·계절·자연
  카페: "cafe", 커피: "coffee", 집: "home", 방: "room", 사무실: "office", 회사: "office", 학교: "school", 도시: "city", 서울: "seoul",
  바다: "sea", 산: "mountain", 숲: "forest", 공원: "park", 하늘: "sky", 꽃: "flower", 나무: "tree", 비: "rain", 눈: "snow",
  봄: "spring", 여름: "summer", 가을: "autumn", 겨울: "winter", 노을: "sunset", 일출: "sunrise", 해변: "beach", 캠핑: "camping",
  여행: "travel", 호텔: "hotel", 비행기: "airplane",
  // 일·돈·공부
  직장인: "office worker", 출근: "commute", 퇴근: "after work", 업무: "work", 회의: "meeting", 창업: "startup", 사업: "business",
  마케팅: "marketing", 부업: "side job", 재테크: "finance", 투자: "investment", 주식: "stock market", 돈: "money", 저축: "savings",
  부동산: "real estate", 공부: "study", 독서: "reading", 책: "book", 시험: "exam", 영어: "english study", 자기계발: "self improvement",
  목표: "goal", 성공: "success", 습관: "habit", 시간관리: "time management", 노트북: "laptop", 컴퓨터: "computer", 스마트폰: "smartphone",
  인공지능: "artificial intelligence", 코딩: "coding",
  // 건강·음식·생활
  건강: "health", 운동: "workout", 다이어트: "diet", 요가: "yoga", 러닝: "running", 헬스: "gym", 수면: "sleep", 명상: "meditation",
  음식: "food", 요리: "cooking", 맛집: "restaurant", 빵: "bread", 디저트: "dessert", 케이크: "cake", 술: "drinks", 와인: "wine",
  차: "tea", 아침밥: "breakfast", 점심: "lunch", 저녁밥: "dinner", 쇼핑: "shopping", 패션: "fashion", 뷰티: "beauty", 화장품: "cosmetics",
  인테리어: "interior", 정리: "tidy", 청소: "cleaning", 자동차: "car", 음악: "music", 영화: "movie", 사진: "photography", 그림: "art",
};

// 뒤에 붙는 조사·어미(긴 것부터 떼어 본다)
const SUFFIXES = ["에서는", "으로는", "에게서", "이라는", "에서", "으로", "에게", "까지", "부터", "처럼", "보다", "이랑", "하고", "라는", "하는", "했던", "의", "은", "는", "이", "가", "을", "를", "에", "로", "와", "과", "도", "만", "랑"];

function lookup(word: string): string | undefined {
  if (DICT[word]) return DICT[word];
  for (const suffix of SUFFIXES) {
    if (word.length > suffix.length && word.endsWith(suffix)) {
      const stem = word.slice(0, -suffix.length);
      if (DICT[stem]) return DICT[stem];
    }
  }
  // 붙여 쓴 말(예: 아침커피) — 사전 단어로 앞에서부터 잘라 본다
  for (let len = Math.min(5, word.length - 1); len >= 1; len -= 1) {
    const head = word.slice(0, len);
    if (DICT[head]) {
      const rest = lookup(word.slice(len));
      return rest ? `${DICT[head]} ${rest}` : DICT[head];
    }
  }
  return undefined;
}

/** 한국어 문장을 사진 검색용 영어 키워드(최대 4개)로. 영어 단어는 그대로 둔다. 못 찾으면 "" */
export function toEnglishKeywords(text: string): string {
  const out: string[] = [];
  for (const raw of text.split(/[\s,.!?·/()[\]「」『』"'~…-]+/)) {
    const word = raw.trim();
    if (!word) continue;
    const english = /^[a-z0-9 ]+$/i.test(word) ? word.toLowerCase() : lookup(word);
    if (english && !out.includes(english)) out.push(english);
    if (out.length >= 4) break;
  }
  return out.join(" ");
}
