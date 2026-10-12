// AI 인플루언서 자동화 - 옵션 데이터셋 및 프리셋

export interface OptionItem {
  id: string;
  labelKo: string;
  labelEn: string;
  detail: string;
  description?: string;
}

export interface CategoryGroup {
  category: string;
  options: OptionItem[];
}

export interface DailyStorylineItem {
  id: string;
  labelKo: string;
  labelEn: string;
  timeOrder: number;
  config: {
    outfit: string;
    location: string;
    expression: string;
    pose: string;
    lighting: string;
    hairStyle: string;
    camera: string;
    filmStock: string;
    skin: string[];
  };
}

// 1. 성별 (Gender)
export const GENDERS: OptionItem[] = [
  {
    "id": "female",
    "labelKo": "여성",
    "labelEn": "Female",
    "detail": "woman"
  },
  {
    "id": "male",
    "labelKo": "남성",
    "labelEn": "Male",
    "detail": "man"
  },
  {
    "id": "nonbinary",
    "labelKo": "기타/중성",
    "labelEn": "Non-binary",
    "detail": "person"
  }
];

// 2. 국적/인종 (Ethnicity)
export const ETHNICITIES: OptionItem[] = [
  {
    "id": "kr",
    "labelKo": "한국인",
    "labelEn": "Korean",
    "detail": "Korean"
  },
  {
    "id": "jp",
    "labelKo": "일본인",
    "labelEn": "Japanese",
    "detail": "Japanese"
  },
  {
    "id": "cn",
    "labelKo": "중국인",
    "labelEn": "Chinese",
    "detail": "Chinese"
  },
  {
    "id": "vn",
    "labelKo": "베트남인",
    "labelEn": "Vietnamese",
    "detail": "Vietnamese"
  },
  {
    "id": "th",
    "labelKo": "태국인",
    "labelEn": "Thai",
    "detail": "Thai"
  },
  {
    "id": "tw",
    "labelKo": "대만인",
    "labelEn": "Taiwanese",
    "detail": "Taiwanese"
  },
  {
    "id": "sg",
    "labelKo": "싱가포르인",
    "labelEn": "Singaporean",
    "detail": "Singaporean"
  },
  {
    "id": "id",
    "labelKo": "인도네시아인",
    "labelEn": "Indonesian",
    "detail": "Indonesian"
  },
  {
    "id": "ph",
    "labelKo": "필리핀인",
    "labelEn": "Filipino",
    "detail": "Filipino"
  },
  {
    "id": "in_n",
    "labelKo": "북인도인",
    "labelEn": "North Indian",
    "detail": "North Indian"
  },
  {
    "id": "in_s",
    "labelKo": "남인도인",
    "labelEn": "South Indian",
    "detail": "South Indian"
  },
  {
    "id": "me_a",
    "labelKo": "중동 아랍인",
    "labelEn": "Arab",
    "detail": "Arab"
  },
  {
    "id": "me_p",
    "labelKo": "중동 페르시아인",
    "labelEn": "Persian",
    "detail": "Persian"
  },
  {
    "id": "tr",
    "labelKo": "터키인",
    "labelEn": "Turkish",
    "detail": "Turkish"
  },
  {
    "id": "cau_n",
    "labelKo": "북유럽 백인",
    "labelEn": "Nordic",
    "detail": "Nordic"
  },
  {
    "id": "cau_m",
    "labelKo": "지중해 백인",
    "labelEn": "Mediterranean",
    "detail": "Mediterranean"
  },
  {
    "id": "cau_e",
    "labelKo": "동유럽 백인",
    "labelEn": "Eastern European",
    "detail": "Eastern European"
  },
  {
    "id": "ru",
    "labelKo": "러시아인",
    "labelEn": "Russian",
    "detail": "Russian"
  },
  {
    "id": "fr",
    "labelKo": "프랑스인",
    "labelEn": "French",
    "detail": "French"
  },
  {
    "id": "it",
    "labelKo": "이탈리아인",
    "labelEn": "Italian",
    "detail": "Italian"
  },
  {
    "id": "es",
    "labelKo": "스페인인",
    "labelEn": "Spanish",
    "detail": "Spanish"
  },
  {
    "id": "uk",
    "labelKo": "영국인",
    "labelEn": "British",
    "detail": "British"
  },
  {
    "id": "de",
    "labelKo": "독일인",
    "labelEn": "German",
    "detail": "German"
  },
  {
    "id": "af_am",
    "labelKo": "아프리카계 미국인",
    "labelEn": "African American",
    "detail": "African American"
  },
  {
    "id": "af_w",
    "labelKo": "서아프리카인",
    "labelEn": "West African",
    "detail": "West African"
  },
  {
    "id": "lat_m",
    "labelKo": "라틴 메스티소",
    "labelEn": "Mestizo",
    "detail": "Mestizo Latina"
  },
  {
    "id": "br",
    "labelKo": "브라질인",
    "labelEn": "Brazilian",
    "detail": "Brazilian"
  },
  {
    "id": "mx",
    "labelKo": "멕시코인",
    "labelEn": "Mexican",
    "detail": "Mexican"
  },
  {
    "id": "au",
    "labelKo": "호주인",
    "labelEn": "Australian",
    "detail": "Australian"
  },
  {
    "id": "global",
    "labelKo": "글로벌 에스닉",
    "labelEn": "Global",
    "detail": "Global Mixed"
  }
];

// 3. 나이 (Ages)
export const AGES: OptionItem[] = [
  {
    "id": "18",
    "labelKo": "18세",
    "labelEn": "18",
    "detail": "18 years old"
  },
  {
    "id": "19",
    "labelKo": "19세",
    "labelEn": "19",
    "detail": "19 years old"
  },
  {
    "id": "20",
    "labelKo": "20세",
    "labelEn": "20",
    "detail": "20 years old"
  },
  {
    "id": "21",
    "labelKo": "21세",
    "labelEn": "21",
    "detail": "21 years old"
  },
  {
    "id": "22",
    "labelKo": "22세",
    "labelEn": "22",
    "detail": "22 years old"
  },
  {
    "id": "23",
    "labelKo": "23세",
    "labelEn": "23",
    "detail": "23 years old"
  },
  {
    "id": "24",
    "labelKo": "24세",
    "labelEn": "24",
    "detail": "24 years old"
  },
  {
    "id": "25",
    "labelKo": "25세",
    "labelEn": "25",
    "detail": "25 years old"
  },
  {
    "id": "26",
    "labelKo": "26세",
    "labelEn": "26",
    "detail": "26 years old"
  },
  {
    "id": "27",
    "labelKo": "27세",
    "labelEn": "27",
    "detail": "27 years old"
  },
  {
    "id": "28",
    "labelKo": "28세",
    "labelEn": "28",
    "detail": "28 years old"
  },
  {
    "id": "29",
    "labelKo": "29세",
    "labelEn": "29",
    "detail": "29 years old"
  },
  {
    "id": "30",
    "labelKo": "30세",
    "labelEn": "30",
    "detail": "30 years old"
  },
  {
    "id": "31",
    "labelKo": "31세",
    "labelEn": "31",
    "detail": "31 years old"
  },
  {
    "id": "32",
    "labelKo": "32세",
    "labelEn": "32",
    "detail": "32 years old"
  },
  {
    "id": "33",
    "labelKo": "33세",
    "labelEn": "33",
    "detail": "33 years old"
  },
  {
    "id": "34",
    "labelKo": "34세",
    "labelEn": "34",
    "detail": "34 years old"
  },
  {
    "id": "35",
    "labelKo": "35세",
    "labelEn": "35",
    "detail": "35 years old"
  },
  {
    "id": "36",
    "labelKo": "36세",
    "labelEn": "36",
    "detail": "36 years old"
  },
  {
    "id": "37",
    "labelKo": "37세",
    "labelEn": "37",
    "detail": "37 years old"
  },
  {
    "id": "38",
    "labelKo": "38세",
    "labelEn": "38",
    "detail": "38 years old"
  },
  {
    "id": "39",
    "labelKo": "39세",
    "labelEn": "39",
    "detail": "39 years old"
  },
  {
    "id": "40",
    "labelKo": "40세",
    "labelEn": "40",
    "detail": "40 years old"
  },
  {
    "id": "41",
    "labelKo": "41세",
    "labelEn": "41",
    "detail": "41 years old"
  },
  {
    "id": "42",
    "labelKo": "42세",
    "labelEn": "42",
    "detail": "42 years old"
  },
  {
    "id": "43",
    "labelKo": "43세",
    "labelEn": "43",
    "detail": "43 years old"
  },
  {
    "id": "44",
    "labelKo": "44세",
    "labelEn": "44",
    "detail": "44 years old"
  },
  {
    "id": "45",
    "labelKo": "45세",
    "labelEn": "45",
    "detail": "45 years old"
  },
  {
    "id": "46",
    "labelKo": "46세",
    "labelEn": "46",
    "detail": "46 years old"
  },
  {
    "id": "47",
    "labelKo": "47세",
    "labelEn": "47",
    "detail": "47 years old"
  }
];

