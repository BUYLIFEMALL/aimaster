import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { ExtensionConnect } from "@/components/ExtensionConnect";

export const dynamic = "force-dynamic";

export default function ExtensionPage() {
  return (
    <div className="space-y-4">
      <PageHeader emoji="🧩" title="확장 연결" description="스마트스토어 칸을 대신 채우는 크롬 확장을 설치하고 내 계정과 연결합니다." />
      <ExtensionConnect />
      <Notice tone="tip">
        💡 연결한 뒤에는 크롬에서 <b>스마트스토어센터에 로그인</b>해 두세요. 「등록할 상품」에서 확장으로 보내면 확장이 「상품 등록」 화면을 새 탭으로 열고 칸을 순서대로 채웁니다. 처음에는 「입력만」으로 확인해 보세요.
      </Notice>
      <Notice tone="warn">
        ⚠️ 채우는 동안 그 탭을 닫거나 다른 칸을 누르지 마세요. 판매자센터 화면이 바뀌어 칸을 찾지 못하면 그 자리에서 멈추고 「등록 기록」에 멈춘 칸을 남깁니다 — 그 칸부터 직접 입력하면 됩니다.
      </Notice>
    </div>
  );
}
