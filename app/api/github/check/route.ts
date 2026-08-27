import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRepos, getNews } from "@/lib/github-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GitHub 情报自动检测：拉取热门仓库（star）+ 最新更新/社区插件（pushed_at）+ 技术新闻，
 * 与上次快照对比，有新增 → 写一条通知并更新快照。
 * 由前端定时调用（每日首次打开 + 每 6 小时）；失败静默，不影响使用。
 */
export async function GET() {
  try {
    const [hotRepos, updatedRepos, harnessRepos, news] = await Promise.all([
      getRepos("plugin"),
      getRepos("plugin", "updated"),
      getRepos("harness"),
      getNews(),
    ]);
    const hotIds = (hotRepos as { id: number }[]).map((r) => String(r.id));
    // 最新更新 + Harness 社区插件合并去重（新发布/刚更新的插件也能捕捉）
    const updatedIds = [
      ...new Set([...(updatedRepos as { id: number }[]), ...(harnessRepos as { id: number }[])].map((r) => String(r.id))),
    ];
    const newsIds = (news as { id: number }[]).map((n) => String(n.id));

    const snap = await prisma.githubCheck.findUnique({ where: { id: "last" } });
    const prevHot = new Set(JSON.parse(snap?.hotIds ?? "[]") as string[]);
    const prevUpdated = new Set(JSON.parse(snap?.updatedIds ?? "[]") as string[]);
    const prevNews = new Set(JSON.parse(snap?.newsIds ?? "[]") as string[]);

    const newHot = hotIds.filter((id) => !prevHot.has(id));
    const newUpdated = updatedIds.filter((id) => !prevUpdated.has(id));
    const newNews = newsIds.filter((id) => !prevNews.has(id));
    const newCount = newHot.length + newUpdated.length + newNews.length;

    if (newCount > 0) {
      const parts: string[] = [];
      if (newHot.length > 0) parts.push(`${newHot.length} 条热门仓库`);
      if (newUpdated.length > 0) parts.push(`${newUpdated.length} 条插件更新`);
      if (newNews.length > 0) parts.push(`${newNews.length} 条技术新闻`);
      await prisma.notification.create({
        data: {
          type: "github_update",
          title: "🛰️ GitHub 情报更新",
          body: `新增 ${parts.join("、")}，见情报页`,
        },
      });
    }

    await prisma.githubCheck.upsert({
      where: { id: "last" },
      update: { hotIds: JSON.stringify(hotIds), updatedIds: JSON.stringify(updatedIds), newsIds: JSON.stringify(newsIds) },
      create: { id: "last", hotIds: JSON.stringify(hotIds), updatedIds: JSON.stringify(updatedIds), newsIds: JSON.stringify(newsIds) },
    });

    return NextResponse.json({ ok: true, newCount, checkedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[api/github/check] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