// 4. 얼굴형/분위기 (Face Style)
export const FACE_STYLES: OptionItem[] = [
  {
    "id": "elegant",
    "labelKo": "우아한 분위기",
    "labelEn": "Elegant",
    "detail": "elegant refined facial features"
  },
  {
    "id": "innocent",
    "labelKo": "청순한 느낌",
    "labelEn": "Innocent",
    "detail": "pure innocent facial features"
  },
  {
    "id": "cute",
    "labelKo": "귀여운/상큼",
    "labelEn": "Cute",
    "detail": "cute youthful facial features"
  },
  {
    "id": "sharp",
    "labelKo": "날카로운/도시적",
    "labelEn": "Sharp",
    "detail": "sharp defined facial features"
  },
  {
    "id": "chic",
    "labelKo": "시크한/차가운",
    "labelEn": "Chic",
    "detail": "cool chic modelesque look"
  },
  {
    "id": "soft",
    "labelKo": "부드러운/포근",
    "labelEn": "Soft",
    "detail": "soft approachable features"
  },
  {
    "id": "mature",
    "labelKo": "성숙한/고혹",
    "labelEn": "Mature",
    "detail": "sophisticated mature facial features"
  },
  {
    "id": "cat",
    "labelKo": "고양이상",
    "labelEn": "Cat-like",
    "detail": "mysterious cat-like eyes"
  },
  {
    "id": "puppy",
    "labelKo": "강아지상",
    "labelEn": "Puppy-like",
    "detail": "round friendly puppy-like eyes"
  },
  {
    "id": "deer",
    "labelKo": "사슴상",
    "labelEn": "Deer-like",
    "detail": "large clear deer-like eyes"
  },
  {
    "id": "fox",
    "labelKo": "여우상",
    "labelEn": "Fox-like",
    "detail": "sharp attractive fox-like features"
  },
  {
    "id": "rabbit",
    "labelKo": "토끼상",
    "labelEn": "Rabbit-like",
    "detail": "bright adorable rabbit-like features"
  },
  {
    "id": "intellectual",
    "labelKo": "지적인",
    "labelEn": "Intellectual",
    "detail": "intellectual sophisticated look"
  },
  {
    "id": "dreamy",
    "labelKo": "몽환적인",
    "labelEn": "Dreamy",
    "detail": "ethereal dreamy facial vibe"
  },
  {
    "id": "athletic",
    "labelKo": "건강미",
    "labelEn": "Athletic",
    "detail": "toned healthy facial structure"
  },
  {
    "id": "exotic",
    "labelKo": "이국적인",
    "labelEn": "Exotic",
    "detail": "striking exotic beauty"
  },
  {
    "id": "classic",
    "labelKo": "클래식한",
    "labelEn": "Classic",
    "detail": "timeless classic beauty"
  },
  {
    "id": "modern",
    "labelKo": "모던한",
    "labelEn": "Modern",
    "detail": "modern trendy influencer face"
  },
  {
    "id": "avant",
    "labelKo": "아방가르드",
    "labelEn": "Avant-garde",
    "detail": "unique high-fashion features"
  },
  {
    "id": "minimal",
    "labelKo": "미니멀한",
    "labelEn": "Minimal",
    "detail": "clean minimal facial lines"
  },
  {
    "id": "vivacious",
    "labelKo": "생기있는",
    "labelEn": "Vivacious",
    "detail": "bright energetic facial expression"
  },
  {
    "id": "stoic",
    "labelKo": "강인한",
    "labelEn": "Stoic",
    "detail": "powerful stoic features"
  },
  {
    "id": "graceful",
    "labelKo": "단아한",
    "labelEn": "Graceful",
    "detail": "poised graceful appearance"
  },
  {
    "id": "bold",
    "labelKo": "강렬한",
    "labelEn": "Bold",
    "detail": "bold charismatic facial features"
  },
  {
    "id": "serene",
    "labelKo": "평온한",
    "labelEn": "Serene",
    "detail": "calm serene facial look"
  },
  {
    "id": "mysterious",
    "labelKo": "신비로운",
    "labelEn": "Mysterious",
    "detail": "enigmatic mysterious gaze"
  },
  {
    "id": "delicate",
    "labelKo": "섬세한",
    "labelEn": "Delicate",
    "detail": "fine delicate facial structure"
  },
  {
    "id": "fresh",
    "labelKo": "싱그러운",
    "labelEn": "Fresh",
    "detail": "fresh natural beauty"
  },
  {
    "id": "radiant",
    "labelKo": "눈부신",
    "labelEn": "Radiant",
    "detail": "radiant glowing facial features"
  },
  {
    "id": "doll",
    "labelKo": "인형같은",
    "labelEn": "Doll-like",
    "detail": "perfect doll-like features"
  }
];

// 5. 헤어스타일 (Hair Style)
export const HAIR_STYLES: OptionItem[] = [
  {
    "id": "ref_same",
    "labelKo": "✨ 레퍼런스와 동일 (고정)",
    "labelEn": "Same as Ref",
    "detail": "EXACTLY SAME AS IMAGE 1"
  },
  {
    "id": "l_str_b",
    "labelKo": "긴 검정 생머리",
    "labelEn": "Long Black Straight",
    "detail": "long silky jet black straight hair"
  },
  {
    "id": "l_str_br",
    "labelKo": "긴 갈색 생머리",
    "labelEn": "Long Brown Straight",
    "detail": "long silky chestnut brown straight hair"
  },
  {
    "id": "l_wave_b",
    "labelKo": "긴 검정 웨이브",
    "labelEn": "Long Black Wave",
    "detail": "long voluminous black wavy hair"
  },
  {
    "id": "l_wave_br",
    "labelKo": "긴 갈색 웨이브",
    "labelEn": "Long Brown Wave",
    "detail": "long voluminous brown wavy hair"
  },
  {
    "id": "l_wave_bl",
    "labelKo": "긴 금발 웨이브",
    "labelEn": "Long Blonde Wave",
    "detail": "long voluminous honey blonde wavy hair"
  },
  {
    "id": "bob_b",
    "labelKo": "단발 검정",
    "labelEn": "Black Bob",
    "detail": "chic black bob cut"
  },
  {
    "id": "bob_bl",
    "labelKo": "단발 금발",
    "labelEn": "Blonde Bob",
    "detail": "chic blonde bob cut"
  },
  {
    "id": "ponytail_h",
    "labelKo": "하이 포니테일",
    "labelEn": "High Ponytail",
    "detail": "high sleek ponytail"
  },
  {
    "id": "ponytail_l",
    "labelKo": "로우 포니테일",
    "labelEn": "Low Ponytail",
    "detail": "elegant low ponytail"
  },
  {
    "id": "bun_h",
    "labelKo": "하이 번",
    "labelEn": "High Bun",
    "detail": "neat high hair bun"
  },
  {
    "id": "bun_m",
    "labelKo": "메시 번",
    "labelEn": "Messy Bun",
    "detail": "natural messy hair bun"
  },
  {
    "id": "short_p",
    "labelKo": "픽시 컷",
    "labelEn": "Pixie Cut",
    "detail": "bold short pixie cut"
  },
  {
    "id": "short_w",
    "labelKo": "울프 컷",
    "labelEn": "Wolf Cut",
    "detail": "edgy layered wolf cut"
  },
  {
    "id": "braids_s",
    "labelKo": "한쪽 땋음",
    "labelEn": "Side Braid",
    "detail": "loose side braid"
  },
  {
    "id": "braids_t",
    "labelKo": "양갈래 땋음",
    "labelEn": "Twin Braids",
    "detail": "cute twin braids"
  },
  {
    "id": "half_up",
    "labelKo": "반묶음",
    "labelEn": "Half-up",
    "detail": "feminine half-up half-down style"
  },
  {
    "id": "hime",
    "labelKo": "히메 컷",
    "labelEn": "Hime Cut",
    "detail": "traditional Japanese hime cut"
  },
  {
    "id": "see_thru",
    "labelKo": "시스루 뱅",
    "labelEn": "See-thru Bangs",
    "detail": "delicate see-through bangs"
  },
  {
    "id": "perm_h",
    "labelKo": "히피 펌",
    "labelEn": "Hippie Perm",
    "detail": "tight hippie perm curls"
  },
  {
    "id": "wet",
    "labelKo": "웨트 헤어",
    "labelEn": "Wet Look",
    "detail": "trendy wet hair look"
  },
  {
    "id": "ash_g",
    "labelKo": "애쉬 그레이",
    "labelEn": "Ash Grey",
    "detail": "modern ash grey dyed hair"
  },
  {
    "id": "rose_g",
    "labelKo": "로즈 골드",
    "labelEn": "Rose Gold",
    "detail": "ethereal rose gold hair"
  },
  {
    "id": "lavender",
    "labelKo": "라벤더",
    "labelEn": "Lavender",
    "detail": "soft lavender dyed hair"
  },
  {
    "id": "blue_b",
    "labelKo": "블루 블랙",
    "labelEn": "Blue Black",
    "detail": "deep blue black hair"
  },
  {
    "id": "ginger",
    "labelKo": "진저/레드",
    "labelEn": "Ginger",
    "detail": "natural vibrant ginger hair"
  },
  {
    "id": "side_part",
    "labelKo": "가르마 스타일",
    "labelEn": "Side Part",
    "detail": "deep side-parted hair"
  },
  {
    "id": "curtain",
    "labelKo": "커튼 뱅",
    "labelEn": "Curtain Bangs",
    "detail": "face-framing curtain bangs"
  },
  {
    "id": "balayage",
    "labelKo": "발레아쥬",
    "labelEn": "Balayage",
    "detail": "natural sun-kissed balayage"
  },
  {
    "id": "silver",
    "labelKo": "실버",
    "labelEn": "Silver",
    "detail": "striking metallic silver hair"
  },
  {
    "id": "pixie_long",
    "labelKo": "롱 픽시",
    "labelEn": "Long Pixie",
    "detail": "feminine long pixie cut"
  }
];

