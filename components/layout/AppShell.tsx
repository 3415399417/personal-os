"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";
import { useAutoReport } from "@/hooks/useAutoReport";
import { useAutoBackup } from "@/hooks/useAutoBackup";

/** 应用外壳：div.app = Sidebar(260px) + .main(Topbar + .content)，结构照搬原型 */
export function AppShell({ children }: { children: React.ReactNode }) {
  // 主题初始化（暗色模式持久化）
  useEffect(() => {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.dataset.theme = "dark";
    }
  }, []);
  useReminderNotifications();
  const [toast, setToast] = useState<string | null>(null);
  useAutoReport((title) => {
    setToast(`✅ ${title}已自动生成，见「复盘」页`);
    window.setTimeout(() => setToast(null), 5000);
  });
  useAutoBackup((file) => {
    setToast(`💾 今日数据已自动备份（${file}）`);
    window.setTimeout(() => setToast(null), 5000);
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  // 路由变化时关闭移动端抽屉
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // 点击抽屉外部关闭（<960px 时生效，与原型 JS 一致）
  const closeOnOutside = useCallback(
    (event: MouseEvent) => {
      if (window.innerWidth <= 960 && drawerOpen) {
        const target = event.target as Node;
        if (
          sidebarRef.current &&
          !sidebarRef.current.contains(target) &&
          !(target as Element).closest("#menuBtn")
        ) {
          setDrawerOpen(false);
        }
      }
    },
    [drawerOpen],
  );

  useEffect(() => {
    document.addEventListener("click", closeOnOutside);
    return () => document.removeEventListener("click", closeOnOutside);
  }, [closeOnOutside]);

  return (
    <div className="app">
      <Sidebar ref={sidebarRef} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="main">
        <Header onMenuClick={() => setDrawerOpen((v) => !v)} />
        <main className="content">{children}</main>
      </div>
      {toast && <div className="global-toast">{toast}</div>}
    </div>
  );
}
