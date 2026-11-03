"use client";

// 삭제 전에 한 번 더 묻는다(실수로 누르는 것 방지). noun: 확인 창에 보일 대상 종류(카테고리·배송비 정책 등)
// message·label을 주면 확인 문구와 버튼 글자를 바꾼다(예: 몰 탈퇴)
export default function DeleteButton({
  name,
  action,
  noun = "카테고리",
  message,
  label = "삭제",
}: {
  name: string;
  action: () => Promise<void>;
  noun?: string;
  message?: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message ?? `「${name}」 ${noun}을(를) 삭제할까요?`)) e.preventDefault();
      }}
    >
      <button className="rounded border border-red-200 px-2 py-1 text-xs text-red-700">{label}</button>
    </form>
  );
}
