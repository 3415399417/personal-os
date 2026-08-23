import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GitHub Search API（无需 token，限流 10 req/min）
const GH_SEARCH = "https://api.github.com/search/repositories";
// GitHub Releases API
const GH_RELEASES = "https://api.github.com/repos/deepseek-ai/deepseek-harness/releases";
// Hacker News API
const HN_TOP = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM = (id: number) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

const UA = "Mozilla/5.0 (personal-os; github-news)";

// 大模型 / Agent harness 相关关键词（命中任一即保留）
const REPO_QUERIES: Record<string, string> = {
  plugin: "(plugin OR extension OR addon) stars:>50",
  model: 'gguf OR llamafile OR safetensors OR "llm inference" OR quantization stars:>100',
  agent: '(agent OR "agent framework" OR agentic) stars:>50',
  harness: "topic:dsh-plugin", // DeepSeek Harness 社区插件（最新动态）
};
const NEWS_KEYWORDS = /ai|llm|gpt|agent|model|openai|anthropic|google|meta|开源|模型|大模型|harness|langchain|rag|diffusion|mcp|claude|inference|deepseek/i;

// 常见语言颜色（GitHub linguist 色值子集）
const LANG_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  "C++": "#f34b7d",
  C: "#555555",
  Java: "#b07219",
  Swift: "#F05138",
  Shell: "#89e051",
  "Jupyter Notebook": "#DA5B0B",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Zig: "#ec915c",
  Ruby: "#701516",
  PHP: "#4F5D95",
  "C#": "#178600",
};

function langColor(lang: string | null): string {
  if (!lang) return "#9CA3AF";
  return LANG_COLORS[lang] ?? "#9CA3AF";
}

function relTime(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return new Date(ts * 1000).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

async function fetchJson(url: string, timeoutMs = 12000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/vnd.github+json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** 热门仓库：GitHub Search 按 star 排序（分类：插件/模型/Agent/Harness） */
async function getRepos(type: string): Promise<unknown[]> {
  const q = encodeURIComponent(REPO_QUERIES[type] ?? REPO_QUERIES.agent);
  // Harness 社区插件按最新更新排序；其余分类按 star 排序
  const sort = type === "harness" ? "updated" : "stars";
  const url = `${GH_SEARCH}?q=${q}&sort=${sort}&order=desc&per_page=18`;
  const data = await fetchJson(url);
  const items: any[] = data.items ?? [];
  return items.map((r) => ({
    id: r.id,
    name: r.full_name,
    desc: r.description ?? "",
    url: r.html_url,
    stars: r.stargazers_count,
    lang: r.language,
    langColor: langColor(r.language),
    updated: relTime(new Date(r.pushed_at ?? r.updated_at).getTime() / 1000),
  }));
}

/** DeepSeek Harness 官方最新通知（GitHub Releases） */
async function getNotices(): Promise<unknown[]> {
  const data = await fetchJson(`${GH_RELEASES}?per_page=8`);
  if (!Array.isArray(data)) return [];
  return data.map((r) => ({
    id: r.id,
    tag: r.tag_name,
    name: r.name || r.tag_name,
    url: r.html_url,
    date: (r.published_at ?? "").slice(0, 10),
    body: (r.body ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140),
  }));
}

/** 技术新闻：Hacker News 热门，过滤大模型/Agent 相关标题 */
async function getNews(): Promise<unknown[]> {
  const ids: number[] = await fetchJson(HN_TOP);
  const top = ids.slice(0, 40);
  const items: any[] = (
    await Promise.allSettled(top.map((id) => fetchJson(HN_ITEM(id))))
  )
    .filter((p): p is PromiseFulfilledResult<any> => p.status === "fulfilled")
    .map((p) => p.value)
    .filter((it) => it && it.type === "story" && !it.deleted && it.title);
  const filtered = items.filter((it) => NEWS_KEYWORDS.test(it.title + " " + (it.url ?? "")));
  return filtered.slice(0, 20).map((it) => ({
    id: it.id,
    title: it.title,
    url: it.url ?? `https://news.ycombinator.com/item?id=${it.id}`,
    score: it.score ?? 0,
    by: it.by ?? "",
    time: relTime(it.time),
  }));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "repos";
  const type = url.searchParams.get("type") ?? "plugin";
  try {
    if (tab === "news") {
      return NextResponse.json({ ok: true, tab, type, items: await getNews() });
    }
    // Harness：插件 + 官方通知
    const [repos, notices] = await Promise.all([getRepos(type), type === "harness" ? getNotices() : Promise.resolve([])]);
    return NextResponse.json({ ok: true, tab, type, items: repos, notices });
  } catch (err) {
    console.error("[api/github] failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
