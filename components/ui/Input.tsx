"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full px-4 py-3 rounded-xl border bg-[var(--bg-elevated)]",
              "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
              "border-[var(--border-default)] focus:border-[var(--gold)] focus:outline-none",
              "transition-colors duration-150",
              icon && "pl-10",
              error && "border-[var(--error)] focus:border-[var(--error)]",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <span className="text-xs text-[var(--error)]">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
