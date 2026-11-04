; 새 버전 설치 때 「실행 중입니다. OK를 클릭하면 종료됩니다」 확인 창 없이 켜진 엔진을 끈다(2026-11-04 마스터PC 0.4.0 → 0.4.1).
; 엔진 실행 프로그램이 띄운 엔진(Node)·음악 엔진(파이썬)까지 함께(/T). 만들던 곡은 대기열에 「중단됨」으로 남고 [다시 하기]로 이어 만든다.
!macro customCheckAppRunning
  nsExec::Exec '"$SYSDIR\taskkill.exe" /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 2000
!macroend
