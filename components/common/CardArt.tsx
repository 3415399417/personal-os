import type { ReactNode } from "react";

/** 卡片右下角插画装饰（对齐原型 .card-art） */
export function CardArt({ children }: { children: ReactNode }) {
  return (
    <div className="absolute right-[10px] bottom-[6px] pointer-events-none opacity-95 z-0" aria-hidden>
      {children}
    </div>
  );
}
