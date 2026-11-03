"use client";

// 삭제 전에 한 번 더 묻는다(실수로 누르는 것 방지)
export default function DeleteButton({ name, action }: { name: string; action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`「${name}」 카테고리를 삭제할까요?`)) e.preventDefault();
      }}
    >
      <button className="rounded border border-red-200 px-2 py-1 text-xs text-red-700">삭제</button>
    </form>
  );
}
