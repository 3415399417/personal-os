import Link from "next/link";

/** 工作台 / 快速入口（参考图样式）：5 入口单行横排，彩色图标 + 浅紫圆角底 + 下方文字 */
const ICON_COLOR: Record<string, string> = {
  inbox: "#7C3AED", // 收集箱：紫
  calendar: "#3B82F6", // 今日计划：蓝
  note: "#F59E0B", // 新建笔记：黄
  project: "#7C3AED", // 新建项目：紫
  mic: "#7C3AED", // 语音记录：紫
};

const ITEMS: { id: string; label: string; icon: string; href: string; svg: React.ReactNode }[] = [
  {
    id: "q1",
    label: "收集箱",
    icon: "inbox",
    href: "/inbox",
    svg: (
      <>
        <path d="M4 7h16l-1.5 12h-13z" />
        <path d="M4 11h5l1.5 2.5h3L15 11h5" />
      </>
    ),
  },
  {
    id: "q2",
    label: "今日计划",
    icon: "calendar",
    href: "/today",
    svg: (
      <>
        <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
        <path d="M8 3v4M16 3v4M3.5 10h17" />
      </>
    ),
  },
  {
    id: "q3",
    label: "新建笔记",
    icon: "note",
    href: "/notes",
    svg: (
      <>
        <path d="M6 4.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6 4.5z" />
        <path d="M14 4.5V9h4" />
      </>
    ),
  },
  {
    id: "q4",
    label: "新建项目",
    icon: "project",
    href: "/projects",
    svg: (
      <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
    ),
  },
  {
    id: "q5",
    label: "语音记录",
    icon: "mic",
    href: "/notes",
    svg: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
      </>
    ),
  },
];

export function QuickCard() {
  return (
    <article className="card" data-od-id="card-quick">
      <div className="card-head">
        <div className="card-title-row">
          <img src="/art/title-quick.png" alt="" className="card-title-ico" />
          <h2 className="card-title">工作台 / 快速入口</h2>
        </div>
      </div>
      <div className="quick-row">
        {ITEMS.map((q) => (
          <Link href={q.href} className="quick-cell" data-od-id={`quick-${q.icon}`} key={q.id}>
            <span className="quick-cell-ico" aria-hidden="true" style={{ color: ICON_COLOR[q.icon] }}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {q.svg}
              </svg>
            </span>
            <span className="quick-cell-label">{q.label}</span>
          </Link>
        ))}
      </div>

      {/* 底部：横线 + 进入工作台（与长期资产库一致） */}
      <div className="card-foot">
        <Link className="link-more" href="/workbench" data-od-id="quick-more">
          进入工作台 &gt;
        </Link>
      </div>
    </article>
  );
}
