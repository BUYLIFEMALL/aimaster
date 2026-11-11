"use client";

// 지우기 전 확인 창 — 지운 사진은 되살릴 수 없다
export default function DeletePhotosButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        const n = e.currentTarget.form?.querySelectorAll("input[name=name]:checked").length ?? 0;
        if (!n) return;
        if (!confirm(`고른 사진 ${n}장을 지웁니다. 지운 사진은 되살릴 수 없습니다. 지울까요?`)) e.preventDefault();
      }}
      className="mt-4 min-h-10 rounded bg-red-700 px-4 text-sm text-white"
    >
      고른 사진 지우기
    </button>
  );
}
