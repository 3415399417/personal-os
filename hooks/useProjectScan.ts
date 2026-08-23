"use client";

import { useEffect, useRef } from "react";
import { scanProject } from "@/lib/api";
import type { ScanResult } from "@/lib/api";

/**
 * 项目进度感知：打开页面立即扫描一次 + 每 60s 轮询。
 * 扫描到变化时回调 onScanned（用于 toast / 刷新），并广播 betterlife:data-changed。
 */
export function useProjectScan(
  projectId: string | undefined,
  onScanned?: (result: ScanResult) => void,
  intervalMs = 60000,
) {
  const onScannedRef = useRef(onScanned);
  onScannedRef.current = onScanned;

  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      try {
        const result = await scanProject(projectId);
        if (!alive) return;
        if (result.skipped) return; // 未关联文件夹，静默
        if (result.changed.length > 0) {
          window.dispatchEvent(new Event("betterlife:data-changed"));
          onScannedRef.current?.(result);
        }
      } catch {
        // 扫描失败静默（网络/服务端错误不打扰用户）
      }
    };

    run();
    timer = setInterval(run, intervalMs);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [projectId, intervalMs]);
}
