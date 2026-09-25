"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Wand2, Sparkles, ArrowRight, RefreshCw, AlertCircle, Copy, Check, 
  Camera, Box, Palette, Layers, Zap, Tag, RotateCcw,
  Feather, Brush, Film, Smile, PenTool, Building2, Flame, LayoutGrid, FileText
} from "lucide-react";

interface Step1PromptEnhancerProps {
  onApplyPrompt: (prompt: string, negativePrompt?: string) => void;
}

const PRESET_STYLES = [
  { id: "photorealistic", name: "실사 포토리얼리즘", icon: Camera, desc: "8K 카메라인 렌즈 & 조명 디테일 극대화" },
  { id: "3d_digital", name: "3D 디지털 아트", icon: Box, desc: "Cinema 4D / Octane 렌더 픽사 3D 스타일" },
  { id: "artistic_editorial", name: "감성 패션 화보", icon: Palette, desc: "Vogue 룩북 스타일 패션/인물 화보" },
  { id: "vector_illustration", name: "벡터 일러스트", icon: Layers, desc: "SVG 그래픽 & 깔끔한 그래픽 디자인" },
  { id: "cyberpunk_neon", name: "사이버펑크 네온", icon: Zap, desc: "네온 라이팅 & 미래도시 신비로운 야경" },
  { id: "oriental_ink", name: "동양 수묵화", icon: Feather, desc: "한지 질감 & 먹선 수묵 채색 미학" },
  { id: "watercolor_pastel", name: "수채화 파스텔", icon: Brush, desc: "투명한 파스텔 톤 동화 감성 수채화" },
  { id: "cinematic_film", name: "35mm 필름", icon: Film, desc: "Kodak Portra 아날로그 필름 빈티지 감성" },
  { id: "claymation", name: "클레이 스톱모션", icon: Smile, desc: "지점토 핸드메이드 스톱모션 미니어처" },
  { id: "webtoon_lineart", name: "웹툰 라인아트", icon: PenTool, desc: "명확한 먹선 아웃라인 & 웹툰 스타일" },
  { id: "architectural", name: "건축 & 인테리어", icon: Building2, desc: "ArchDaily 스타일 공간 렌더링 & 빛 조화" },
  { id: "dark_fantasy", name: "다크 판타지", icon: Flame, desc: "웅장한 마법 광원 & 고딕 콘셉트 아트" },
  { id: "minimal_flat", name: "미니멀 플랫 아트", icon: LayoutGrid, desc: "세련된 칼라 블록 & 모던 포스터 디자인" },
];

