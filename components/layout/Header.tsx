"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getNotificationsForBell, markAllNotificationsRead, deleteNotification, clearAllNotifications } from "@/lib/api";
import type { BellNotification } from "@/lib/api";

interface HeaderProps {
  onMenuClick: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  meta: string;
  type?: string; // 资源条目的类型（inbox/domain/knowledge/command/template）
}

interface SearchResults {
  tasks: SearchResult[];
  projects: SearchResult[];
  notes: SearchResult[];
  resources: SearchResult[];
}

const NAV_ITEMS = [
  { key: "home", label: "首页", href: "/" },
  { key: "today", label: "今天", href: "/today" },
  { key: "projects", label: "项目", href: "/projects" },
  { key: "study", label: "学习", href: "/learning" },
  { key: "workbench", label: "工作台", href: "/workbench" },
  { key: "review", label: "复盘", href: "/review" },
  { key: "github", label: "GitHub 情报", href: "/github" },
  { key: "stats", label: "统计", href: "/stats" },
] as const;

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const [bellOpen, setBellOpen] = useState(false);
  const [bellData, setBellData] = useState<{ unreadCount: number; items: BellNotification[] } | null>(null);
  const bellWrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const loadBell = () => {
    getNotificationsForBell().then(setBellData).catch(() => {});
  };

  useEffect(() => {
    loadBell();
    const onChanged = () => loadBell();
    window.addEventListener("betterlife:data-changed", onChanged);
    return () => window.removeEventListener("betterlife:data-changed", onChanged);
  }, []);

  // 点击外部关闭通知
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // 点击外部关闭搜索
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // 搜索：防抖 300ms
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    setSearchOpen(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) setResults(d.results);
        })
        .catch(() => {})
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  /** 命令匹配：输入内容同时匹配“操作”，支持中英文/模糊 */
  const COMMANDS = [
    { keys: ["新建任务", "新任务", "任务", "add"], href: "/today", label: "新建任务", icon: "＋" },
    { keys: ["去今天", "今天", "today"], href: "/today", label: "去「今天」页", icon: "📅" },
    { keys: ["去项目", "项目", "projects"], href: "/projects", label: "去「项目」页", icon: "📁" },
    { keys: ["去学习", "学习", "learning"], href: "/learning", label: "去「学习」页", icon: "📖" },
    { keys: ["去复盘", "复盘", "review"], href: "/review", label: "去「复盘」页", icon: "🔁" },
    { keys: ["去统计", "统计", "stats"], href: "/stats", label: "去「统计」页", icon: "📊" },
    { keys: ["GitHub", "情报", "github"], href: "/github", label: "去「GitHub 情报」", icon: "🛰️" },
    { keys: ["去设置", "设置", "settings"], href: "/settings", label: "去「设置」页", icon: "⚙️" },
    { keys: ["个人空间", "我的", "space", "资料"], href: "/space", label: "去「个人空间」", icon: "👤" },
    { keys: ["去工作台", "工作台", "workbench"], href: "/workbench", label: "去「工作台」页", icon: "🗂️" },
    { keys: ["导出", "备份", "export", "backup"], href: "/api/export", label: "导出全部数据", icon: "💾" },
  ];

  const matchedCommands = query.trim()
    ? COMMANDS.filter((c) => c.keys.some((k) => k.toLowerCase().includes(query.trim().toLowerCase())))
    : [];

  const total = results ? results.tasks.length + results.projects.length + results.notes.length + results.resources.length : 0;

  const goSearch = (url: string) => {
    setSearchOpen(false);
    window.location.href = url;
  };

  const groups: { key: keyof SearchResults; label: string; icon: string }[] = [
    { key: "tasks", label: "任务", icon: "☑" },
    { key: "projects", label: "项目", icon: "📁" },
    { key: "notes", label: "笔记", icon: "📝" },
    { key: "resources", label: "资源", icon: "🔖" },
  ];

  const resultUrl = (key: keyof SearchResults, item: SearchResult) => {
    if (key === "projects") return `/projects/${item.id}`;
    if (key === "tasks") return `/today`;
    if (key === "notes") return `/notes`;
    if (key === "resources") {
      const t = (item as { type?: string }).type;
      if (!t || t === "inbox") return `/inbox`;
      return `/resources/${t}`;
    }
    return `/assets`;
  };

  // Esc 关闭搜索
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        if (document.activeElement === searchRef.current) searchRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Enter：优先执行匹配到的命令（有命令时先走命令，否则走首个搜索结果）
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (matchedCommands.length > 0) {
      e.preventDefault();
      goSearch(matchedCommands[0].href);
      return;
    }
    if (total > 0) {
      const g = groups.find((gr) => results![gr.key].length > 0)!;
      goSearch(resultUrl(g.key, results![g.key][0]));
    }
  };

  return (
    <header className="topbar" data-od-id="topnav">
      <div className="topbar-inner">
        <button
          className="menu-btn"
          id="menuBtn"
          onClick={onMenuClick}
          aria-label="打开侧边栏"
          aria-expanded="false"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M4 6.5h16M4 12h16M4 17.5h16" />
          </svg>
        </button>
        <nav className="topnav" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              className={`nav-link${pathname === item.href ? " active" : ""}`}
              href={item.href}
              data-od-id={`nav-${item.key}`}
            >
              <NavIcon name={item.key} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="topbar-right">
          <div className="search" ref={searchWrapRef}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-4.2-4.2" />
            </svg>
            <input
              ref={searchRef}
              id="globalSearch"
              type="search"
              placeholder="搜索任务、笔记、知识库…"
              aria-label="全局搜索"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim()) setSearchOpen(true);
              }}
              onKeyDown={onSearchKeyDown}
              onFocus={() => {
                if (query.trim()) setSearchOpen(true);
              }}
            />
            {searchOpen && (
              <div className="search-results" data-od-id="search-results">
                {searchLoading ? (
                  <div className="search-empty">搜索中…</div>
                ) : !query.trim() ? null : (
                  <>
                    {/* 命令区：输入同时匹配操作，置顶展示 */}
                    {matchedCommands.length > 0 && (
                      <div className="search-group">
                        <div className="search-group-label">操作</div>
                        {matchedCommands.slice(0, 5).map((c) => (
                          <div
                            className="search-result-item"
                            key={c.label}
                            onClick={() => goSearch(c.href)}
                            style={{ cursor: "pointer" }}
                          >
                            <span className="search-result-ico" aria-hidden="true">{c.icon}</span>
                            <span className="search-result-title">{c.label}</span>
                            <span className="search-result-meta">命令</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {total === 0 && matchedCommands.length === 0 ? (
                      <div className="search-empty">没有找到与「{query.trim()}」相关的内容</div>
                    ) : (
                      <>
                        {results &&
                          groups.map((g) =>
                            results![g.key].length > 0 ? (
                              <div className="search-group" key={g.key}>
                                <div className="search-group-label">{g.label}</div>
                                {results![g.key].map((it) => (
                                  <div
                                    className="search-result-item"
                                    key={it.id}
                                    onClick={() => goSearch(resultUrl(g.key, it))}
                                  >
                                    <span className="search-result-ico" aria-hidden="true">{g.icon}</span>
                                    <span className="search-result-title">{it.title}</span>
                                    <span className="search-result-meta">{it.meta}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null,
                          )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="bell-wrap" ref={bellWrapRef}>
            <button
              className="icon-btn bell-btn"
              id="bellBtn"
              aria-label="通知"
              aria-expanded={bellOpen}
              onClick={(e) => {
                e.stopPropagation();
                setBellOpen((v) => !v);
                if (!bellOpen) {
                  // 打开面板 → 全部已读（持久化）
                  markAllNotificationsRead().then(loadBell).catch(() => {});
                }
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9.5a6 6 0 0 1 12 0c0 4.2 1.6 5.4 1.6 5.4H4.4S6 13.7 6 9.5z" />
                <path d="M10.2 19a2 2 0 0 0 3.6 0" />
              </svg>
              {(bellData?.unreadCount ?? 0) > 0 && (
                <span className="bell-count">{bellData!.unreadCount > 9 ? "9+" : bellData!.unreadCount}</span>
              )}
            </button>
            <div
              className={`bell-pop${bellOpen ? " open" : ""}`}
              id="bellPop"
              role="region"
              aria-label="通知列表"
            >
              <div className="bell-pop-head">
                <b>通知</b>
                {(bellData?.unreadCount ?? 0) > 0 && <span className="badge warn">{bellData!.unreadCount} 未读</span>}
              </div>
              <ul>
                {(bellData?.items ?? []).map((n) => (
                  <li key={n.id} className={`bell-item${n.read ? " read" : ""}`}>
                    <div className="bell-item-main">
                      <b>{n.title}</b>
                      {n.body && <span>{n.body}</span>}
                      <em>{n.time}</em>
                    </div>
                    {n.id !== "__overdue__" && (
                      <button
                        type="button"
                        className="bell-item-del"
                        aria-label={`删除通知：${n.title}`}
                        title="删除通知"
                        onClick={() => {
                          deleteNotification(n.id)
                            .then(loadBell)
                            .catch(() => {});
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
                {(bellData?.items ?? []).length === 0 && (
                  <li style={{ fontSize: 11.5, color: "var(--muted)", padding: "10px 8px", borderTop: "1px solid var(--border)" }}>
                    暂无通知
                  </li>
                )}
              </ul>
              {(bellData?.items ?? []).length > 0 && (
                <div className="bell-pop-foot">
                  <button
                    onClick={() => {
                      clearAllNotifications().then(loadBell).catch(() => {});
                    }}
                  >
                    清空全部
                  </button>
                </div>
              )}
            </div>
          </div>
          <a className="avatar" href="/space" aria-label="个人空间" title="个人空间">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8.5" r="3.4" />
              <path d="M4.8 20c1.2-3.4 3.9-5 7.2-5s6 1.6 7.2 5" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}

/** 导航图标（SVG 原样照搬原型） */
function NavIcon({ name }: { name: string }) {
  switch (name) {
    case "home":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4.5 10.5L12 4l7.5 6.5" />
          <path d="M6.5 9.2V19a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9.2" />
        </svg>
      );
    case "today":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
        </svg>
      );
    case "projects":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
        </svg>
      );
    case "study":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 6.2C10.2 4.9 7.6 4.4 4.5 5v13.4c3.1-.6 5.7-.1 7.5 1.2 1.8-1.3 4.4-1.8 7.5-1.2V5c-3.1-.6-5.7-.1-7.5 1.2z" />
          <path d="M12 6.2v13.4" />
        </svg>
      );
    case "workbench":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="4.5" width="16" height="15" rx="2" />
          <path d="M10 4.5v15" />
        </svg>
      );
    case "review":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4.2 12a7.8 7.8 0 0 1 13.4-5.5L20 8.6" />
          <path d="M20 4v4.6h-4.6" />
          <path d="M19.8 12a7.8 7.8 0 0 1-13.4 5.5L4 15.4" />
          <path d="M4 20v-4.6h4.6" />
        </svg>
      );
    case "github":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
        </svg>
      );
    case "stats":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    default:
      return null;
  }
}
