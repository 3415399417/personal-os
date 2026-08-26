import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 连续使用天数：从今天（或昨天，今天还没打卡时）往前数 */
function calcStreak(dates: Set<string>): number {
  let streak = 0;
  const d = new Date();
  if (!dates.has(dateKey(d))) d.setDate(d.getDate() - 1);
  while (dates.has(dateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** 成就徽章：基于统计数据计算解锁状态与进度 */
function calcBadges(args: {
  streak: number;
  usageDays: number;
  tasksCompleted: number;
  tasksTotal: number;
  projectsCompleted: number;
  notes: number;
  usageSeconds: number;
  todayCompleted: number;
  reviews: number;
  plans: number;
  assets: number;
  dailyTaskStreak: number;
}) {
  const { streak, usageDays, tasksCompleted, tasksTotal, projectsCompleted, notes, usageSeconds, todayCompleted, reviews, plans, assets, dailyTaskStreak } = args;
  const usageHours = Math.floor(usageSeconds / 3600);
  const defs: { id: string; name: string; desc: string; icon: string; unlocked: boolean; progress: number; max: number }[] = [
    // 使用天数
    { id: "streak3", name: "三日之约", desc: "连续使用 3 天", icon: "🔥", unlocked: streak >= 3, progress: Math.min(streak, 3), max: 3 },
    { id: "streak7", name: "七日之约", desc: "连续使用 7 天", icon: "⚡", unlocked: streak >= 7, progress: Math.min(streak, 7), max: 7 },
    { id: "streak30", name: "月满长明", desc: "连续使用 30 天", icon: "🌕", unlocked: streak >= 30, progress: Math.min(streak, 30), max: 30 },
    { id: "used10", name: "持之以恒", desc: "累计使用 10 天", icon: "🗓️", unlocked: usageDays >= 10, progress: Math.min(usageDays, 10), max: 10 },
    { id: "used30", name: "月度坚守", desc: "累计使用 30 天", icon: "📆", unlocked: usageDays >= 30, progress: Math.min(usageDays, 30), max: 30 },
    { id: "used100", name: "百日维新", desc: "累计使用 100 天", icon: "💯", unlocked: usageDays >= 100, progress: Math.min(usageDays, 100), max: 100 },
    // 在线时长
    { id: "hour10", name: "时间投资家", desc: "累计学习 10 小时", icon: "⏳", unlocked: usageHours >= 10, progress: Math.min(usageHours, 10), max: 10 },
    { id: "hour50", name: "长期主义", desc: "累计学习 50 小时", icon: "🌳", unlocked: usageHours >= 50, progress: Math.min(usageHours, 50), max: 50 },
    { id: "hour100", name: "时间大师", desc: "累计学习 100 小时", icon: "⏰", unlocked: usageHours >= 100, progress: Math.min(usageHours, 100), max: 100 },
    { id: "hour500", name: "时间之王", desc: "累计学习 500 小时", icon: "👑", unlocked: usageHours >= 500, progress: Math.min(usageHours, 500), max: 500 },
    // 任务
    { id: "task10", name: "行动者", desc: "累计完成 10 个任务", icon: "✅", unlocked: tasksCompleted >= 10, progress: Math.min(tasksCompleted, 10), max: 10 },
    { id: "task50", name: "高效引擎", desc: "累计完成 50 个任务", icon: "🚀", unlocked: tasksCompleted >= 50, progress: Math.min(tasksCompleted, 50), max: 50 },
    { id: "task100", name: "百事达成", desc: "累计完成 100 个任务", icon: "🏆", unlocked: tasksCompleted >= 100, progress: Math.min(tasksCompleted, 100), max: 100 },
    { id: "task200", name: "全勤战士", desc: "累计完成 200 个任务", icon: "🎖️", unlocked: tasksCompleted >= 200, progress: Math.min(tasksCompleted, 200), max: 200 },
    // 项目
    { id: "project1", name: "启航", desc: "完成第 1 个项目", icon: "⛵", unlocked: projectsCompleted >= 1, progress: Math.min(projectsCompleted, 1), max: 1 },
    { id: "project5", name: "建造者", desc: "完成 5 个项目", icon: "🏗️", unlocked: projectsCompleted >= 5, progress: Math.min(projectsCompleted, 5), max: 5 },
    { id: "project10", name: "工程队长", desc: "完成 10 个项目", icon: "👷", unlocked: projectsCompleted >= 10, progress: Math.min(projectsCompleted, 10), max: 10 },
    // 笔记
    { id: "note10", name: "记录者", desc: "写下 10 条笔记", icon: "📝", unlocked: notes >= 10, progress: Math.min(notes, 10), max: 10 },
    { id: "note50", name: "知识囤积者", desc: "写下 50 条笔记", icon: "📚", unlocked: notes >= 50, progress: Math.min(notes, 50), max: 50 },
    { id: "note100", name: "百科全书", desc: "写下 100 条笔记", icon: "📖", unlocked: notes >= 100, progress: Math.min(notes, 100), max: 100 },
    // 复盘
    { id: "review3", name: "反思者", desc: "完成 3 次复盘", icon: "🔍", unlocked: reviews >= 3, progress: Math.min(reviews, 3), max: 3 },
    { id: "review10", name: "深度复盘者", desc: "完成 10 次复盘", icon: "🧠", unlocked: reviews >= 10, progress: Math.min(reviews, 10), max: 10 },
    { id: "review30", name: "复盘大师", desc: "完成 30 次复盘", icon: "🎓", unlocked: reviews >= 30, progress: Math.min(reviews, 30), max: 30 },
    // 学习计划 & 资产
    { id: "plan5", name: "学习规划师", desc: "创建 5 个学习计划", icon: "📋", unlocked: plans >= 5, progress: Math.min(plans, 5), max: 5 },
    { id: "asset10", name: "资产积累者", desc: "积累 10 个长期资产", icon: "💎", unlocked: assets >= 10, progress: Math.min(assets, 10), max: 10 },
    // 每日全勤
    { id: "day1", name: "今日事今日毕", desc: "一天内完成任务", icon: "🎯", unlocked: todayCompleted >= 1, progress: Math.min(todayCompleted, 1), max: 1 },
    { id: "day3", name: "三日全勤", desc: "连续 3 天每天完成至少 1 个任务", icon: "🗓️", unlocked: dailyTaskStreak >= 3, progress: Math.min(dailyTaskStreak, 3), max: 3 },
  ];
  return defs.map((b) => ({ ...b, percent: Math.min(100, Math.round((b.progress / b.max) * 100)) }));
}

/** 个人空间数据：个人统计概览 + 连续打卡 + 今日进度 + 最近动态 */
export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const today = dateKey(new Date());

    const [tasks, projects, notes, usageRows, todayTasks, yesterdayTasks, notifications, reviews, plans, assets, completedTasks] =
      await Promise.all([
        prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.note.count(),
        prisma.dailyUsage.findMany({ select: { date: true, seconds: true } }),
        prisma.task.findMany({
          where: { completedAt: { gte: todayStart, lt: todayEnd } },
          select: { id: true },
        }),
        prisma.task.findMany({
          where: { completedAt: { gte: new Date(todayStart.getTime() - 86400000), lt: todayStart } },
          select: { id: true },
        }),
        prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { title: true, body: true, createdAt: true } }),
        prisma.review.count(),
        prisma.learningRecord.count(),
        prisma.asset.count(),
        prisma.task.findMany({
          where: { status: "completed", completedAt: { not: null } },
          select: { completedAt: true },
        }),
      ]);

    const taskCount = (s: string) => tasks.find((t) => t.status === s)?._count._all ?? 0;
    const projectCount = (s: string) => projects.find((p) => p.status === s)?._count._all ?? 0;
    const usageDates = new Set(usageRows.map((r) => r.date));

    // 连续每日完成任务天数：从今天（或昨天）往前数，每天至少完成 1 个任务
    const completedDates = new Set(
      completedTasks.map((t) => (t.completedAt ? dateKey(t.completedAt) : "")).filter(Boolean),
    );
    let dailyTaskStreak = 0;
    {
      const d = new Date();
      if (!completedDates.has(dateKey(d))) d.setDate(d.getDate() - 1);
      while (completedDates.has(dateKey(d))) {
        dailyTaskStreak++;
        d.setDate(d.getDate() - 1);
      }
    }

    return NextResponse.json({
      ok: true,
      stats: {
        tasksCompleted: taskCount("completed"),
        tasksDoing: taskCount("doing"),
        tasksTodo: taskCount("todo"),
        tasksTotal: tasks.reduce((s, t) => s + t._count._all, 0),
        projectsActive: projectCount("active"),
        projectsCompleted: projectCount("completed"),
        projectsTotal: projects.reduce((s, p) => s + p._count._all, 0),
        notes,
        usageSeconds: usageRows.reduce((s, r) => s + r.seconds, 0),
        usageDays: usageRows.length,
      },
      today: {
        completed: todayTasks.length,
        seconds: usageRows.find((r) => r.date === today)?.seconds ?? 0,
        streak: calcStreak(usageDates),
      },
      yesterday: {
        completed: yesterdayTasks.length,
      },
      badges: calcBadges({
        streak: calcStreak(usageDates),
        usageDays: usageRows.length,
        tasksCompleted: taskCount("completed"),
        tasksTotal: tasks.reduce((s, t) => s + t._count._all, 0),
        projectsCompleted: projectCount("completed"),
        notes,
        usageSeconds: usageRows.reduce((s, r) => s + r.seconds, 0),
        todayCompleted: todayTasks.length,
        reviews,
        plans,
        assets,
        dailyTaskStreak,
      }),
      recent: notifications.map((n) => ({
        title: n.title,
        body: n.body,
        time: n.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[api/space] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