// 6. 표정 (Expressions)
export const EXPRESSIONS: OptionItem[] = [
  {
    "id": "g_smile",
    "labelKo": "은은한 미소",
    "labelEn": "Gentle Smile",
    "detail": "soft gentle smile"
  },
  {
    "id": "smile",
    "labelKo": "밝은 미소",
    "labelEn": "Smile",
    "detail": "bright radiant smile"
  },
  {
    "id": "laugh",
    "labelKo": "파안대소",
    "labelEn": "Laughing",
    "detail": "laughing out loud with crescent eyes"
  },
  {
    "id": "wink",
    "labelKo": "윙크",
    "labelEn": "Wink",
    "detail": "playful wink"
  },
  {
    "id": "serious",
    "labelKo": "진지한",
    "labelEn": "Serious",
    "detail": "serious professional gaze"
  },
  {
    "id": "chic",
    "labelKo": "시크한 무표정",
    "labelEn": "Neutral Chic",
    "detail": "cool neutral chic expression"
  },
  {
    "id": "pout",
    "labelKo": "뾰로통한",
    "labelEn": "Pouting",
    "detail": "cute pouting expression"
  },
  {
    "id": "surprised",
    "labelKo": "놀란",
    "labelEn": "Surprised",
    "detail": "wide-eyed surprised look"
  },
  {
    "id": "dreamy",
    "labelKo": "몽환적인",
    "labelEn": "Dreamy",
    "detail": "hazy dreamy look"
  },
  {
    "id": "seductive",
    "labelKo": "매혹적인",
    "labelEn": "Seductive",
    "detail": "alluring seductive gaze"
  },
  {
    "id": "pensive",
    "labelKo": "생각에 잠긴",
    "labelEn": "Pensive",
    "detail": "deep in thought, pensive look"
  },
  {
    "id": "sleepy",
    "labelKo": "졸린듯한",
    "labelEn": "Sleepy",
    "detail": "sleepy half-closed eyes"
  },
  {
    "id": "smug",
    "labelKo": "자신만만한",
    "labelEn": "Smug",
    "detail": "confident smug grin"
  },
  {
    "id": "curious",
    "labelKo": "호기심 어린",
    "labelEn": "Curious",
    "detail": "curious tilted head expression"
  },
  {
    "id": "relaxed",
    "labelKo": "편안한",
    "labelEn": "Relaxed",
    "detail": "relaxed facial muscles"
  },
  {
    "id": "vibrant",
    "labelKo": "생기 넘치는",
    "labelEn": "Vibrant",
    "detail": "energetic vibrant expression"
  },
  {
    "id": "stoic",
    "labelKo": "단호한",
    "labelEn": "Stoic",
    "detail": "expressionless stoic face"
  },
  {
    "id": "bashful",
    "labelKo": "부끄러워하는",
    "labelEn": "Bashful",
    "detail": "shy bashful look with slight blush"
  },
  {
    "id": "joyful",
    "labelKo": "환희에 찬",
    "labelEn": "Joyful",
    "detail": "expression of pure joy"
  },
  {
    "id": "mysterious",
    "labelKo": "미스터리한",
    "labelEn": "Mysterious",
    "detail": "mysterious enigmatic look"
  },
  {
    "id": "determined",
    "labelKo": "결연한",
    "labelEn": "Determined",
    "detail": "strong determined gaze"
  },
  {
    "id": "tender",
    "labelKo": "다정한",
    "labelEn": "Tender",
    "detail": "warm tender expression"
  },
  {
    "id": "haughty",
    "labelKo": "도도한",
    "labelEn": "Haughty",
    "detail": "proud haughty expression"
  },
  {
    "id": "playful",
    "labelKo": "장난스러운",
    "labelEn": "Playful",
    "detail": "naughty playful grin"
  },
  {
    "id": "melancholy",
    "labelKo": "우울한",
    "labelEn": "Melancholy",
    "detail": "sad melancholy expression"
  },
  {
    "id": "serene",
    "labelKo": "고요한",
    "labelEn": "Serene",
    "detail": "peaceful serene look"
  },
  {
    "id": "startled",
    "labelKo": "깜짝 놀란",
    "labelEn": "Startled",
    "detail": "sharp startled expression"
  },
  {
    "id": "disdainful",
    "labelKo": "경멸하는",
    "labelEn": "Disdainful",
    "detail": "cool disdainful look"
  },
  {
    "id": "yearning",
    "labelKo": "갈망하는",
    "labelEn": "Yearning",
    "detail": "longing yearning gaze"
  },
  {
    "id": "hopeful",
    "labelKo": "희망찬",
    "labelEn": "Hopeful",
    "detail": "bright hopeful expression"
  }
];

