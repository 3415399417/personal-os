import Link from "next/link";
import { Home, Sun, FolderOpen, BookOpen, LayoutGrid, RotateCw, Github, Inbox, FileText, FolderKanban, Settings, BrainCircuit, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** 顶部主导航（原型 6 项） */
export const mainNav: NavItem[] = [
  { href: "/", label: "首页", icon: Home },
  { href: "/today", label: "今天", icon: Sun },
  { href: "/projects", label: "项目", icon: FolderOpen },
  { href: "/learning", label: "学习", icon: BookOpen },
  { href: "/workbench", label: "工作台", icon: LayoutGrid },
  { href: "/review", label: "复盘", icon: RotateCw },
  { href: "/github", label: "GitHub 情报", icon: Github },
];

/** 占位路由全集（保证无 404） */
export const placeholderRoutes: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/today", label: "今天", icon: Sun },
  { href: "/projects", label: "项目", icon: FolderOpen },
  { href: "/learning", label: "学习", icon: BookOpen },
  { href: "/workbench", label: "工作台", icon: LayoutGrid },
  { href: "/review", label: "复盘", icon: RotateCw },
  { href: "/inbox", label: "收集箱", icon: Inbox },
  { href: "/notes", label: "笔记", icon: FileText },
  { href: "/assets", label: "资产库", icon: FolderKanban },
  { href: "/ai", label: "AI", icon: BrainCircuit },
  { href: "/settings", label: "设置", icon: Settings },
];

export function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-[6px] text-[13px] font-medium text-muted",
        "px-3 py-[7px] rounded-[9px] leading-[1.3]",
        "transition-[color,background] duration-150 hover:text-fg hover:bg-surface",
        active && "text-accent-deep bg-accent-tint font-semibold",
      )}
    >
      <Icon className={cn("w-[14px] h-[14px] flex-none", active && "text-accent")} />
      {label}
    </Link>
  );
}
