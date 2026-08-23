"use client";

import { useEffect, useRef } from "react";

interface ProgressBarProps {
  /** 目标百分比（与原型 data-w 一致，如 "60%"） */
  value: string;
}

/** 进度条：结构/动画行为与原型 JS 完全一致 —— <i data-w> 挂载 120ms 后动画到目标宽度 */
export function ProgressBar({ value }: ProgressBarProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const timer = window.setTimeout(() => {
        if (ref.current) ref.current.style.width = ref.current.getAttribute("data-w") ?? "";
      }, 120);
      return () => window.clearTimeout(timer);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="progress">
      <i ref={ref} data-w={value} style={{ width: 0 }} />
    </div>
  );
}