// 7. 포즈 (Poses)
export const POSES: OptionItem[] = [
  {
    "id": "selfie",
    "labelKo": "기본 셀카",
    "labelEn": "Selfie",
    "detail": "holding phone for a traditional selfie, arm slightly visible"
  },
  {
    "id": "mirror_selfie",
    "labelKo": "거울 셀카",
    "labelEn": "Mirror Selfie",
    "detail": "posing in front of a mirror holding a smartphone"
  },
  {
    "id": "vlog_selfie",
    "labelKo": "브이로그 캠",
    "labelEn": "Vlog Shot",
    "detail": "holding a compact vlog camera with flip-screen at arm length"
  },
  {
    "id": "gimbal_selfie",
    "labelKo": "짐벌 팔로잉",
    "labelEn": "Gimbal Walk",
    "detail": "holding a gimbal stabilizer while walking for a POV selfie"
  },
  {
    "id": "top_angle",
    "labelKo": "하이 앵글 셀카",
    "labelEn": "High Angle",
    "detail": "holding the device high above the head looking up"
  },
  {
    "id": "standing",
    "labelKo": "정면 서기",
    "labelEn": "Standing",
    "detail": "standing straight facing camera"
  },
  {
    "id": "sitting",
    "labelKo": "앉아있기",
    "labelEn": "Sitting",
    "detail": "sitting comfortably"
  },
  {
    "id": "leaning",
    "labelKo": "벽에 기대기",
    "labelEn": "Leaning",
    "detail": "leaning against a wall"
  },
  {
    "id": "over_shoulder",
    "labelKo": "뒤돌아보기",
    "labelEn": "Over Shoulder",
    "detail": "looking back over shoulder"
  },
  {
    "id": "walking",
    "labelKo": "걷는 중",
    "labelEn": "Walking",
    "detail": "captured while walking"
  },
  {
    "id": "crouching",
    "labelKo": "웅크리기",
    "labelEn": "Crouching",
    "detail": "stylish crouching pose"
  },
  {
    "id": "lying",
    "labelKo": "누워있기",
    "labelEn": "Lying Down",
    "detail": "lying down on a surface"
  },
  {
    "id": "jumping",
    "labelKo": "점프",
    "labelEn": "Jumping",
    "detail": "dynamic mid-air jump"
  },
  {
    "id": "dancing",
    "labelKo": "춤추기",
    "labelEn": "Dancing",
    "detail": "moving while dancing"
  },
  {
    "id": "fixing_hair",
    "labelKo": "머리 만지기",
    "labelEn": "Fixing Hair",
    "detail": "hands fixing hair"
  },
  {
    "id": "stretching",
    "labelKo": "스트레칭",
    "labelEn": "Stretching",
    "detail": "morning stretch pose"
  },
  {
    "id": "yoga",
    "labelKo": "요가 자세",
    "labelEn": "Yoga",
    "detail": "zen yoga posture"
  },
  {
    "id": "holding_phone",
    "labelKo": "폰 들기",
    "labelEn": "Phone",
    "detail": "holding a smartphone"
  },
  {
    "id": "drinking",
    "labelKo": "음료 마시기",
    "labelEn": "Drinking",
    "detail": "holding a cup near lips"
  },
  {
    "id": "adjusting_glasses",
    "labelKo": "안경 고치기",
    "labelEn": "Glasses",
    "detail": "hand on glasses frame"
  },
  {
    "id": "cross_arms",
    "labelKo": "팔짱 끼기",
    "labelEn": "Crossed Arms",
    "detail": "confident crossed arms"
  },
  {
    "id": "hands_pocket",
    "labelKo": "주머니에 손",
    "labelEn": "Hands in Pocket",
    "detail": "relaxed hands in pocket"
  },
  {
    "id": "kneeling",
    "labelKo": "무릎 꿇기",
    "labelEn": "Kneeling",
    "detail": "graceful kneeling position"
  },
  {
    "id": "twisting",
    "labelKo": "몸 틀기",
    "labelEn": "Twisting",
    "detail": "dynamic body twist"
  },
  {
    "id": "running",
    "labelKo": "달리기",
    "labelEn": "Running",
    "detail": "mid-stride running action"
  },
  {
    "id": "squatting",
    "labelKo": "스쿼트",
    "labelEn": "Squatting",
    "detail": "athletic squatting pose"
  },
  {
    "id": "saluting",
    "labelKo": "경례",
    "labelEn": "Saluting",
    "detail": "playful salute"
  },
  {
    "id": "waving",
    "labelKo": "손 흔들기",
    "labelEn": "Waving",
    "detail": "waving at the camera"
  },
  {
    "id": "pointing",
    "labelKo": "가리키기",
    "labelEn": "Pointing",
    "detail": "pointing at something"
  },
  {
    "id": "praying",
    "labelKo": "기도하기",
    "labelEn": "Praying",
    "detail": "hands pressed together"
  }
];

