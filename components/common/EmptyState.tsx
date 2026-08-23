import Link from "next/link";

interface EmptyStateProps {
  title: string;
  sub?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: "inbox" | "task" | "note" | "project" | "star" | "book" | "chart" | "folder";
}

const ICONS: Record<string, React.ReactNode> = {
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16l-1.5 12h-13z" />
      <path d="M4 11h5l1.5 2.5h3L15 11h5" />
    </svg>
  ),
  task: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  ),
  note: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6 4.5z" />
      <path d="M14 4.5V9h4" />
    </svg>
  ),
  project: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2.6 5.5 6 .7-4.4 4.2 1.1 6L12 16.6 6.7 19.4l1.1-6L3.4 9.2l6-.7L12 3z" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.2C10.2 4.9 7.6 4.4 4.5 5v13.4c3.1-.6 5.7-.1 7.5 1.2 1.8-1.3 4.4-1.8 7.5-1.2V5c-3.1-.6-5.7-.1-7.5 1.2z" />
      <path d="M12 6.2v13.4" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V6a2 2 0 0 1 2-2h10v15" />
      <path d="M4 19h14" />
      <path d="M8 8h6M8 12h6" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h9l4 4v12H6z" />
      <path d="M14 4v4h4" />
    </svg>
  ),
};

/** 统一空状态：紫色治愈风图标 + 文案 + 新建入口 */
export function EmptyState({ title, sub, actionLabel, actionHref, onAction, icon = "task" }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-ico">{ICONS[icon] ?? ICONS.task}</span>
      <div className="empty-state-title">{title}</div>
      {sub && <div className="empty-state-sub">{sub}</div>}
      {actionLabel &&
        (actionHref ? (
          <Link href={actionHref} className="btn btn-soft">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="11" height="11">
              <path d="M6 1v10M1 6h10" />
            </svg>
            {actionLabel}
          </Link>
        ) : (
          <button className="btn btn-soft" onClick={onAction}>
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="11" height="11">
              <path d="M6 1v10M1 6h10" />
            </svg>
            {actionLabel}
          </button>
        ))}
    </div>
  );
}
