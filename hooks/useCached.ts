"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 轻量 SWR 缓存：useCached(key, fetcher, ttlMs)
 * - 首次调用走网络，之后 TTL 内直接返回缓存（秒开）
 * - TTL 过期后自动重新请求（stale-while-revalidate）
 * - betterlife:data-changed 事件触发时立即失效刷新（数据变更后保持新鲜）
 */
const cache = new Map<string, { data: unknown; at: number }>();

const DEFAULT_TTL = 30_000; // 30 秒

export function useCached<T>(key: string, fetcher: () => Promise<T>, ttlMs = DEFAULT_TTL): {
  data: T | null;
  loading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(() => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
    return null;
  });
  const [loading, setLoading] = useState(() => {
    const hit = cache.get(key);
    return !(hit && Date.now() - hit.at < ttlMs);
  });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const ttlRef = useRef(ttlMs);
  ttlRef.current = ttlMs;

  const load = useCallback((force = false) => {
    const hit = cache.get(key);
    if (!force && hit && Date.now() - hit.at < ttlRef.current) {
      setData(hit.data as T);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetcherRef.current()
      .then((d) => {
        cache.set(key, { data: d, at: Date.now() });
        setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [key]);

  useEffect(() => {
    load();
    const onChanged = () => load(true); // 数据变更 → 强制刷新
    window.addEventListener("betterlife:data-changed", onChanged);
    return () => window.removeEventListener("betterlife:data-changed", onChanged);
  }, [load]);

  const reload = useCallback(() => load(true), [load]);

  return { data, loading, reload };
}

/** 清除全部缓存（登出/手动刷新用） */
export function clearDataCache() {
  cache.clear();
}
