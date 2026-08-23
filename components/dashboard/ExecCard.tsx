import Link from "next/link";

/** 今日执行：标题下横线 + 左列分类 + 右列状态统计（无大括号无圆圈）+ 底部查看全部 */
export function ExecCard({
  stats = { done: 0, doing: 0, pending: 0 },
  total = 0,
}: {
  stats?: { done: number; doing: number; pending: number };
  total?: number;
}) {
  return (
    <article className="card" data-od-id="card-exec">
      <div className="card-head">
        <div className="card-title-row">
          <img src="/art/title-exec.png" alt="" className="card-title-ico" />
          <h2 className="card-title">今日执行</h2>
        </div>
      </div>

      {/* 标题下横线 */}
      <div className="exec-divider" aria-hidden="true" />

      {total === 0 ? (
        <div className="exec-empty">
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--accent-tint)",
              border: "1px solid var(--border)",
              color: "var(--accent)",
              display: "grid",
              placeItems: "center",
              marginBottom: 8,
            }}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="20"
              height="20"
            >
              <path d="M13 3L5 13.5h5L9 21l8-10.5h-5L13 3z" />
            </svg>
          </span>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg)" }}>还没有执行记录</div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>
            去「今天」页安排任务，开始今天的推进
          </div>
          <Link href="/today" className="btn btn-soft" style={{ marginTop: 10, height: 28, fontSize: 11.5 }}>
            去安排
          </Link>
        </div>
      ) : (
        <>
          {/* 主体：左列分类 + 右列状态统计（无大括号无圆圈） */}
          <div className="exec-body">
            {/* 左列：分类标签（必须完成 / 进行中 / 等待处理） */}
            <ul className="exec-cats">
              <li>
                <img src="/art/exec-cat-must.png" alt="" className="exec-cat-ico" />
                <span>必须完成</span>
              </li>
              <li>
                <img src="/art/exec-cat-doing.png" alt="" className="exec-cat-ico" />
                <span>进行中</span>
              </li>
              <li>
                <img src="/art/exec-cat-waiting.png" alt="" className="exec-cat-ico" />
                <span>等待处理</span>
              </li>
            </ul>

            {/* 右列：状态统计文字（数字在前带“项”） */}
            <ul className="exec-status-list">
              <li>
                <b>{stats.done}项</b>
                <span>已完成</span>
              </li>
              <li>
                <b>{stats.doing}项</b>
                <span>进行中</span>
              </li>
              <li>
                <b>{stats.pending}项</b>
                <span>待处理</span>
              </li>
            </ul>
          </div>

          {/* 底部：横线 + 查看全部 */}
          <div className="card-foot">
            <Link className="link-more" href="/today" data-od-id="exec-more">
              查看全部执行 &gt;
            </Link>
          </div>
        </>
      )}

      {/* 右下角插画：像素风女孩（后续可替换其他人物图）；card-art 类提供绝对定位+z-index 0 */}
      <img src="/art/study-girl.png" alt="" className="card-art exec-art" aria-hidden="true" />
    </article>
  );
}
