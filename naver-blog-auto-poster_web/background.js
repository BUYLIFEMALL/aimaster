"use strict";

// 확장 아이콘을 클릭하면(또는 네이버 페이지에서) 사이드패널이 열리게 한다.
// 데스크톱 앱과 달리 별도 브라우저 창을 띄우지 않고, 사용자가 이미 로그인해서 쓰고
// 있는 그 크롬 창의 사이드패널에 붙는 방식이다(README "2단계: 크롬 확장 버전" 참고).
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
