import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-[7px]",
    "h-8 px-3 text-[12.5px] font-semibold whitespace-nowrap",
    "rounded-[12px] border transition-[background,border-color,transform] duration-150",
    "active:translate-y-[1px]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-accent-deep text-white border-accent-deep hover:bg-[#6d28d9] hover:border-[#6d28d9]",
        soft: "bg-accent-tint text-accent-deep border-border hover:bg-surface-deep hover:border-accent-light",
        ghost: "bg-transparent text-accent-deep border-transparent hover:bg-accent-tint",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      block: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, block, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, block }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
