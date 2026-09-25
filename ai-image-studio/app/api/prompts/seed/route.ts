import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SEED_PROMPTS_DATA: Array<{ style_id: string; label: string; prompt: string; display_order: number }> = [
  // 1. photorealistic (실사 포토리얼리즘 - 10개)
  { style_id: "photorealistic", label: "#한옥카페 인물", prompt: "서울 경복궁 한옥 카페에서 노트북으로 작업 중인 한복을 입은 20대 한국 여성, 따뜻한 오후 햇살", display_order: 1 },
  { style_id: "photorealistic", label: "#제주 감성 풍경", prompt: "제주도 해변 언덕 위 해질녘 노을빛 오션뷰 한옥 숙소와 감성적인 풍경", display_order: 2 },
  { style_id: "photorealistic", label: "#스튜디오 인물 컷", prompt: "도도한 시선의 20대 한국 남성 모델, 은은한 스튜디오 링 라이트 조명과 85mm 인물 포트레이트", display_order: 3 },
  { style_id: "photorealistic", label: "#비오는 서울야경", prompt: "비에 젖은 서울 강남대로 신호등 불빛과 우산을 쓴 사람들의 몽환적인 포토리얼 포트레이트", display_order: 4 },
  { style_id: "photorealistic", label: "#봄날 벚꽃 피크닉", prompt: "벚꽃이 만개한 한강 공원 돗자리 위에서 웃고 있는 한국 젊은 남녀 커플 피크닉", display_order: 5 },
  { style_id: "photorealistic", label: "#커피 브루잉 디테일", prompt: "핸드드립 커피가 유리 드립서버로 떨어지는 순간의 극사실적 클로즈업 사진", display_order: 6 },
  { style_id: "photorealistic", label: "#모던 럭셔리 세단", prompt: "어두운 터널 속을 질주하는 블랙 럭셔리 스포츠 세단의 사이드 뷰 헤드라이트 궤적", display_order: 7 },
  { style_id: "photorealistic", label: "#가을 산책길 인물", prompt: "가을 단풍 숲길을 걷는 갈색 코트 차림의 한국 여성, 바스락거리는 낙엽 질감", display_order: 8 },
  { style_id: "photorealistic", label: "#럭셔리 워치 화보", prompt: "고급 매트 블랙 배경 위 실버 기계식 시계의 정교한 톱니바퀴 디테일 컷", display_order: 9 },
  { style_id: "photorealistic", label: "#해질녘 파도 서핑", prompt: "해질녘 분홍빛 바다 파도를 타는 서퍼의 다이내믹한 8K 순간 포착", display_order: 10 },

  // 2. 3d_digital (3D 디지털 아트 - 10개)
  { style_id: "3d_digital", label: "#3D 마케팅 아이콘", prompt: "혁신적인 스마트폰과 신용카드가 떠있는 3D 미니멀 클레이 아트 마케팅 아이콘 세트", display_order: 1 },
  { style_id: "3d_digital", label: "#픽사풍 귀여운 캐릭터", prompt: "동글동글한 안경을 쓴 귀여운 3D 토끼 탐정 캐릭터, Pixar 애니메이션 렌더링", display_order: 2 },
  { style_id: "3d_digital", label: "#미래지향 3D 오브젝트", prompt: "투명한 글래스모피즘 큐브와 입체 가상화폐 3D 디스플레이 렌더", display_order: 3 },
  { style_id: "3d_digital", label: "#3D 장난감 로봇", prompt: "귀여운 등불을 든 미니멀 3D 차콜 장난감 로봇 캐릭터", display_order: 4 },
  { style_id: "3d_digital", label: "#입체 퐁퐁이 아일랜드", prompt: "구름 위에 떠있는 아기자기한 3D 장난감 마을과 무지개 동산", display_order: 5 },
  { style_id: "3d_digital", label: "#3D 금융 백그라운드", prompt: "파스텔 톤 동전과 황금 열쇠가 날아다니는 금융 앱 3D 일러스트", display_order: 6 },
  { style_id: "3d_digital", label: "#3D 귀여운 디저트", prompt: "딸기 생크림 케이크와 알록달록 마카롱이 떠있는 3D 렌더링", display_order: 7 },
  { style_id: "3d_digital", label: "#3D 우주선 비행", prompt: "알록달록한 아기 우주선이 반짝이는 별들 사이를 누비는 3D 그래픽", display_order: 8 },
  { style_id: "3d_digital", label: "#3D 스마트 홈", prompt: "미니멀 아이콘 형태의 스마트 TV와 온도조절기가 조화를 이루는 3D 아트", display_order: 9 },
  { style_id: "3d_digital", label: "#3D 동물 동화 캐릭터", prompt: "책 읽는 귀여운 3D 아기 곰돌이 캐릭터, 부드러운 3D 질감", display_order: 10 },

  // 3. artistic_editorial (감성 패션 화보 - 10개)
  { style_id: "artistic_editorial", label: "#패션 룩북 화보", prompt: "모던한 미니멀 백그라운드 스튜디오에서 봄 신상 트렌치코트를 입은 모델의 패션 잡지 화보", display_order: 1 },
  { style_id: "artistic_editorial", label: "#보그 흑백 세련미", prompt: "Vogue 룩북 스타일, 드라마틱한 음영 대비가 돋보이는 모던 하이패션 포즈의 여성 모델", display_order: 2 },
  { style_id: "artistic_editorial", label: "#하이엔드 주얼리 컷", prompt: "고급스러운 아크릴 무대 위 다이아몬드 목걸이와 패션 잡지 커버컷 조명 연출", display_order: 3 },
  { style_id: "artistic_editorial", label: "#네온 스트리트 패션", prompt: "밤거리 도심 속 힙한 스트릿웨어와 선글라스를 착용한 모델의 감성 화보", display_order: 4 },
  { style_id: "artistic_editorial", label: "#미니멀 린넨 패션", prompt: "베이지 린넨 수트를 입은 한국 남성 모델의 차분하고 감성적인 인물 스냅", display_order: 5 },
  { style_id: "artistic_editorial", label: "#레트로 엘레강스", prompt: "70년대 클래식 무드의 드레스를 입은 모델과 레트로 가구 조화", display_order: 6 },
  { style_id: "artistic_editorial", label: "#컬러 블록 에디토리얼", prompt: "강렬한 레드와 블루 배경이 대조를 이루는 아방가르드 패션 화보", display_order: 7 },
  { style_id: "artistic_editorial", label: "#하이패션 뷰티 포트레이트", prompt: "글로시한 입술과 매끈한 피부 디테일이 강조된 뷰티 매거진 커버 컷", display_order: 8 },
  { style_id: "artistic_editorial", label: "#스튜디오 그림자 예술", prompt: "블라인드 사이로 새어 나오는 슬릿 조명과 인물의 감각적인 실루엣", display_order: 9 },
  { style_id: "artistic_editorial", label: "#실크 드레스 댄스", prompt: "바람에 흩날리는 붉은 실크 드레스를 입고 무용하는 모델의 역동적인 컷", display_order: 10 },

  // 4. vector_illustration (벡터 일러스트 - 10개)
  { style_id: "vector_illustration", label: "#벡터 제품 일러스트", prompt: "친환경 오가닉 코스메틱 화장품 병과 나뭇잎 요소가 조화로운 벡터 평면 일러스트레이션", display_order: 1 },
  { style_id: "vector_illustration", label: "#IT 스타트업 캐릭터", prompt: "노트북으로 코딩 중인 젊은 개발자 팀, 선명한 아웃라인과 모던 벡터 스타일", display_order: 2 },
  { style_id: "vector_illustration", label: "#도시 생활 플랫 카드", prompt: "커피를 들고 도심 공원을 산책하는 사람들의 세련된 flat vector 그래픽", display_order: 3 },
  { style_id: "vector_illustration", label: "#여행 가방 벡터 아트", prompt: "세계 명소 라벨이 붙은 빈티지 여행 가방과 항공기 벡터 아이콘", display_order: 4 },
  { style_id: "vector_illustration", label: "#헬스 피트니스 벡터", prompt: "아령을 들고 운동하는 사람들의 밝고 건강한 평면 벡터 일러스트", display_order: 5 },
  { style_id: "vector_illustration", label: "#스마트시티 벡터", prompt: "자율주행 차와 태양광 판넬이 어우러진 친환경 스마트시티 벡터 포스터", display_order: 6 },
  { style_id: "vector_illustration", label: "#배달 라이더 벡터", prompt: "오토바이를 타고 도시를 달리는 친근한 캐릭터 벡터 일러스트", display_order: 7 },
  { style_id: "vector_illustration", label: "#커피 브루잉 플랫아트", prompt: "원두와 드립포트가 정갈하게 배치된 모던 카페 벡터 그래픽", display_order: 8 },
  { style_id: "vector_illustration", label: "#음악 바이닐 벡터 아트", prompt: "LP판과 헤드폰이 아날로그 감성으로 배치된 팝아트 벡터", display_order: 9 },
  { style_id: "vector_illustration", label: "#에코 그린 벡터", prompt: "지구를 품고 있는 나무와 나뭇잎들의 심플한 환경 캠페인 벡터", display_order: 10 },

  // 5. cyberpunk_neon (사이버펑크 네온 - 10개)
  { style_id: "cyberpunk_neon", label: "#사이버펑크 서울야경", prompt: "네온사인 가득한 비 내리는 사이버펑크 서울 야경 속 트렌디한 한국 여성의 몽환적인 포트레이트", display_order: 1 },
  { style_id: "cyberpunk_neon", label: "#네온 라이더 스피드", prompt: "미래도시 네온 고속도로를 질주하는 사이버펑크 오토바이 라이더와 청색/자홍색 이펙트", display_order: 2 },
  { style_id: "cyberpunk_neon", label: "#미래형 해커 로봇", prompt: "신비로운 홀로그램 인터페이스를 조작하는 미래형 안드로이드 해커", display_order: 3 },
  { style_id: "cyberpunk_neon", label: "#사이버펑크 차이나타운", prompt: "붉은 네온 등불과 한자가 반짝이는 미래 도시 골목의 고양이 포트레이트", display_order: 4 },
  { style_id: "cyberpunk_neon", label: "#네온 고글 사이보그", prompt: "투명 네온 고글을 쓰고 사이버네틱 임플란트를 이식한 힙합 아티스트", display_order: 5 },
  { style_id: "cyberpunk_neon", label: "#미래형 메카 기체", prompt: "안개 속 웅장하게 서 있는 거대 사이버펑크 전투 메카 로봇", display_order: 6 },
  { style_id: "cyberpunk_neon", label: "#사이버펑크 술집 야경", prompt: "네온 조명 아래 홀로그램 술잔을 기울이는 사막의 여전사", display_order: 7 },
  { style_id: "cyberpunk_neon", label: "#네온 비행 자동차", prompt: "초고층 빌딩 숲 사이를 누비는 붉은색 광원의 비행 자동차", display_order: 8 },
  { style_id: "cyberpunk_neon", label: "#사이버펑크 브릿지", prompt: "자홍빛 안개 속에 휩싸인 미래 도시의 아치형 네온 대교", display_order: 9 },
  { style_id: "cyberpunk_neon", label: "#네온 닌자 아웃라인", prompt: "빛나는 사쿠라 네온 검을 든 스텔스 사이버 닌자", display_order: 10 },

  // 6. oriental_ink (동양 수묵화 - 10개)
  { style_id: "oriental_ink", label: "#수묵 한복 포트레이트", prompt: "은은한 수묵 먹선과 한지 질감 속 아련한 분위기의 한복 입은 선비와 매화 가지", display_order: 1 },
  { style_id: "oriental_ink", label: "#경복궁 수묵 산수화", prompt: "안개 낀 아침 삼각산과 경복궁 대웅전이 먹선의 짙고 옅음으로 그려진 동양 수묵화", display_order: 2 },
  { style_id: "oriental_ink", label: "#달빛 매화 대나무", prompt: "둥근 은달빛 아래 대나무 잎과 흰 매화가 번진 조선 전통 수묵 채색화", display_order: 3 },
  { style_id: "oriental_ink", label: "#수묵 호랑이 기상", prompt: "용맹한 기세로 호효하는 호랑이의 기품 있는 먹선 수묵 드로잉", display_order: 4 },
  { style_id: "oriental_ink", label: "#한옥과 소나무 산수", prompt: "구름에 휩싸인 소나무 언덕 위 아담한 한옥 기와집의 은은한 수묵화", display_order: 5 },
  { style_id: "oriental_ink", label: "#수묵 연꽃 금붕어", prompt: "맑은 묵향 연못 속에 유유히 헤엄치는 붉은 금붕어와 연꽃 수묵 채색", display_order: 6 },
  { style_id: "oriental_ink", label: "#풍류 가야금 선비", prompt: "계곡 정자 아래 가야금을 연주하는 선비의 운치 있는 동양화", display_order: 7 },
  { style_id: "oriental_ink", label: "#수묵 학과 일출", prompt: "붉은 아침 해를 향해 날아오르는 두루미(학)의 고결한 먹선 붓터치", display_order: 8 },
  { style_id: "oriental_ink", label: "#비 내리는 한양 수묵", prompt: "먹구름 낀 옛 한양 거리를 삿갓을 쓰고 걷는 나그네의 수묵 감성", display_order: 9 },
  { style_id: "oriental_ink", label: "#수묵 산사 안개", prompt: "겹겹이 싸인 청산 속 고즈넉한 산사의 종소리가 느껴지는 수묵 진경산수화", display_order: 10 },

  // 7. watercolor_pastel (수채화 파스텔 - 10개)
  { style_id: "watercolor_pastel", label: "#수채화 파스텔 동화", prompt: "해질녘 분홍빛 노을 하늘 아래 동화 속 작은 목조 오두막과 꽃밭 풍경", display_order: 1 },
  { style_id: "watercolor_pastel", label: "#수채화 고양이 감성", prompt: "창가 햇살 아래 졸고 있는 몽환적인 털 질감의 수채화 고양이 일러스트", display_order: 2 },
  { style_id: "watercolor_pastel", label: "#파스텔 봄날 꽃길", prompt: "벚꽃잎이 날리는 시골 오솔길을 자전거로 달리는 아이의 맑은 수채화", display_order: 3 },
  { style_id: "watercolor_pastel", label: "#파스텔 유니콘 꿈", prompt: "민트빛 하늘 속 은은한 수채화 물감이 번진 몽환적인 유니콘 동화", display_order: 4 },
  { style_id: "watercolor_pastel", label: "#수채화 수국 정원", prompt: "보랏빛 수국 꽃잎에 물방울이 촉촉히 맺힌 투명한 수채화 화법", display_order: 5 },
  { style_id: "watercolor_pastel", label: "#파스텔 바닷가 마을", prompt: "에메랄드 빛 바다와 알록달록한 파스텔 지붕이 어우러진 해안 마을", display_order: 6 },
  { style_id: "watercolor_pastel", label: "#수채화 커피 한 잔", prompt: "김이 모락모락 나는 따뜻한 찻잔과 수채화 기법의 브런치 풍경", display_order: 7 },
  { style_id: "watercolor_pastel", label: "#파스텔 밤하늘 은하수", prompt: "밤하늘 가득 반짝이는 파스텔 오로라와 은하수 아래 캠핑 텐트", display_order: 8 },
  { style_id: "watercolor_pastel", label: "#수채화 아기 사슴", prompt: "숲속 들꽃 사이를 누비는 아기 사슴의 부드럽고 따스한 수채화", display_order: 9 },
  { style_id: "watercolor_pastel", label: "#파스텔 빗방울 우산", prompt: "노란 우산을 쓴 소녀의 따스하고 감성적인 비 오는 날 수채화", display_order: 10 },

  // 8. cinematic_film (35mm 필름 - 10개)
  { style_id: "cinematic_film", label: "#35mm 빈티지 카페", prompt: "80년대 골목길 카페 야외 테라스에서 커피를 마시는 감성적인 빈티지 인물 컷", display_order: 1 },
  { style_id: "cinematic_film", label: "#레트로 야간 스냅", prompt: "Kodak Portra 400 필름 특유의 따뜻한 입자와 비 오는 밤 도쿄 골목 네온 스냅", display_order: 2 },
  { style_id: "cinematic_film", label: "#여름 바다 필름 감성", prompt: "햇빛이 수면에 반사되는 청량한 여름 바닷가와 90년대 필름 카메라 질감", display_order: 3 },
  { style_id: "cinematic_film", label: "#레트로 올드카 여행", prompt: "노을빛 사막 도로 위에 멈춰선 클래식 올드카와 여행자의 필름 사진", display_order: 4 },
  { style_id: "cinematic_film", label: "#70년대 아날로그 레코드", prompt: "아날로그 LP판을 들고 미소 짓는 뮤지션의 따스한 35mm 레트로 컷", display_order: 5 },
  { style_id: "cinematic_film", label: "#필름 빛갈라짐 인물", prompt: "숲속 틈새 햇살 아래 눈을 감은 인물의 오렌지빛 필름 플레어", display_order: 6 },
  { style_id: "cinematic_film", label: "#레트로 레스토랑 데이트", prompt: "네온 글라스와 빈티지 소파가 어우러진 80년대 레스토랑의 인물 사진", display_order: 7 },
  { style_id: "cinematic_film", label: "#아날로그 기차 창가", prompt: "달리는 기차 창가 밖 들판을 바라보는 인물의 아련한 필름 감성", display_order: 8 },
  { style_id: "cinematic_film", label: "#35mm 흑백 포토", prompt: "강렬한 그레인과 거친 질감이 살이있는 빈티지 흑백 스트리트 포토", display_order: 9 },
  { style_id: "cinematic_film", label: "#레트로 레코드 샵", prompt: "수많은 레코드판이 꽂힌 아날로그 상점에서 음악을 듣는 인물 컷", display_order: 10 },

  // 9. claymation (클레이 스톱모션 - 10개)
  { style_id: "claymation", label: "#지점토 귀여운 공룡", prompt: "손맛 느껴지는 울퉁불퉁 지점토 질감의 알록달록 아기 공룡 스톱모션 인형", display_order: 1 },
  { style_id: "claymation", label: "#클레이 베이커리 빵", prompt: "따뜻한 오븐 속 귀여운 표정이 그려진 클레이 빵과 미니어처 주방", display_order: 2 },
  { style_id: "claymation", label: "#클레이 아기자기 마을", prompt: "아기자기한 클레이 스톱모션 미니어처 마을과 알록달록 자동차", display_order: 3 },
  { style_id: "claymation", label: "#지점토 우주 비행사", prompt: "둥글둥글한 지점토 우주복을 입은 아기 우주 비행사 인형", display_order: 4 },
  { style_id: "claymation", label: "#클레이 펭귄 가족", prompt: "남극 얼음판 위에서 옹기종기 모여있는 클레이 펭귄 캐릭터들", display_order: 5 },
  { style_id: "claymation", label: "#클레이 햄버거 세트", prompt: "미니어처 지점토 치즈버거와 감자튀김 스톱모션 푸드 소품", display_order: 6 },
  { style_id: "claymation", label: "#클레이 숲속 버섯 집", prompt: "알록달록한 지점토 버섯 지붕 집과 클레이 아기 요정", display_order: 7 },
  { style_id: "claymation", label: "#클레이 몬스터 밴드", prompt: "기타와 드럼을 연주하는 귀여운 클레이 몬스터 음악 밴드", display_order: 8 },
  { style_id: "claymation", label: "#클레이 해적선 항해", prompt: "아기자기한 지점토 장난감 해적선과 손맛 넘치는 바다 파도", display_order: 9 },
  { style_id: "claymation", label: "#클레이 크리스마스 트리", prompt: "반짝이는 방울과 눈사람 지점토 인형이 달린 트리 스톱모션", display_order: 10 },

  // 10. webtoon_lineart (웹툰 라인아트 - 10개)
  { style_id: "webtoon_lineart", label: "#웹툰 주인공 액션", prompt: "강렬한 먹선 아웃라인과 셀 셰이딩이 돋보이는 한국 판타지 웹툰 주인공 소환 씬", display_order: 1 },
  { style_id: "webtoon_lineart", label: "#학원물 웹툰 로맨스", prompt: "학교 복도 창가 햇살 아래 서로 바라보는 고등학생 남녀 웹툰 명장면", display_order: 2 },
  { style_id: "webtoon_lineart", label: "#도시 몬스터 웹툰", prompt: "서울 강남역 한복판에 나타난 거대 몬스터와 이에 맞서는 웹툰 히어로", display_order: 3 },
  { style_id: "webtoon_lineart", label: "#무협 웹툰 검사", prompt: "바람에 도포 자락이 날리는 조선 판타지 무협 웹툰의 검객", display_order: 4 },
  { style_id: "webtoon_lineart", label: "#사이버 헌터 웹툰", prompt: "게이트가 열린 현대 도시에서 각성한 S급 헌터의 웹툰 일러스트", display_order: 5 },
  { style_id: "webtoon_lineart", label: "#로맨스 판타지 영애", prompt: "화려한 영애 드레스를 입은 로맨스 판타지 웹툰 여주인공", display_order: 6 },
  { style_id: "webtoon_lineart", label: "#음식 웹툰 먹방", prompt: "김이 모락모락 나는 떡볶이와 튀김이 먹음직스럽게 그려진 웹툰 컷", display_order: 7 },
  { style_id: "webtoon_lineart", label: "#스포츠 웹툰 슬램", prompt: "농구 코트 위에서 역동적으로 슛을 던지는 스포츠 웹툰 명장면", display_order: 8 },
  { style_id: "webtoon_lineart", label: "#일상 인디 웹툰", prompt: "자취방에서 반려묘와 누워있는 소소한 일상 한국 웹툰 일러스트", display_order: 9 },
  { style_id: "webtoon_lineart", label: "#스릴러 웹툰 인물", prompt: "어두운 조명 속 차가운 눈빛을 한 추리 웹툰 주인공 포트레이트", display_order: 10 },

  // 11. architectural (건축 & 인테리어 - 10개)
  { style_id: "architectural", label: "#건축 인테리어", prompt: "통창 너머로 숲이 펼쳐지는 미니멀 우드 앤 콘크리트 고급 거실 인테리어 디자인", display_order: 1 },
  { style_id: "architectural", label: "#모던 단독주택 외관", prompt: "ArchDaily 잡지 커버 스타일, 자연광과 노출 콘크리트 조화의 미니멀 모던 주택", display_order: 2 },
  { style_id: "architectural", label: "#호텔 리조트 수영장", prompt: "발리 리조트풍 인피니티 풀과 해질녘 오렌지빛 라이팅 디자인 공간", display_order: 3 },
  { style_id: "architectural", label: "#북유럽 미니멀 주방", prompt: "대리석 아일랜드 식탁과 따뜻한 펜던트 조명이 돋보이는 모던 키친", display_order: 4 },
  { style_id: "architectural", label: "#공중정원 온실 스튜디오", prompt: "유리 온실 구조 속 수목이 가득한 생태 친화적 건축 오피스", display_order: 5 },
  { style_id: "architectural", label: "#자연광 테라스 서재", prompt: "나무 서가와 편안한 1인용 소파가 자연광을 받으며 놓인 서재", display_order: 6 },
  { style_id: "architectural", label: "#도심 펜트하우스 야경", prompt: "통유리창으로 도심 야경이 한눈에 들어오는 고급 펜트하우스 침실", display_order: 7 },
  { style_id: "architectural", label: "#일본식 미니멀 중정", prompt: "단풍나무와 자갈 정원이 바라보이는 정갈한 지다미 스타일 한옥/와시츠", display_order: 8 },
  { style_id: "architectural", label: "#미래형 갤러리 미술관", prompt: "곡선형 콘크리트 벽면과 천장 천창 라이팅이 예술적인 현대 미술관", display_order: 9 },
  { style_id: "architectural", label: "#스파 바이오필릭 바스", prompt: "자연 석재 욕조와 대나무 숲 뷰가 차분함을 주는 바이오필릭 욕실", display_order: 10 },

  // 12. dark_fantasy (다크 판타지 - 10개)
  { style_id: "dark_fantasy", label: "#다크판타지 웅장함", prompt: "어둡고 신비로운 고성 타워 위에서 붉은 마법 룬을 시전하는 검은 로브의 마법사", display_order: 1 },
  { style_id: "dark_fantasy", label: "#심연의 고딕 기사", prompt: "자색 안개 가득한 폐허 성당 앞 거대한 대검을 든 고딕 다크 판타지 기사", display_order: 2 },
  { style_id: "dark_fantasy", label: "#용의 둥지 수호자", prompt: "용암이 흐르는 어두운 동굴 속 붉은 눈의 용과 고대 성물", display_order: 3 },
  { style_id: "dark_fantasy", label: "#해골 왕좌 군주", prompt: "해골과 뼈로 조각된 고딕 왕좌에 앉아있는 안개 속 불사의 왕", display_order: 4 },
  { style_id: "dark_fantasy", label: "#저주받은 숲 요정", prompt: "이끼 낀 거대한 고목과 신비로운 푸른 빛버섯이 자라는 잔혹 동화 숲", display_order: 5 },
  { style_id: "dark_fantasy", label: "#타락한 천사의 날개", prompt: "붉은 핏빛 달 아래 흑색 날개를 펼치고 있는 타락 천사", display_order: 6 },
  { style_id: "dark_fantasy", label: "#네크로맨서 소환", prompt: "어두운 지하 묘지에서 푸른 영혼의 불꽃을 소환하는 주술사", display_order: 7 },
  { style_id: "dark_fantasy", label: "#고딕 뱀파이어 성", prompt: "벼락이 치는 암벽 산 정상 위에 솟아있는 장엄한 고딕 뱀파이어 성", display_order: 8 },
  { style_id: "dark_fantasy", label: "#마법 연금술 랩", prompt: "보랏빛 물약이 끓고 고대 마도서가 넘겨지는 비밀 연금술사의 방", display_order: 9 },
  { style_id: "dark_fantasy", label: "#룬 문자 마법검", prompt: "차가운 서리가 내린 검신 위에 룬 문자가 빛나는 신화 속의 검", display_order: 10 },

  // 13. minimal_flat (미니멀 플랫 아트 - 10개)
  { style_id: "minimal_flat", label: "#미니멀 여행 포스터", prompt: "제주 돌하르방과 조용한 해변을 감각적인 컬러 블록으로 표현한 모던 아트 포스터", display_order: 1 },
  { style_id: "minimal_flat", label: "#플랫 팝아트 인물", prompt: "강렬한 비비드 컬러와 단순한 기하학 도형으로 디자인된 인물 포스터", display_order: 2 },
  { style_id: "minimal_flat", label: "#모던 미드센추리 가구", prompt: "60년대 미드센추리 모던 가구와 플랫 그래픽 일러스트", display_order: 3 },
  { style_id: "minimal_flat", label: "#음악 바이닐 그래픽", prompt: "LP 플레이어와 턴테이블이 강렬한 컬러 콘트라스트로 표현된 플랫 그래픽", display_order: 4 },
  { style_id: "minimal_flat", label: "#커피 모노톤 일러스트", prompt: "모노톤 브라운 톤의 그래픽 도형으로 구성된 모던 커피 브랜딩 포스터", display_order: 5 },
  { style_id: "minimal_flat", label: "#시티 브리즈 플랫", prompt: "선글라스를 끼고 야자수 도로를 달리는 자동차의 모던 미니멀 플랫 아트", display_order: 6 },
  { style_id: "minimal_flat", label: "#스마트 파이낸스 일러스트", prompt: "파스텔 계열의 평면 기하학 도형으로 구성된 스마트 금융 아트", display_order: 7 },
  { style_id: "minimal_flat", label: "#네이처 가드닝 아트", prompt: "가위와 화분이 아기자기한 벡터 평면으로 배치된 모던 가드닝 포스터", display_order: 8 },
  { style_id: "minimal_flat", label: "#스페이스 우주 플랫", prompt: "신비로운 원형 행성들과 은하수가 단순한 선과 색면으로 구성된 우주 아트", display_order: 9 },
  { style_id: "minimal_flat", label: "#북커버 미니멀 그래픽", prompt: "세련된 타이포그래피와 대담한 비대칭 컬러 면 분할로 이루어진 책 커버 디자인", display_order: 10 },
];

export async function POST(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabaseAdmin = createAdminClient();

    // Insert 130 seed items (skip existing or clear table if needed)
    const { count, error } = await supabaseAdmin
      .from("style_preset_prompts")
      .insert(SEED_PROMPTS_DATA);

    if (error) {
      console.error("Failed to seed style_preset_prompts:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, count: SEED_PROMPTS_DATA.length });
  } catch (err: any) {
    console.error("POST /api/prompts/seed error:", err);
    return Response.json({ error: err.message || "Failed to seed prompts" }, { status: 500 });
  }
}
