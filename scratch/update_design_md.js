const fs = require('fs');

let content = fs.readFileSync('DESIGN.md', 'utf8');

const templateSnippet = `| **36. 유튜브 쇼츠 무한루프 퓨어 크리에이터 레드·화이트 스타일<br>(YouTube Shorts Infinite Loop Pure Creator Red & White Style)** | **무한루프 영상자동화 제안 시안 1** (\`infinite-loop-video\`, \`v1.10\` 제안 시안 1) | 퓨어 화이트 (\`#FFFFFF\`) & 쿨 그레이 (\`#F8FAFC\`) & 유튜브 쇼츠 레드 (\`#FF0000\` / \`#EA3323\`) | 유튜브 쇼츠 크리에이터 감성 일체화, 9:16 모바일 뷰파인더 목업 덱, 3D 엠보싱 레드 버튼 | 숏폼/릴스 무한루프 제작, 크리에이터 비디오 스튜디오 |
| **37. 쇼츠 네온 루프 캔디 핑크·사이언 스튜디오 스타일<br>(Shorts Neon Loop Candy Pink-Cyan Studio Style)** | **무한루프 영상자동화 제안 시안 2** (\`infinite-loop-video\`, \`v1.10\` 제안 시안 2) | 다크 미드나잇 퍼플 (\`#0B0716\`) & 네온 캔디 핑크 (\`#EC4899\`) & 사이버 사이언 (\`#06B6D4\`) | Z세대 틱톡/릴스 팝 네온 비주얼, 듀얼 컬러 네온 타임라인, 3D 엠보싱 핑크 버튼 | 팝 네온 숏폼, 틱톡 바이럴 비디오, Z세대 타깃 릴스 |
| **38. 프로 크리에이터 슬레이트 NLE 랩 스타일<br>(Pro Creator Slate NLE Lab Style)** | **무한루프 영상자동화 공식 채택안** (\`infinite-loop-video\`, \`v1.10\` 공식 배포) | 스튜디오 클린 화이트 (\`#FFFFFF\`) & 슬레이트 그레이 (\`#F1F5F9\`) & 앰버 골드 (\`#F59E0B\`) & 코발트 블루 (\`#2563EB\`) | 전문가용 NLE 비디오 편집기 & 숏폼 랩, NLE 정밀 타임라인 트랙 매트릭스, 3D 엠보싱 앰버 버튼 | 전문가용 영상 NLE 편집기, 정밀 루프 비디오 제작 |
| **39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 스타일<br>(Coupang Rocket Seller WING Red & Blue Studio Style)** | **쿠팡 WING 셀러 자동화 추천 1안** (\`coupang-ops\`, \`v1.0\` 제안 1안) | 퓨어 화이트 & 쿨 그레이 (\`#F8FAFC\`) & 아이코닉 쿠팡 로켓 레드 (\`#E31A22\` / \`#ED1C24\`) & 로켓 블루 (\`#0073E9\`) | 쿠팡 WING 공식 셀러 센터 감성, 4대 핵심 KPI 카드 덱, 3D 로켓 레드 엠보싱 버튼(\`.btn-3d-coupang-red\`), 긴급 위기 알림 덱 | 쿠팡 WING 셀러 자동화, 대량 상품 등록, 최저가 위너 매칭 스튜디오 |
| **40. 쿠팡 로켓 배송 옐로우·네이비 물류 대시보드 스타일<br>(Coupang Rocket Delivery Yellow & Navy Logistics Dashboard Style)** | **쿠팡 WING 셀러 자동화 시안 2** (\`coupang-ops\`, \`v1.0\` 제안 2안) | 볼드 로켓 옐로우 (\`#FFB800\` / \`#F59E0B\`) & 딥 로켓 네이비 (\`#0F172A\` / \`#1E293B\`) & 소프트 그레이 | 로켓배송 특유의 스피드와 에너지, 풀필먼트 물동량 게이지, 실시간 배송/반품 모니터링 데크, 3D 엠보싱 옐로우 버튼 | 쿠팡 풀필먼트/로켓배송 물류 관제, 주문/반품 패스트 트래커 |
| **41. 쿠팡 아이템위너 알고리즘 데이터 인텔리전스 랩 스타일<br>(Coupang Item Winner Algorithm Data Intelligence Lab Style)** | **쿠팡 WING 셀러 자동화 시안 3** (\`coupang-ops\`, \`v1.0\` 제안 3안) | 스마트 클린 슬레이트 화이트 (\`#F8FAFC\`) & 로열 인디고 블루 (\`#1D4ED8\`) & 위너 에메랄드 (\`#059669\`) | 알고리즘 기반 아이템위너 쟁탈전 분석 데크, 24시간 실시간 최저가 매칭 차트, 마진 하한선 실시간 수식 제어 콘솔, 3D 엠보싱 인디고 버튼 | 이커머스 최저가 위너 탈환 알고리즘, 가격 모니터링 및 마진 시뮬레이터 |
`;

if (!content.includes('39. 쿠팡 로켓 셀러 윙')) {
  const targetLine = '| **35. 틱톡·릴스 팝 네온 민트 라임 크리에이터 랩 스타일<br>(TikTok·Reels Pop Neon Mint-Lime Creator Lab Style)**';
  const pos = content.indexOf(targetLine);
  if (pos !== -1) {
    const endOfLine = content.indexOf('\n', pos);
    content = content.slice(0, endOfLine + 1) + templateSnippet + content.slice(endOfLine + 1);
    console.log('Successfully added templates 36-41 to DESIGN.md');
  } else {
    console.warn('Target line for templates 36-41 not found');
  }
}

const programRow = '| 90 | 쿠팡 WING 셀러 자동화 스튜디오 | `coupang-ops` | **39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 스타일 (추천 1안)**<br>• 유형: 쿠팡 WING 공식 셀러 센터 감성 고화질 스튜디오<br>• 스타일: 퓨어 화이트 & 쿨 그레이 + 쿠팡 로켓 레드 & 로켓 블루 + 3D 엠보싱 버튼<br>• 선정이유: WING 공식 감성 일체화, 4대 핵심 KPI 카드 덱 및 위너 탈환 긴급 액션 콘솔 탑재 | 라이트(퓨어 화이트 `#ffffff` + 로켓 레드 `#e31a22`·로켓 블루 `#0073e9`) | 📋 4대 화면 3시안 제안 완료 (12뷰 쇼케이스 구축 및 1440px 캡처 완료, 사용자 승인 대기) | [`coupang-ops/docs/COUPANG_OPS_12VIEWS_PROPOSAL.md`](coupang-ops/docs/COUPANG_OPS_12VIEWS_PROPOSAL.md) |\n';

if (!content.includes('`coupang-ops`')) {
  const targetRow = '| 89 | AI 영상 스튜디오 | `ai-video-studio`';
  const pos2 = content.indexOf(targetRow);
  if (pos2 !== -1) {
    const endOfLine2 = content.indexOf('\n', pos2);
    content = content.slice(0, endOfLine2 + 1) + programRow + content.slice(endOfLine2 + 1);
    console.log('Successfully added coupang-ops to program registry');
  } else {
    console.warn('Target row for program 89 not found');
  }
}

fs.writeFileSync('DESIGN.md', content, 'utf8');
console.log('DESIGN.md update complete.');
