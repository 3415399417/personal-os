"use client";

import { useEffect, useRef } from "react";

/**
 * 路由切换模板：每个页面挂载时做一次轻量淡入（配合全局 loading 骨架屏，
 * 让切页体验从"白屏等待"变成"骨架 → 内容淡入"）。
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("betterlife-route-enter");
    // 强制 reflow 后重新加类，触发动画
    void el.offsetWidth;
    el.classList.add("betterlife-route-enter");
  }, []);

  return <div ref={ref}>{children}</div>;
}