// 8. 의상 카테고리 (Outfits by Category)
export const OUTFIT_CATEGORIES: CategoryGroup[] = [
  {
    "category": "Daily Trend (인플루언서 OOTD)",
    "options": [
      {
        "id": "oversized_shirt",
        "labelKo": "오버사이즈 화이트 셔츠",
        "labelEn": "Oversized Shirt",
        "detail": "oversized white crisp button-up shirt"
      },
      {
        "id": "crop_hoodie",
        "labelKo": "크롭 후디 & 조거팬츠",
        "labelEn": "Crop Hoodie Set",
        "detail": "trendy crop hoodie and matching joggers set"
      },
      {
        "id": "cargo_pants_top",
        "labelKo": "카고 팬츠 & 탱크탑",
        "labelEn": "Cargo & Tank",
        "detail": "street style cargo pants and tight white tank top"
      },
      {
        "id": "denim_shorts_tee",
        "labelKo": "데님 숏팬츠 & 그래픽 티",
        "labelEn": "Denim & Tee",
        "detail": "vintage denim shorts and oversized graphic t-shirt"
      },
      {
        "id": "knit_vest_shirt",
        "labelKo": "니트 베스트 & 셔츠 레이어드",
        "labelEn": "Knit Vest Layer",
        "detail": "preppy knit vest layered over a white shirt"
      },
      {
        "id": "mini_skirt_blazer",
        "labelKo": "미니스커트 & 오버 블레이저",
        "labelEn": "Mini & Blazer",
        "detail": "chic mini skirt with an oversized boxy blazer"
      },
      {
        "id": "biker_shorts_sweat",
        "labelKo": "바이커 쇼츠 & 맨투맨",
        "labelEn": "Biker Shorts Set",
        "detail": "athletic biker shorts with an oversized sweatshirt"
      },
      {
        "id": "slip_dress_tee",
        "labelKo": "슬립 드레스 & 티셔츠 레이어드",
        "labelEn": "Slip Layered",
        "detail": "silky slip dress layered over a simple white tee"
      },
      {
        "id": "knit_set",
        "labelKo": "원마일웨어 니트 세트",
        "labelEn": "Knit Co-ord",
        "detail": "matching soft knit top and wide pants set"
      },
      {
        "id": "pleated_skirt_polo",
        "labelKo": "플리츠 스커트 & 폴로 셔츠",
        "labelEn": "Pleated & Polo",
        "detail": "sporty pleated mini skirt and cropped polo shirt"
      },
      {
        "id": "leather_pants_crop",
        "labelKo": "가죽 팬츠 & 크롭 가디건",
        "labelEn": "Leather & Crop",
        "detail": "black faux leather pants and fuzzy crop cardigan"
      },
      {
        "id": "check_skirt_boots",
        "labelKo": "체크 스커트 & 롱부츠 룩",
        "labelEn": "Check & Boots",
        "detail": "plaid mini skirt paired with knee-high leather boots"
      },
      {
        "id": "puffer_vest_leggings",
        "labelKo": "푸퍼 베스트 & 레깅스",
        "labelEn": "Puffer & Leggings",
        "detail": "glossy puffer vest with high-waisted leggings"
      },
      {
        "id": "off_shoulder_knit",
        "labelKo": "오프숄더 니트 & 와이드 슬랙스",
        "labelEn": "Off-shoulder Knit",
        "detail": "soft off-shoulder knit sweater and loose slacks"
      },
      {
        "id": "varsity_jacket",
        "labelKo": "바시티 자켓 & 테니스 스커트",
        "labelEn": "Varsity Look",
        "detail": "oversized varsity jacket and white tennis skirt"
      }
    ]
  },
  {
    "category": "Luxury & Elegant (명품/격식)",
    "options": [
      {
        "id": "satin_slip",
        "labelKo": "럭셔리 새틴 슬립 드레스",
        "labelEn": "Satin Slip",
        "detail": "luxurious champagne satin slip dress"
      },
      {
        "id": "tweed_set",
        "labelKo": "클래식 트위드 셋업",
        "labelEn": "Tweed Set",
        "detail": "elegant designer pink tweed jacket and skirt set"
      },
      {
        "id": "cocktail_black",
        "labelKo": "리틀 블랙 드레스",
        "labelEn": "Black Dress",
        "detail": "chic designer little black cocktail dress"
      },
      {
        "id": "silk_blouse_slacks",
        "labelKo": "실크 블라우스 & 하이웨스트 슬랙스",
        "labelEn": "Silk & Slacks",
        "detail": "cream silk pussy-bow blouse and tailored slacks"
      },
      {
        "id": "trench_dress",
        "labelKo": "트렌치 드레스 룩",
        "labelEn": "Trench Look",
        "detail": "belted classic beige trench coat worn as a dress"
      },
      {
        "id": "velvet_gown",
        "labelKo": "이브닝 벨벳 가운",
        "labelEn": "Velvet Gown",
        "detail": "glamorous floor-length deep red velvet evening gown"
      },
      {
        "id": "lace_midi_dress",
        "labelKo": "레이스 미디 원피스",
        "labelEn": "Lace Dress",
        "detail": "delicate white lace midi dress"
      },
      {
        "id": "wrap_dress",
        "labelKo": "패턴 랩 원피스",
        "labelEn": "Wrap Dress",
        "detail": "feminine floral silk wrap dress"
      },
      {
        "id": "power_suit_white",
        "labelKo": "화이트 파워 수트",
        "labelEn": "White Suit",
        "detail": "sharp all-white tailored power suit"
      },
      {
        "id": "sequin_dress",
        "labelKo": "스팽글 파티 드레스",
        "labelEn": "Sequin Dress",
        "detail": "shimmering silver sequin mini dress"
      }
    ]
  },
  {
    "category": "Underwear & Loungewear (언더웨어/홈웨어)",
    "options": [
      {
        "id": "lace_lingerie_set",
        "labelKo": "시스루 레이스 란제리 세트",
        "labelEn": "Lace Lingerie",
        "detail": "delicate black see-through lace lingerie set"
      },
      {
        "id": "sporty_underwear",
        "labelKo": "스포티 밴딩 언더웨어 (CK 스타일)",
        "labelEn": "Sporty Set",
        "detail": "minimalist grey cotton sporty underwear set with branded elastic band"
      },
      {
        "id": "silk_pajama",
        "labelKo": "새틴 파자마 세트",
        "labelEn": "Silk Pajamas",
        "detail": "luxurious navy blue satin pajama set"
      },
      {
        "id": "corset_top",
        "labelKo": "화이트 코르셋 탑",
        "labelEn": "Corset",
        "detail": "vintage style white lace-up corset top"
      },
      {
        "id": "bodysuit_lace",
        "labelKo": "레이스 바디수트",
        "labelEn": "Bodysuit",
        "detail": "intricate black lace bodysuit"
      },
      {
        "id": "silk_robe",
        "labelKo": "실크 로브 & 슬립",
        "labelEn": "Silk Robe",
        "detail": "elegant long silk robe over a matching slip"
      },
      {
        "id": "bralette_shorts",
        "labelKo": "브라렛 & 프릴 팬츠",
        "labelEn": "Bralette Set",
        "detail": "comfy lace bralette and ruffled sleep shorts"
      },
      {
        "id": "teddy_lingerie",
        "labelKo": "테디 란제리",
        "labelEn": "Teddy",
        "detail": "seductive sheer mesh teddy lingerie"
      },
      {
        "id": "oversized_knit_socks",
        "labelKo": "오버사이즈 니트 & 롱삭스",
        "labelEn": "Knit & Socks",
        "detail": "oversized chunky knit sweater and thigh-high wool socks"
      },
      {
        "id": "sports_bra_leggings",
        "labelKo": "심리스 스포츠 브라",
        "labelEn": "Sports Bra",
        "detail": "tight seamless sports bra and high-waist leggings"
      }
    ]
  },
  {
    "category": "Active & Swim (활동/수영복)",
    "options": [
      {
        "id": "high_cut_bikini",
        "labelKo": "하이컷 비키니",
        "labelEn": "High-cut Bikini",
        "detail": "stylish high-cut string bikini"
      },
      {
        "id": "monokini",
        "labelKo": "컷아웃 모노키니",
        "labelEn": "Monokini",
        "detail": "chic black monokini with side cut-outs"
      },
      {
        "id": "rash_guard_set",
        "labelKo": "크롭 래쉬가드 세트",
        "labelEn": "Rash Guard",
        "detail": "sporty cropped rash guard and mini bikini bottom"
      },
      {
        "id": "yoga_all_in_one",
        "labelKo": "요가 올인원 수트",
        "labelEn": "Yoga One-piece",
        "detail": "tight-fitting one-piece yoga jumpsuit"
      },
      {
        "id": "tennis_skirt_set",
        "labelKo": "테니스 셋업",
        "labelEn": "Tennis Set",
        "detail": "white tennis polo and pleated skirt"
      },
      {
        "id": "surfing_suit",
        "labelKo": "네오프렌 서핑 수트",
        "labelEn": "Surf Suit",
        "detail": "professional sleek black neoprene surfing suit"
      },
      {
        "id": "gym_set_bright",
        "labelKo": "네온 컬러 짐 웨어",
        "labelEn": "Gym Set",
        "detail": "bright neon pink seamless workout set"
      },
      {
        "id": "ballet_leotard",
        "labelKo": "발레 레오타드 & 랩스커트",
        "labelEn": "Ballet",
        "detail": "graceful ballet leotard and sheer wrap skirt"
      }
    ]
  },
  {
    "category": "Themed & Concept (컨셉/기타)",
    "options": [
      {
        "id": "modern_hanbok",
        "labelKo": "현대식 개량 한복",
        "labelEn": "Modern Hanbok",
        "detail": "stylized modern traditional Hanbok"
      },
      {
        "id": "techwear_set",
        "labelKo": "테크웨어 룩",
        "labelEn": "Techwear",
        "detail": "futuristic tactical techwear with straps"
      },
      {
        "id": "maid_outfit",
        "labelKo": "클래식 메이드복",
        "labelEn": "Maid",
        "detail": "classic black and white maid costume"
      },
      {
        "id": "cheongsam_modern",
        "labelKo": "모던 치파오",
        "labelEn": "Cheongsam",
        "detail": "elegant Consultant Cheongsam"
      },
      {
        "id": "kimono_yukata",
        "labelKo": "유카타",
        "labelEn": "Yukata",
        "detail": "traditional floral Japanese yukata"
      },
      {
        "id": "school_uniform_k",
        "labelKo": "한국식 교복",
        "labelEn": "School Uniform",
        "detail": "trendy Korean style high school uniform"
      },
      {
        "id": "cyberpunk_neon",
        "labelKo": "사이버펑크 네온 룩",
        "labelEn": "Cyberpunk",
        "detail": "neon glowing cyberpunk outfit with metallic accents"
      },
      {
        "id": "fairy_core",
        "labelKo": "페어리코어 드레스",
        "labelEn": "Fairycore",
        "detail": "ethereal layered tulle dress with floral accents"
      }
    ]
  }
];

