// 首页 Dashboard 聚合（getDashboard）
import { prisma } from "@/lib/db";
import type { DashboardData, LearningRecord } from "@/types";
import { calcProgress, formatTime, formatDate, noteTypeLabel, todayKey, toProject, toReminder, toTask, STATUS_TO_GROUP } from "./commons";

export async function getDashboard(): Promise<DashboardData> {
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // 本周一 00:00
  const [tasks, projects, notes, resources, learning, assets, reminders, weekNotes, usageRows] = await Promise.all([
    prisma.task.findMany(),
    prisma.project.findMany(),
    prisma.note.findMany({ where: { projectId: null }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.resource.findMany(),
    prisma.learningRecord.findMany(),
    prisma.asset.findMany(),
    prisma.reminder.findMany({ orderBy: { remindAt: "asc" } }),
    prisma.note.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.dailyUsage.findMany({ orderBy: { date: "desc" }, take: 7 }),
  ]);
  // 已完成项目沉底（与 getProjects 排序一致），其余按更新时间倒序
  projects.sort((a, b) => {
    const rank = (s: string) => (s === "completed" ? 1 : 0);
    return rank(a.status) - rank(b.status) || b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  // 今日执行/今日状态统计范围：个人任务 + 今日焦点项目的任务（未设焦点项目则只有个人任务）
  const focusProject = projects.find((p) => p.isTodayFocus) ?? null;
  const todayTasks = tasks.filter((t) => !t.projectId || (focusProject && t.projectId === focusProject.id));

  const total = todayTasks.length;
  const doneCount = todayTasks.filter((t) => t.status === "completed").length;
  const todoCount = todayTasks.filter((t) => t.status === "todo").length;
  const waitingCount = todayTasks.filter((t) => t.status === "waiting").length;
  // 今日执行卡片左右列计数（左列按 group 分类，右列按 status 状态）
  const execGroups = {
    cats: {
      must: todayTasks.filter((t) => t.group === "must").length,
      doing: todayTasks.filter((t) => t.group === "doing").length,
      waiting: todayTasks.filter((t) => t.group === "waiting").length,
    },
    stats: {
      done: doneCount,
      doing: todayTasks.filter((t) => t.status === "doing").length,
      pending: todayTasks.filter((t) => t.status === "todo" || t.status === "waiting").length,
    },
  };
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const focusTask = tasks.find((t) => t.isTodayFocus && t.status !== "completed") ?? null;

  const projectRows = projects.map((p) => {
    const ptasks = tasks.filter((t) => t.projectId === p.id);
    return { ...p, _progress: calcProgress(ptasks), _tasks: ptasks };
  });

  // 首页“最近活动”：每个项目取最近一条进度事件（详情页展开任务后产生）
  const recentEvents = await Promise.all(
    projectRows.map((p) =>
      prisma.progressEvent
        .findFirst({ where: { projectId: p.id }, orderBy: { createdAt: "desc" } })
        .then((ev) => (ev ? { id: p.id, detail: ev.detail, time: formatTime(ev.createdAt) } : null)),
    ),
  );
  const recentMap = new Map(
    recentEvents.filter(Boolean).map((r) => [r!.id, { detail: r!.detail, time: r!.time }]),
  );

  const learnedToday = learning.reduce((s, r) => s + r.progress, 0);
  const targetMinutes = 60;

  return {
    stats: {
      feature: { value: focusTask ? 1 : 0, label: "今日最重要" },
      cells: [
        { label: "必须完成", value: todoCount },
        { label: "进行中项目", value: activeProjects },
        { label: "等待处理", value: waitingCount },
        { label: "今日完成", value: doneCount },
      ],
    },
    execDone: doneCount,
    execTotal: total,
    execGroups,
    projects: projectRows.map((p) => ({
      ...toProject({ ...p, progress: p._progress }),
      tasks: p._tasks.map(toTask),
      recentActivity: recentMap.get(p.id) ?? undefined,
    })),
    resources: [
      { id: "r1", label: "收集箱", count: resources.filter((r) => r.type === "inbox" && r.status === "open").length, href: "/inbox" },
      { id: "r2", label: "领域库", count: resources.filter((r) => r.type === "domain").length, href: "/resources/domain" },
      { id: "r3", label: "项目库", count: projects.length, href: "/projects" },
      { id: "r4", label: "学习库", count: learning.length, href: "/learning" },
      { id: "r5", label: "知识库", count: resources.filter((r) => r.type === "knowledge").length, href: "/resources/knowledge" },
      { id: "r6", label: "指令库", count: resources.filter((r) => r.type === "command").length, href: "/resources/command" },
      { id: "r7", label: "模板库", count: resources.filter((r) => r.type === "template").length, href: "/resources/template" },
    ],
    reminders: reminders.map(toReminder),
    notes: notes.slice(0, 6).map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      type: noteTypeLabel(n.type),
      time: formatTime(n.createdAt),
    })),
    learning: {
      percent: 0,
      learnedMinutes: usageRows.reduce((s, r) => s + r.seconds, 0) / 60,
      targetMinutes,
      planCount: learning.length,
      cardCount: notes.length,
      activePlanCount: learning.filter((l) => l.progress > 0 && l.progress < 100).length,
      activePlanProgress: (() => {
        const active = learning.filter((l) => l.progress > 0 && l.progress < 100);
        return active.length > 0 ? Math.round(active.reduce((s, l) => s + l.progress, 0) / active.length) : 0;
      })(),
      usageTodaySeconds: usageRows.find((r) => r.date === todayKey())?.seconds ?? 0,
      usageWeekSeconds: usageRows.reduce((s, r) => s + r.seconds, 0),
      weekNotesCount: weekNotes,
      assetCount: assets.length,
      plans: learning.slice(0, 2).map((l) => ({
        id: l.id,
        title: l.title,
        minutes: l.progress,
        targetMinutes: 100,
        state: (l.progress >= 100 ? "已完成" : l.progress > 0 ? "进行中" : "待开始") as LearningRecord["state"],
        kind: "学习",
        date: formatDate(l.createdAt),
      })),
    },
    life: [
      { id: "f1", kind: "heart", label: "家庭", meta: "晚上与家人视频" },
      { id: "f2", kind: "sun", label: "健康", meta: "晨跑 5km", done: true },
      { id: "f3", kind: "bolt", label: "精力", meta: "午后冥想 15 分钟" },
      { id: "f4", kind: "book", label: "成长", meta: "阅读 20 分钟" },
    ],
    quick: [
      { id: "q1", label: "收集箱", icon: "inbox", href: "/inbox" },
      { id: "q2", label: "今日计划", icon: "calendar", href: "/today" },
      { id: "q3", label: "新建笔记", icon: "note", href: "/notes" },
      { id: "q4", label: "新建项目", icon: "project", href: "/projects" },
      { id: "q5", label: "语音记录", icon: "mic", href: "/notes" },
    ],
    aiTags: ["整理今天的收集箱", "总结这篇文档", "制定明日计划", "复盘本周工作"],
    assets: [
      { id: "a1", label: "SOP", count: assets.filter((a) => a.type === "sop").length },
      { id: "a2", label: "Prompt", count: assets.filter((a) => a.type === "prompt").length },
      { id: "a3", label: "Skill", count: assets.filter((a) => a.type === "skill").length },
      { id: "a4", label: "项目记忆", count: assets.filter((a) => a.type === "project_memory").length },
      { id: "a5", label: "复盘记录", count: assets.filter((a) => a.type === "review").length },
    ],
    focus: (() => {
      // 焦点：项目优先（今日项目），其次任务（今日最重要任务）
      const focusProject = projects.find((p) => p.isTodayFocus) ?? null;
      const focusTask = !focusProject ? tasks.find((t) => t.isTodayFocus && t.status !== "completed") ?? null : null;

      if (focusProject) {
        const ptasks = tasks.filter((t) => t.projectId === focusProject.id);
        const done = ptasks.filter((t) => t.status === "completed").length;
        const total = ptasks.length;
        const next = ptasks.find((t) => t.status !== "completed");
        const progress = calcProgress(ptasks);
        const allDone = total > 0 && done === total;
        return {
          kind: "project",
          eyebrow: "今日最重要",
          tag: "今日项目",
          title: focusProject.name,
          desc: focusProject.description || "今天专注推进这个项目。",
          source: "项目",
          stage: focusProject.status === "active" ? "进行中" : focusProject.status === "paused" ? "暂停" : focusProject.status === "completed" ? "已完成" : "待开始",
          progress,
          mainTask: next?.title ?? (allDone ? "全部完成" : "暂无任务"),
          status: allDone ? "已完成" : focusProject.status === "active" ? "进行中" : "待开始",
          nextStep: allDone ? "项目任务已全部完成，可以复盘了" : next?.description || "开始推进这项任务",
          projectId: focusProject.id,
          done,
          total,
          focusHref: `/projects/${focusProject.id}`,
        };
      }

      if (focusTask) {
        return {
          kind: "task",
          eyebrow: "今日最重要",
          tag: "AI 赋能任务",
          title: focusTask.title,
          desc: focusTask.description || "把注意力留给真正重要的事。",
          source: projects.find((p) => p.id === focusTask.projectId)?.name ?? "个人待办",
          stage: STATUS_TO_GROUP[focusTask.status] === "doing" ? "进行中" : "待开始",
          progress: focusTask.status === "completed" ? 100 : 0,
          mainTask: focusTask.title,
          status: focusTask.status === "completed" ? "已完成" : focusTask.status === "doing" ? "进行中" : "待开始",
          nextStep: focusTask.description || "开始推进这项任务",
          focusHref: "/today",
        };
      }

      return {
        kind: "none",
        eyebrow: "今日最重要",
        tag: "AI 赋能任务",
        title: "",
        desc: "",
        source: "",
        stage: "",
        progress: 0,
        mainTask: "",
        status: "",
        nextStep: "",
        focusHref: "/today",
      };
    })(),
  };
}

/* ── 待办 ── */

