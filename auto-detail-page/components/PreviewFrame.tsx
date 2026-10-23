"use client";

interface Props {
  html: string;
}

export default function PreviewFrame({ html }: Props) {
  return (
    <div className="w-full border border-gray-200 rounded-xl overflow-hidden shadow-lg">
      <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <span className="text-xs text-gray-500 ml-2">상세페이지 미리보기</span>
      </div>
      <iframe
        srcDoc={html}
        className="w-full"
        style={{ height: "80vh", border: "none" }}
        sandbox="allow-scripts allow-same-origin"
        title="상세페이지 미리보기"
      />
    </div>
  );
}