// 9. 장소/배경 카테고리 (Locations by Category)
export const LOCATION_CATEGORIES: CategoryGroup[] = [
  {
    "category": "Indoor (실내)",
    "options": [
      {
        "id": "bedroom",
        "labelKo": "아늑한 침실",
        "labelEn": "Bedroom",
        "detail": "cozy sunlight-filled bedroom"
      },
      {
        "id": "studio",
        "labelKo": "화이트 스튜디오",
        "labelEn": "Studio",
        "detail": "minimalist white photo studio"
      },
      {
        "id": "kitchen",
        "labelKo": "모던 주방",
        "labelEn": "Kitchen",
        "detail": "modern luxury marble kitchen"
      },
      {
        "id": "library",
        "labelKo": "도서관",
        "labelEn": "Library",
        "detail": "antique grand library"
      },
      {
        "id": "elevator",
        "labelKo": "거울 엘리베이터",
        "labelEn": "Elevator",
        "detail": "luxury mirrored elevator"
      },
      {
        "id": "bathroom",
        "labelKo": "욕실/욕조",
        "labelEn": "Bathroom",
        "detail": "luxurious bathroom with marble tub"
      },
      {
        "id": "gallery",
        "labelKo": "아트 갤러리",
        "labelEn": "Gallery",
        "detail": "minimalist art gallery"
      },
      {
        "id": "cinema",
        "labelKo": "영화관",
        "labelEn": "Cinema",
        "detail": "vintage movie theater seats"
      },
      {
        "id": "gym",
        "labelKo": "헬스장",
        "labelEn": "Gym",
        "detail": "modern high-end fitness center"
      },
      {
        "id": "hotel_lobby",
        "labelKo": "호텔 로비",
        "labelEn": "Hotel",
        "detail": "grand luxury hotel lobby"
      }
    ]
  },
  {
    "category": "Urban (도시)",
    "options": [
      {
        "id": "cafe",
        "labelKo": "성수동 카페",
        "labelEn": "Cafe",
        "detail": "aesthetic industrial cafe"
      },
      {
        "id": "rooftop",
        "labelKo": "루프탑 테라스",
        "labelEn": "Rooftop",
        "detail": "city rooftop terrace at dusk"
      },
      {
        "id": "neon_street",
        "labelKo": "네온 밤거리",
        "labelEn": "Neon Street",
        "detail": "Shinjuku neon street at night"
      },
      {
        "id": "subway",
        "labelKo": "지하철역",
        "labelEn": "Subway",
        "detail": "futuristic subway station"
      },
      {
        "id": "parking_lot",
        "labelKo": "주차장",
        "labelEn": "Parking Lot",
        "detail": "moody underground parking lot"
      },
      {
        "id": "times_square",
        "labelKo": "타임스퀘어",
        "labelEn": "Times Square",
        "detail": "busy Times Square background"
      },
      {
        "id": "alleyway",
        "labelKo": "좁은 골목",
        "labelEn": "Alleyway",
        "detail": "mysterious narrow urban alleyway"
      },
      {
        "id": "bus_stop",
        "labelKo": "버스 정류장",
        "labelEn": "Bus Stop",
        "detail": "city bus stop in the rain"
      },
      {
        "id": "department",
        "labelKo": "백화점",
        "labelEn": "Mall",
        "detail": "high-end luxury shopping mall"
      },
      {
        "id": "office",
        "labelKo": "사무실",
        "labelEn": "Office",
        "detail": "high-rise corporate office"
      }
    ]
  },
  {
    "category": "Nature (자연/여행)",
    "options": [
      {
        "id": "beach",
        "labelKo": "에메랄드 해변",
        "labelEn": "Beach",
        "detail": "tropical beach at sunset"
      },
      {
        "id": "forest",
        "labelKo": "안개 낀 숲",
        "labelEn": "Forest",
        "detail": "misty pine forest"
      },
      {
        "id": "garden",
        "labelKo": "유럽식 정원",
        "labelEn": "Garden",
        "detail": "English rose garden"
      },
      {
        "id": "desert",
        "labelKo": "사구(사막)",
        "labelEn": "Desert",
        "detail": "vast golden sand dunes"
      },
      {
        "id": "yacht",
        "labelKo": "럭셔리 요트",
        "labelEn": "Yacht",
        "detail": "yacht deck in the Mediterranean"
      },
      {
        "id": "waterfall",
        "labelKo": "폭포",
        "labelEn": "Waterfall",
        "detail": "majestic jungle waterfall"
      },
      {
        "id": "mountain",
        "labelKo": "설산",
        "labelEn": "Mountain",
        "detail": "snow-capped mountain peak"
      },
      {
        "id": "meadow",
        "labelKo": "꽃밭",
        "labelEn": "Meadow",
        "detail": "vibrant flower meadow"
      },
      {
        "id": "swimming_pool",
        "labelKo": "수영장",
        "labelEn": "Pool",
        "detail": "luxury infinity pool"
      },
      {
        "id": "temple",
        "labelKo": "사찰/신사",
        "labelEn": "Temple",
        "detail": "peaceful ancient temple"
      }
    ]
  }
];

// 10. 조명 (Lighting)
export const LIGHTINGS: OptionItem[] = [
  {
    "id": "g_5pm",
    "labelKo": "오후 5시 골든아워",
    "labelEn": "Golden Hour",
    "detail": "warm 5pm golden-hour sunlight"
  },
  {
    "id": "blue_h",
    "labelKo": "블루아워",
    "labelEn": "Blue Hour",
    "detail": "cool blue-hour ambient light"
  },
  {
    "id": "m_win",
    "labelKo": "아침 창가광",
    "labelEn": "Morning Window",
    "detail": "soft morning window light"
  },
  {
    "id": "sunset",
    "labelKo": "강렬한 노을",
    "labelEn": "Sunset",
    "detail": "intense orange sunset glow"
  },
  {
    "id": "neon",
    "labelKo": "네온/사이버",
    "labelEn": "Neon",
    "detail": "vibrant neon city lights"
  },
  {
    "id": "studio_soft",
    "labelKo": "스튜디오 소프트박스",
    "labelEn": "Softbox",
    "detail": "diffused soft studio-quality illumination with seamless shadows"
  },
  {
    "id": "ring_light",
    "labelKo": "인플루언서 링라이트",
    "labelEn": "Ring Light",
    "detail": "classic circular ring-light glow"
  },
  {
    "id": "top_lit",
    "labelKo": "상단광",
    "labelEn": "Top Lit",
    "detail": "high-contrast top lighting"
  },
  {
    "id": "bokeh",
    "labelKo": "보케 배경 조명",
    "labelEn": "Bokeh",
    "detail": "dreamy blurred background lights"
  },
  {
    "id": "fluorescent",
    "labelKo": "형광등",
    "labelEn": "Fluorescent",
    "detail": "harsh industrial fluorescent light"
  },
  {
    "id": "morning_mist",
    "labelKo": "안개 자욱한 아침",
    "labelEn": "Misty",
    "detail": "diffused morning mist light"
  },
  {
    "id": "twilight",
    "labelKo": "황혼",
    "labelEn": "Twilight",
    "detail": "deep purple twilight sky light"
  },
  {
    "id": "volumetric",
    "labelKo": "빛내림 (틴들 현상)",
    "labelEn": "Volumetric Rays",
    "detail": "god rays, volumetric lighting shafts piercing through"
  },
  {
    "id": "rembrandt",
    "labelKo": "렘브란트 조명 (클래식)",
    "labelEn": "Rembrandt",
    "detail": "classic Rembrandt lighting triangle on cheek, dramatic chiaroscuro"
  },
  {
    "id": "neon_noir",
    "labelKo": "네온 느와르",
    "labelEn": "Neon Noir",
    "detail": "moody dark cinematic lighting with pink and teal neon accents"
  },
  {
    "id": "candle",
    "labelKo": "따뜻한 촛불",
    "labelEn": "Candlelight",
    "detail": "intimate warm flickering candlelight glow"
  },
  {
    "id": "biolum",
    "labelKo": "신비로운 발광 (아바타)",
    "labelEn": "Bioluminescent",
    "detail": "ethereal bioluminescent blue and purple forest glow"
  },
  {
    "id": "club_laser",
    "labelKo": "클럽 레이저",
    "labelEn": "Club Laser",
    "detail": "dynamic sharp club laser lights cutting through smoke"
  }
];

// 11. 카메라/촬영 기기 (Cameras by Mode)
export const CAMERA_MODES: CategoryGroup[] = [
  {
    "category": "Selfie Mode (직접 촬영)",
    "options": [
      {
        "id": "iphone_front",
        "labelKo": "폰카 셀카 (전면)",
        "labelEn": "iPhone Front Selfie",
        "detail": "iPhone front-facing camera selfie perspective, slightly wide angle"
      },
      {
        "id": "galaxy_flip",
        "labelKo": "제트플립 셀카 (하이앵글)",
        "labelEn": "Z Flip Selfie",
        "detail": "Samsung Galaxy Z Flip high-angle selfie shot"
      },
      {
        "id": "vlog_cam",
        "labelKo": "브이로그 캠 (광각)",
        "labelEn": "Vlog Cam",
        "detail": "Sony ZV-1 II handheld vlog style with wide lens"
      },
      {
        "id": "gimbal",
        "labelKo": "짐벌 액션캠 (다이내믹)",
        "labelEn": "Gimbal",
        "detail": "DJI Pocket 3 handheld gimbal stabilized dynamic selfie"
      },
      {
        "id": "fisheye",
        "labelKo": "어안렌즈 (Y2K 감성)",
        "labelEn": "Fisheye",
        "detail": "Y2K style fisheye lens close-up selfie"
      }
    ]
  },
  {
    "category": "Third Person (남이 찍어줌)",
    "options": [
      {
        "id": "iphone_rear",
        "labelKo": "폰카 후면 (기본)",
        "labelEn": "iPhone Rear",
        "detail": "iPhone 15 Pro rear camera, candid shot by friend"
      },
      {
        "id": "dslr_50mm",
        "labelKo": "DSLR 50mm (인물 중심)",
        "labelEn": "50mm Portrait",
        "detail": "Professional 50mm f/1.2 lens portrait"
      },
      {
        "id": "dslr_85mm",
        "labelKo": "DSLR 85mm (배경 흐림)",
        "labelEn": "85mm Telephoto",
        "detail": "Professional 85mm f/1.2 telephoto lens with heavy bokeh"
      },
      {
        "id": "film_cam",
        "labelKo": "필름 카메라 (빈티지)",
        "labelEn": "Film Camera",
        "detail": "35mm analog film camera shot by photographer"
      },
      {
        "id": "paparazzi",
        "labelKo": "파파라치 (자연스러움)",
        "labelEn": "Paparazzi",
        "detail": "Long lens paparazzi style, candid walking shot"
      },
      {
        "id": "drone",
        "labelKo": "드론 (항공샷)",
        "labelEn": "Drone",
        "detail": "High-angle drone shot capturing environment"
      }
    ]
  }
];