const STYLE_QUICK_TAGS_MAP: Record<string, Array<{ label: string; prompt: string }>> = {
  photorealistic: [
    { label: "#한옥카페 인물", prompt: "서울 경복궁 한옥 카페에서 노트북으로 작업 중인 한복을 입은 20대 한국 여성, 따뜻한 오후 햇살" },
    { label: "#제주 감성 풍경", prompt: "제주도 해변 언덕 위 해질녘 노을빛 오션뷰 한옥 숙소와 감성적인 풍경" },
    { label: "#스튜디오 인물 컷", prompt: "도도한 시선의 20대 한국 남성 모델, 은은한 스튜디오 링 라이트 조명과 85mm 인물 포트레이트" },
    { label: "#비오는 서울야경", prompt: "비에 젖은 서울 강남대로 신호등 불빛과 우산을 쓴 사람들의 몽환적인 포토리얼 포트레이트" },
    { label: "#봄날 벚꽃 피크닉", prompt: "벚꽃이 만개한 한강 공원 돗자리 위에서 웃고 있는 한국 젊은 남녀 커플 피크닉" },
    { label: "#커피 브루잉 디테일", prompt: "핸드드립 커피가 유리 드립서버로 떨어지는 순간의 극사실적 클로즈업 사진" },
    { label: "#모던 럭셔리 세단", prompt: "어두운 터널 속을 질주하는 블랙 럭셔리 스포츠 세단의 사이드 뷰 헤드라이트 궤적" },
    { label: "#가을 산책길 인물", prompt: "가을 단풍 숲길을 걷는 갈색 코트 차림의 한국 여성, 바스락거리는 낙엽 질감" },
    { label: "#럭셔리 워치 화보", prompt: "고급 매트 블랙 배경 위 실버 기계식 시계의 정교한 톱니바퀴 디테일 컷" },
    { label: "#해질녘 파도 서핑", prompt: "해질녘 분홍빛 바다 파도를 타는 서퍼의 다이내믹한 8K 순간 포착" },
  ],
  "3d_digital": [
    { label: "#3D 마케팅 아이콘", prompt: "혁신적인 스마트폰과 신용카드가 떠있는 3D 미니멀 클레이 아트 마케팅 아이콘 세트" },
    { label: "#픽사풍 귀여운 캐릭터", prompt: "동글동글한 안경을 쓴 귀여운 3D 토끼 탐정 캐릭터, Pixar 애니메이션 렌더링" },
    { label: "#미래지향 3D 오브젝트", prompt: "투명한 글래스모피즘 큐브와 입체 가상화폐 3D 디스플레이 렌더" },
    { label: "#3D 장난감 로봇", prompt: "귀여운 등불을 든 미니멀 3D 차콜 장난감 로봇 캐릭터" },
    { label: "#입체 퐁퐁이 아일랜드", prompt: "구름 위에 떠있는 아기자기한 3D 장난감 마을과 무지개 동산" },
    { label: "#3D 금융 백그라운드", prompt: "파스텔 톤 동전과 황금 열쇠가 날아다니는 금융 앱 3D 일러스트" },
    { label: "#3D 귀여운 디저트", prompt: "딸기 생크림 케이크와 알록달록 마카롱이 떠있는 3D 렌더링" },
    { label: "#3D 우주선 비행", prompt: "알록달록한 아기 우주선이 반짝이는 별들 사이를 누비는 3D 그래픽" },
    { label: "#3D 스마트 홈", prompt: "미니멀 아이콘 형태의 스마트 TV와 온도조절기가 조화를 이루는 3D 아트" },
    { label: "#3D 동물 동화 캐릭터", prompt: "책 읽는 귀여운 3D 아기 곰돌이 캐릭터, 부드러운 3D 질감" },
  ],
  artistic_editorial: [
    { label: "#패션 룩북 화보", prompt: "모던한 미니멀 백그라운드 스튜디오에서 봄 신상 트렌치코트를 입은 모델의 패션 잡지 화보" },
    { label: "#보그 흑백 세련미", prompt: "Vogue 룩북 스타일, 드라마틱한 음영 대비가 돋보이는 모던 하이패션 포즈의 여성 모델" },
    { label: "#하이엔드 주얼리 컷", prompt: "고급스러운 아크릴 무대 위 다이아몬드 목걸이와 패션 잡지 커버컷 조명 연출" },
    { label: "#네온 스트리트 패션", prompt: "밤거리 도심 속 힙한 스트릿웨어와 선글라스를 착용한 모델의 감성 화보" },
    { label: "#미니멀 린넨 패션", prompt: "베이지 린넨 수트를 입은 한국 남성 모델의 차분하고 감성적인 인물 스냅" },
    { label: "#레트로 엘레강스", prompt: "70년대 클래식 무드의 드레스를 입은 모델과 레트로 가구 조화" },
    { label: "#컬러 블록 에디토리얼", prompt: "강렬한 레드와 블루 배경이 대조를 이루는 아방가르드 패션 화보" },
    { label: "#하이패션 뷰티 포트레이트", prompt: "글로시한 입술과 매끈한 피부 디테일이 강조된 뷰티 매거진 커버 컷" },
    { label: "#스튜디오 그림자 예술", prompt: "블라인드 사이로 새어 나오는 슬릿 조명과 인물의 감각적인 실루엣" },
    { label: "#실크 드레스 댄스", prompt: "바람에 흩날리는 붉은 실크 드레스를 입고 무용하는 모델의 역동적인 컷" },
  ],
  vector_illustration: [
    { label: "#벡터 제품 일러스트", prompt: "친환경 오가닉 코스메틱 화장품 병과 나뭇잎 요소가 조화로운 벡터 평면 일러스트레이션" },
    { label: "#IT 스타트업 캐릭터", prompt: "노트북으로 코딩 중인 젊은 개발자 팀, 선명한 아웃라인과 모던 벡터 스타일" },
    { label: "#도시 생활 플랫 카드", prompt: "커피를 들고 도심 공원을 산책하는 사람들의 세련된 flat vector 그래픽" },
    { label: "#여행 가방 벡터 아트", prompt: "세계 명소 라벨이 붙은 빈티지 여행 가방과 항공기 벡터 아이콘" },
    { label: "#헬스 피트니스 벡터", prompt: "아령을 들고 운동하는 사람들의 밝고 건강한 평면 벡터 일러스트" },
    { label: "#스마트시티 벡터", prompt: "자율주행 차와 태양광 판넬이 어우러진 친환경 스마트시티 벡터 포스터" },
    { label: "#배달 라이더 벡터", prompt: "오토바이를 타고 도시를 달리는 친근한 캐릭터 벡터 일러스트" },
    { label: "#커피 브루잉 플랫아트", prompt: "원두와 드립포트가 정갈하게 배치된 모던 카페 벡터 그래픽" },
    { label: "#음악 바이닐 벡터 아트", prompt: "LP판과 헤드폰이 아날로그 감성으로 배치된 팝아트 벡터" },
    { label: "#에코 그린 벡터", prompt: "지구를 품고 있는 나무와 나뭇잎들의 심플한 환경 캠페인 벡터" },
  ],
  cyberpunk_neon: [
    { label: "#사이버펑크 서울야경", prompt: "네온사인 가득한 비 내리는 사이버펑크 서울 야경 속 트렌디한 한국 여성의 몽환적인 포트레이트" },
    { label: "#네온 라이더 스피드", prompt: "미래도시 네온 고속도로를 질주하는 사이버펑크 오토바이 라이더와 청색/자홍색 이펙트" },
    { label: "#미래형 해커 로봇", prompt: "신비로운 홀로그램 인터페이스를 조작하는 미래형 안드로이드 해커" },
    { label: "#사이버펑크 차이나타운", prompt: "붉은 네온 등불과 한자가 반짝이는 미래 도시 골목의 고양이 포트레이트" },
    { label: "#네온 고글 사이보그", prompt: "투명 네온 고글을 쓰고 사이버네틱 임플란트를 이식한 힙합 아티스트" },
    { label: "#미래형 메카 기체", prompt: "안개 속 웅장하게 서 있는 거대 사이버펑크 전투 메카 로봇" },
    { label: "#사이버펑크 술집 야경", prompt: "네온 조명 아래 홀로그램 술잔을 기울이는 사막의 여전사" },
    { label: "#네온 비행 자동차", prompt: "초고층 빌딩 숲 사이를 누비는 붉은색 광원의 비행 자동차" },
    { label: "#사이버펑크 브릿지", prompt: "자홍빛 안개 속에 휩싸인 미래 도시의 아치형 네온 대교" },
    { label: "#네온 닌자 아웃라인", prompt: "빛나는 사쿠라 네온 검을 든 스텔스 사이버 닌자" },
  ],
  oriental_ink: [
    { label: "#수묵 한복 포트레이트", prompt: "은은한 수묵 먹선과 한지 질감 속 아련한 분위기의 한복 입은 선비와 매화 가지" },
    { label: "#경복궁 수묵 산수화", prompt: "안개 낀 아침 삼각산과 경복궁 대웅전이 먹선의 짙고 옅음으로 그려진 동양 수묵화" },
    { label: "#달빛 매화 대나무", prompt: "둥근 은달빛 아래 대나무 잎과 흰 매화가 번진 조선 전통 수묵 채색화" },
    { label: "#수묵 호랑이 기상", prompt: "용맹한 기세로 호효하는 호랑이의 기품 있는 먹선 수묵 드로잉" },
    { label: "#한옥과 소나무 산수", prompt: "구름에 휩싸인 소나무 언덕 위 아담한 한옥 기와집의 은은한 수묵화" },
    { label: "#수묵 연꽃 금붕어", prompt: "맑은 묵향 연못 속에 유유히 헤엄치는 붉은 금붕어와 연꽃 수묵 채색" },
    { label: "#풍류 가야금 선비", prompt: "계곡 정자 아래 가야금을 연주하는 선비의 운치 있는 동양화" },
    { label: "#수묵 학과 일출", prompt: "붉은 아침 해를 향해 날아오르는 두루미(학)의 고결한 먹선 붓터치" },
    { label: "#비 내리는 한양 수묵", prompt: "먹구름 낀 옛 한양 거리를 삿갓을 쓰고 걷는 나그네의 수묵 감성" },
    { label: "#수묵 산사 안개", prompt: "겹겹이 싸인 청산 속 고즈넉한 산사의 종소리가 느껴지는 수묵 진경산수화" },
  ],
  watercolor_pastel: [
    { label: "#수채화 파스텔 동화", prompt: "해질녘 분홍빛 노을 하늘 아래 동화 속 작은 목조 오두막과 꽃밭 풍경" },
    { label: "#수채화 고양이 감성", prompt: "창가 햇살 아래 졸고 있는 몽환적인 털 질감의 수채화 고양이 일러스트" },
    { label: "#파스텔 봄날 꽃길", prompt: "벚꽃잎이 날리는 시골 오솔길을 자전거로 달리는 아이의 맑은 수채화" },
    { label: "#파스텔 유니콘 꿈", prompt: "민트빛 하늘 속 은은한 수채화 물감이 번진 몽환적인 유니콘 동화" },
    { label: "#수채화 수국 정원", prompt: "보랏빛 수국 꽃잎에 물방울이 촉촉히 맺힌 투명한 수채화 화법" },
    { label: "#파스텔 바닷가 마을", prompt: "에메랄드 빛 바다와 알록달록한 파스텔 지붕이 어우러진 해안 마을" },
    { label: "#수채화 커피 한 잔", prompt: "김이 모락모락 나는 따뜻한 찻잔과 수채화 기법의 브런치 풍경" },
    { label: "#파스텔 밤하늘 은하수", prompt: "밤하늘 가득 반짝이는 파스텔 오로라와 은하수 아래 캠핑 텐트" },
    { label: "#수채화 아기 사슴", prompt: "숲속 들꽃 사이를 누비는 아기 사슴의 부드럽고 따스한 수채화" },
    { label: "#파스텔 빗방울 우산", prompt: "노란 우산을 쓴 소녀의 따스하고 감성적인 비 오는 날 수채화" },
  ],
  cinematic_film: [
    { label: "#35mm 빈티지 카페", prompt: "80년대 골목길 카페 야외 테라스에서 커피를 마시는 감성적인 빈티지 인물 컷" },
    { label: "#레트로 야간 스냅", prompt: "Kodak Portra 400 필름 특유의 따뜻한 입자와 비 오는 밤 도쿄 골목 네온 스냅" },
    { label: "#여름 바다 필름 감성", prompt: "햇빛이 수면에 반사되는 청량한 여름 바닷가와 90년대 필름 카메라 질감" },
    { label: "#레트로 올드카 여행", prompt: "노을빛 사막 도로 위에 멈춰선 클래식 올드카와 여행자의 필름 사진" },
    { label: "#70년대 아날로그 레코드", prompt: "아날로그 LP판을 들고 미소 짓는 뮤지션의 따스한 35mm 레트로 컷" },
    { label: "#필름 빛갈라짐 인물", prompt: "숲속 틈새 햇살 아래 눈을 감은 인물의 오렌지빛 필름 플레어" },
    { label: "#레트로 레스토랑 데이트", prompt: "네온 글라스와 빈티지 소파가 어우러진 80년대 레스토랑의 인물 사진" },
    { label: "#아날로그 기차 창가", prompt: "달리는 기차 창가 밖 들판을 바라보는 인물의 아련한 필름 감성" },
    { label: "#35mm 흑백 포토", prompt: "강렬한 그레인과 거친 질감이 살이있는 빈티지 흑백 스트리트 포토" },
    { label: "#레트로 레코드 샵", prompt: "수많은 레코드판이 꽂힌 아날로그 상점에서 음악을 듣는 인물 컷" },
  ],
  claymation: [
    { label: "#지점토 귀여운 공룡", prompt: "손맛 느껴지는 울퉁불퉁 지점토 질감의 알록달록 아기 공룡 스톱모션 인형" },
    { label: "#클레이 베이커리 빵", prompt: "따뜻한 오븐 속 귀여운 표정이 그려진 클레이 빵과 미니어처 주방" },
    { label: "#클레이 아기자기 마을", prompt: "아기자기한 클레이 스톱모션 미니어처 마을과 알록달록 자동차" },
    { label: "#지점토 우주 비행사", prompt: "둥글둥글한 지점토 우주복을 입은 아기 우주 비행사 인형" },
    { label: "#클레이 펭귄 가족", prompt: "남극 얼음판 위에서 옹기종기 모여있는 클레이 펭귄 캐릭터들" },
    { label: "#클레이 햄버거 세트", prompt: "미니어처 지점토 치즈버거와 감자튀김 스톱모션 푸드 소품" },
    { label: "#클레이 숲속 버섯 집", prompt: "알록달록한 지점토 버섯 지붕 집과 클레이 아기 요정" },
    { label: "#클레이 몬스터 밴드", prompt: "기타와 드럼을 연주하는 귀여운 클레이 몬스터 음악 밴드" },
    { label: "#클레이 해적선 항해", prompt: "아기자기한 지점토 장난감 해적선과 손맛 넘치는 바다 파도" },
    { label: "#클레이 크리스마스 트리", prompt: "반짝이는 방울과 눈사람 지점토 인형이 달린 트리 스톱모션" },
  ],
  webtoon_lineart: [
    { label: "#웹툰 주인공 액션", prompt: "강렬한 먹선 아웃라인과 셀 셰이딩이 돋보이는 한국 판타지 웹툰 주인공 소환 씬" },
    { label: "#학원물 웹툰 로맨스", prompt: "학교 복도 창가 햇살 아래 서로 바라보는 고등학생 남녀 웹툰 명장면" },
    { label: "#도시 몬스터 웹툰", prompt: "서울 강남역 한복판에 나타난 거대 몬스터와 이에 맞서는 웹툰 히어로" },
    { label: "#무협 웹툰 검사", prompt: "바람에 도포 자락이 날리는 조선 판타지 무협 웹툰의 검객" },
    { label: "#사이버 헌터 웹툰", prompt: "게이트가 열린 현대 도시에서 각성한 S급 헌터의 웹툰 일러스트" },
    { label: "#로맨스 판타지 영애", prompt: "화려한 영애 드레스를 입은 로맨스 판타지 웹툰 여주인공" },
    { label: "#음식 웹툰 먹방", prompt: "김이 모락모락 나는 떡볶이와 튀김이 먹음직스럽게 그려진 웹툰 컷" },
    { label: "#스포츠 웹툰 슬램", prompt: "농구 코트 위에서 역동적으로 슛을 던지는 스포츠 웹툰 명장면" },
    { label: "#일상 인디 웹툰", prompt: "자취방에서 반려묘와 누워있는 소소한 일상 한국 웹툰 일러스트" },
    { label: "#스릴러 웹툰 인물", prompt: "어두운 조명 속 차가운 눈빛을 한 추리 웹툰 주인공 포트레이트" },
  ],
  architectural: [
    { label: "#건축 인테리어", prompt: "통창 너머로 숲이 펼쳐지는 미니멀 우드 앤 콘크리트 고급 거실 인테리어 디자인" },
    { label: "#모던 단독주택 외관", prompt: "ArchDaily 잡지 커버 스타일, 자연광과 노출 콘크리트 조화의 미니멀 모던 주택" },
    { label: "#호텔 리조트 수영장", prompt: "발리 리조트풍 인피니티 풀과 해질녘 오렌지빛 라이팅 디자인 공간" },
    { label: "#북유럽 미니멀 주방", prompt: "대리석 아일랜드 식탁과 따뜻한 펜던트 조명이 돋보이는 모던 키친" },
    { label: "#공중정원 온실 스튜디오", prompt: "유리 온실 구조 속 수목이 가득한 생태 친화적 건축 오피스" },
    { label: "#자연광 테라스 서재", prompt: "나무 서가와 편안한 1인용 소파가 자연광을 받으며 놓인 서재" },
    { label: "#도심 펜트하우스 야경", prompt: "통유리창으로 도심 야경이 한눈에 들어오는 고급 펜트하우스 침실" },
    { label: "#일본식 미니멀 중정", prompt: "단풍나무와 자갈 정원이 바라보이는 정갈한 지다미 스타일 한옥/와시츠" },
    { label: "#미래형 갤러리 미술관", prompt: "곡선형 콘크리트 벽면과 천장 천창 라이팅이 예술적인 현대 미술관" },
    { label: "#스파 바이오필릭 바스", prompt: "자연 석재 욕조와 대나무 숲 뷰가 차분함을 주는 바이오필릭 욕실" },
  ],
  dark_fantasy: [
    { label: "#다크판타지 웅장함", prompt: "어둡고 신비로운 고성 타워 위에서 붉은 마법 룬을 시전하는 검은 로브의 마법사" },
    { label: "#심연의 고딕 기사", prompt: "자색 안개 가득한 폐허 성당 앞 거대한 대검을 든 고딕 다크 판타지 기사" },
    { label: "#용의 둥지 수호자", prompt: "용암이 흐르는 어두운 동굴 속 붉은 눈의 용과 고대 성물" },
    { label: "#해골 왕좌 군주", prompt: "해골과 뼈로 조각된 고딕 왕좌에 앉아있는 안개 속 불사의 왕" },
    { label: "#저주받은 숲 요정", prompt: "이끼 낀 거대한 고목과 신비로운 푸른 빛버섯이 자라는 잔혹 동화 숲" },
    { label: "#타락한 천사의 날개", prompt: "붉은 핏빛 달 아래 흑색 날개를 펼치고 있는 타락 천사" },
    { label: "#네크로맨서 소환", prompt: "어두운 지하 묘지에서 푸른 영혼의 불꽃을 소환하는 주술사" },
    { label: "#고딕 뱀파이어 성", prompt: "벼락이 치는 암벽 산 정상 위에 솟아있는 장엄한 고딕 뱀파이어 성" },
    { label: "#마법 연금술 랩", prompt: "보랏빛 물약이 끓고 고대 마도서가 넘겨지는 비밀 연금술사의 방" },
    { label: "#룬 문자 마법검", prompt: "차가운 서리가 내린 검신 위에 룬 문자가 빛나는 신화 속의 검" },
  ],
  minimal_flat: [
    { label: "#미니멀 여행 포스터", prompt: "제주 돌하르방과 조용한 해변을 감각적인 컬러 블록으로 표현한 모던 아트 포스터" },
    { label: "#플랫 팝아트 인물", prompt: "강렬한 비비드 컬러와 단순한 기하학 도형으로 디자인된 인물 포스터" },
    { label: "#모던 미드센추리 가구", prompt: "60년대 미드센추리 모던 가구와 플랫 그래픽 일러스트" },
    { label: "#음악 바이닐 그래픽", prompt: "LP 플레이어와 턴테이블이 강렬한 컬러 콘트라스트로 표현된 플랫 그래픽" },
    { label: "#커피 모노톤 일러스트", prompt: "모노톤 브라운 톤의 그래픽 도형으로 구성된 모던 커피 브랜딩 포스터" },
    { label: "#시티 브리즈 플랫", prompt: "선글라스를 끼고 야자수 도로를 달리는 자동차의 모던 미니멀 플랫 아트" },
    { label: "#스마트 파이낸스 일러스트", prompt: "파스텔 계열의 평면 기하학 도형으로 구성된 스마트 금융 아트" },
    { label: "#네이처 가드닝 아트", prompt: "가위와 화분이 아기자기한 벡터 평면으로 배치된 모던 가드닝 포스터" },
    { label: "#스페이스 우주 플랫", prompt: "신비로운 원형 행성들과 은하수가 단순한 선과 색면으로 구성된 우주 아트" },
    { label: "#북커버 미니멀 그래픽", prompt: "세련된 타이포그래피와 대담한 비대칭 컬러 면 분할로 이루어진 책 커버 디자인" },
  ],
};

