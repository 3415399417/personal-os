import { NextResponse } from "next/server";
import { getRepos, getNews } from "@/lib/github-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GitHub Releases API（DeepSeek Harness 官方通知）
const GH_RELEASES = "https://api.github.com/repos/deepseek-ai/deepseek-harness/releases";

const UA = "Mozilla/5.0 (personal-os; github-news)";

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
