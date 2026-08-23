import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { placeholderRoutes } from "@/lib/nav";

/** 占位页：页面名 + "开发中" + 返回首页（指令 §3） */
export function PlaceholderPage({ title }: { title: string }) {
  const current = placeholderRoutes.find((route) => route.label === title);

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 text-center">
      {current && (
        <span className="w-12 h-12 rounded-[14px] bg-accent-tint border border-border text-accent grid place-items-center">
          <current.icon className="w-6 h-6" />
        </span>
      )}
      <h1 className="text-[18px] font-bold tracking-[-0.01em]">{title}</h1>
      <p className="text-xs text-muted">
        开发中 · Phase 2 即将到来
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-[6px] mt-2 h-8 px-3 text-[12.5px] font-semibold rounded-[12px] bg-accent-tint text-accent-deep border border-border transition-colors duration-150 hover:bg-surface-deep"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        返回首页
      </Link>
    </div>
  );
}
