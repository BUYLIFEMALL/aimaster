// AI 올인원 그래픽 자동화 123종 전문 템플릿 데이터베이스
export interface TemplateField {
  id: string;
  label: string;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
}

export interface GraphicTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  template: string;
  fields: TemplateField[];
  usage: string;
  defaultStyle: string;
}

export const GRAPHIC_TEMPLATES: GraphicTemplate[] = [
  {
    "id": "dev-ui",
    "title": "UI/UX 플레이스홀더",
    "description": "앱 개발 시 사용할 더미 UI 디자인을 생성합니다.",
    "category": "DEV",
    "icon": "Smartphone",
    "template": "{{platform}} 환경을 위한 {{app_type}} UI 디자인 화면. 차트와 사용자 프로필 아이콘이 포함된 대시보드 뷰. 모던하고 깔끔한 인터페이스. 드리블(Dribbble) 미적 감각, {{color_scheme}} 색상 테마.",
    "fields": [
      {
        "id": "platform",
        "label": "디바이스/플랫폼",
        "placeholder": "",
        "options": [
          "Smartphone",
          "Tablet",
          "Desktop"
        ],
        "defaultValue": "Smartphone"
      },
      {
        "id": "app_type",
        "label": "앱 종류",
        "placeholder": "예: 피트니스 트래킹 앱"
      },
      {
        "id": "color_scheme",
        "label": "선호 색상",
        "placeholder": "예: 민트와 블랙"
      }
    ],
    "usage": "개발 초기 단계에서 디자이너 없이 빠르게 화면 구성을 확인하고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 요구사항 명세서(.md) 또는 기획안 텍스트(.txt)\n- 손으로 그린 와이어프레임 스케치 이미지\n- 선호하는 앱의 스크린샷 (스타일 참고용)",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "dev-banner",
    "title": "랜딩 페이지 헤더 이미지",
    "description": "웹사이트 상단에 들어갈 기술적인 배너를 만듭니다.",
    "category": "DEV",
    "icon": "Layout",
    "template": "{{topic}}에 대한 웹 배너 이미지. 와이드 비율. 오른쪽에는 {{visual_element}}, 왼쪽에는 텍스트를 위한 여백. 미니멀리스트, 기술적인 스타일.",
    "fields": [
      {
        "id": "topic",
        "label": "웹사이트 주제",
        "placeholder": "예: AI 코딩 도우미"
      },
      {
        "id": "visual_element",
        "label": "그림 요소",
        "placeholder": "예: 키보드를 치는 3D 로봇"
      }
    ],
    "usage": "웹사이트나 블로그의 대문(Hero Section) 이미지가 필요할 때 유용합니다.\n\n[추천 레퍼런스]\n- 페이지 컨셉 기획 문서(.txt, .pdf)\n- 브랜드 로고나 컬러 팔레트 이미지\n- 웹사이트 레이아웃 초안",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "dev-app-icon",
    "title": "앱 아이콘 생성",
    "description": "스토어에 등록할 매력적인 앱 아이콘을 디자인합니다.",
    "category": "DEV",
    "icon": "Box",
    "template": "{{app_concept}}을(를) 위한 모던한 모바일 앱 아이콘 디자인. 미니멀리스트 스타일, 둥근 모서리. {{color}} 그라데이션 배경. 광택 마감, 벡터 그래픽 스타일.",
    "fields": [
      {
        "id": "app_concept",
        "label": "앱 컨셉",
        "placeholder": "예: 음악 플레이어"
      },
      {
        "id": "color",
        "label": "메인 컬러",
        "placeholder": "예: 보라와 핑크"
      }
    ],
    "usage": "앱스토어 등록용 아이콘 시안이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 앱 설명서나 기획 문서(.pdf)\n- 앱 로고나 심볼 스케치 이미지\n- 참고하고 싶은 타사 앱 아이콘 이미지",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "dev-error",
    "title": "404 에러 페이지 일러스트",
    "description": "유머러스하거나 브랜드에 맞는 에러 페이지 이미지를 만듭니다.",
    "category": "DEV",
    "icon": "AlertTriangle",
    "template": "웹사이트 404 에러 페이지를 위한 창의적인 일러스트. {{concept}} 컨셉. \"페이지를 찾을 수 없음\"을 시각적으로 표현. 플랫 디자인 벡터 스타일. 부드러운 색감.",
    "fields": [
      {
        "id": "concept",
        "label": "컨셉",
        "placeholder": "예: 우주에서 길을 잃은 우주비행사"
      }
    ],
    "usage": "사용자가 잘못된 경로로 진입했을 때 보여줄 친근한 이미지를 만듭니다.\n\n[추천 레퍼런스]\n- 브랜드 가이드라인 문서(.pdf)\n- 웹사이트의 전체적인 톤앤매너를 보여주는 스크린샷",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "dev-admin",
    "title": "관리자 대시보드 디자인",
    "description": "복잡한 데이터를 보여주는 관리자 페이지 시안을 생성합니다.",
    "category": "DEV",
    "icon": "LayoutDashboard",
    "template": "{{system_type}}을(를) 위한 관리자 대시보드 UI 디자인 ({{platform}} 뷰). 데이터 테이블, 원형 차트, 사이드바 메뉴. 다크 모드(또는 라이트 모드). 전문적이고 정보 밀도가 높음.",
    "fields": [
      {
        "id": "platform",
        "label": "디바이스/플랫폼",
        "placeholder": "",
        "options": [
          "Desktop",
          "Tablet",
          "Smartphone"
        ],
        "defaultValue": "Desktop"
      },
      {
        "id": "system_type",
        "label": "시스템 종류",
        "placeholder": "예: 쇼핑몰 주문 관리 시스템"
      }
    ],
    "usage": "복잡한 데이터를 다루는 백오피스나 Admin 페이지 기획 시 활용하세요.\n\n[추천 레퍼런스]\n- 필요한 데이터 항목 리스트(.csv, .txt)\n- 대략적인 레이아웃 손그림 이미지",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "dev-db",
    "title": "DB 스키마/네트워크 다이어그램",
    "description": "기술 문서에 넣을 추상적인 시스템 구조도를 생성합니다.",
    "category": "DEV",
    "icon": "Share2",
    "template": "{{tech_stack}} 아키텍처를 표현하는 아이소메트릭 다이어그램 일러스트. 서버, 데이터베이스, 클라우드 연결을 추상적으로 시각화. 기술 블로그용, 깔끔한 파란색 톤.",
    "fields": [
      {
        "id": "tech_stack",
        "label": "기술 스택",
        "placeholder": "예: 클라우드 서버와 마이크로서비스"
      }
    ],
    "usage": "기술 블로그나 제안서에 시스템 구조를 시각적으로 보여주고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 아키텍처 구성도 이미지(draw.io 캡처 등)\n- 시스템 구성 명세서(.md, .txt)\n- 기술 스택 로고 이미지",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "game-item",
    "title": "아이템 및 스킬 아이콘",
    "description": "게임 내 사용할 아이콘 에셋을 생성합니다.",
    "category": "GAME",
    "icon": "Sword",
    "template": "{{item}}을(를) 나타내는 판타지 게임 아이콘. 아이소메트릭 뷰, 어두운 배경, 마법의 반짝임. 디지털 아트 스타일, 고품질 에셋.",
    "fields": [
      {
        "id": "item",
        "label": "아이템",
        "placeholder": "예: 유리병에 든 빨간 치유 물약"
      }
    ],
    "usage": "인벤토리 창에 들어갈 아이템 이미지를 대량으로 생성할 때 유용합니다.\n\n[추천 레퍼런스]\n- 아이템 목록 및 설명 문서(.csv, .json)\n- 아이템의 대략적인 형태 스케치\n- 게임의 UI 스타일 이미지",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "game-texture",
    "title": "타일맵/텍스처 생성",
    "description": "게임 맵에 사용할 반복 가능한 텍스처를 만듭니다.",
    "category": "GAME",
    "icon": "Grid",
    "template": "{{material}}의 매끄러운(seamless) 텍스처 패턴. 탑다운 뷰. 비디오 게임 에셋 스타일, 반복 가능한 패턴, 높은 디테일.",
    "fields": [
      {
        "id": "material",
        "label": "재질",
        "placeholder": "예: 이끼 낀 돌 바닥"
      }
    ],
    "usage": "게임 배경이나 3D 모델링에 입힐 텍스처가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 재질 설명 텍스트(.txt)\n- 원하는 재질의 실제 사진 (돌, 나무, 금속 등)",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "game-npc",
    "title": "NPC 초상화",
    "description": "다양한 표정의 NPC 캐릭터 얼굴을 생성합니다.",
    "category": "GAME",
    "icon": "UserPlus",
    "template": "비디오 게임 NPC 초상화, {{character_desc}}. 픽셀 아트 스타일 (또는 반실사 스타일). 무표정. 어두운 배경.",
    "fields": [
      {
        "id": "character_desc",
        "label": "캐릭터 설명",
        "placeholder": "예: 고집 센 늙은 대장장이"
      }
    ],
    "usage": "대화창에 표시될 캐릭터 얼굴이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 캐릭터 설정 문서(.txt, .md)\n- 캐릭터 컨셉 아트나 레퍼런스 사진\n- 원하는 화풍의 예시 이미지",
    "defaultStyle": "Pixel art, retro game"
  },
  {
    "id": "game-weapon",
    "title": "판타지 무기 컨셉 아트",
    "description": "게임에 등장할 전설적인 무기 디자인을 생성합니다.",
    "category": "GAME",
    "icon": "Hammer",
    "template": "{{weapon_type}} 컨셉 아트. {{element}} 속성을 가짐. 화려한 장식과 빛나는 효과. 무기 설정화, 흰색 배경. 판타지 RPG 스타일.",
    "fields": [
      {
        "id": "weapon_type",
        "label": "무기 종류",
        "placeholder": "예: 양손 대검"
      },
      {
        "id": "element",
        "label": "속성/테마",
        "placeholder": "예: 얼음과 냉기"
      }
    ],
    "usage": "게임 속 레어 아이템이나 전설 무기의 디자인 아이디어를 얻고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 무기 설정 기획안(.txt)\n- 무기의 실루엣 스케치 이미지\n- 모티브가 되는 사물 이미지",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "game-map",
    "title": "레벨 디자인/맵 컨셉",
    "description": "게임 스테이지의 전체적인 분위기와 구조를 시각화합니다.",
    "category": "GAME",
    "icon": "Map",
    "template": "{{environment}} 게임 레벨 디자인 컨셉 아트. 쿼터뷰(Top-down oblique). 장애물과 경로가 보임. 어드벤처 게임 스타일. 신비로운 분위기.",
    "fields": [
      {
        "id": "environment",
        "label": "환경",
        "placeholder": "예: 용암이 흐르는 지하 동굴"
      }
    ],
    "usage": "게임 스테이지의 전체적인 분위기나 지형 배치를 기획할 때 유용합니다.\n\n[추천 레퍼런스]\n- 레벨 디자인 기획 문서(.pdf)\n- 레벨 디자인 레이아웃(Top-view) 스케치\n- 분위기 참고용 풍경 사진",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "game-hud",
    "title": "게임 UI/HUD 디자인",
    "description": "체력바, 미니맵 등 게임 오버레이 UI를 디자인합니다.",
    "category": "GAME",
    "icon": "LayoutTemplate",
    "template": "{{genre}} 게임을 위한 헤드업 디스플레이(HUD) UI 디자인. 체력 게이지, 스킬 아이콘 슬롯, 미니맵 프레임. 투명한 배경 느낌. SF(또는 판타지) 스타일.",
    "fields": [
      {
        "id": "genre",
        "label": "게임 장르",
        "placeholder": "예: FPS 슈팅 게임"
      }
    ],
    "usage": "게임 화면 위에 띄울 UI 요소를 디자인할 때 사용하세요.\n\n[추천 레퍼런스]\n- UI 기능 정의서(.csv, .txt)\n- 게임 스크린샷 (UI를 얹어볼 배경용)\n- UI 배치도 스케치",
    "defaultStyle": "Cyberpunk, neon lights"
  },
  {
    "id": "biz-simulation",
    "title": "공정 시뮬레이션 조감도",
    "description": "공장 내부나 공정 과정의 전체적인 조감도를 생성합니다.",
    "category": "ENGINEER",
    "icon": "Factory",
    "template": "{{factory_type}}의 하이 앵글 조감도(아이소메트릭 항공 뷰). 전체 시설 레이아웃 개요. 자동화된 컨베이어 벨트, 로봇 팔, 산업 기계. 깔끔하고 모던한 전문 산업 디자인, 3D 렌더링, 정밀한 텍스처, 부드러운 주광.",
    "fields": [
      {
        "id": "factory_type",
        "label": "공장 종류",
        "placeholder": "예: 자동화 물류 센터"
      }
    ],
    "usage": "공장 레이아웃이나 물류 흐름을 시각적으로 설명해야 할 때 사용하세요.\n\n[추천 레퍼런스]\n- 공장 설비 리스트(.csv)\n- 공장 평면도(CAD 도면 이미지)\n- 배치하고 싶은 설비 설명 문서(.txt, .pdf)",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "eng-blueprint",
    "title": "기계 부품 블루프린트",
    "description": "기술적인 느낌의 기계 부품 설계도면 컨셉 아트를 생성합니다.",
    "category": "ENGINEER",
    "icon": "Wrench",
    "template": "{{part_name}}의 기술 청사진(Blueprint) 도면. 진한 파란색 배경에 흰색 선 (클래식 청사진 스타일). 상세한 치수, 도식적 뷰, 산업 공학 미학.",
    "fields": [
      {
        "id": "part_name",
        "label": "부품 명칭",
        "placeholder": "예: 제트 엔진 터빈"
      }
    ],
    "usage": "기술 보고서나 발표 자료에 전문적인 느낌을 주는 청사진(Blueprint) 이미지가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 부품 사양서(.pdf)\n- 부품의 3D 모델 캡처\n- 참고할 기술 도면 이미지",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "eng-control-panel",
    "title": "산업용 제어 패널 UI",
    "description": "현대적인 산업 현장에서 즉시 참조 가능한 HMI 디자인을 생성합니다.",
    "category": "ENGINEER",
    "icon": "Activity",
    "template": "{{machine}}을(를) 위한 현대적이고 전문적인 산업용 HMI(Human Machine Interface) 제어 패널 디자인. 정면 뷰(Front view). 실제 산업 현장에서 사용 가능한 직관적인 UI. 깔끔한 그레이/화이트 톤 배경, 명확한 데이터 그래프, 상태 표시기, 조작 버튼. 높은 가독성과 실용성을 강조한 엔지니어링 스타일.",
    "fields": [
      {
        "id": "machine",
        "label": "장비 대상",
        "placeholder": "예: 원자로 제어 장치"
      }
    ],
    "usage": "복잡한 기계 장비의 조작 화면(HMI) 컨셉을 잡을 때 유용합니다. 실제 개발 시 참조하기 좋은 평면적이고 직관적인 디자인을 제공합니다.\n\n[추천 레퍼런스]\n- 제어 기능 목록 문서(.txt, .csv)\n- 패널 레이아웃 스케치 이미지",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "eng-robot",
    "title": "로봇/기계 디자인",
    "description": "미래지향적인 로봇이나 기계 장치를 디자인합니다.",
    "category": "ENGINEER",
    "icon": "Bot",
    "template": "미래형 {{robot_type}} 로봇 디자인. 매끄러운 금속 재질, 관절 디테일. 스튜디오 조명. 컨셉 아트 스타일. 하이테크 분위기.",
    "fields": [
      {
        "id": "robot_type",
        "label": "로봇 용도",
        "placeholder": "예: 가정용 청소 로봇"
      }
    ],
    "usage": "새로운 로봇 제품이나 기계 장치의 외형 디자인 아이디어가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 로봇 기능 명세서(.txt)\n- 로봇의 구조나 관절 형태 스케치\n- 영감을 받은 기계 이미지",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "eng-safety",
    "title": "산업 안전 포스터",
    "description": "현장에 부착할 안전 수칙 포스터를 생성합니다.",
    "category": "ENGINEER",
    "icon": "ShieldAlert",
    "template": "산업 현장 안전 포스터. \"{{rule}}\" 수칙을 준수하는 작업자 일러스트. 헬멧과 안전 장비 착용. 명확한 경고 심볼. 주황색과 검은색 테마.",
    "fields": [
      {
        "id": "rule",
        "label": "안전 수칙",
        "placeholder": "예: 낙하물 주의"
      }
    ],
    "usage": "공장이나 건설 현장에 붙일 안전 캠페인 포스터를 만들 때 사용하세요.\n\n[추천 레퍼런스]\n- 안전 수칙 가이드라인 문서(.pdf, .txt)\n- 경고 표지판 심볼 이미지\n- 현장 사진 (배경 참고용)",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "eng-pcb",
    "title": "회로 기판(PCB) 텍스처",
    "description": "복잡한 전자 회로 기판 이미지를 생성합니다.",
    "category": "ENGINEER",
    "icon": "Cpu",
    "template": "복잡한 녹색 전자 회로 기판(PCB)의 매크로 샷. 금색 납땜 포인트, 검은색 칩셋, 구리 배선. 하이테크 배경 텍스처.",
    "fields": [],
    "usage": "기술 관련 배경 이미지나 하드웨어 관련 자료에 사용할 고해상도 회로 기판 이미지가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- PCB 회로도(Gerber 등) 캡처 이미지\n- 실제 PCB 기판 사진 (패턴 참고용)",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "creator-thumbnail",
    "title": "유튜브 썸네일 자동화",
    "description": "텍스트가 포함된 고퀄리티 썸네일을 생성합니다.",
    "category": "CREATOR",
    "icon": "Youtube",
    "template": "{{subject}}을(를) 특징으로 하는 고품질 유튜브 썸네일 이미지. 선명한 색상, 높은 대비, 흥미진진한 분위기. 중앙에 크고 굵은 글씨로 \"{{text}}\"라고 적혀 있음. {{ratio}} 비율.",
    "fields": [
      {
        "id": "subject",
        "label": "주제/장면",
        "placeholder": "예: 화면을 보고 놀란 게이머"
      },
      {
        "id": "text",
        "label": "포함할 텍스트",
        "placeholder": "예: 역대급 게임 2025"
      }
    ],
    "usage": "유튜브 영상의 클릭률(CTR)을 높이고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 영상 기획안이나 대본(.txt)\n- 유튜버의 표정 사진 (얼굴 합성/참고용)\n- 참고하고 싶은 인기 썸네일 이미지",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "creator-playlist",
    "title": "플레이리스트 썸네일 (텍스트 심도)",
    "description": "피사체 뒤에 PLAY LIST 텍스트가 배치됨 감성 썸네일을 생성합니다.",
    "category": "CREATOR",
    "icon": "Layers",
    "template": "유튜브 플레이리스트 썸네일 아트. 전경 중앙에는 {{subject}}. 배경에는 거대하고 굵은 영문 타이포그래피 \"PLAY LIST\"가 적혀 있음 (한글 표기 금지, 반드시 영문). 텍스트는 피사체에 의해 부분적으로 가려져 깊이감을 줌. 하단에는 보조 텍스트 \"{{sub_text}}\"가 세련되게 배치됨. 시네마틱 조명, {{mood}} 분위기, 고화질 4k.",
    "fields": [
      {
        "id": "subject",
        "label": "피사체",
        "placeholder": "예: 아늑한 방에서 공부하는 소녀"
      },
      {
        "id": "mood",
        "label": "분위기/장르",
        "placeholder": "예: 로파이 힙합, 비 오는 날, 감성적인"
      },
      {
        "id": "sub_text",
        "label": "보조 문구",
        "placeholder": "예: Study with me"
      }
    ],
    "usage": "음악 플레이리스트 커버를 만들 때 최적입니다. 인물 뒤에 글자가 가려지는 트렌디한 효과를 연출합니다.\n\n[추천 레퍼런스]\n- 플레이리스트 곡 목록(.txt)\n- 원하는 분위기의 감성 사진\n- 특정 인물 사진 (피사체 유지 옵션 사용 시)",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "creator-avatar",
    "title": "가상 부캐(Avatar) 생성",
    "description": "일관성 있는 3D 캐릭터 시트를 디자인합니다.",
    "category": "CREATOR",
    "icon": "User",
    "template": "{{character_desc}}의 캐릭터 디자인 시트. 흰색 배경. 세 가지 다른 포즈: {{pose1}}, {{pose2}}, {{pose3}}. 3D 픽사 애니메이션 스타일, 일관된 캐릭터 디테일.",
    "fields": [
      {
        "id": "character_desc",
        "label": "캐릭터 설명",
        "placeholder": "예: 파란 눈을 가진 귀여운 로봇"
      },
      {
        "id": "pose1",
        "label": "동작 1",
        "placeholder": "예: 손 흔들기"
      },
      {
        "id": "pose2",
        "label": "동작 2",
        "placeholder": "예: 생각하기"
      },
      {
        "id": "pose3",
        "label": "동작 3",
        "placeholder": "예: 울기"
      }
    ],
    "usage": "방송이나 채널의 마스코트 캐릭터를 만들 때 사용하세요.\n\n[추천 레퍼런스]\n- 캐릭터 성격 및 설정 문서(.txt)\n- 캐릭터 스케치나 특징을 묘사한 그림\n- 선호하는 그림체/스타일 예시 이미지",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "creator-stream",
    "title": "방송용 오버레이/프레임",
    "description": "게임 방송이나 캠 화면에 씌울 오버레이를 디자인합니다.",
    "category": "CREATOR",
    "icon": "Monitor",
    "template": "라이브 스트리밍용 웹캠 테두리 오버레이 디자인. {{theme}} 테마. 네온 빛나는 효과, 투명한 중앙 영역. 하단에 소셜 미디어 아이콘 공간. 게이밍 감성.",
    "fields": [
      {
        "id": "theme",
        "label": "테마",
        "placeholder": "예: 사이버펑크 퍼플"
      }
    ],
    "usage": "OBS 등에 적용할 웹캠 테두리 디자인이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 채널 브랜딩 가이드(.pdf)\n- 채널 로고 이미지 (색상 매칭용)\n- 화면 비율(16:9 등)을 표시한 레이아웃 가이드",
    "defaultStyle": "Cyberpunk, neon lights"
  },
  {
    "id": "creator-banner",
    "title": "채널 아트/배너",
    "description": "유튜브/트위치 채널 상단 배너 이미지를 생성합니다.",
    "category": "CREATOR",
    "icon": "Image",
    "template": "{{channel_name}} 채널을 위한 유튜브 배너 아트. {{topic}} 관련 그래픽 요소들이 배경에 배치됨. 중앙에 텍스트. 대담하고 에너지가 넘치는 스타일.",
    "fields": [
      {
        "id": "channel_name",
        "label": "채널명",
        "placeholder": "예: Tech Reviewer"
      },
      {
        "id": "topic",
        "label": "채널 주제",
        "placeholder": "예: 최신 전자기기 리뷰"
      }
    ],
    "usage": "채널의 첫인상을 결정하는 상단 배너를 만들 때 사용하세요.\n\n[추천 레퍼런스]\n- 채널 소개 텍스트(.txt)\n- 채널 로고나 시그니처 캐릭터 이미지\n- 브랜드 컬러 팔레트",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "creator-meme",
    "title": "밈(Meme) 템플릿 생성",
    "description": "유머러스한 상황의 짤방 이미지를 생성합니다.",
    "category": "CREATOR",
    "icon": "Smile",
    "template": "인터넷 밈(Meme) 스타일의 재미있는 이미지. {{situation}} 상황. 과장된 표정의 캐릭터나 동물. 상단에 흰색 굵은 글씨로 텍스트를 넣을 여백.",
    "fields": [
      {
        "id": "situation",
        "label": "상황",
        "placeholder": "예: 월요일 아침에 출근하는 고양이"
      }
    ],
    "usage": "커뮤니티나 SNS에 올릴 재치 있는 이미지가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 밈 아이디어 메모(.txt)\n- 패러디하고 싶은 원본 짤방 이미지\n- 표정 참고용 사진",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "webtoon-bg",
    "title": "웹툰 배경 (콘티용)",
    "description": "복잡한 도시나 실내 배경을 빠르게 생성합니다.",
    "category": "WEBTOON",
    "icon": "Image",
    "template": "웹툰 배경 아트, {{place}}을(를) 내려다보는 하이 앵글 뷰. 플랫 채색의 라인 아트 스타일. {{objects}}의 복잡한 디테일. 애니메이션 배경 스타일.",
    "fields": [
      {
        "id": "place",
        "label": "장소",
        "placeholder": "예: 번화한 강남 교차로"
      },
      {
        "id": "objects",
        "label": "주요 사물",
        "placeholder": "예: 자동차와 빌딩들"
      }
    ],
    "usage": "반복적인 배경 작업 시간을 줄이고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 배경 설명 지문(.txt)\n- 스케치업 모델링 캡처 (리터칭용)\n- 장소의 구도를 잡은 러프 스케치",
    "defaultStyle": "Anime style, Studio Ghibli"
  },
  {
    "id": "webtoon-char",
    "title": "캐릭터 시트 & 바리에이션",
    "description": "역동적인 포즈의 만화 캐릭터 설정을 잡습니다.",
    "category": "WEBTOON",
    "icon": "PenTool",
    "template": "구체적인 캐릭터 컨셉: {{appearance}}. 캐릭터는 {{emotion}}의 표정으로 {{action}}하고 있음. 역동적인 포즈, 만화 스타일, 배경의 속도선 효과.",
    "fields": [
      {
        "id": "appearance",
        "label": "캐릭터 외형",
        "placeholder": "예: 검고 헝클어진 머리의 청년"
      },
      {
        "id": "action",
        "label": "행동",
        "placeholder": "예: 필사적으로 달리기"
      },
      {
        "id": "emotion",
        "label": "감정",
        "placeholder": "예: 공포"
      }
    ],
    "usage": "새로운 캐릭터의 디자인이나 특정 포즈를 참고하고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 캐릭터 프로필 문서(.txt)\n- 캐릭터 초기 디자인 스케치\n- 원하는 포즈의 졸라맨/가이드 그림",
    "defaultStyle": "Anime style, Studio Ghibli"
  },
  {
    "id": "webtoon-retouch",
    "title": "스케치 리터칭 (Rendering)",
    "description": "스케치를 업로드하여 고퀄리티 렌더링으로 변환합니다.",
    "category": "WEBTOON",
    "icon": "Brush",
    "template": "{{scene}}의 고품질 3D 렌더링. 스케치를 사실적인 텍스처, 볼류메트릭 조명, 언리얼 엔진 5 렌더 스타일, 마법 같은 분위기로 변환.",
    "fields": [
      {
        "id": "scene",
        "label": "장면 설명",
        "placeholder": "예: 판타지 성 내부"
      }
    ],
    "usage": "직접 그린 러프 스케치를 완성된 일러스트로 발전시키고 싶을 때 사용하세요. *자동으로 편집 모드로 전환됩니다.*\n\n[추천 레퍼런스]\n- **필수**: 직접 그린 선화(Line art)나 스케치 이미지\n- 채색 스타일 참고용 레퍼런스",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "webtoon-creature",
    "title": "판타지 크리처/몬스터",
    "description": "웹툰에 등장할 괴물이나 신수 디자인을 생성합니다.",
    "category": "WEBTOON",
    "icon": "Ghost",
    "template": "{{creature_desc}}의 컨셉 아트. 위협적이고 거대한 모습. {{ability}} 능력을 사용하고 있음. 다크 판타지 웹툰 스타일. 디테일한 묘사.",
    "fields": [
      {
        "id": "creature_desc",
        "label": "크리처 묘사",
        "placeholder": "예: 불타는 털을 가진 늑대"
      },
      {
        "id": "ability",
        "label": "능력/속성",
        "placeholder": "예: 화염 방사"
      }
    ],
    "usage": "상상 속의 몬스터를 구체화할 때 사용하세요.\n\n[추천 레퍼런스]\n- 몬스터 설정 자료(.txt)\n- 크리처의 실루엣이나 특징 스케치\n- 질감(털, 비늘 등) 참고용 동물 사진",
    "defaultStyle": "Anime style, Studio Ghibli"
  },
  {
    "id": "webtoon-bubble",
    "title": "말풍선/효과음 디자인",
    "description": "강렬한 인상을 주는 말풍선이나 의성어 효과를 디자인합니다.",
    "category": "WEBTOON",
    "icon": "MessageCircle",
    "template": "만화 효과음 텍스트 \"{{sound}}\". 역동적인 글자 디자인. 뾰족한 말풍선, 폭발 효과 배경. 강렬한 색감. 액션 만화 스타일.",
    "fields": [
      {
        "id": "sound",
        "label": "효과음 텍스트",
        "placeholder": "예: 콰아앙!"
      }
    ],
    "usage": "액션 씬에 들어갈 타격감 있는 효과음 글씨가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 원하는 글씨체 스타일 예시 이미지",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "pub-magazine",
    "title": "잡지 표지 디자인",
    "description": "시선을 사로잡는 트렌디한 잡지 표지를 디자인합니다.",
    "category": "PUBLISHING",
    "icon": "Layout",
    "template": "{{subject}}을(를) 특징으로 하는 트렌디한 잡지 표지 디자인. 상단에 굵은 타이포그래피 제목 \"{{title}}\". 하이엔드 에디토리얼 사진 스타일, 생생한 색상, 선명한 초점, 전문적인 레이아웃.",
    "fields": [
      {
        "id": "subject",
        "label": "표지 모델/주제",
        "placeholder": "예: 성공한 CEO 초상화"
      },
      {
        "id": "title",
        "label": "잡지 이름 (영문 권장)",
        "placeholder": "예: TIMELESS"
      }
    ],
    "usage": "출판물이나 사보의 표지 디자인 시안을 잡을 때 유용합니다.\n\n[추천 레퍼런스]\n- 잡지 기획안(.pdf, .txt)\n- 표지 모델의 사진\n- 선호하는 잡지 표지 레이아웃 이미지",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "pub-cover",
    "title": "소설 표지 일러스트",
    "description": "장르에 맞는 감성적인 책 표지를 생성합니다.",
    "category": "PUBLISHING",
    "icon": "Book",
    "template": "{{genre}} 소설을 위한 책 표지 일러스트. {{scene}} 장면을 묘사. 감성적이고 예술적인 스타일. 상단에 제목 공간 확보. 고품질 디지털 아트.",
    "fields": [
      {
        "id": "genre",
        "label": "장르",
        "placeholder": "예: 미스터리 스릴러"
      },
      {
        "id": "scene",
        "label": "주요 장면",
        "placeholder": "예: 가로등 아래 고독한 탐정"
      }
    ],
    "usage": "웹소설이나 전자책 표지가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 소설 줄거리 요약(.txt)\n- 주인공 캐릭터의 외형 묘사나 스케치\n- 소설의 분위기를 나타내는 무드 이미지",
    "defaultStyle": "Oil painting, classical art"
  },
  {
    "id": "pub-kids",
    "title": "동화책 삽화",
    "description": "어린이를 위한 따뜻한 스타일의 삽화를 그립니다.",
    "category": "PUBLISHING",
    "icon": "Smile",
    "template": "{{activity}}을(를) 하는 {{character}}의 동화책 삽화. 따뜻한 수채화 스타일 (또는 부드러운 크레용 스타일). 밝고 행복한 색감. 귀엽고 친근함.",
    "fields": [
      {
        "id": "character",
        "label": "캐릭터",
        "placeholder": "예: 작은 곰"
      },
      {
        "id": "activity",
        "label": "행동",
        "placeholder": "예: 숲속에서 꿀 먹기"
      }
    ],
    "usage": "동화책의 한 장면을 그릴 때 사용하세요.\n\n[추천 레퍼런스]\n- 동화 스토리보드(.txt)\n- 캐릭터 디자인 시트\n- 장면 구도 스케치",
    "defaultStyle": "Watercolor, soft edges"
  },
  {
    "id": "pub-ebook",
    "title": "전자책 썸네일",
    "description": "작은 화면에서도 눈에 띄는 전자책 표지를 만듭니다.",
    "category": "PUBLISHING",
    "icon": "Tablet",
    "template": "{{topic}}에 관한 전자책 표지 디자인. \"{{title}}\"라고 적힌 크고 굵은 타이포그래피. 심플한 아이콘이 있는 고대비 배경. 전문적이고 깔끔한 모양.",
    "fields": [
      {
        "id": "topic",
        "label": "주제",
        "placeholder": "예: 경제적 자유"
      },
      {
        "id": "title",
        "label": "제목",
        "placeholder": "예: MONEY MASTER"
      }
    ],
    "usage": "정보성 전자책(PDF) 표지를 만들 때 좋습니다.\n\n[추천 레퍼런스]\n- 책 제목 및 부제 텍스트\n- 브랜드 컬러 코드\n- 표지에 넣고 싶은 아이콘이나 심볼",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "pub-bookmark",
    "title": "책갈피/굿즈 디자인",
    "description": "책과 함께 제공할 예쁜 책갈피 디자인을 생성합니다.",
    "category": "PUBLISHING",
    "icon": "Bookmark",
    "template": "{{motif}}을(를) 주제로 한 예술적인 책갈피 디자인. 세로로 긴 비율. 수채화(또는 캘리그라피) 스타일. 감성적인 분위기.",
    "fields": [
      {
        "id": "motif",
        "label": "모티브",
        "placeholder": "예: 밤하늘과 별"
      }
    ],
    "usage": "책과 어울리는 굿즈나 책갈피 도안이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 굿즈 기획서(.pdf)\n- 책 표지 이미지 (깔맞춤용)\n- 원하는 패턴이나 그림 스타일",
    "defaultStyle": "Watercolor, soft edges"
  },
  {
    "id": "pub-poem",
    "title": "시집 표지/내지 삽화",
    "description": "시적 감수성이 묻어나는 서정적인 이미지를 만듭니다.",
    "category": "PUBLISHING",
    "icon": "Feather",
    "template": "시집을 위한 서정적인 일러스트. {{emotion}} 감정을 표현하는 추상적인 수묵화(또는 미니멀 라인 아트). 여백의 미. 차분하고 고요한 분위기.",
    "fields": [
      {
        "id": "emotion",
        "label": "감정/주제",
        "placeholder": "예: 그리움과 가을"
      }
    ],
    "usage": "시나 에세이에 어울리는 감성적인 삽화가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 시의 구절이나 텍스트(.txt)\n- 원하는 감성을 담은 추상화 이미지",
    "defaultStyle": "Watercolor, soft edges"
  },
  {
    "id": "photo-stock",
    "title": "고화질 스톡 포토 생성",
    "description": "상업적으로 사용할 수 있는 고해상도 스톡 이미지를 생성합니다.",
    "category": "PHOTO_VIDEO",
    "icon": "Camera",
    "template": "{{subject}}의 고해상도 전문 스톡 사진. 완벽한 조명, {{setting}} 배경. 선명한 초점, 실사, 상업용 품질.",
    "fields": [
      {
        "id": "subject",
        "label": "피사체",
        "placeholder": "예: 악수하는 다양한 비즈니스 팀"
      },
      {
        "id": "setting",
        "label": "배경",
        "placeholder": "예: 유리벽이 있는 현대적인 사무실"
      }
    ],
    "usage": "저작권 걱정 없는 고퀄리티 사진 자료가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 필요한 이미지 설명서(.txt)\n- 원하는 구도의 낮은 화질 샘플 사진\n- 촬영하고 싶은 장소나 피사체 예시",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "video-bg",
    "title": "영상용 시네마틱 배경",
    "description": "크로마키 합성을 위한 영상 배경 소스를 만듭니다.",
    "category": "PHOTO_VIDEO",
    "icon": "Video",
    "template": "{{place}}의 시네마틱 비디오 배경 루프 프레임. {{mood}} 분위기. 아나모픽 렌즈 플레어, 피사계 심도. 사람 없음, 영상 편집용 정적 샷.",
    "fields": [
      {
        "id": "place",
        "label": "장소",
        "placeholder": "예: 미래지향적 제어실"
      },
      {
        "id": "mood",
        "label": "분위기",
        "placeholder": "예: 긴장감 있고 어두운"
      }
    ],
    "usage": "유튜브 촬영이나 줌 배경으로 쓸 이미지가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 배경 컨셉 기획안(.txt)\n- 원하는 인테리어 스타일 사진\n- 영화 스틸컷 (색감 참고용)",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "video-storyboard",
    "title": "영상 스토리보드 (콘티)",
    "description": "영상 기획 단계에서 샷 구성을 위한 스토리보드 컷을 생성합니다.",
    "category": "PHOTO_VIDEO",
    "icon": "Film",
    "template": "영화 장면을 위한 러프 스토리보드 스케치. 샷 종류: {{shot_type}}. {{action}}을(를) 보여줌. 목탄 스케치 스타일 (또는 마카 드로잉 스타일), 거친 선, 시네마틱 구도.",
    "fields": [
      {
        "id": "shot_type",
        "label": "샷 종류",
        "placeholder": "예: 클로즈업, 와이드 샷"
      },
      {
        "id": "action",
        "label": "내용",
        "placeholder": "예: 카메라를 향해 달려오는 주인공"
      }
    ],
    "usage": "영상 촬영 전 앵글과 구도를 미리 시각화할 때 사용하세요.\n\n[추천 레퍼런스]\n- 시나리오 또는 대본(.txt)\n- 대략적인 졸라맨 콘티 스케치\n- 앵글 참고용 영화 장면",
    "defaultStyle": "Sketch, pencil drawing"
  },
  {
    "id": "photo-double",
    "title": "이중 노출(Double Exposure)",
    "description": "두 이미지가 예술적으로 겹쳐진 이중 노출 사진을 만듭니다.",
    "category": "PHOTO_VIDEO",
    "icon": "Layers",
    "template": "{{subject}}의 실루엣 안에 {{landscape}} 풍경이 결합된 이중 노출(Double Exposure) 예술 사진. 몽환적이고 초현실적인 분위기. 흰색 배경.",
    "fields": [
      {
        "id": "subject",
        "label": "실루엣 대상",
        "placeholder": "예: 여자의 옆모습"
      },
      {
        "id": "landscape",
        "label": "결합할 풍경",
        "placeholder": "예: 눈 덮인 숲"
      }
    ],
    "usage": "예술적이고 몽환적인 포스터나 앨범 커버를 만들 때 사용하세요.\n\n[추천 레퍼런스]\n- 아트워크 기획안(.txt)\n- 실루엣으로 사용할 인물 사진 (피사체 유지용)\n- 결합하고 싶은 풍경 사진",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "photo-macro",
    "title": "매크로(접사) 사진",
    "description": "작은 물체를 아주 크게 확대한 디테일한 사진을 생성합니다.",
    "category": "PHOTO_VIDEO",
    "icon": "ZoomIn",
    "template": "{{object}}의 초근접 매크로 사진. 놀라운 질감 디테일과 물방울. 얕은 피사계 심도(보케). 자연광. 생생한 색감.",
    "fields": [
      {
        "id": "object",
        "label": "대상",
        "placeholder": "예: 아침 이슬이 맺힌 거미줄"
      }
    ],
    "usage": "🔍 **매크로 포커스 도구**: 이 템플릿을 선택하면 나타나는 업로드 창에 사진을 올리고, 확대하고 싶은 부분을 브러쉬로 칠해주세요. AI가 해당 영역을 분석하여 초고해상도 매크로 디테일로 재구성합니다.\n\n[추천 레퍼런스]\n- 확대하고 싶은 대상의 일반 사진 (필수)\n- 원하는 질감 느낌의 텍스처 이미지",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "photo-podcast",
    "title": "팟캐스트/앨범 커버",
    "description": "오디오 콘텐츠를 위한 분위기 있는 커버 아트를 디자인합니다.",
    "category": "PHOTO_VIDEO",
    "icon": "Mic",
    "template": "{{title}} 팟캐스트(또는 앨범) 커버 아트. {{vibe}} 분위기를 시각화한 그래픽. 중앙에 타이틀 텍스트. 미니멀하고 세련된 디자인. 스포티파이 스타일.",
    "fields": [
      {
        "id": "title",
        "label": "제목",
        "placeholder": "예: Midnight Jazz"
      },
      {
        "id": "vibe",
        "label": "분위기",
        "placeholder": "예: 도시의 밤과 네온"
      }
    ],
    "usage": "팟캐스트나 음원 사이트에 등록할 정사각형 커버 이미지를 만들 때 사용하세요.\n\n[추천 레퍼런스]\n- 앨범 정보 및 트랙 리스트(.txt)\n- 아티스트 사진이나 로고\n- 선호하는 앨범 커버 스타일 예시",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "biz-exec-summary",
    "title": "경영진 핵심 요약보고",
    "description": "복잡한 보고서를 한눈에 파악할 수 있는 1장짜리 인포그래픽으로 요약합니다.",
    "category": "BUSINESS",
    "icon": "FileBarChart",
    "template": "{{topic}}에 대한 경영진 보고용 1페이지 요약 인포그래픽(Executive Summary). 핵심 성과 지표: {{metrics}}. 상단에 요약(Overview), 중앙에 주요 데이터 차트, 하단에 제언(Action Item) 배치. 전문적이고 가독성 높은 코퍼레이트 디자인 스타일. {{style_tone}} 톤앤매너.",
    "fields": [
      {
        "id": "topic",
        "label": "보고 주제",
        "placeholder": "예: 2025 상반기 영업 실적 보고"
      },
      {
        "id": "metrics",
        "label": "핵심 지표/성과",
        "placeholder": "예: 매출 20% 성장, 영업이익 15억 달성"
      },
      {
        "id": "style_tone",
        "label": "톤앤매너",
        "placeholder": "예: 신뢰감을 주는 네이비 블루와 그레이"
      }
    ],
    "usage": "CEO나 이사회 보고 전, 방대한 자료를 핵심만 추려 시각화할 때 사용하세요.\n\n[추천 레퍼런스]\n- 보고서 원문 텍스트(.txt, .pdf)\n- 핵심 수치 데이터(.csv)\n- 기존 보고서 양식 이미지",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "biz-infographic",
    "title": "실시간 데이터 인포그래픽",
    "description": "미래지향적인 차트와 데이터 시각화를 생성합니다.",
    "category": "BUSINESS",
    "icon": "BarChart",
    "template": "{{topic}}을(를) 보여주는 미래지향적 인포그래픽 디자인 시각화. 빛나는 데이터 라인, 홀로그램 차트, 전문적인 비즈니스 미학. {{color}} 색상 팔레트. 깔끔하고 모던한 룩.",
    "fields": [
      {
        "id": "topic",
        "label": "데이터 주제",
        "placeholder": "예: 전기차 시장 성장"
      },
      {
        "id": "color",
        "label": "강조 색상",
        "placeholder": "예: 짙은 파랑과 네온 그린"
      }
    ],
    "usage": "발표 자료에 첨단 기술이나 미래지향적인 데이터를 보여줄 때 사용하세요.\n\n[추천 레퍼런스]\n- 데이터 통계 자료(.csv, .json, .txt)\n- 엑셀 차트 캡처 (데이터 형태 참고용)\n- 기업 브랜드 컬러 가이드",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "biz-mockup",
    "title": "제품 컨셉 목업(Mock-up)",
    "description": "제품의 디자인 시안을 실사처럼 확인합니다.",
    "category": "BUSINESS",
    "icon": "Box",
    "template": "{{product_name}}의 제품 목업. 미니멀리스트 디자인. 부드러운 스튜디오 조명이 있는 {{floor_material}} 위에 놓여 있음. 고해상도, 매끄러운 산업 디자인.",
    "fields": [
      {
        "id": "product_name",
        "label": "제품명/종류",
        "placeholder": "예: 미래형 전기차 충전기"
      },
      {
        "id": "floor_material",
        "label": "바닥 재질",
        "placeholder": "예: 콘크리트 바닥"
      }
    ],
    "usage": "제품 출시 전 디자인 시안을 사실적으로 확인하고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 제품 기획서(.pdf)\n- 제품의 3D 모델링 스크린샷\n- 손으로 그린 제품 스케치",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "biz-brand-mood",
    "title": "브랜드 컨셉 무드보드",
    "description": "브랜드 아이덴티티와 비주얼 전략을 위한 이미지를 모읍니다.",
    "category": "BUSINESS",
    "icon": "Palette",
    "template": "{{brand_type}}을(를) 위한 브랜드 아이덴티티 무드 보드. 핵심 가치: {{values}}. 비주얼 스타일: {{visual_style}}. 전문적이고 깔끔하며 영감을 주는 레이아웃. 고품질 이미지 콜라주.",
    "fields": [
      {
        "id": "brand_type",
        "label": "브랜드 종류",
        "placeholder": "예: 친환경 스킨케어"
      },
      {
        "id": "values",
        "label": "핵심 가치",
        "placeholder": "예: 자연, 순수, 지속가능성"
      },
      {
        "id": "visual_style",
        "label": "비주얼 스타일",
        "placeholder": "예: 녹색 톤과 나무 질감"
      }
    ],
    "usage": "브랜드 런칭 초기 단계에서 전체적인 디자인 방향성을 잡을 때 유용합니다.\n\n[추천 레퍼런스]\n- 브랜드 전략 문서(.pdf)\n- 영감을 받은 타사 브랜드 이미지\n- 선호하는 텍스처나 색상 샘플",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "biz-swot",
    "title": "SWOT 분석 시각화",
    "description": "전략 발표 자료에 넣을 세련된 SWOT 분석 도표를 만듭니다.",
    "category": "BUSINESS",
    "icon": "Grid",
    "template": "비즈니스 SWOT 분석 다이어그램. 강점, 약점, 기회, 위협을 나타내는 4개의 세련된 구역. {{theme}} 컬러 테마. 전문적인 프레젠테이션 슬라이드 배경.",
    "fields": [
      {
        "id": "theme",
        "label": "컬러 테마",
        "placeholder": "예: 블루와 그레이"
      }
    ],
    "usage": "PPT에 들어갈 SWOT 분석 장표 배경이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- SWOT 분석 텍스트 내용(.txt, .md)\n- PPT 슬라이드 마스터 스크린샷 (배경 톤앤매너 일치용)\n- 원하는 다이어그램 스타일 예시",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "biz-startup",
    "title": "스타트업 비전 일러스트",
    "description": "혁신과 성장을 상징하는 추상적인 비즈니스 일러스트입니다.",
    "category": "BUSINESS",
    "icon": "Rocket",
    "template": "스타트업의 성장과 혁신을 상징하는 3D 일러스트. {{symbol}}이(가) 위로 상승하는 모습. 밝고 긍정적인 에너지. 아이소메트릭 스타일. 그라데이션 배경.",
    "fields": [
      {
        "id": "symbol",
        "label": "상징물",
        "placeholder": "예: 빛나는 로켓"
      }
    ],
    "usage": "회사 소개서나 비전 선포식에 사용할 긍정적이고 역동적인 이미지가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 기업 비전 선언문(.txt)\n- 회사 로고\n- 비즈니스 키워드(성장, 연결 등)를 나타내는 아이콘",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "biz-office",
    "title": "미래형 오피스 컨셉",
    "description": "이상적인 업무 환경이나 스마트 오피스 조감도를 생성합니다.",
    "category": "BUSINESS",
    "icon": "Building",
    "template": "미래지향적인 스마트 오피스 인테리어 디자인. 개방형 공간, 식물, 첨단 유리 디스플레이. {{atmosphere}} 분위기. 자연채광이 가득함.",
    "fields": [
      {
        "id": "atmosphere",
        "label": "분위기",
        "placeholder": "예: 창의적이고 협력적인"
      }
    ],
    "usage": "사옥 이전이나 리모델링 제안서에 이상적인 사무실 모습을 보여줄 때 사용하세요.\n\n[추천 레퍼런스]\n- 오피스 요구사항 정의서(.pdf)\n- 사무실 평면도 이미지\n- 선호하는 인테리어 레퍼런스 사진",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "mkt-poster",
    "title": "포스터 다국어 텍스트",
    "description": "영문/한글 텍스트가 자연스럽게 합성된 포스터를 만듭니다.",
    "category": "MARKETING",
    "icon": "Megaphone",
    "template": "{{product}} 홍보 포스터. 배경은 {{bg_elements}} 특징. 중앙에 크고 우아한 글씨로 \"{{text}}\"라고 적혀 있음. 따뜻하고 매력적인 분위기.",
    "fields": [
      {
        "id": "product",
        "label": "제품/서비스",
        "placeholder": "예: 유기농 커피"
      },
      {
        "id": "bg_elements",
        "label": "배경 요소",
        "placeholder": "예: 커피콩과 자연"
      },
      {
        "id": "text",
        "label": "문구",
        "placeholder": "예: 프리미엄의 맛"
      }
    ],
    "usage": "제품 홍보용 포스터를 원스톱으로 만들고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 마케팅 카피 문구(.txt)\n- 제품 누끼 사진\n- 포스터에 넣을 브랜드 로고",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "mkt-detail",
    "title": "상세 페이지 연출컷",
    "description": "제품의 라이프스타일 연출 사진을 생성합니다.",
    "category": "MARKETING",
    "icon": "Camera",
    "template": "{{product}}의 라이프스타일 사진. {{location}}에 놓여 있음. 햇빛이 들어와 부드러운 그림자를 만듦. 보케 효과, 고급스러운 분위기.",
    "fields": [
      {
        "id": "product",
        "label": "제품",
        "placeholder": "예: 향수 병"
      },
      {
        "id": "location",
        "label": "배치 장소",
        "placeholder": "예: 창가 옆 실크 천 위"
      }
    ],
    "usage": "상세 페이지 중간에 들어갈 감성적인 제품 연출컷이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 제품 정보 및 타겟 고객 분석(.pdf)\n- 제품의 실제 사진 (AI가 형태 학습용)",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "mkt-sns-ad",
    "title": "SNS 광고 이미지",
    "description": "인스타그램, 페이스북 피드용 감각적인 광고 이미지를 만듭니다.",
    "category": "MARKETING",
    "icon": "Instagram",
    "template": "{{product}}을(를) 위한 정사각형 소셜 미디어 광고 이미지. 생생한 색상, 눈길을 끄는 구도. \"Sponsored\" 비주얼 미학. 미니멀한 텍스트 오버레이. 참여를 유도하는 스타일.",
    "fields": [
      {
        "id": "product",
        "label": "광고 상품",
        "placeholder": "예: 한정판 스니커즈"
      }
    ],
    "usage": "인스타그램이나 페이스북 광고 효율을 높이고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 광고 카피 및 기획안(.pdf)\n- 타겟팅하는 경쟁사 광고 이미지",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "mkt-coupon",
    "title": "쿠폰/티켓 디자인",
    "description": "이벤트용 할인 쿠폰이나 초대권을 디자인합니다.",
    "category": "MARKETING",
    "icon": "Ticket",
    "template": "프리미엄 {{type}} 디자인. 금박 장식, 찢는 선 점선 디테일. \"{{offer}}\" 텍스트 포함. 고급스러운 종이 질감 배경.",
    "fields": [
      {
        "id": "type",
        "label": "종류",
        "placeholder": "예: 골드 멤버십 할인 쿠폰"
      },
      {
        "id": "offer",
        "label": "혜택 내용",
        "placeholder": "예: 50% OFF"
      }
    ],
    "usage": "고객에게 발송할 모바일 쿠폰이나 실물 티켓 디자인이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 쿠폰 혜택 내용(.txt)\n- 브랜드 로고\n- 기존에 사용하던 티켓/쿠폰 이미지",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "mkt-email",
    "title": "이메일 뉴스레터 헤더",
    "description": "뉴스레터 상단에 들어갈 계절감 있는 헤더 이미지를 만듭니다.",
    "category": "MARKETING",
    "icon": "Mail",
    "template": "이메일 뉴스레터 헤더 이미지. {{season}} 테마. {{objects}} 일러스트가 양옆에 배치됨. 따뜻하고 환영하는 분위기. 가로로 긴 비율.",
    "fields": [
      {
        "id": "season",
        "label": "시즌/테마",
        "placeholder": "예: 가을 정기 세일"
      },
      {
        "id": "objects",
        "label": "장식 요소",
        "placeholder": "예: 낙엽과 책"
      }
    ],
    "usage": "뉴스레터의 오픈율을 높이고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 뉴스레터 기획안(.txt)\n- 뉴스레터 레이아웃 초안 이미지\n- 이번 호의 핵심 주제 이미지",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "mkt-blog",
    "title": "블로그 썸네일/히어로",
    "description": "블로그 포스팅 주제를 잘 나타내는 대표 이미지를 생성합니다.",
    "category": "MARKETING",
    "icon": "Image",
    "template": "블로그 포스트 히어로 이미지. 주제: {{topic}}. 플랫 디자인 벡터 일러스트 스타일 (또는 미니멀 3D). 파스텔 톤 배경. 텍스트 없이 이미지만으로 주제 전달.",
    "fields": [
      {
        "id": "topic",
        "label": "포스팅 주제",
        "placeholder": "예: 재택근무의 장점"
      }
    ],
    "usage": "블로그 글의 주제를 함축적으로 보여주는 이미지가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 글의 핵심 키워드나 요약본 텍스트(.txt)",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "fin-chart",
    "title": "금융 시장 시각화",
    "description": "주식, 코인 등 상승/하락장을 표현하는 이미지를 생성합니다.",
    "category": "FINANCE",
    "icon": "TrendingUp",
    "template": "{{trend}}을(를) 보여주는 금융 시장 컨셉 아트. 황소와 곰의 은유, {{direction}} 방향으로 가는 주식 차트. 전문적인 파란색과 금색 색상. 3D 렌더링 스타일.",
    "fields": [
      {
        "id": "trend",
        "label": "시장 상황",
        "placeholder": "예: 비트코인 신고가 경신"
      },
      {
        "id": "direction",
        "label": "방향",
        "placeholder": "예: 수직 상승"
      }
    ],
    "usage": "시장 시황 리포트나 뉴스 기사에 사용할 이미지가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 시황 분석 리포트(.pdf)\n- 실제 주식 차트 캡처 화면\n- 뉴스 헤드라인 텍스트",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "fin-coin",
    "title": "가상화폐/코인 디자인",
    "description": "새로운 코인이나 토큰의 3D 렌더링 이미지를 만듭니다.",
    "category": "FINANCE",
    "icon": "Circle",
    "template": "{{symbol}} 로고가 있는 황금 암호화폐 코인 디자인. 빛나는 금속 질감, 반사. 디지털 블록체인 노드가 연결된 어두운 배경.",
    "fields": [
      {
        "id": "symbol",
        "label": "상징물",
        "placeholder": "예: 사자 머리"
      }
    ],
    "usage": "새로운 토큰이나 포인트 시스템의 아이콘이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 백서(Whitepaper) 요약(.pdf)\n- 코인에 새기고 싶은 로고나 심볼 이미지",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "fin-credit-card",
    "title": "프리미엄 신용카드 디자인",
    "description": "고급스러운 금속 재질의 VVIP 신용카드 디자인을 생성합니다.",
    "category": "FINANCE",
    "icon": "CreditCard",
    "template": "럭셔리 프리미엄 신용카드 디자인. 무광 블랙 메탈 마감과 {{accent}} 포인트. 미니멀한 칩 및 로고 배치. 하이엔드 재력의 상징. 스튜디오 조명.",
    "fields": [
      {
        "id": "accent",
        "label": "포인트 재질",
        "placeholder": "예: 로즈 골드 테두리"
      }
    ],
    "usage": "VIP 마케팅 자료나 핀테크 앱의 카드 디자인 시안이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 카드 상품 설명서(.pdf)\n- 카드 플레이트 레이아웃 스케치\n- IC 칩 위치 등 기술적 요구사항 메모(.txt)",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "fin-piggy",
    "title": "저축/자산관리 아이콘",
    "description": "저축이나 자산 관리를 상징하는 귀여운 3D 아이콘을 만듭니다.",
    "category": "FINANCE",
    "icon": "PiggyBank",
    "template": "귀여운 3D 돼지 저금통 일러스트. {{color}} 색상. 주변에 금화가 쌓여 있음. 부드러운 조명와 그림자. 금융 앱 아이콘 스타일.",
    "fields": [
      {
        "id": "color",
        "label": "색상",
        "placeholder": "예: 파스텔 핑크"
      }
    ],
    "usage": "금융 앱의 저축 목표 달성 화면이나 마케팅 배너에 사용할 친근한 아이콘이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 앱 UI 컬러 팔레트 가이드(.pdf)\n- 원하는 캐릭터 스타일 예시 이미지",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "fin-app-ui",
    "title": "핀테크 앱 UI 컨셉",
    "description": "깔끔하고 신뢰감 있는 금융 앱 인터페이스를 디자인합니다.",
    "category": "FINANCE",
    "icon": "Smartphone",
    "template": "모던한 핀테크 {{platform}} 앱 UI 화면. 자산 현황 그래프와 송금 버튼. {{style}} 스타일. 깔끔한 흰색 배경에 신뢰감을 주는 파란색 포인트.",
    "fields": [
      {
        "id": "platform",
        "label": "디바이스/플랫폼",
        "placeholder": "",
        "options": [
          "Smartphone",
          "Tablet",
          "Desktop"
        ],
        "defaultValue": "Smartphone"
      },
      {
        "id": "style",
        "label": "스타일",
        "placeholder": "예: 미니멀리즘"
      }
    ],
    "usage": "금융 앱 리뉴얼이나 신규 서비스 기획 시 UI 레퍼런스가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 화면 설계서(Wireframe) 문서(.pdf)\n- 와이어프레임(Wireframe) 스케치\n- 벤치마킹하는 앱의 스크린샷",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "fin-report",
    "title": "재무 보고서 커버",
    "description": "연차 보고서나 투자 제안서의 표지를 디자인합니다.",
    "category": "FINANCE",
    "icon": "FileText",
    "template": "기업 연차 보고서(Annual Report) 표지 디자인. 추상적인 데이터 시각화 그래픽 패턴. \"Annual Report 2025\" 텍스트. 전문적이고 진중한 분위기.",
    "fields": [],
    "usage": "주주총회 자료나 연차 보고서의 표지를 전문적으로 디자인하고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 보고서 목차 및 개요(.txt)\n- 기업 CI/BI 로고\n- 기업의 브랜드 컬러 가이드",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "sales-success",
    "title": "비즈니스 성공 이미지",
    "description": "계약 체결, 악수 등 성공적인 비즈니스 모먼트를 생성합니다.",
    "category": "SALES",
    "icon": "Users",
    "template": "{{action}}하고 있는 비즈니스 전문가들. 정장을 입고 자신감 있게 웃고 있음. 도시 전망이 보이는 사무실 배경. 성공과 파트너십의 컨셉.",
    "fields": [
      {
        "id": "action",
        "label": "행동",
        "placeholder": "예: 계약서 위에서 악수"
      }
    ],
    "usage": "제안서의 마지막 장이나 파트너십 관련 자료에 긍정적인 이미지를 넣고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 사무실 인테리어 사진 (배경 합성용)\n- 원하는 포즈의 레퍼런스 사진",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "sales-biz-card",
    "title": "명함 목업",
    "description": "비즈니스 명함 디자인 시안을 현실감 있게 확인합니다.",
    "category": "SALES",
    "icon": "CreditCard",
    "template": "콘크리트 책상 위에 놓인 전문 비즈니스 명함 더미 목업. 이름: \"{{name}}\", 직책: {{job_role}}. 디자인 스타일은 {{style}}. 얕은 피사계 심도, 우아한 조명.",
    "fields": [
      {
        "id": "name",
        "label": "이름",
        "placeholder": "예: 홍길동"
      },
      {
        "id": "job_role",
        "label": "직업/역할",
        "placeholder": "예: 수석 컨설턴트"
      },
      {
        "id": "style",
        "label": "디자인 스타일",
        "placeholder": "예: 엠보싱 로고가 있는 미니멀 화이트"
      }
    ],
    "usage": "새로운 명함을 만들기 전 디자인 느낌을 확인하고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 명함 정보 텍스트(.txt)\n- 명함에 넣을 로고 파일\n- 명함 레이아웃 초안 이미지",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "sales-brochure",
    "title": "영업 브로셔 커버",
    "description": "고객에게 전달할 영업 제안서나 브로셔의 표지를 디자인합니다.",
    "category": "SALES",
    "icon": "FileText",
    "template": "{{industry}} 회사를 위한 기업 브로셔 표지 디자인. 전문적인 레이아웃, 신뢰를 주는 파란색 색상 테마. 제목 텍스트 영역. 깔끔하고 모던한 그래픽.",
    "fields": [
      {
        "id": "industry",
        "label": "산업 분야",
        "placeholder": "예: 클라우드 보안 솔루션"
      }
    ],
    "usage": "고객사에 전달할 회사 소개서나 브로셔의 표지가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 회사 소개 자료(.pdf)\n- 회사 로고\n- 브로셔 제목 및 목차 텍스트",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "sales-award",
    "title": "트로피/상패 디자인",
    "description": "성과 달성을 기념하는 트로피나 상패 이미지를 생성합니다.",
    "category": "SALES",
    "icon": "Award",
    "template": "우아한 크리스탈(또는 금속) 트로피 디자인. \"{{achievement}}\" 문구가 새겨짐. 스포트라이트를 받아 빛나는 모습. 검은색 배경. 승리와 성취.",
    "fields": [
      {
        "id": "achievement",
        "label": "달성 내용",
        "placeholder": "예: 올해의 판매왕"
      }
    ],
    "usage": "사내 시상식이나 성과 공유회 자료에 들어갈 트로피 이미지가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 수상 내역 및 문구(.txt)\n- 트로피 형태 스케치\n- 각인하고 싶은 로고나 엠블럼",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "sales-ppt",
    "title": "PPT 발표 슬라이드 배경",
    "description": "프레젠테이션에 사용할 깔끔한 배경 이미지를 만듭니다.",
    "category": "SALES",
    "icon": "MonitorPlay",
    "template": "전문적인 프레젠테이션 슬라이드 배경. 추상적인 {{shape}} 도형 패턴. 내용 작성을 위한 넓은 여백. 기업용 파란색과 흰색 그라데이션. 방해되지 않는 은은한 디자인.",
    "fields": [
      {
        "id": "shape",
        "label": "도형 형태",
        "placeholder": "예: 육각형"
      }
    ],
    "usage": "PPT 템플릿의 배경이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 기업 로고 컬러 코드(.txt)\n- 기존 PPT 장표 이미지 (톤앤매너 유지용)",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "sales-gift",
    "title": "고객 감사 선물 포장",
    "description": "VIP 고객에게 보낼 선물 패키징 아이디어를 확인합니다.",
    "category": "SALES",
    "icon": "Gift",
    "template": "VIP 고객용 럭셔리 선물 포장 디자인. 고급스러운 {{color}} 리본과 포장지. 감사 카드. 우아한 테이블 세팅.",
    "fields": [
      {
        "id": "color",
        "label": "색상",
        "placeholder": "예: 블랙과 골드"
      }
    ],
    "usage": "명절 선물이나 VIP 답례품의 포장 컨셉을 잡을 때 유용합니다.\n\n[추천 레퍼런스]\n- 선물 품목 리스트(.txt)\n- 포장지 패턴 샘플 이미지\n- 리본이나 감사 카드 디자인 시안",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "hr-culture",
    "title": "사내 문화 포스터",
    "description": "팀워크, 비전 등을 주제로 한 사내 포스터 이미지를 만듭니다.",
    "category": "HR_LEGAL",
    "icon": "Smile",
    "template": "{{value}}에 관한 기업 문화 포스터 일러스트. 플랫 벡터 스타일 (또는 3D 일러스트). 행복하게 함께 일하는 다양한 팀원들. 밝은 사무실 색상.",
    "fields": [
      {
        "id": "value",
        "label": "핵심 가치",
        "placeholder": "예: 혁신과 협업"
      }
    ],
    "usage": "사내 캠페인이나 조직문화 활성화를 위한 포스터가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 기업 핵심 가치 설명서(.pdf)\n- 포스터에 넣을 슬로건 텍스트\n- 사내 분위기를 잘 나타내는 사진",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "legal-icon",
    "title": "법률/계약 아이콘",
    "description": "계약서, 저울, 망치 등 법률 관련 고퀄리티 아이콘을 생성합니다.",
    "category": "HR_LEGAL",
    "icon": "Scale",
    "template": "{{object}}의 고품질 3D 아이콘. 금과 마호가니 나무 질감. 법률과 정의 테마. 깔끔한 흰색 배경.",
    "fields": [
      {
        "id": "object",
        "label": "대상",
        "placeholder": "예: 판사 의사봉"
      }
    ],
    "usage": "법률 관련 문서나 웹사이트에 들어갈 무게감 있는 아이콘이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 아이콘 목록(.txt)\n- 아이콘으로 만들고 싶은 사물 스케치",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "hr-welcome-kit",
    "title": "웰컴 키트 패키지",
    "description": "신규 입사자를 위한 환영 굿즈 패키지 디자인을 생성합니다.",
    "category": "HR_LEGAL",
    "icon": "Gift",
    "template": "신입 사원 웰컴 키트 목업. 브랜드 로고가 박힌 후드티, 노트북, 펜, 텀블러가 책상 위에 깔끔하게 진열됨. 색상 테마: {{brand_color}}. \"Welcome Aboard\" 메시지 카드. 기업 브랜딩.",
    "fields": [
      {
        "id": "brand_color",
        "label": "브랜드 컬러",
        "placeholder": "예: 네이비 블루와 화이트"
      }
    ],
    "usage": "채용 브랜딩을 위해 웰컴 키트 구성을 기획할 때 사용하세요.\n\n[추천 레퍼런스]\n- 웰컴 키트 기획안(.pdf)\n- 회사 로고 (굿즈 합성용)\n- 구성품 목록 리스트(.txt)",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "hr-recruit",
    "title": "채용 공고 이미지",
    "description": "인재 영입을 위한 시선을 끄는 채용 이미지를 디자인합니다.",
    "category": "HR_LEGAL",
    "icon": "UserPlus",
    "template": "창의적인 채용 공고(Hiring) 이미지. \"We are Hiring\" 텍스트. 열정적인 인재를 찾는 {{concept}} 컨셉 일러스트. 밝고 활기찬 분위기.",
    "fields": [
      {
        "id": "concept",
        "label": "컨셉",
        "placeholder": "예: 로켓에 탑승하는 사람들"
      }
    ],
    "usage": "링크드인이나 채용 사이트에 올릴 썸네일이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 채용 공고문(JD)(.txt)\n- 채용 공고 텍스트 (직무명 등)\n- 기업 아이덴티티를 보여주는 이미지",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "hr-workshop",
    "title": "워크샵/행사 현수막",
    "description": "사내 행사나 워크샵에 사용할 현수막 디자인을 생성합니다.",
    "category": "HR_LEGAL",
    "icon": "Flag",
    "template": "기업 워크샵 현수막 디자인. \"{{text}}\" 문구. 팀워크를 상징하는 그래픽 배경. 자연 풍경(또는 추상적 패턴). 가로로 긴 비율.",
    "fields": [
      {
        "id": "text",
        "label": "문구",
        "placeholder": "예: 2025 상반기 비전 워크샵"
      }
    ],
    "usage": "워크샵 장소에 걸어둘 현수막 디자인이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 행사 기획안(.pdf)\n- 현수막 사이즈 비율 정보\n- 행사 로고나 엠블럼",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "hr-idcard",
    "title": "사원증 디자인",
    "description": "회사의 아이덴티티가 담긴 사원증 목업을 만듭니다.",
    "category": "HR_LEGAL",
    "icon": "BadgeCheck",
    "template": "모던한 기업 사원증(ID Card) 디자인 목업. {{color}} 스트랩. 증명사진과 이름, 직급이 배치됨. 깔끔한 레이아웃. 스마트하고 전문적인 느낌.",
    "fields": [
      {
        "id": "color",
        "label": "포인트 컬러",
        "placeholder": "예: 오렌지"
      }
    ],
    "usage": "사원증 리뉴얼을 고민 중일 때 사용하세요.\n\n[추천 레퍼런스]\n- 사원증 기재 항목(.txt)\n- 회사 로고\n- 사원증 레이아웃 아이디어 스케치",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "ecom-product-grid",
    "title": "쇼핑몰 상품 누끼/배치",
    "description": "흰 배경에 깔끔하게 정돈된 상품 이미지를 생성합니다.",
    "category": "ECOMMERCE",
    "icon": "ShoppingBag",
    "template": "순백색 배경에 고립된 {{product}} 제품 사진. 스튜디오 조명, 부드러운 그림자. 깔끔하고 전문적인 이커머스 스타일.",
    "fields": [
      {
        "id": "product",
        "label": "상품",
        "placeholder": "예: 유기농 화장품 병 세트"
      }
    ],
    "usage": "스마트스토어나 자사몰의 대표 상품 이미지가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 상품 리스트 및 설명(.txt, .csv)\n- 실제 상품 사진 (AI가 형태를 학습하여 깔끔하게 재구성)\n- 경쟁사 상품 이미지 (구도 참고용)",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "ecom-banner",
    "title": "기획전 메인 배너",
    "description": "쇼핑몰 메인에 걸릴 시선을 끄는 배너 이미지를 만듭니다.",
    "category": "ECOMMERCE",
    "icon": "Layout",
    "template": "{{season}} 세일을 위한 이커머스 프로모션 배너. 배경에는 {{props}} 특징. 왼쪽에 텍스트 공간. 밝고 쇼핑 분위기.",
    "fields": [
      {
        "id": "season",
        "label": "시즌/행사",
        "placeholder": "예: 블랙 프라이데이"
      },
      {
        "id": "props",
        "label": "소품",
        "placeholder": "예: 날아다니는 선물 상자와 색종이 조각"
      }
    ],
    "usage": "쇼핑몰 메인 페이지의 대형 배너가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 기획전 기획안(.pdf)\n- 쇼핑몰 로고\n- 배너에 들어갈 문구 텍스트 파일(.txt)",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "ecom-detail-page",
    "title": "제품 상세 페이지 (종합)",
    "description": "상품의 매력을 극대화하는 상세 페이지 레이아웃을 생성합니다.",
    "category": "ECOMMERCE",
    "icon": "FileText",
    "template": "{{product}}에 대한 구매 전환율 높은 이커머스 제품 상세 페이지 디자인 ({{platform}} 레이아웃). 강력한 헤드라인 \"{{headline}}\"이 있는 시각적 위계. 제품 특징, 이점, 라이프스타일 사용을 보여주는 섹션들. 깔끔하고 모던한 웹 디자인 미학, 고해상도.",
    "fields": [
      {
        "id": "platform",
        "label": "디바이스/플랫폼",
        "placeholder": "",
        "options": [
          "Desktop",
          "Smartphone",
          "Tablet"
        ],
        "defaultValue": "Desktop"
      },
      {
        "id": "product",
        "label": "상품명",
        "placeholder": "예: 인체공학적 사무용 의자"
      },
      {
        "id": "headline",
        "label": "메인 카피",
        "placeholder": "예: 하루 종일 편안함"
      }
    ],
    "usage": "상세 페이지의 전체적인 구조와 디자인 레이아웃을 잡을 때 사용하세요.\n\n[추천 레퍼런스]\n- 상품 상세 스펙 문서(.pdf)\n- 제품 정보가 담긴 기획서\n- 제품 사진 및 로고",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "ecom-package",
    "title": "패키지 박스 디자인",
    "description": "배송 박스나 제품 패키징 디자인을 시각화합니다.",
    "category": "ECOMMERCE",
    "icon": "Package",
    "template": "{{product}}을(를) 위한 친환경 패키지 박스 디자인. 크라프트지(또는 매트 화이트) 재질. 미니멀한 로고 인쇄. 감성적인 포장.",
    "fields": [
      {
        "id": "product",
        "label": "제품",
        "placeholder": "예: 수제 비누"
      }
    ],
    "usage": "제품 포장 박스를 제작하기 전 디자인 느낌을 보고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 박스 전개도(Die-line) 이미지\n- 패키지에 넣을 로고 및 라벨 디자인",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "ecom-delivery",
    "title": "배송/물류 일러스트",
    "description": "빠른 배송을 강조하는 귀여운 일러스트를 생성합니다.",
    "category": "ECOMMERCE",
    "icon": "Truck",
    "template": "빠른 배송을 상징하는 3D 일러스트. 고속으로 달리는 {{vehicle}}. 선물 상자가 가득 실려 있음. 속도감 있는 효과. 밝고 명랑한 색감.",
    "fields": [
      {
        "id": "vehicle",
        "label": "운송 수단",
        "placeholder": "예: 귀여운 노란 트럭"
      }
    ],
    "usage": "\"오늘 출발\", \"당일 배송\" 등을 안내할 때 사용할 귀여운 이미지가 필요하면 사용하세요.\n\n[추천 레퍼런스]\n- 배송 안내 문구(.txt)\n- 배송 차량(트럭, 오토바이) 이미지\n- 브랜드 캐릭터 (운전자로 합성용)",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "ecom-review",
    "title": "리뷰 이벤트 배너",
    "description": "고객 리뷰 작성을 유도하는 배너 이미지를 디자인합니다.",
    "category": "ECOMMERCE",
    "icon": "Star",
    "template": "리뷰 이벤트 프로모션 배너. 별 5개 아이콘과 선물 상자 그래픽. \"{{text}}\" 문구. 파스텔 톤의 부드러운 배경. 참여를 유도하는 디자인.",
    "fields": [
      {
        "id": "text",
        "label": "문구",
        "placeholder": "예: 리뷰 쓰고 포인트 받자"
      }
    ],
    "usage": "구매 확정 후 리뷰 작성을 유도하는 팝업이나 배너를 만들 때 사용하세요.\n\n[추천 레퍼런스]\n- 이벤트 혜택 안내(.txt)\n- 제공할 사은품/포인트 이미지",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "food-photo",
    "title": "시그니처 메뉴 연출샷",
    "description": "메뉴판용 고해상도 음식 사진을 촬영합니다.",
    "category": "FOOD",
    "icon": "Pizza",
    "template": "{{food}}의 전문 음식 사진. 치즈가 늘어나고 김이 모락모락 남. 어두운 나무 테이블 배경. 먹음직스러운, 4k, 매크로 샷.",
    "fields": [
      {
        "id": "food",
        "label": "음식",
        "placeholder": "예: 매콤한 페퍼로니 피자"
      }
    ],
    "usage": "배달 앱이나 메뉴판에 넣을 고퀄리티 음식 사진이 없을 때 사용하세요.\n\n[추천 레퍼런스]\n- 메뉴 설명 텍스트(.txt)\n- 실제 음식 조리 사진 (플레이팅 참고용)\n- 원하는 구도의 샘플 사진",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "food-menu-intro",
    "title": "시그니처 메뉴 소개 인포그래픽",
    "description": "대표 메뉴의 재료와 맛 특징을 설명하는 소개 이미지를 만듭니다.",
    "category": "FOOD",
    "icon": "FileText",
    "template": "시그니처 메뉴 \"{{menu_name}}\"의 인포그래픽 소개 포스터. 중앙에는 고품질의 음식 사진. 주요 재료인 {{ingredients}}에 대한 설명선(Callouts). 맛 그래프(단맛, 짠맛, 매운맛 등) 차트 포함. {{theme}} 배경 테마. 전문적인 요리 잡지 스타일.",
    "fields": [
      {
        "id": "menu_name",
        "label": "메뉴 이름",
        "placeholder": "예: 트러플 머쉬룸 파스타"
      },
      {
        "id": "ingredients",
        "label": "주요 재료",
        "placeholder": "예: 이탈리아산 트러플 오일, 양송이"
      },
      {
        "id": "theme",
        "label": "배경 테마",
        "placeholder": "예: 고급스러운 블랙 골드"
      }
    ],
    "usage": "메뉴판 첫 페이지나 매장 입구에 걸어둘 대표 메뉴 설명 포스터로 활용하세요.\n\n[추천 레퍼런스]\n- 레시피 또는 재료 리스트(.txt)\n- 실제 메뉴 사진 (중앙 배치용)\n- 매장 로고",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "food-chalk",
    "title": "카페 입간판/칠판 디자인",
    "description": "손글씨 느낌의 카페 메뉴판을 디자인합니다.",
    "category": "FOOD",
    "icon": "Coffee",
    "template": "검은 이젤 위의 초크 아트 메뉴 보드 디자인. {{drink}} 일러스트. 상단에 예술적인 분필 폰트로 \"{{text}}\"라고 적혀 있음. 아늑한 카페 분위기.",
    "fields": [
      {
        "id": "drink",
        "label": "음료",
        "placeholder": "예: 라떼"
      },
      {
        "id": "text",
        "label": "문구",
        "placeholder": "예: 오늘의 스페셜"
      }
    ],
    "usage": "매장 앞에 둘 입간판(A보드) 디자인 아이디어가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 메뉴 이름과 가격 리스트(.txt)\n- 입간판을 설치할 매장 입구 사진",
    "defaultStyle": "Sketch, pencil drawing"
  },
  {
    "id": "food-banner",
    "title": "시즌 한정 프로모션 배너",
    "description": "이벤트 홍보용 배너 이미지를 생성합니다.",
    "category": "FOOD",
    "icon": "Tag",
    "template": "{{event}}를 위한 프로모션 배너 이미지. 배경은 {{elements}}를 보여줌. 중앙에 크고 굵은 텍스트: \"{{discount}}\". 신선하고 밝고 식욕을 돋우는 색상.",
    "fields": [
      {
        "id": "event",
        "label": "이벤트",
        "placeholder": "예: 여름 세일"
      },
      {
        "id": "elements",
        "label": "배경 요소",
        "placeholder": "예: 열대 과일과 얼음"
      },
      {
        "id": "discount",
        "label": "할인 문구",
        "placeholder": "예: 50% 할인"
      }
    ],
    "usage": "배달 앱의 가게 배너나 SNS 홍보용 이미지를 만들 때 사용하세요.\n\n[추천 레퍼런스]\n- 이벤트 내용 텍스트(.txt)\n- 이벤트 메뉴 사진\n- 가게 로고",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "food-truck",
    "title": "푸드트럭/키오스크 디자인",
    "description": "매장 외관이나 푸드트럭 디자인 컨셉을 확인합니다.",
    "category": "FOOD",
    "icon": "Truck",
    "template": "{{food_type}}을(를) 판매하는 트렌디한 푸드트럭 디자인. {{style}} 스타일의 외관 장식. 네온 간판, 메뉴판. 밤거리 배경. 활기찬 분위기.",
    "fields": [
      {
        "id": "food_type",
        "label": "판매 음식",
        "placeholder": "예: 수제 버거"
      },
      {
        "id": "style",
        "label": "스타일",
        "placeholder": "예: 레트로 아메리칸"
      }
    ],
    "usage": "푸드트럭 창업이나 리뉴얼을 준비 중일 때 사용하세요.\n\n[추천 레퍼런스]\n- 창업 계획서(.pdf)\n- 트럭이나 키오스크의 도면/사진\n- 적용하고 싶은 로고나 그래픽",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "food-ingredient",
    "title": "식재료 패턴/배경",
    "description": "신선한 재료들이 배치된 배경 이미지를 생성합니다.",
    "category": "FOOD",
    "icon": "Carrot",
    "template": "신선한 {{ingredients}}의 플랫 레이(Flat lay) 패턴 배경. 대리석 바닥 위에 예술적으로 배치됨. 밝고 생생한 색감. 메뉴판 배경용.",
    "fields": [
      {
        "id": "ingredients",
        "label": "식재료",
        "placeholder": "예: 레몬, 민트, 얼음"
      }
    ],
    "usage": "메뉴판의 배경이나 트레이에 깔 종이(테이블 매트) 디자인이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 식재료 목록(.txt)\n- 사용할 식재료 사진",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "food-logo",
    "title": "식당/카페 로고 아이디어",
    "description": "매장의 아이덴티티를 나타내는 로고 심볼을 만듭니다.",
    "category": "FOOD",
    "icon": "Utensils",
    "template": "{{store_type}}을(를) 위한 미니멀한 로고 심볼 디자인. {{object}} 형상화. 벡터 그래픽 스타일. 흰색 배경. 깔끔하고 기억에 남는 디자인.",
    "fields": [
      {
        "id": "store_type",
        "label": "매장 종류",
        "placeholder": "예: 스시 전문점"
      },
      {
        "id": "object",
        "label": "형상화 대상",
        "placeholder": "예: 물고기와 젓가락"
      }
    ],
    "usage": "가게 로고를 고민 중일 때 아이디어를 얻는 용도로 사용하세요.\n\n[추천 레퍼런스]\n- 가게 이름 및 컨셉 메모(.txt)\n- 선호하는 로고 스타일 예시",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "fash-magazine",
    "title": "패션 매거진 화보",
    "description": "트렌디한 패션 잡지 화보 컷을 연출합니다.",
    "category": "FASHION",
    "icon": "Camera",
    "template": "{{outfit}}을(를) 입은 모델의 하이패션 잡지 에디토리얼 사진. {{location}}에서 역동적으로 포즈를 취함. 트렌디한 미학, 드라마틱한 조명, 필름 그레인 질감, 보그 스타일.",
    "fields": [
      {
        "id": "outfit",
        "label": "의상 스타일",
        "placeholder": "예: 아방가르드 네온 드레스"
      },
      {
        "id": "location",
        "label": "촬영 장소",
        "placeholder": "예: 미니멀한 콘크리트 스튜디오"
      }
    ],
    "usage": "브랜드 룩북이나 SNS에 올릴 감각적인 화보 사진이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 의상 컨셉 기획안(.pdf)\n- 의상 디자인 스케치나 마네킹 착샷\n- 원하는 포즈 레퍼런스 사진",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "fash-cover",
    "title": "패션 매거진 표지",
    "description": "시즌 트렌드를 반영한 감각적인 잡지 표지를 디자인합니다.",
    "category": "FASHION",
    "icon": "Layout",
    "template": "하이패션 잡지 표지 디자인. {{outfit}}을(를) 입은 모델. 상단에 크고 굵은 타이포그래피 제목 \"{{magazine_title}}\". \"{{headline}}\"에 관한 텍스트 오버레이. 스튜디오 조명, {{season}} 분위기, 전문 그래픽 디자인, 고해상도.",
    "fields": [
      {
        "id": "outfit",
        "label": "의상/모델",
        "placeholder": "예: 럭셔리 레드 실크 드레스"
      },
      {
        "id": "magazine_title",
        "label": "잡지 제호",
        "placeholder": "예: ELLE"
      },
      {
        "id": "headline",
        "label": "메인 헤드라인",
        "placeholder": "예: 봄 컬렉션"
      },
      {
        "id": "season",
        "label": "시즌 분위기",
        "placeholder": "예: 2025년 봄"
      }
    ],
    "usage": "시즌 룩북의 표지나 패션 관련 콘텐츠의 썸네일로 활용하세요.\n\n[추천 레퍼런스]\n- 잡지 제호 및 문구(.txt)\n- 표지 레이아웃 초안\n- 브랜드 로고",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "fash-print",
    "title": "티셔츠 그래픽 프린트",
    "description": "의류에 들어갈 그래픽 아트를 디자인합니다.",
    "category": "FASHION",
    "icon": "Shirt",
    "template": "티셔츠 프린트를 위한 멋진 그래픽 디자인. 주제는 {{theme}}. {{elements}}을(를) 포함. 생생한 색상, 벡터 스타일, 흰색 배경에 고립됨.",
    "fields": [
      {
        "id": "theme",
        "label": "주제",
        "placeholder": "예: 레트로 신스웨이브"
      },
      {
        "id": "elements",
        "label": "요소",
        "placeholder": "예: 석양과 스포츠카"
      }
    ],
    "usage": "티셔츠나 에코백 등에 인쇄할 그래픽 도안이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 아트워크 스타일 레퍼런스 이미지\n- 포함하고 싶은 텍스트나 심볼",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "fash-pattern",
    "title": "원단 패턴 디자인",
    "description": "의류 제작을 위한 텍스타일 패턴을 생성합니다.",
    "category": "FASHION",
    "icon": "Scissors",
    "template": "{{pattern}}을(를) 특징으로 하는 매끄러운 텍스타일 패턴 디자인. 파스텔 핑크와 블루 색상. 우아한 수채화 스타일. 플랫 레이 뷰.",
    "fields": [
      {
        "id": "pattern",
        "label": "무늬",
        "placeholder": "예: 벚꽃과 새"
      }
    ],
    "usage": "의류 원단이나 스카프 등에 들어갈 패턴을 디자인할 때 사용하세요.\n\n[추천 레퍼런스]\n- 패턴의 모티브가 될 자연물 사진\n- 원하는 배색 팔레트",
    "defaultStyle": "Watercolor, soft edges"
  },
  {
    "id": "fash-lookbook",
    "title": "가상 모델 피팅 (룩북)",
    "description": "의상을 착용한 모델의 화보를 생성합니다.",
    "category": "FASHION",
    "icon": "Aperture",
    "template": "{{clothing}}을(를) 입은 모델의 패션 룩북 사진. 스트릿 패션 스타일. {{background}}에 서 있음. 전문 사진 촬영, 부드러운 조명.",
    "fields": [
      {
        "id": "clothing",
        "label": "의상",
        "placeholder": "예: 오버사이즈 데님 재킷"
      },
      {
        "id": "background",
        "label": "배경",
        "placeholder": "예: 그래피티 골목길"
      }
    ],
    "usage": "모델 섭외 없이 의상의 착용 핏이나 코디 느낌을 보고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 의상 설명서(.pdf)\n- 의상 바닥 코디 사진(Flat lay)\n- 의상 상세 디테일 컷",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "fash-mood",
    "title": "패션 무드보드",
    "description": "의류 컬렉션 기획을 위한 색감 및 소재 무드보드를 생성합니다.",
    "category": "FASHION",
    "icon": "Palette",
    "template": "{{collection_theme}}을(를) 위한 패션 디자인 무드 보드. {{colors}} 색상 팔레트. {{fabrics}}의 질감. 콜라주 스타일, 하이패션 미학.",
    "fields": [
      {
        "id": "collection_theme",
        "label": "컬렉션 테마",
        "placeholder": "예: 어반 윈터 2025"
      },
      {
        "id": "colors",
        "label": "색상 팔레트",
        "placeholder": "예: 쿨 그레이와 네온 블루"
      },
      {
        "id": "fabrics",
        "label": "소재",
        "placeholder": "예: 울과 나일론"
      }
    ],
    "usage": "새로운 패션 컬렉션을 기획할 때 영감을 정리하는 용도로 사용하세요.\n\n[추천 레퍼런스]\n- 컬렉션 기획안(.pdf)\n- 영감받은 사진 이미지\n- 원단 스와치(샘플) 사진",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "fash-acc-mockup",
    "title": "잡화/액세서리 목업",
    "description": "가방, 신발, 모자 등의 디자인 시안을 확인합니다.",
    "category": "FASHION",
    "icon": "Box",
    "template": "{{accessory_item}}의 제품 목업. 미니멀리스트 패션 스튜디오 배경. 부드러운 조명, {{material}}의 높은 질감 디테일. 4K 해상도.",
    "fields": [
      {
        "id": "accessory_item",
        "label": "아이템 종류",
        "placeholder": "예: 가죽 토트백"
      },
      {
        "id": "material",
        "label": "주요 재질",
        "placeholder": "예: 갈색 빈티지 가죽"
      }
    ],
    "usage": "가방이나 지갑 등 잡화 디자인의 재질감을 확인하고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 제품 사양서(.pdf)\n- 잡화 디자인 스케치\n- 가죽/천 질감 샘플 이미지",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "fash-jewelry",
    "title": "주얼리 렌더링",
    "description": "반지, 목걸이 등 주얼리 디자인을 시각화합니다.",
    "category": "FASHION",
    "icon": "Gem",
    "template": "{{gem}}이(가) 세팅된 럭셔리 {{jewelry_type}} 디자인. 3D 렌더링. 반짝이는 금속과 보석의 광채. 벨벳 받침대 위. 우아하고 섬세한 디테일.",
    "fields": [
      {
        "id": "jewelry_type",
        "label": "종류",
        "placeholder": "예: 다이아몬드 약혼 반지"
      },
      {
        "id": "gem",
        "label": "보석",
        "placeholder": "예: 사파이어"
      }
    ],
    "usage": "반지나 목걸이 등 주얼리 디자인 시안을 볼 때 사용하세요.\n\n[추천 레퍼런스]\n- 보석 감정서(.pdf)\n- 주얼리 세공 도면 스케치\n- 보석 컷팅 스타일 예시",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "fash-shoes",
    "title": "스니커즈/신발 디자인",
    "description": "새로운 스타일의 신발 컨셉 아트를 생성합니다.",
    "category": "FASHION",
    "icon": "Footprints",
    "template": "{{style}} 스타일의 혁신적인 스니커즈 디자인 컨셉. {{material}} 소재와 독특한 밑창 디자인. 역동적인 앵글. 제품 광고 샷.",
    "fields": [
      {
        "id": "style",
        "label": "스타일",
        "placeholder": "예: 미래지향적 청키 스니커즈"
      },
      {
        "id": "material",
        "label": "소재",
        "placeholder": "예: 네온 메시와 가죽"
      }
    ],
    "usage": "신발 디자인 아이디어가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 신발 컨셉 스케치\n- 신발 옆모습 스케치\n- 밑창(Outsole) 디자인 아이디어",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "fash-runway",
    "title": "패션쇼 런웨이 무대",
    "description": "패션쇼 무대 디자인이나 쇼 분위기를 시각화합니다.",
    "category": "FASHION",
    "icon": "Video",
    "template": "패션쇼 런웨이 무대 디자인. {{theme}} 테마. 장식. 모델이 걸어나오는 조명 효과. 양옆의 관객들(실루엣). 웅장하고 드라마틱한 분위기.",
    "fields": [
      {
        "id": "theme",
        "label": "테마",
        "placeholder": "예: 얼음 왕국"
      }
    ],
    "usage": "패션쇼 무대 연출을 기획할 때 사용하세요.\n\n[추천 레퍼런스]\n- 쇼 큐시트(.csv)\n- 무대 배치도(Flat plan)\n- 조명 레퍼런스 이미지",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "edu-infographic",
    "title": "교육용 인포그래픽",
    "description": "복잡한 개념을 시각적으로 설명하는 자료를 생성합니다.",
    "category": "EDUCATION",
    "icon": "PieChart",
    "template": "{{topic}}을(를) 설명하는 교육용 인포그래픽 포스터. 학생들을 위한 디자인. 핵심 개념: {{concepts}}. 깔끔한 레이아웃, 컬러풀한 벡터 아이콘, 정리된 섹션, 흰색 배경. 높은 가독성.",
    "fields": [
      {
        "id": "topic",
        "label": "주제",
        "placeholder": "예: 태양계"
      },
      {
        "id": "concepts",
        "label": "핵심 개념",
        "placeholder": "예: 행성, 궤도, 태양"
      }
    ],
    "usage": "수업 자료나 발표에 사용할 시각 자료가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 수업 교안(.pdf)\n- 교과서 내용 요약 텍스트\n- 인포그래픽에 포함할 데이터나 도표 스케치",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "edu-problem-solver",
    "title": "문제 풀이/해설 시각화",
    "description": "질문이나 문제 이미지를 입력하면 단계별 풀이 인포그래픽을 만듭니다.",
    "category": "EDUCATION",
    "icon": "HelpCircle",
    "template": "교육용 문제 풀이 해설 인포그래픽. 주제: {{problem}}. 단계별 해결 과정(Step-by-step solution)을 시각적으로 보여줌. 칠판 스타일(또는 깔끔한 노트 스타일). 수학/과학적 도표와 하이라이트 포함. \"Q&A\" 및 \"Solution\" 섹션 구분. 명확하고 논리적인 레이아웃.",
    "fields": [
      {
        "id": "problem",
        "label": "문제 내용/주제",
        "placeholder": "예: 피타고라스의 정리 증명"
      }
    ],
    "usage": "수학이나 과학 문제의 풀이 과정을 시각적으로 보여주고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 문제 텍스트 파일(.txt)\n- **필수**: 문제지 사진 또는 손으로 쓴 문제 이미지\n- 풀이 과정 메모",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "edu-timeline",
    "title": "역사 타임라인 인포그래픽",
    "description": "역사적 사건의 흐름을 한눈에 보여주는 연표를 생성합니다.",
    "category": "EDUCATION",
    "icon": "Clock",
    "template": "{{history_topic}}에 대한 역사적 타임라인 인포그래픽. 가로(또는 세로) 스크롤 형식의 연표 디자인. 주요 사건들이 아이콘과 날짜로 표시됨. 빈티지 지도 배경 (또는 모던한 플랫 스타일). 교육적이고 정보가 풍부함.",
    "fields": [
      {
        "id": "history_topic",
        "label": "역사 주제",
        "placeholder": "예: 한국 삼국시대의 발전"
      }
    ],
    "usage": "역사 수업이나 연대기 설명이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 역사 연표 데이터(.csv)\n- 사건명과 연도 리스트\n- 관련 역사 지도 이미지",
    "defaultStyle": "Vintage poster, retro colors"
  },
  {
    "id": "edu-flashcard",
    "title": "언어 학습용 플래시 카드",
    "description": "단어와 그림이 함께 있는 교육 자료를 만듭니다.",
    "category": "EDUCATION",
    "icon": "BookOpen",
    "template": "어린이를 위한 귀여운 교육용 플래시 카드. {{object}} 일러스트. 흰색 배경. 그림 아래에 크고 친근한 폰트로 \"{{text}}\"라고 명확하게 쓰여 있음. 벡터 아트 스타일.",
    "fields": [
      {
        "id": "object",
        "label": "대상",
        "placeholder": "예: 빨간 사과"
      },
      {
        "id": "text",
        "label": "단어",
        "placeholder": "예: 사과"
      }
    ],
    "usage": "유아용 단어 카드나 외국어 학습 교구를 만들 때 사용하세요.\n\n[추천 레퍼런스]\n- 단어 리스트(.txt, .csv)",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "edu-history",
    "title": "역사적 사건 재연",
    "description": "역사적 장면을 생생한 실사로 구현합니다.",
    "category": "EDUCATION",
    "icon": "Hourglass",
    "template": "{{event}}의 사실적인 재구성. 고대 노동자들, 사막 풍경, 밝은 햇빛. 역사적 고증, 8k 해상도, 시네마틱 샷.",
    "fields": [
      {
        "id": "event",
        "label": "역사적 사건/장소",
        "placeholder": "예: 이집트 피라미드 건설"
      }
    ],
    "usage": "교과서에 나오는 역사적 장면을 실사처럼 생생하게 보여주고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 사건 설명 자료(.pdf)\n- 역사적 고증 자료 (복식, 건축물 사진)\n- 박물관 유물 사진",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "edu-science",
    "title": "과학 원리 도해 (3D 단면)",
    "description": "복잡한 과학 원리나 신체 구조를 시각화합니다.",
    "category": "EDUCATION",
    "icon": "Microscope",
    "template": "{{target}}의 3D 단면도 다이어그램. 내부 공간과 질감을 보여줌. 교육적인 스타일, 깔끔한 배경, 높은 디테일, 의학 일러스트 스타일.",
    "fields": [
      {
        "id": "target",
        "label": "과학 대상",
        "placeholder": "예: 인간의 심장"
      }
    ],
    "usage": "생물이나 기계의 내부 구조를 설명할 때 사용하세요.\n\n[추천 레퍼런스]\n- 원리 설명 텍스트(.txt)\n- 교과서 도해 스케치 이미지\n- 구조를 설명하는 다이어그램",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "edu-certificate",
    "title": "상장/수료증 디자인",
    "description": "공식적인 상장이나 수료증 양식을 디자인합니다.",
    "category": "EDUCATION",
    "icon": "Award",
    "template": "{{award_name}}을(를) 위한 우아한 상장(인증서) 디자인 프레임. 금박 테두리 장식, 고급스러운 종이 질감. 중앙에 내용을 적을 빈 공간 확보. 클래식하고 권위 있는 스타일.",
    "fields": [
      {
        "id": "award_name",
        "label": "상장 명칭",
        "placeholder": "예: 최우수 과학상"
      }
    ],
    "usage": "학교나 학원의 상장, 수료증 양식이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 상장 내용 및 명단(.csv)\n- 학교/기관 로고",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "edu-lab",
    "title": "과학 실험실 풍경",
    "description": "실험 도구가 배치된 과학실 배경을 생성합니다.",
    "category": "EDUCATION",
    "icon": "FlaskConical",
    "template": "현대적인 과학 실험실 배경. 책상 위에 놓인 {{tools}}. 비커, 현미경, 노트북. 밝고 깨끗한 조명. 뒤쪽 칠판에는 복잡한 수식이 적혀 있음.",
    "fields": [
      {
        "id": "tools",
        "label": "주요 도구",
        "placeholder": "예: 형형색색의 화학 약품"
      }
    ],
    "usage": "과학 관련 콘텐츠의 배경이나 실험실 분위기를 연출하고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 실험 도구 리스트(.txt)\n- 원하는 실험실 분위기 사진",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "med-anatomy",
    "title": "의학 해부도 (교육용)",
    "description": "깔끔하고 정확한 인체 해부도 일러스트를 생성합니다.",
    "category": "MEDICAL",
    "icon": "Activity",
    "template": "{{body_part}}의 의학 해부학 일러스트. 상세한 라벨링 스타일 (깔끔한 선). 흰색 배경. 전문 의학 교과서 스타일. 3D 렌더링.",
    "fields": [
      {
        "id": "body_part",
        "label": "신체 부위",
        "placeholder": "예: 척추 구조"
      }
    ],
    "usage": "환자에게 병명이나 수술 부위를 설명할 때 시각 자료로 활용하세요.\n\n[추천 레퍼런스]\n- 진료 기록 요약(.txt)\n- 설명하고자 하는 부위의 간략한 스케치",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "med-clinic",
    "title": "병원 인테리어 디자인",
    "description": "환자에게 신뢰감을 주는 병원 대기실/진료실 디자인입니다.",
    "category": "MEDICAL",
    "icon": "PlusSquare",
    "template": "현대적인 {{clinic_type}} 인테리어 디자인. 깨끗한 흰색과 {{accent_color}} 색상 조합. 편안한 대기 공간, 밝은 조명. 위생적이고 차분한 분위기.",
    "fields": [
      {
        "id": "clinic_type",
        "label": "병원 종류",
        "placeholder": "예: 치과 로비"
      },
      {
        "id": "accent_color",
        "label": "포인트 컬러",
        "placeholder": "예: 민트 그린"
      }
    ],
    "usage": "개원이나 리모델링을 앞두고 병원 인테리어 컨셉을 잡을 때 사용하세요.\n\n[추천 레퍼런스]\n- 인테리어 요구사항(.pdf)\n- 병원 평면도\n- 선호하는 인테리어 스타일 사진",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "med-supple",
    "title": "건강기능식품 패키지/광고",
    "description": "건강하고 활력 넘치는 느낌의 제품 이미지를 연출합니다.",
    "category": "MEDICAL",
    "icon": "Package",
    "template": "건강 보조 식품 제품 광고 이미지. 자연({{background}}) 속에 놓인 병. 신선한 햇살, 유기농 분위기. 활력과 웰니스 테마.",
    "fields": [
      {
        "id": "background",
        "label": "배경 자연물",
        "placeholder": "예: 푸른 잎과 물 튀김"
      }
    ],
    "usage": "비타민이나 영양제 상세페이지에 들어갈 연출컷이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 제품 패키지 파일(이미지, .pdf)\n- 제품 병/패키지 디자인 파일\n- 제품 로고",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "med-micro",
    "title": "미생물/세포 현미경 뷰",
    "description": "세포나 바이러스의 고해상도 확대 이미지를 생성합니다.",
    "category": "MEDICAL",
    "icon": "Binary",
    "template": "{{cell_type}}의 전자 현미경 확대 이미지. 3D 렌더링, 신비로운 색감. 의학적 연구 자료 스타일. 고해상도 디테일.",
    "fields": [
      {
        "id": "cell_type",
        "label": "세포 종류",
        "placeholder": "예: 면역 세포와 바이러스"
      }
    ],
    "usage": "의학 관련 발표 자료나 블로그에 사용할 미시적인 이미지가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 연구 논문 요약(.txt)\n- 현미경 관찰 사진 (참고용)",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "med-poster",
    "title": "공중 보건 포스터",
    "description": "건강 캠페인이나 예방 수칙 포스터를 디자인합니다.",
    "category": "MEDICAL",
    "icon": "AlertCircle",
    "template": "{{campaign}}에 대한 공중 보건 캠페인 포스터. 친근하고 안심시키는 일러스트 스타일. 명확한 메시지 전달을 위한 공간. 파스텔 톤 의료 색상.",
    "fields": [
      {
        "id": "campaign",
        "label": "캠페인 주제",
        "placeholder": "예: 올바른 손 씻기"
      }
    ],
    "usage": "병원 내 게시판이나 보건소에서 사용할 건강 캠페인 포스터를 만들 때 사용하세요.\n\n[추천 레퍼런스]\n- 캠페인 안내문(.pdf)\n- 캠페인 문구 텍스트\n- 병원/기관 로고",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "int-atmosphere",
    "title": "시간대 및 날씨 변환",
    "description": "흐린 날이나 밤 사진을 화창한 낮이나 노을 진 저녁으로 변경합니다.",
    "category": "INTERIOR",
    "icon": "Sun",
    "template": "{{room_desc}}의 인테리어/외관 사진. {{weather_time}}의 자연스러운 조명과 분위기. 고품질 부동산 사진 스타일.",
    "fields": [
      {
        "id": "room_desc",
        "label": "공간 설명",
        "placeholder": "예: 모던한 거실"
      },
      {
        "id": "weather_time",
        "label": "원하는 시간/날씨",
        "placeholder": "예: 오후 2시의 따사로운 햇살"
      }
    ],
    "usage": "매물의 가장 아름다운 순간을 연출하고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- **필수**: 원본 매물 사진\n- 원하는 분위기의 레퍼런스 이미지",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "int-signage",
    "title": "부동산 안내판 생성",
    "description": "이미지 내의 텍스트를 수정하거나 새로운 안내판을 합성합니다.",
    "category": "INTERIOR",
    "icon": "Type",
    "template": "부동산 안내판 디자인. \"{{text}}\"라는 한글 문구가 명확하게 적혀 있음. {{style}} 스타일. 고해상도, 가독성 높음.",
    "fields": [
      {
        "id": "text",
        "label": "안내 문구",
        "placeholder": "예: 주차 금지"
      },
      {
        "id": "style",
        "label": "디자인 스타일",
        "placeholder": "예: 깔끔한 노란색 표지판"
      }
    ],
    "usage": "매물 사진 내의 텍스트를 수정하거나 브로슈어용 안내문을 만들 때 사용하세요.\n\n[추천 레퍼런스]\n- 텍스트를 수정할 원본 사진",
    "defaultStyle": "Vector illustration, flat"
  },
  {
    "id": "int-iso-plan",
    "title": "3D 평면도/조감도 변환",
    "description": "2D 도면을 이해하기 쉬운 3D 아이소메트릭 뷰로 변환합니다.",
    "category": "INTERIOR",
    "icon": "Layers",
    "template": "{{plan_desc}}의 3D 아이소메트릭(Isometric) 뷰. 벽체와 문 위치 반영. 바닥은 {{flooring}} 마감. 따뜻한 조명. 언리얼 엔진 5 렌더링.",
    "fields": [
      {
        "id": "plan_desc",
        "label": "공간 설명",
        "placeholder": "예: 방 3개 아파트 평면도"
      },
      {
        "id": "flooring",
        "label": "바닥 마감",
        "placeholder": "예: 헤링본 마루"
      }
    ],
    "usage": "일반인이 이해하기 어려운 2D 도면을 입체적으로 보여줄 때 사용하세요.\n\n[추천 레퍼런스]\n- **필수**: 흑백 2D 평면도 이미지\n- 인테리어 마감재 리스트",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "int-drone",
    "title": "드론 뷰/주변 합성",
    "description": "건물 주변에 녹지나 환경이 조성된 항공 샷을 생성합니다.",
    "category": "INTERIOR",
    "icon": "Plane",
    "template": "{{building}}의 100미터 상공 드론 뷰(Aerial shot). 주변에는 {{surroundings}}이(가) 조성되어 있음. 맑은 날씨, 광각 렌즈, 건축 시각화 스타일.",
    "fields": [
      {
        "id": "building",
        "label": "건물 설명",
        "placeholder": "예: 현대적인 유리 외벽 빌딩"
      },
      {
        "id": "surroundings",
        "label": "주변 환경",
        "placeholder": "예: 울창한 녹지 공원"
      }
    ],
    "usage": "드론 촬영이 어렵거나 아직 조경이 완공되지 않은 건물의 조감도가 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 건물 외관 사진\n- 주변 배치도",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "int-staging",
    "title": "가상 홈 스테이징",
    "description": "빈 공간을 원하는 스타일의 가구로 채웁니다.",
    "category": "INTERIOR",
    "icon": "Home",
    "template": "{{room_type}}의 인테리어 디자인 사진. {{style}} 스타일로 꾸며짐. 베이지색 소파, 나무 커피 테이블, 창문으로 들어오는 햇살, 아늑한 분위기. 실사, 4K.",
    "fields": [
      {
        "id": "room_type",
        "label": "방 종류",
        "placeholder": "예: 작은 거실"
      },
      {
        "id": "style",
        "label": "인테리어 스타일",
        "placeholder": "예: 북유럽 미니멀리스트"
      }
    ],
    "usage": "부동산 매물 사진이 비어있거나 썰렁할 때, 가상으로 가구를 배치해보고 싶다면 사용하세요.\n\n[추천 레퍼런스]\n- 매물 정보서(.pdf)\n- **필수**: 가구가 없는 빈 방 사진\n- 원하는 가구 스타일 레퍼런스",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "int-facade",
    "title": "건물 외관 리모델링",
    "description": "건물 외관 디자인 시안을 미리 확인합니다.",
    "category": "INTERIOR",
    "icon": "Building",
    "template": "{{building_type}} 파사드의 건축 시각화. {{materials}}을(를) 사용한 현대적인 외관 디자인. 거리 뷰, 낮, 푸른 하늘.",
    "fields": [
      {
        "id": "building_type",
        "label": "건물 유형",
        "placeholder": "예: 2층 카페 건물"
      },
      {
        "id": "materials",
        "label": "자재",
        "placeholder": "예: 붉은 벽돌과 검은 철제 프레임"
      }
    ],
    "usage": "노후된 건물의 리모델링 후 모습을 예상해보고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 건축물 현황도(.pdf)\n- 현재 건물 외관 사진\n- 사용하고 싶은 외장재 샘플 이미지",
    "defaultStyle": "Photorealistic, 8k"
  },
  {
    "id": "int-mood",
    "title": "무드보드(재질/색감)",
    "description": "인테리어 컨셉 보드를 생성합니다.",
    "category": "INTERIOR",
    "icon": "Palette",
    "template": "{{concept}}을(를) 위한 인테리어 디자인 무드 보드. {{colors}} 색상 팔레트. 대리석, 벨벳, 황동의 질감. 콜라주 스타일, 예술적 배치.",
    "fields": [
      {
        "id": "concept",
        "label": "컨셉",
        "placeholder": "예: 럭셔리 호텔 로비"
      },
      {
        "id": "colors",
        "label": "색상",
        "placeholder": "예: 금색, 남색, 흰색"
      }
    ],
    "usage": "인테리어 클라이언트 미팅 시 전체적인 컨셉을 제안할 때 사용하세요.\n\n[추천 레퍼런스]\n- 고객 요구사항 정리(.txt)\n- 클라이언트가 선호하는 이미지\n- 마감재 샘플 사진",
    "defaultStyle": "Minimalist, flat design"
  },
  {
    "id": "int-pattern",
    "title": "벽지/패브릭 패턴",
    "description": "인테리어에 사용할 벽지나 커튼의 패턴을 디자인합니다.",
    "category": "INTERIOR",
    "icon": "Grid",
    "template": "{{motif}}을(를) 특징으로 하는 매끄러운 벽지 텍스처 패턴. {{color_tone}} 색조. 인테리어 디자인 자재 스타일. 플랫 레이 뷰, 고품질 텍스처.",
    "fields": [
      {
        "id": "motif",
        "label": "무늬 주제",
        "placeholder": "예: 다마스크 꽃"
      },
      {
        "id": "color_tone",
        "label": "색조",
        "placeholder": "예: 따뜻한 베이지와 금색"
      }
    ],
    "usage": "특정한 무늬의 벽지나 패브릭이 필요할 때 사용하세요.\n\n[추천 레퍼런스]\n- 패턴 모티브 스케치\n- 색상 팔레트 이미지",
    "defaultStyle": "Watercolor, soft edges"
  },
  {
    "id": "int-kitchen",
    "title": "주방/키친 디자인",
    "description": "최신 트렌드의 주방 인테리어를 시각화합니다.",
    "category": "INTERIOR",
    "icon": "Coffee",
    "template": "모던한 {{style}} 스타일의 주방 인테리어. 아일랜드 식탁, 빌트인 가전, {{material}} 상판. 펜던트 조명. 고급스럽고 깔끔한 마감.",
    "fields": [
      {
        "id": "style",
        "label": "스타일",
        "placeholder": "예: 미드 센추리 모던"
      },
      {
        "id": "material",
        "label": "상판 재질",
        "placeholder": "예: 화이트 대리석"
      }
    ],
    "usage": "주방 리모델링 시 상판 재질이나 전체적인 스타일을 결정하기 어려울 때 사용하세요.\n\n[추천 레퍼런스]\n- 주방 설계 도면(.pdf, 이미지)\n- 주방 평면도\n- 원하는 타일/상판 샘플",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "int-garden",
    "title": "조경/정원 디자인",
    "description": "건물 주변의 조경이나 정원 디자인을 생성합니다.",
    "category": "INTERIOR",
    "icon": "TreePine",
    "template": "{{garden_type}} 조경 디자인 렌더링. {{plants}}와 돌길이 있는 정원. 야외 가구 배치. 평화롭고 자연친화적인 분위기. 주광.",
    "fields": [
      {
        "id": "garden_type",
        "label": "정원 종류",
        "placeholder": "예: 옥상 정원"
      },
      {
        "id": "plants",
        "label": "식물 구성",
        "placeholder": "예: 대나무와 작은 연못"
      }
    ],
    "usage": "전원주택이나 옥상 정원을 꾸밀 때 식재 계획을 세우는 용도로 사용하세요.\n\n[추천 레퍼런스]\n- 식재 계획 목록(.csv)\n- 정원 부지 사진\n- 심고 싶은 식물 리스트",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "evt-wedding",
    "title": "청첩장 디자인 소스",
    "description": "우아하고 고급스러운 청첩장 배경을 생성합니다.",
    "category": "EVENT",
    "icon": "Heart",
    "template": "청첩장 카드 배경 디자인. {{flowers}}을(를) 특징으로 하는 꽃 프레임. 부드러운 파스텔 {{color}} 색상 테마. 우아한 캘리그라피 분위기. 중앙 공간은 텍스트를 위해 비워둠.",
    "fields": [
      {
        "id": "flowers",
        "label": "꽃 종류",
        "placeholder": "예: 흰 장미와 유칼립투스"
      },
      {
        "id": "color",
        "label": "테마 색상",
        "placeholder": "예: 더스티 핑크와 골드"
      }
    ],
    "usage": "셀프 청첩장을 만들 때 배경 이미지가 필요하다면 사용하세요.\n\n[추천 레퍼런스]\n- 청첩장 문구(.txt)\n- 웨딩홀 분위기 사진 (색감 참고용)\n- 좋아하는 꽃 이미지",
    "defaultStyle": "Watercolor, soft edges"
  },
  {
    "id": "evt-stage",
    "title": "무대/행사장 디자인",
    "description": "콘서트나 컨퍼런스 무대 디자인 시안을 확인합니다.",
    "category": "EVENT",
    "icon": "Music",
    "template": "{{event_type}}을(를) 위한 무대 디자인 시각화. {{visuals}}을(를) 보여주는 대형 LED 스크린. 스포트라이트와 레이저 빔. 전경의 관중(실루엣). 에너지 넘치는 분위기.",
    "fields": [
      {
        "id": "event_type",
        "label": "행사 종류",
        "placeholder": "예: 락 콘서트"
      },
      {
        "id": "visuals",
        "label": "화면 연출",
        "placeholder": "예: 은하수와 별"
      }
    ],
    "usage": "행사 기획 단계에서 무대 연출 시안을 클라이언트에게 보여줄 때 사용하세요.\n\n[추천 레퍼런스]\n- 무대 도면(이미지)\n- 큐시트 및 연출안(.pdf)\n- 행사 로고 및 비주얼 키(Visual Key)",
    "defaultStyle": "Cyberpunk, neon lights"
  },
  {
    "id": "evt-party",
    "title": "파티/이벤트 포토존",
    "description": "행사장 포토존 데코레이션 아이디어를 생성합니다.",
    "category": "EVENT",
    "icon": "Camera",
    "template": "{{party_theme}}을(를) 위한 포토 부스 배경 디자인. {{decorations}}로 장식됨. \"Happy Day\"라고 적힌 네온 사인. 축제 분위기, 인스타감성.",
    "fields": [
      {
        "id": "party_theme",
        "label": "파티 테마",
        "placeholder": "예: 열대 썸머 파티"
      },
      {
        "id": "decorations",
        "label": "장식 요소",
        "placeholder": "예: 플라밍고와 야자수 잎"
      }
    ],
    "usage": "행사장에 설치할 포토존 디자인이 고민될 때 사용하세요.\n\n[추천 레퍼런스]\n- 행사 기획 문서(.pdf)\n- 포토존 설치 공간 사진\n- 행사 타이틀 로고",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "evt-balloon",
    "title": "풍선 아트/데코레이션",
    "description": "이벤트 공간을 채울 풍선 장식 아이디어를 만듭니다.",
    "category": "EVENT",
    "icon": "Circle",
    "template": "{{color}} 색상 테마의 화려한 풍선 아치와 장식. {{event_nature}} 행사를 위한 공간 연출. 금박 색종이, 리본. 축하하는 분위기.",
    "fields": [
      {
        "id": "event_nature",
        "label": "행사 성격",
        "placeholder": "예: 아기 돌잔치"
      },
      {
        "id": "color",
        "label": "색상 테마",
        "placeholder": "예: 파스텔 블루와 실버"
      }
    ],
    "usage": "돌잔치나 기념일 파티의 풍선 장식 색 조합을 미리 보고 싶을 때 사용하세요.\n\n[추천 레퍼런스]\n- 행사 장소 인테리어 사진\n- 원하는 색상 팔레트",
    "defaultStyle": "3D Render, Unreal Engine 5"
  },
  {
    "id": "evt-badge",
    "title": "컨퍼런스 명찰/목걸이",
    "description": "행사 참가자용 ID 카드 및 목걸이 줄 디자인을 생성합니다.",
    "category": "EVENT",
    "icon": "UserCheck",
    "template": "{{conf_name}} 컨퍼런스를 위한 참가자 ID 배지 및 목걸이(Lanyard) 디자인. 전문적이고 깔끔한 레이아웃. QR 코드와 이름 영역. 기업 브랜딩 스타일.",
    "fields": [
      {
        "id": "conf_name",
        "label": "컨퍼런스 이름",
        "placeholder": "예: AI Tech Summit 2025"
      }
    ],
    "usage": "대규모 행사나 컨퍼런스의 명찰 디자인을 할 때 사용하세요.\n\n[추천 레퍼런스]\n- 참가자 명단 및 소속 정보(.csv)\n- 행사 로고\n- 스폰서 로고 리스트",
    "defaultStyle": "Minimalist, flat design"
  }
];