export function Step1PromptEnhancer({ onApplyPrompt }: Step1PromptEnhancerProps) {
  const [idea, setIdea] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("photorealistic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    enhancedPrompt: string;
    styleNotes: string;
    negativePrompt: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [dbPrompts, setDbPrompts] = useState<Array<{ label: string; prompt: string }>>([]);

  useEffect(() => {
    async function loadDbPrompts() {
      try {
        const res = await fetch(`/api/prompts?style_id=${selectedPreset}`);
        if (res.ok) {
          const data = await res.json();
          if (data.prompts && data.prompts.length > 0) {
            setDbPrompts(data.prompts.map((p: any) => ({ label: p.label, prompt: p.prompt })));
            return;
          }
        }
      } catch (err) {
        // Fallback to static map
      }
      setDbPrompts([]);
    }
    loadDbPrompts();
  }, [selectedPreset]);

  const activeStyleInfo = PRESET_STYLES.find((s) => s.id === selectedPreset) || PRESET_STYLES[0];
  const fallbackTags = STYLE_QUICK_TAGS_MAP[selectedPreset] || STYLE_QUICK_TAGS_MAP.photorealistic;
  const activeTags = dbPrompts.length > 0 ? dbPrompts : fallbackTags;

  const handleEnhance = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, presetStyle: selectedPreset })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "프롬프트 최적화 생성에 실패했습니다.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.enhancedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectQuickTag = (tagPrompt: string) => {
    setIdea(tagPrompt);
  };

  return (
    <div id="step1-container" className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-7 backdrop-blur-xl space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 px-3.5 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0 whitespace-nowrap">
            <span className="text-sm font-bold">Step 1</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-amber-400" />
              AI 프롬프트 최적화 생성기 (UI/UX 고도화)
            </h2>
            <p className="text-sm text-zinc-300 mt-0.5">
              원하는 아이디어를 자유롭게 입력하거나 추천 태그를 클릭해보세요. AI가 최적의 영문 프롬프트를 만듭니다.
            </p>
          </div>
        </div>

        <Link
          href="/prompts"
          className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 transition-colors shrink-0 shadow-sm shadow-amber-500/10"
        >
          <FileText className="h-4 w-4 text-amber-400" />
          <span>📝 프롬프트 게시판 관리 (추가·수정·삭제)</span>
        </Link>
      </div>

      {/* Preset Style Selector */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-200">화풍 / 화법 프리셋 선택</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {PRESET_STYLES.map((st) => {
            const IconComponent = st.icon;
            const isSelected = selectedPreset === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedPreset(st.id)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <IconComponent className={`h-4 w-4 ${isSelected ? "text-amber-400" : "text-zinc-400"}`} />
                  <span className="text-sm font-bold text-white">{st.name}</span>
                </div>
                <span className="text-xs text-zinc-400 line-clamp-1">{st.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Quick Idea Recommendation Tags based on selected style */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
          <Tag className="h-3.5 w-3.5 text-amber-400" />
          <span><strong className="text-amber-400 font-extrabold">[{activeStyleInfo.name}]</strong> 전용 추천 아이디어 (클릭 시 자동 입력):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTags.map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectQuickTag(tag.prompt)}
              className="rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors"
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="예: 서울 경복궁 한옥 카페에서 노트북으로 작업 중인 한복을 입은 한국 여성, 따뜻한 오후 햇살"
          rows={3}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-base text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none leading-relaxed"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          {(() => {
            const hasContent = Boolean(idea.trim() || result);
            return (
              <button
                type="button"
                disabled={!hasContent}
                onClick={() => {
                  setIdea("");
                  setResult(null);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 px-8 py-3.5 text-sm font-bold border border-amber-400/50 shadow-lg shadow-amber-500/20 transition-all active:scale-95 min-w-[180px] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-700 disabled:shadow-none disabled:active:scale-100"
                title={hasContent ? "입력된 아이디어를 초기화합니다" : "초기화할 내용이 없습니다"}
              >
                <RotateCcw className="h-4 w-4" />
                <span>프롬프트 초기화 (Reset)</span>
              </button>
            );
          })()}

          <button
            onClick={handleEnhance}
            disabled={loading || !idea.trim()}
            className="flex items-center gap-2.5 rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
          >
            {loading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>AI 마스터 분석 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 fill-zinc-950" />
                <span>마스터 프롬프트 생성</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3.5 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
            <span className="font-bold text-amber-300 text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              최적화 생성된 영문 프롬프트
            </span>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-sm text-zinc-200 hover:text-white bg-zinc-900 px-3.5 py-1.5 rounded-lg border border-zinc-700 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "복사됨" : "복사하기"}
              </button>
              <button
                onClick={() => onApplyPrompt(result.enhancedPrompt, result.negativePrompt)}
                className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-6 py-3 text-sm font-black text-zinc-950 hover:from-amber-300 hover:to-yellow-300 transition-all shadow-xl shadow-amber-500/40 ring-4 ring-amber-400/50 hover:ring-amber-300 transform hover:scale-[1.03] active:scale-95 animate-pulse cursor-pointer"
              >
                <span>Step 2에 적용하기 (1-Click)</span>
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </button>
            </div>
          </div>

          <p className="font-mono text-base text-zinc-100 leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-800 select-all">
            {result.enhancedPrompt}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-zinc-300 pt-1">
            <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
              <span className="font-bold text-amber-400">💡 적용된 연출 노하우:</span> {result.styleNotes}
            </div>
            {result.negativePrompt && (
              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
                <span className="font-bold text-red-400">🚫 부정 프롬프트:</span> {result.negativePrompt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
