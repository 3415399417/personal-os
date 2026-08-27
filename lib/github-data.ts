// GitHub 情报共享数据层：热门仓库 / 技术新闻 拉取（供 /api/github 与 /api/github/check 复用）

// GitHub Search API（无需 token，限流 10 req/min）
const GH_SEARCH = "https://api.github.com/search/repositories";
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
  // GitHub token（可选）：配置后限流从 60 次/时提升到 5000 次/时，避免 403
  const token = process.env.GITHUB_TOKEN;
  const doFetch = (auth: boolean) =>
    fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/vnd.github+json",
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: ctrl.signal,
    });
  try {
    let res = await doFetch(true);
    // token 失效（401）→ 去掉 Authorization 重试一次（匿名限流 10 次/分，检测频率低足够）
    if (res.status === 401 && token) {
      console.warn("[github-data] GITHUB_TOKEN 返回 401，降级为匿名请求");
      res = await doFetch(false);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** 热门仓库：GitHub Search 按 star 排序（分类：插件/模型/Agent/Harness）
 * sort: stars（热门）| updated（最新），默认 stars；harness 默认 updated */
export async function getRepos(type: string, sort?: string): Promise<unknown[]> {
  const q = encodeURIComponent(REPO_QUERIES[type] ?? REPO_QUERIES.agent);
  // 默认：Harness 社区插件按最新更新排序；其余分类按 star 排序（可显式传入覆盖）
  const sortBy = sort ?? (type === "harness" ? "updated" : "stars");
  const url = `${GH_SEARCH}?q=${q}&sort=${sortBy}&order=desc&per_page=18`;
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

/** 技术新闻：Hacker News 热门，过滤大模型/Agent 相关标题 */
export async function getNews(): Promise<unknown[]> {
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
