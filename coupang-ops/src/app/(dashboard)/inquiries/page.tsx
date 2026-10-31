import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { InquiryBoard } from "@/components/InquiryBoard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function InquiriesPage() {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);

  return (
    <div className="space-y-5">
      <PageHeader emoji="💬" title="고객 문의" description="상품 문의와 쿠팡 고객센터 이관 문의를 모아 보고, AI 초안을 고쳐 답변합니다." />
      <Notice tone="tip">💡 AI 초안은 회원 본인 Claude 키로 만들고, 회원이 확인해야만 등록됩니다. 재고·배송일·환불처럼 모르는 내용은 지어내지 않고 [ ] 칸으로 남깁니다. 고객 연락처와 번호는 가린 뒤 화면과 AI에 넘기며, 문의 내용은 저장하지 않습니다.</Notice>
      <InquiryBoard keysSaved={!!keys} />
    </div>
  );
}
