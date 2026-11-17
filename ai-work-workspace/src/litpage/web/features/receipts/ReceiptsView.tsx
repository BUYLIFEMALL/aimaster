// 2026-11-17 WS-20261117-17 (주인님 지시: 「이 페이지도 좌측에 메인 메뉴 보이게 처리해줘」)
// 영수증·세금계산서를 워크스페이스 안 화면(/<domain>/receipts)으로 — 왼쪽 메인 메뉴가 그대로 보인다.
// 화면 내용은 기존 /receipts의 ReceiptsBoard(브라우저 컴포넌트, /api/rpc/rcpt* 회원 인가 API)를 그대로 재사용한다.
// 기존 /receipts 주소는 그대로 둔다(즐겨찾기·외부 링크 보존).
import { ReceiptsBoard } from '@/app/receipts/ReceiptsBoard';
import { APP_NAME, APP_VERSION } from '@/lib/version';
import { useSession } from '../../lib/store/session.ts';
import '@/app/guide/guide.css';
import '@/app/receipts/receipts.css';
import './receiptsView.css';

export function ReceiptsView() {
  // QA017 P1: 지금 로그인한 회원 id. 없으면(로그아웃) 영수증 자료를 그리지 않고, 바뀌면 화면을 새로 만든다.
  const userId = useSession((s) => s.userId);
  return (
    <div className="aww-guide aww-receipts-view">
      <div className="aww-guide-inner">
        <header className="aww-guide-meta rc-noprint">
          <div className="aww-guide-meta-left">
            <div className="aww-guide-emoji-box" aria-hidden>
              🧾
            </div>
            <div>
              <p className="aww-guide-eyebrow">
                {APP_NAME} {APP_VERSION}
              </p>
              <h1>영수증·세금계산서</h1>
            </div>
          </div>
          <div className="aww-guide-meta-right">
            <div className="aww-guide-badges">
              <span className="aww-badge aww-badge-indigo">📷 사진 올리면 자동 정리</span>
              <span className="aww-badge">회원 본인 AI 키</span>
            </div>
          </div>
        </header>
        {userId ? <ReceiptsBoard key={userId} accountKey={userId} /> : null}
      </div>
    </div>
  );
}
