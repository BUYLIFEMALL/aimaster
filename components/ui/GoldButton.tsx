import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "gold" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const GoldButton = forwardRef<HTMLButtonElement, GoldButtonProps>(
  (
    {
      className,
      variant = "gold",
      size = "md",
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    const variantClasses = {
      gold: "btn-gold",
      outline: "btn-outline",
      ghost:
        "text-gold hover:bg-gold/10 transition-colors duration-200 font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "rounded-xl font-semibold inline-flex items-center justify-center gap-2",
          sizeClasses[size],
          variantClasses[variant],
          fullWidth && "w-full",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GoldButton.displayName = "GoldButton";

export default GoldButton;