// 12. 필름 스톡 (Film Stock)
export const FILM_STOCKS: OptionItem[] = [
  {
    "id": "p_400",
    "labelKo": "코닥 포트라 400",
    "labelEn": "Portra 400",
    "detail": "Kodak Portra 400 look"
  },
  {
    "id": "f_400h",
    "labelKo": "후지 400H",
    "labelEn": "Fuji 400H",
    "detail": "Fuji Pro 400H aesthetic"
  },
  {
    "id": "g_200",
    "labelKo": "코닥 골드 200",
    "labelEn": "Gold 200",
    "detail": "warm Kodak Gold"
  },
  {
    "id": "instax",
    "labelKo": "인스탁스",
    "labelEn": "Instax",
    "detail": "instant film softness"
  },
  {
    "id": "cinestill",
    "labelKo": "시네스틸 800T",
    "labelEn": "Cinestill",
    "detail": "halations around lights"
  },
  {
    "id": "modern_digital",
    "labelKo": "현대적 디지털",
    "labelEn": "Digital",
    "detail": "clean modern sensor data"
  },
  {
    "id": "ilford",
    "labelKo": "일포드 흑백",
    "labelEn": "Ilford HP5",
    "detail": "classic Ilford HP5 Plus 400 black and white film grain"
  },
  {
    "id": "polaroid",
    "labelKo": "빈티지 폴라로이드",
    "labelEn": "Polaroid",
    "detail": "faded vintage Polaroid 600 tones with soft edges"
  },
  {
    "id": "ektar",
    "labelKo": "코닥 엑타 (비비드)",
    "labelEn": "Ektar 100",
    "detail": "vibrant and sharp Kodak Ektar 100 fine grain"
  },
  {
    "id": "lomo",
    "labelKo": "로모 (비네팅)",
    "labelEn": "Lomo LC-A",
    "detail": "Lomo style saturated colors with heavy vignetting"
  },
  {
    "id": "slide",
    "labelKo": "슬라이드 필름",
    "labelEn": "Slide Film",
    "detail": "high contrast positive slide film look (Velvia)"
  }
];

// 13. 피부 텍스처 (Skin Texture - 멀티 선택)
export const SKIN_TEXTURES: OptionItem[] = [
  {
    "id": "pore",
    "labelKo": "초정밀 모공",
    "labelEn": "Pores",
    "detail": "visible micro-pores"
  },
  {
    "id": "freckle",
    "labelKo": "자연스러운 주근깨",
    "labelEn": "Freckles",
    "detail": "natural freckles"
  },
  {
    "id": "glow",
    "labelKo": "건강한 광채",
    "labelEn": "Glow",
    "detail": "healthy skin glow"
  },
  {
    "id": "dewy",
    "labelKo": "물광 피부",
    "labelEn": "Dewy",
    "detail": "highly reflective dewy skin"
  },
  {
    "id": "matte",
    "labelKo": "보송한 매트",
    "labelEn": "Matte",
    "detail": "velvety matte finish"
  },
  {
    "id": "blemish",
    "labelKo": "사실적 잡티",
    "labelEn": "Blemishes",
    "detail": "subtle realistic blemishes"
  },
  {
    "id": "mole",
    "labelKo": "매력점",
    "labelEn": "Mole",
    "detail": "small beauty mark"
  },
  {
    "id": "sweat",
    "labelKo": "미세한 땀",
    "labelEn": "Sweat",
    "detail": "micro sweat beads"
  },
  {
    "id": "vein",
    "labelKo": "투명한 핏줄",
    "labelEn": "Veins",
    "detail": "faint subcutaneous veins"
  },
  {
    "id": "texture",
    "labelKo": "거친 피부 질감",
    "labelEn": "Texture",
    "detail": "raw skin texture"
  },
  {
    "id": "lines",
    "labelKo": "미세 잔주름",
    "labelEn": "Fine Lines",
    "detail": "natural fine lines"
  },
  {
    "id": "tanned",
    "labelKo": "태닝 피부",
    "labelEn": "Tanned",
    "detail": "sun-kissed tanned skin"
  },
  {
    "id": "pale",
    "labelKo": "창백한 피부",
    "labelEn": "Pale",
    "detail": "ethereal pale skin"
  },
  {
    "id": "olive",
    "labelKo": "올리브 톤",
    "labelEn": "Olive",
    "detail": "rich olive skin tone"
  },
  {
    "id": "rosy",
    "labelKo": "홍조",
    "labelEn": "Rosy",
    "detail": "natural rosy flush on cheeks"
  },
  {
    "id": "scar",
    "labelKo": "작은 흉터",
    "labelEn": "Scar",
    "detail": "subtle realistic skin scar"
  },
  {
    "id": "oily",
    "labelKo": "약간의 유분",
    "labelEn": "Oily",
    "detail": "natural oily sheen"
  },
  {
    "id": "porcelain",
    "labelKo": "도자기 피부",
    "labelEn": "Porcelain",
    "detail": "smooth porcelain-like skin"
  },
  {
    "id": "vibrant",
    "labelKo": "생기있는 피부",
    "labelEn": "Vibrant",
    "detail": "energetic healthy skin"
  },
  {
    "id": "soft_focus",
    "labelKo": "소프트 포커스",
    "labelEn": "Soft Focus",
    "detail": "gentle soft focus skin rendering"
  },
  {
    "id": "high_res",
    "labelKo": "8K 디테일",
    "labelEn": "High Res",
    "detail": "extreme 8K skin resolution"
  },
  {
    "id": "subsurface",
    "labelKo": "심층 산란",
    "labelEn": "Subsurface",
    "detail": "realistic subsurface scattering"
  },
  {
    "id": "unfiltered",
    "labelKo": "무보정 질감",
    "labelEn": "Unfiltered",
    "detail": "strictly unfiltered raw skin"
  },
  {
    "id": "velvet",
    "labelKo": "벨벳 질감",
    "labelEn": "Velvet",
    "detail": "smooth velvety skin surface"
  },
  {
    "id": "peach_fuzz",
    "labelKo": "솜털",
    "labelEn": "Peach Fuzz",
    "detail": "microscopic peach fuzz hairs"
  },
  {
    "id": "highlight",
    "labelKo": "강한 하이라이트",
    "labelEn": "Highlight",
    "detail": "pronounced skin highlights"
  },
  {
    "id": "even_tone",
    "labelKo": "균일한 톤",
    "labelEn": "Even Tone",
    "detail": "perfectly even skin tone"
  },
  {
    "id": "aged",
    "labelKo": "성숙한 질감",
    "labelEn": "Aged",
    "detail": "mature sophisticated skin texture"
  },
  {
    "id": "glossy",
    "labelKo": "광택",
    "labelEn": "Glossy",
    "detail": "shiny glossy skin finish"
  },
  {
    "id": "translucent",
    "labelKo": "반투명 피부",
    "labelEn": "Translucent",
    "detail": "delicate translucent skin look"
  }
];

