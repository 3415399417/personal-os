import Link from "next/link";

/** 长期资产库（参考图样式）：5 类资产横向排列，上图下文（图标 + 主标题 + 副标题），底部查看全部 */
const ASSETS = [
  {
    id: "a1",
    label: "SOP",
    sub: "流程与标准",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3.5h9l4 4V20a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 20z" />
        <path d="M14 3.5V8h4" />
        <path d="M9 12h6M9 15.5h6" />
      </svg>
    ),
    icoBg: "#fff",
    icoBorder: "1.5px solid #9CA3AF",
    icoColor: "#6B7280",
  },
  {
    id: "a2",
    label: "Prompt",
    sub: "提示词库",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6.5L3.5 12 8 17.5" />
        <path d="M16 6.5l4.5 5.5L16 17.5" />
        <path d="M13.5 4l-3 16" />
      </svg>
    ),
    icoBg: "#F59E0B",
    icoBorder: "none",
    icoColor: "#fff",
  },
  {
    id: "a3",
    label: "Skill",
    sub: "技能清单",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8.5c0-2.8 2.7-5 6-5s6 2.2 6 5c0 1.7-.9 3.2-2.3 4.1l.8 6.4-4.5-2.5-4.5 2.5.8-6.4C6.9 11.7 6 10.2 6 8.5z" />
        <path d="M9.5 7.5c0-1.2 1.1-2.2 2.5-2.2s2.5 1 2.5 2.2" />
      </svg>
    ),
    icoBg: "#22C55E",
    icoBorder: "none",
    icoColor: "#fff",
  },
  {
    id: "a4",
    label: "项目记忆",
    sub: "项目经验",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
        <path d="M8 3.5v17" />
        <path d="M10.5 8h5M10.5 12h5" />
      </svg>
    ),
    icoBg: "#8B5CF6",
    icoBorder: "none",
    icoColor: "#fff",
  },
  {
    id: "a5",
    label: "复盘记录",
    sub: "复盘沉淀",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z" />
        <path d="M14 3.5V8h4" />
      </svg>
    ),
    icoBg: "#E5E7EB",
    icoBorder: "none",
    icoColor: "#6B7280",
  },
];

export function AssetsCard() {
  return (
    <article className="card" data-od-id="card-assets">
      <div className="card-head">
        <div className="card-title-row">
          <img src="/art/title-assets.png" alt="" className="card-title-ico" />
          <h2 className="card-title">长期资产库</h2>
        </div>
      </div>

      <div className="asset-grid">
        {ASSETS.map((a) => (
          <Link href="/assets" className="asset-cell" key={a.id} data-od-id={`asset-${a.id}`}>
            <span
              className="asset-cell-ico"
              aria-hidden="true"
              style={{ background: a.icoBg, border: a.icoBorder, color: a.icoColor }}
            >
              {a.icon}
            </span>
            <b>{a.label}</b>
            <em>{a.sub}</em>
          </Link>
        ))}
      </div>

      {/* 底部：横线 + 查看全部 */}
      <div className="card-foot">
        <Link className="link-more" href="/assets" data-od-id="assets-more">
          查看全部资产 &gt;
        </Link>
      </div>
    </article>
  );
}
