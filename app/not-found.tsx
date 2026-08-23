import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-3 text-center bg-bg text-fg font-sans">
      <h1 className="text-[18px] font-bold tracking-[-0.01em]">页面不存在</h1>
      <p className="text-xs text-muted">404 · 你访问的页面走丢了</p>
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
