"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type Variant = "gold" | "blue" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  gold: "bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#080E1A] font-semibold hover:opacity-90",
  blue: "bg-[var(--blue)] text-white font-semibold hover:opacity-90",
  ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
  danger: "bg-[var(--error)] text-white font-semibold hover:opacity-90",
  outline: "bg-transparent border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--gold)] hover:text-[var(--gold)]",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3 text-base rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "gold", size = "md", loading, fullWidth, className, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer select-none",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          (disabled || loading) && "opacity-50 cursor-not-allowed",
          className
        )}
        disabled={disabled || loading}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
export default Button;
