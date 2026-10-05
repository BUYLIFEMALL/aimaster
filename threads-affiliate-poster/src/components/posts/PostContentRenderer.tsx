import React from "react";
import { ExternalLink } from "lucide-react";

interface PostContentRendererProps {
  content: string;
  className?: string;
  displayMode?: boolean;
}

/**
 * 게시글 본문 렌더러:
 * 1) '지금 쿠팡에서 확인' 등 레거시 CTA 문구를 '상품링크:'로 정돈
 * 2) 본문 내 제휴 링크 및 URL을 실제로 클릭 가능한 <a> 링크로 활성화
 */
export function PostContentRenderer({
  content,
  className = "whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-900",
  displayMode = true,
}: PostContentRendererProps) {
  if (!content) return null;

  let textToRender = content;

  if (displayMode) {
    // 기존 레거시 문구(지금 쿠팡에서 확인 등)를 '상품링크:'로 변환
    textToRender = textToRender.replace(
      /(지금 쿠팡에서 확인|지금 알리익스프레스에서 확인하기|지금 바로 확인하기|지금 확인하기|지금 토스쇼핑에서 확인하기)/g,
      "상품링크:"
    );
  }

  // URL 정규식 매칭 (http:// 또는 https://)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = textToRender.split(urlRegex);

  return (
    <div className={className}>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-semibold transition-colors cursor-pointer break-all inline-flex items-center gap-1 mx-0.5 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{part}</span>
              <ExternalLink className="h-3.5 w-3.5 inline-block opacity-70 shrink-0" />
            </a>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </div>
  );
}
