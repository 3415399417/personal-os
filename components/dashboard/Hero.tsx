import Link from "next/link";
import type { DashboardData } from "@/types";

/**
 * Hero 区：hero-scene 场景插画 + 文案 + 今日最重要任务卡
 * 结构照搬原型；数据来自 Dashboard（DB 实时），无焦点任务时显示空状态
 */
export function Hero({ focus, streak }: { focus?: DashboardData["focus"]; streak?: number }) {
  const hasFocus = !!focus && !!focus.title;

  return (
    <section className="hero-card" data-od-id="hero">
      {/* 右上角：连续使用天数徽章 */}
      {!!streak && streak > 0 && (
        <div className="hero-streak" title="连续使用天数">
          🔥 {streak} 天
        </div>
      )}
      <div className="hero-scene" aria-hidden="true">
        <svg viewBox="0 0 860 340" preserveAspectRatio="xMidYMid slice" fill="none">
          <rect width="860" height="340" fill="#F5F3FF" />
          <g>
            <rect x="58" y="40" width="120" height="112" rx="10" fill="#fff" stroke="#C4B5FD" strokeWidth="1.6" />
            <path d="M58 96h120" stroke="#C4B5FD" strokeWidth="1.4" />
            <path d="M118 40v112" stroke="#C4B5FD" strokeWidth="1.4" />
            <path d="M88 150l8-18 10 12 14-26 12 32z" fill="#A78BFA" />
            <rect x="96" y="140" width="44" height="16" rx="4" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />
            <circle cx="78" cy="64" r="2" fill="#C4B5FD" />
            <circle cx="150" cy="56" r="1.6" fill="#C4B5FD" />
          </g>
          <path d="M700 12a16 16 0 1 0 10 26 13 13 0 1 1 -10 -26z" fill="#A78BFA" />
          <circle cx="806" cy="30" r="2.4" fill="#C4B5FD" />
          <circle cx="782" cy="50" r="1.7" fill="#C4B5FD" />
          <circle cx="672" cy="52" r="1.7" fill="#C4B5FD" />
          <path d="M-20 300l180-110 120 92 150-150 130 128 120-96 200 136z" fill="#EDE9FE" />
          <path d="M200 292l120-66 130 118 120-76 130 96 160-70z" fill="#C4B5FD" opacity=".55" />
          <path d="M470 322l150-70 120 84 120-54z" fill="#A78BFA" opacity=".4" />
          <g transform="translate(300 258)">
            <ellipse cx="0" cy="18" rx="22" ry="13" fill="#fff" />
            <circle cx="0" cy="2" r="13" fill="#fff" />
            <path d="M-10-3c-3-10 2-14 7-13 2 5 1 9-3 13z" fill="#C4B5FD" />
            <path d="M11-3c3-10-2-14-7-13-2 5-1 9 3 13z" fill="#C4B5FD" />
            <circle cx="-3.5" cy="1" r="1.3" fill="#1F2937" />
            <circle cx="3.5" cy="1" r="1.3" fill="#1F2937" />
            <path d="M-2 6c1.5 1 3 1 4.5 0" stroke="#1F2937" strokeWidth="1" strokeLinecap="round" />
            <path d="M-14 24c-5-4-11-5-17-3l-3-8 20-5z" fill="#EDE9FE" />
          </g>
        </svg>
      </div>
      <div className="hero-copy">
        <h1 className="hero-title">专注当下，持续创造真实成果</h1>
        <p className="hero-sub">把注意力留给真正重要的事，让每一次行动都有回响。</p>
      </div>

      <div className="hero-body">
        {hasFocus ? (
          <div className="focus-card" data-od-id="focus-card">
            {/* 左栏：概览 */}
            <div className="focus-left">
              {/* 顶部：星星 + 今日最重要 */}
              <div className="focus-top">
                <span className="card-eyebrow">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3l2.6 5.5 6 .7-4.4 4.2 1.1 6L12 16.6 6.7 19.4l1.1-6L3.4 9.2l6-.7L12 3z" />
                  </svg>
                  今日最重要
                </span>
              </div>

              {/* 主体：旗帜图标 + 标题 + AI 标签 + 描述 */}
              <div className="focus-main">
                <span className="focus-flag" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 21V4.5" />
                    <path d="M5 4.5c2-1.8 4.5-1.8 6.5 0 2 1.8 4.5 1.8 6.5 0v8.5c-2 1.8-4.5 1.8-6.5 0-2-1.8-4.5-1.8-6.5 0z" />
                  </svg>
                </span>
                <div className="focus-main-text">
                  <div className="focus-title-row">
                    <h3 className="focus-title">{focus.title}</h3>
                    <span className="focus-ai-tag">AI 赋能任务</span>
                  </div>
                  <p className="focus-desc">{focus.desc}</p>
                </div>
              </div>

              {/* 底部：三个浅灰胶囊元数据 */}
              <div className="focus-meta">
                <span className="focus-meta-pill">来源：{focus.source || "个人待办"}</span>
                <span className="focus-meta-pill">阶段：{focus.stage || "待开始"}</span>
                <span className="focus-meta-pill">进度：{focus.progress}%</span>
              </div>
            </div>

            {/* 右栏：执行详情 */}
            <div className="focus-right">
              <div className="focus-block">
                <span className="focus-block-label">主任务</span>
                <p className="focus-block-text">{focus.mainTask}</p>
              </div>
              <div className="focus-block focus-block-row">
                <span className="focus-block-label">状态</span>
                <span className="focus-state-pill">{focus.status || "进行中"}</span>
              </div>
              <div className="focus-block">
                <span className="focus-block-label">下一步</span>
                <p className="focus-block-text focus-next-text">{focus.nextStep}</p>
              </div>
              <div className="focus-btns">
                <Link className="btn btn-primary" href={focus.focusHref ?? (focus.kind === "project" ? "/projects" : "/today")} data-od-id="focus-continue">
                  继续工作
                  <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" aria-hidden="true">
                    <path d="M7 4.5l12 7.5-12 7.5z" />
                  </svg>
                </Link>
                <Link className="btn btn-soft" href="/review" data-od-id="focus-submit">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="12"
                    height="12"
                    aria-hidden="true"
                  >
                    <rect x="4" y="5" width="16" height="16" rx="2.5" />
                    <path d="M8 3v4M16 3v4M4 10h16" />
                  </svg>
                  提交成果
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="focus-card focus-card-empty" data-od-id="focus-task-card">
            {/* 左：星形图标 + 文案 */}
            <div className="empty-left">
              <span className="empty-ico" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l2.6 5.5 6 .7-4.4 4.2 1.1 6L12 16.6 6.7 19.4l1.1-6L3.4 9.2l6-.7L12 3z" />
                </svg>
              </span>
              <div className="empty-text">
                <div className="empty-title">
                  还没有今日<span className="empty-title-kai">焦点</span>
                </div>
                <div className="empty-sub">把最重要的任务或正在推进的项目设为今日焦点</div>
              </div>
            </div>
            {/* 右：两个胶囊按钮 */}
            <div className="empty-actions">
              <Link href="/today" className="btn empty-btn">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="11" height="11">
                  <path d="M6 1v10M1 6h10" />
                </svg>
                今天任务
              </Link>
              <Link href="/projects" className="btn empty-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
                  <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
                </svg>
                今日项目
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
