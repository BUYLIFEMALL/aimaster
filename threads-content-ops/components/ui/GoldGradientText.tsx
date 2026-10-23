import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface GoldGradientTextProps extends HTMLAttributes<HTMLSpanElement> {
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p";
}

export default function GoldGradientText({
  as: Tag = "span",
  className,
  children,
  ...props
}: GoldGradientTextProps) {
  return (
    <Tag className={cn("gold-text", className)} {...props}>
      {children}
    </Tag>
  );
}
