import Link from "next/link";
import { ProgressBar } from "@/components/common/ProgressBar";
import type { DashboardData } from "@/types";

/** 学习与成长（当前项目同款行式样式）：今日学习(进度条) / 学习计划(进行中) / 知识卡片(今日复习) + 底部进入学习中心 */
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
        {/* 今日学习：右侧百分比 + 行下进度条 */}
        <li>
          <span className="proj-line" style={{ display: "flex" }}>
            <span className="proj-name">
              <img src="/art/study-cat-learn.png" alt="" className="study-cat-ico" />
              <span className="proj-name-text">
                <b>今日学习</b>
              </span>
            </span>
            <span className="num">{learning.percent}%</span>
          </span>
          <ProgressBar value={`${learning.percent}%`} />
        </li>

        {/* 学习计划：进行中几项 */}
        <li>
          <span className="proj-line" style={{ display: "flex" }}>
            <span className="proj-name">
              <img src="/art/study-cat-plan.png" alt="" className="study-cat-ico" />
              <span className="proj-name-text">
                <b>学习计划</b>
              </span>
            </span>
            <span className="study-meta">
              进行中 <b className="num">{learning.activePlanCount}</b> 项
            </span>
          </span>
          <ProgressBar value={`${learning.activePlanProgress}%`} />
        </li>

        {/* 知识卡片：今日复习多少条 + 复习进度条 */}
        <li>
          <span className="proj-line" style={{ display: "flex" }}>
            <span className="proj-name">
              <img src="/art/study-cat-card.png" alt="" className="study-cat-ico" />
              <span className="proj-name-text">
                <b>知识卡片</b>
              </span>
            </span>
            <span className="study-meta">
              今日复习 <b className="num">{learning.reviewToday}</b> 条
            </span>
          </span>
          <ProgressBar value={`${learning.reviewProgress}%`} />
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
