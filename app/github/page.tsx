"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHead } from "@/components/common/PageHead";
import { openExternal } from "@/lib/openExternal";
import { useEffect, useState } from "react";

interface RepoItem {
  id: number;
  name: string;
  desc: string;
  url: string;
  stars: number;
  lang: string;
  langColor: string;
  updated: string;
}

interface NewsItem {
  id: number;
  title: string;
  url: string;
  score: number;
  by: string;
  time: string;
}

interface NoticeItem {
  id: number;
  tag: string;
  name: string;
  url: string;
  date: string;
  body: string;
}

type Tab = "repos" | "news";
type RepoType = "plugin" | "model" | "agent" | "harness";

const REPO_TYPES: { key: RepoType; label: string }[] = [
  { key: "plugin", label: "插件" },
  { key: "model", label: "模型" },
  { key: "agent", label: "Agent" },
  { key: "harness", label: "Harness" },
];

export default function GithubPage() {
  const [tab, setTab] = useState<Tab>("repos");
  const [repoType, setRepoType] = useState<RepoType>("plugin");
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const query = tab === "repos" ? `tab=repos&type=${repoType}` : "tab=news";
    fetch(`/api/github?${query}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (!d.ok) throw new Error(d.error || "加载失败");
        if (tab === "repos") {
          setRepos(d.items);
          setNotices(d.notices ?? []);
        } else setNews(d.items);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message || "加载失败");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tab, repoType]);

  const open = (url: string) => openExternal(url);

  return (
    <AppShell>
      <div className="page">
        <PageHead title="GitHub 情报" sub="大模型 · Agent · Harness 最新动态">
          <div className="github-tabs">
            <button
              className={`github-tab ${tab === "repos" ? "active" : ""}`}
              onClick={() => setTab("repos")}
            >
              热门仓库
            </button>
            <button
              className={`github-tab ${tab === "news" ? "active" : ""}`}
              onClick={() => setTab("news")}
            >
              技术新闻
            </button>
          </div>
        </PageHead>

        <div className="page-scroll">
          {tab === "repos" && (
            <div className="github-subtabs">
              {REPO_TYPES.map((t) => (
                <button
                  key={t.key}
                  className={`github-subtab ${repoType === t.key ? "active" : ""}`}
                  onClick={() => setRepoType(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {loading ? (
            <div className="panel github-loading">加载中…</div>
          ) : error ? (
            <div className="panel github-error">
              <div>⚠️ 加载失败：{error}</div>
              <button className="btn btn-soft" style={{ marginTop: 10 }} onClick={() => window.location.reload()}>
                重试
              </button>
            </div>
          ) : tab === "repos" && repoType === "harness" ? (
            <>
              {/* 官方通知（最新 releases） */}
              {notices.length > 0 && (
                <div className="panel">
                  <div className="github-section-title">
                    <span className="github-bell">🔔</span> 官方通知
                  </div>
                  <ul className="news-list">
                    {notices.map((n) => (
                      <li className="news-item" key={n.id} onClick={() => open(n.url)}>
                        <span className="notice-tag">{n.tag}</span>
                        <div className="news-main">
                          <b className="news-title">{n.name}</b>
                          <span className="news-meta">{n.date} · {n.body || "查看发布详情"}</span>
                        </div>
                        <svg className="news-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 17L17 7M9 7h8v8" />
                        </svg>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* 社区插件（最新动态） */}
              <div className="panel">
                <div className="github-section-title">
                  <span className="github-bell">🧩</span> 社区插件（dsh-plugin）
                </div>
                {repos.length === 0 ? (
                  <div className="github-loading" style={{ minHeight: 80 }}>暂无插件</div>
                ) : (
                  <div className="card-grid github-grid">
                    {repos.map((r) => (
                      <article className="mini-card github-card" key={r.id} onClick={() => open(r.url)}>
                        <div className="mini-card-top">
                          <div className="mini-ico" style={{ color: r.langColor }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
                            </svg>
                          </div>
                          <span className="badge">★ {r.stars >= 1000 ? `${(r.stars / 1000).toFixed(1)}k` : r.stars}</span>
                        </div>
                        <h3 className="mini-card-title github-name">{r.name}</h3>
                        <p className="mini-card-desc github-desc">{r.desc || "暂无描述"}</p>
                        <div className="mini-card-foot">
                          <span className="github-lang">
                            <i style={{ background: r.langColor }} />
                            {r.lang || "未知"}
                          </span>
                          <span className="mini-card-meta">{r.updated}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : tab === "repos" ? (
            repos.length === 0 ? (
              <div className="panel">暂无数据</div>
            ) : (
              <div className="card-grid github-grid">
                {repos.map((r) => (
                  <article className="mini-card github-card" key={r.id} onClick={() => open(r.url)}>
                    <div className="mini-card-top">
                      <div className="mini-ico" style={{ color: r.langColor }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
                        </svg>
                      </div>
                      <span className="badge">★ {r.stars >= 1000 ? `${(r.stars / 1000).toFixed(1)}k` : r.stars}</span>
                    </div>
                    <h3 className="mini-card-title github-name">{r.name}</h3>
                    <p className="mini-card-desc github-desc">{r.desc || "暂无描述"}</p>
                    <div className="mini-card-foot">
                      <span className="github-lang">
                        <i style={{ background: r.langColor }} />
                        {r.lang || "未知"}
                      </span>
                      <span className="mini-card-meta">{r.updated}</span>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : news.length === 0 ? (
            <div className="panel">暂无相关新闻</div>
          ) : (
            <div className="panel">
              <ul className="news-list">
                {news.map((n) => (
                  <li className="news-item" key={n.id} onClick={() => open(n.url)}>
                    <span className="news-score">{n.score}</span>
                    <div className="news-main">
                      <b className="news-title">{n.title}</b>
                      <span className="news-meta">
                        {n.by ? `${n.by} · ` : ""}
                        {n.time}
                      </span>
                    </div>
                    <svg className="news-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17L17 7M9 7h8v8" />
                    </svg>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
