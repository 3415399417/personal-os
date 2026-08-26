import Link from "next/link";
import type { DashboardData } from "@/types";

/** 秒数 → "X 小时 Y 分" / "X 分钟" */
function fmtDuration(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 1) return "不足 1 分钟";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} 小时 ${m} 分` : `${m} 分钟`;
}

/**
 * 学习与成长（输入 → 沉淀 → 复用）：
 * 今日学习时长（系统使用计时）/ 本周沉淀（新增笔记）/ 长期资产（SOP/Prompt/Skill）
 */
export function StudyCard({ learning }: { learning: DashboardData["learning"] }) {
  return (
    <article className="card" data-od-id="card-study">
      <div className="card-head">
        <div className="card-title-row">
          <img src="/art/title-study.png" alt="" className="card-title-ico" />
          <h2 className="card-title">学习与成长</h2>
        </div>
      </div>

      <ul className="proj-list study-list">
        {/* 今日学习时长：系统打开即计时 */}
        <li>
          <span className="proj-line" style={{ display: "flex" }}>
            <span className="proj-name">
              <img src="/art/study-cat-learn.png" alt="" className="study-cat-ico" />
              <span className="proj-name-text">
                <b>今日学习</b>
              </span>
            </span>
            <span className="num">{fmtDuration(learning.usageTodaySeconds)}</span>
          </span>
          <span className="study-sub">本周累计 {fmtDuration(learning.usageWeekSeconds)}</span>
        </li>

        {/* 本周沉淀：新增笔记数 */}
        <li>
          <span className="proj-line" style={{ display: "flex" }}>
            <span className="proj-name">
              <img src="/art/study-cat-plan.png" alt="" className="study-cat-ico" />
              <span className="proj-name-text">
                <b>本周沉淀</b>
              </span>
            </span>
            <span className="study-meta">
              新增笔记 <b className="num">{learning.weekNotesCount}</b> 篇
            </span>
          </span>
          <span className="study-sub">进行中学习计划 {learning.activePlanCount} 项 · 平均 {learning.activePlanProgress}%</span>
        </li>

        {/* 长期资产：可复用积累 */}
        <li>
          <span className="proj-line" style={{ display: "flex" }}>
            <span className="proj-name">
              <img src="/art/study-cat-card.png" alt="" className="study-cat-ico" />
              <span className="proj-name-text">
                <b>长期资产</b>
              </span>
            </span>
            <span className="study-meta">
              SOP / Prompt / Skill 共 <b className="num">{learning.assetCount}</b> 个
            </span>
          </span>
          <span className="study-sub">可复用的方法沉淀，越攒越值钱</span>
        </li>
      </ul>

      {/* 底部：横线 + 进入学习中心 */}
      <div className="card-foot">
        <Link className="link-more" href="/learning" data-od-id="study-more">
          进入学习中心 &gt;
        </Link>
      </div>

      {/* 右下角插画：读书像素角色（今日执行同款模式：半透明置底） */}
      <img src="/art/study-read.png" alt="" className="card-art study-art" aria-hidden="true" />
    </article>
  );
}
