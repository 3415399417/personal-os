import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex w-full h-[30px] px-[10px] text-[12px] font-inherit",
        "border border-accent-light rounded-[9px] bg-white text-fg",
        "placeholder:text-muted focus:outline-none focus:border-accent",
        "transition-colors duration-150",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