// 14. 광고/협찬 유형 (Ad Types)
export const AD_TYPES: OptionItem[] = [
  {
    "id": "group_buy",
    "labelKo": "공동 구매 (Group Buy)",
    "labelEn": "Group Buy",
    "description": "인플루언서가 특정 기간 동안만 단독 할인 가격으로 제품을 판매하는 방식입니다. 주로 스토리와 프로필 링크를 활용하며 팬덤의 구매력이 중요하게 작용합니다.",
    "detail": "Limited-time exclusive discount sale driven by fandom power. Vibe: Urgent, Excited, communicating directly to fans. Pose: Showing product clearly to camera, pointing to \"Link in Bio\", holding phone and product together."
  },
  {
    "id": "seeding",
    "labelKo": "단순 협찬 (Seeding)",
    "labelEn": "Product Seeding",
    "description": "브랜드가 제품을 무상으로 제공하고, 인플루언서가 자발적으로 후기를 남기도록 유도하는 방식입니다. 대규모 광고비 집행 전 반응을 보는 용도로 쓰입니다.",
    "detail": "Casual genuine review of a gifted product. Vibe: Natural, Daily Life, Authentic. Pose: Using the product in a real-life situation, relaxed and candid."
  },
  {
    "id": "paid_partnership",
    "labelKo": "브랜디드 콘텐츠 (Paid Ad)",
    "labelEn": "Paid Partnership",
    "description": "광고주로부터 직접적인 비용을 받고 진행하는 광고입니다. 게시물 상단에 \"유료 광고 포함\" 또는 \"함께 공동 작업\" 표시가 붙는 것이 특징입니다.",
    "detail": "High-quality official advertisement. Vibe: Professional, Polished, Commercial. Pose: High-end model pose, product as the hero, perfect composition."
  },
  {
    "id": "ambassador",
    "labelKo": "앰배서더 (Ambassador)",
    "labelEn": "Brand Ambassador",
    "description": "단발성 광고가 아니라 일정 기간 브랜드의 \"얼굴\"로 활동하며 지속적으로 제품을 노출하는 장기 파트너십 형태입니다.",
    "detail": "Long-term brand face. Vibe: Iconic, Confident, Luxurious, perfectly aligned with brand identity. Pose: Signature pose, holding product like a trophy or luxury item."
  },
  {
    "id": "my_money",
    "labelKo": "내돈내산 (Genuine Review)",
    "labelEn": "My Money / Genuine Review",
    "description": "협업이나 광고비 지원 없이 인플루언서가 직접 구매하여 진정성 있게 추천하는 콘텐츠",
    "detail": "Authentic unsponsored review of a product bought with own money. Vibe: Honest, Trustworthy, \"Real talk\", emphasizing no sponsorship. Pose: Holding the product casually, perhaps showing a receipt or card, convincing gesture."
  }
];

// 15. 하루 일과 기본 시나리오 타임라인 (Daily Storyline)
export const DEFAULT_DAILY_STORYLINE: DailyStorylineItem[] = [
  {
    "id": "morning_vibes",
    "labelKo": "🌅 아침 거울 셀카",
    "labelEn": "Morning Mirror Selfie",
    "timeOrder": 1,
    "config": {
      "outfit": "luxurious navy blue satin pajama set",
      "location": "cozy sunlight-filled bedroom with a full-length vanity mirror",
      "expression": "relaxed facial muscles with a tiny smile",
      "pose": "mirror selfie holding the phone with one hand, casual bed-head",
      "lighting": "m_win",
      "hairStyle": "bun_m",
      "camera": "iphone_front",
      "filmStock": "instax",
      "skin": [
        "pore",
        "dewy"
      ]
    }
  },
  {
    "id": "cafe_vlog",
    "labelKo": "☕ 성수동 카페 브이로그",
    "labelEn": "Cafe Vlog Snap",
    "timeOrder": 2,
    "config": {
      "outfit": "oversized white crisp button-up shirt and gold accessories",
      "location": "aesthetic industrial cafe with warm ambient lighting",
      "expression": "soft gentle gaze into the flip-screen",
      "pose": "holding a compact vlog camera at arm length with a flip-screen visible",
      "lighting": "g_5pm",
      "hairStyle": "l_str_b",
      "camera": "vlog_cam",
      "filmStock": "f_400h",
      "skin": [
        "glow",
        "rosy"
      ]
    }
  },
  {
    "id": "gym_routine",
    "labelKo": "💪 오운완 짐벌 셀카",
    "labelEn": "Gym Routine POV",
    "timeOrder": 3,
    "config": {
      "outfit": "tight seamless sports bra and high-waist leggings",
      "location": "modern high-end fitness center with mirrors",
      "expression": "strong determined gaze",
      "pose": "holding a gimbal stabilizer for a steady walking selfie, dynamic angle",
      "lighting": "top_lit",
      "hairStyle": "ponytail_h",
      "camera": "gimbal",
      "filmStock": "modern_digital",
      "skin": [
        "sweat",
        "texture"
      ]
    }
  },
  {
    "id": "elevator_ootd",
    "labelKo": "🏢 엘리베이터 OOTD",
    "labelEn": "Elevator Mirror Selfie",
    "timeOrder": 4,
    "config": {
      "outfit": "chic mini skirt with an oversized boxy blazer and designer bag",
      "location": "luxury mirrored elevator with soft bright lighting",
      "expression": "cool neutral chic expression",
      "pose": "mirror selfie leaning against the elevator wall, looking at the phone screen",
      "lighting": "studio_soft",
      "hairStyle": "half_up",
      "camera": "iphone_front",
      "filmStock": "modern_digital",
      "skin": [
        "pore",
        "matte"
      ]
    }
  },
  {
    "id": "rooftop_sunset",
    "labelKo": "🌇 루프탑 선셋 브이로그",
    "labelEn": "Rooftop Sunset Vlog",
    "timeOrder": 5,
    "config": {
      "outfit": "feminine floral silk wrap dress",
      "location": "city rooftop terrace at dusk with golden city lights",
      "expression": "bright radiant smile towards the vlog camera",
      "pose": "holding a vlog camera high for a sunset background selfie, flip-screen visible",
      "lighting": "g_5pm",
      "hairStyle": "l_wave_br",
      "camera": "vlog_cam",
      "filmStock": "f_400h",
      "skin": [
        "glow",
        "highlight"
      ]
    }
  }
];

// 16. K-인플루언서 대표 20대 일과 프리셋 (주사위 랜덤 버튼용)
export const RANDOM_ROUTINE_PRESETS = [
  "성공한 CEO 인플루언서의 바쁜 월요일",
  "럭셔리 리조트에서의 힐링 주말",
  "에너지 넘치는 운동과 웰니스 루틴",
  "비 오는 날 아늑한 홈바디 감성",
  "전문 스튜디오 화보 촬영 날",
  "성수동 힙한 카페 투어",
  "K-POP 아이돌 연습생의 하루",
  "강남에서의 화려한 파티 나이트",
  "제주도 푸른 바다 여행 브이로그",
  "한강 공원 피크닉과 치맥 타임",
  "북촌 한옥마을에서의 전통 체험",
  "홍대 거리 패션 스냅 촬영",
  "부산 해운대 요트 투어",
  "도산공원 명품관 쇼핑 브이로그",
  "따뜻한 봄날 벚꽃 구경 데이트",
  "가을 단풍 캠핑 감성",
  "겨울 스키장 리조트 여행",
  "힙지로(을지로) 레트로 감성 투어",
  "익선동 골목길 데이트 코스",
  "호텔 애프터눈 티 세트 즐기기"
];

// 17. 화질 및 해상도
export const QUALITY_OPTIONS = [
  { id: "1K", labelKo: "1K (표준 고화질)", labelEn: "1K" },
  { id: "2K", labelKo: "2K (초고화질 디테일)", labelEn: "2K" }
];

export const ASPECT_RATIO_OPTIONS = [
  { id: "1:1", labelKo: "1:1 정사각형 (인스타 피드)", labelEn: "1:1 Square" },
  { id: "9:16", labelKo: "9:16 세로형 (릴스/스토리)", labelEn: "9:16 Portrait" },
  { id: "16:9", labelKo: "16:9 가로형 (유튜브/시네마틱)", labelEn: "16:9 Landscape" },
  { id: "3:4", labelKo: "3:4 클래식 화보", labelEn: "3:4 Classic" }
];

// 18. 마스터 네거티브 프롬프트
export const MASTER_NEGATIVE_PROMPT = "Exclude any readable text, signage, logos, posters, labels, watermarks; NO PHOTOGRAPHIC EQUIPMENT, NO LIGHT STANDS, NO SOFTBOX HARDWARE, NO STUDIO GEAR, NO VISIBLE CAMERA LENSES OR LIGHTING RIGS; keep realistic pores and subtle imperfections; avoid perfect symmetry; natural shadows only; smooth highlight roll-off; subtle film grain; no HDR, no over-sharpening, no CGI look, no beauty filter, no plastic skin.";
