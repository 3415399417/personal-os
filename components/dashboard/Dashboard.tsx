"use client";

import { useEffect, useState } from "react";
import { Hero } from "@/components/dashboard/Hero";
import { ExecCard } from "@/components/dashboard/ExecCard";
import { ProjectsCard } from "@/components/dashboard/ProjectsCard";
import { ResourcesCard } from "@/components/dashboard/ResourcesCard";
import { StudyCard } from "@/components/dashboard/StudyCard";
import { NotesCard } from "@/components/dashboard/NotesCard";
import { LifeCard } from "@/components/dashboard/LifeCard";
import { QuickCard } from "@/components/dashboard/QuickCard";
import { AiCard } from "@/components/dashboard/AiCard";
import { AssetsCard } from "@/components/dashboard/AssetsCard";
import { getDashboard } from "@/lib/api";
import { useCached } from "@/hooks/useCached";
import type { DashboardData } from "@/types";

/**
 * 首页 Dashboard：原型结构逐行翻译；数据来自 DB（getDashboard）
 * Hero → grid-row（今日执行/当前项目/资源中心）→ grid-row（学习/沉淀/生活）→ grid-row（工作台/AI/资产库）
 */
export function Dashboard() {
  // 缓存秒开：切回首页直接显示缓存，后台静默刷新（betterlife:data-changed 时强制刷新）
  const { data, reload } = useCached<DashboardData | null>("dashboard:data", () => getDashboard(), 30_000);
  const [streak, setStreak] = useState(0);

  // 连续使用天数（Hero 右上角徽章）：来自 /api/space
  const loadStreak = () => {
    fetch("/api/space")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setStreak(d.today?.streak ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadStreak();
    // 全局数据变更事件：侧边栏/其他页面操作后实时刷新首页卡片（无需手动刷新页面）
    const onDataChanged = () => {
      reload();
      loadStreak();
    };
    window.addEventListener("betterlife:data-changed", onDataChanged);
    return () => window.removeEventListener("betterlife:data-changed", onDataChanged);
  }, [reload]);

  return (
    <div className="page">
      <div className="page-scroll">
        <Hero focus={data?.focus} streak={streak} />

        {/* Layer 2 · row 1 */}
        <section className="grid-row" data-od-id="row-today">
          <ExecCard
            stats={data?.execGroups?.stats}
            total={data?.execTotal ?? 0}
          />
          <ProjectsCard projects={data?.projects ?? []} onChanged={reload} />
          <ResourcesCard resources={data?.resources ?? []} />
        </section>

        {/* Layer 3 · row 2 */}
        <section className="grid-row" data-od-id="row-growth">
          <StudyCard learning={data?.learning ?? { percent: 0, learnedMinutes: 0, targetMinutes: 60, planCount: 0, cardCount: 0, activePlanCount: 0, activePlanProgress: 0, usageTodaySeconds: 0, usageWeekSeconds: 0, weekNotesCount: 0, assetCount: 0, plans: [] }} />
          <NotesCard notes={data?.notes ?? []} onChanged={reload} />
          <LifeCard />
        </section>

        {/* Layer 4 · row 3 */}
        <section className="grid-row" data-od-id="row-tools">
          <QuickCard />
          <AiCard />
          <AssetsCard />
        </section>
      </div>
    </div>
  );
}
