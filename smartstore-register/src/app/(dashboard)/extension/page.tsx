import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { ExtensionConnect } from "@/components/ExtensionConnect";
import { requireProgramAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function ExtensionPage() {
  const user = await requireProgramAccess();
  return (
    <div className="space-y-4">
      <PageHeader emoji="🧩" title="확장 연결" description="스마트스토어 칸을 대신 채우는 크롬 확장을 설치하고 내 계정과 연결합니다." />
      <ExtensionConnect myEmail={user.email ?? null} />
      <Notice tone="warn">
        ⚠️ <b>처음 한 번만 — 팝업 허용</b>: 상세설명을 넣는 스마트 에디터는 팝업 창으로 열립니다. 크롬 주소창에 <code>chrome://settings/content/popups</code>를 입력 → 「팝업 전송 및 리디렉션 사용이 허용됨」의 「추가」 → <code>https://sell.smartstore.naver.com</code>을 넣어 주세요. 허용하지 않으면 상세설명이 「에디터 화면을 찾지 못했습니다」로 멈춥니다.
      </Notice>
      <Notice tone="tip">
        💡 연결한 뒤에는 크롬에서 <b>스마트스토어센터에 로그인</b>해 두세요. 「등록할 상품」에서 확장으로 보내면 확장이 「상품 등록」 화면을 열려 있는 판매자센터 탭 자리(없으면 지금 창의 새 탭)에 열고 칸을 순서대로 채웁니다. 처음에는 「입력만」으로 확인해 보세요.
      </Notice>
      <Notice tone="warn">
        ⚠️ 채우는 동안 그 탭을 닫거나 다른 칸을 누르지 마세요. 판매자센터 화면이 바뀌어 칸을 찾지 못하면 그 자리에서 멈추고 「등록 기록」에 멈춘 칸을 남깁니다 — 그 칸부터 직접 입력하면 됩니다.
      </Notice>
    </div>
  );
}
