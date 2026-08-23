import Link from "next/link";

/** AI 协作小助手（原型 card-ai 逐行翻译） */
export function AiCard() {
  return (
    <article className="card ai-card" data-od-id="card-ai">
      <div className="ai-head">
        <div>
          <div className="card-title-row">
            <img src="/art/title-ai.png" alt="" className="card-title-ico" />
            <h2 className="card-title">AI 协作小助手</h2>
          </div>
          <p>随时待命，帮你把想法变成行动</p>
        </div>
        <div className="ai-art" aria-hidden="true">
          <svg viewBox="0 0 100 74" fill="none">
            <path d="M50 4v5" stroke="#A78BFA" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="50" cy="4" r="2.6" fill="#A78BFA" />
            <rect x="30" y="14" width="40" height="34" rx="10" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.4" />
            <rect x="42" y="22" width="6.5" height="8" rx="3" fill="#1F2937" />
            <rect x="51.5" y="22" width="6.5" height="8" rx="3" fill="#1F2937" />
            <path d="M42 37h16" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="22" y="36" width="7" height="16" rx="3.5" fill="#C4B5FD" />
            <rect x="71" y="36" width="7" height="16" rx="3.5" fill="#C4B5FD" />
            <rect x="36" y="48" width="28" height="14" rx="7" fill="#A78BFA" />
            <circle cx="46" cy="55" r="1.6" fill="#fff" />
            <circle cx="54" cy="55" r="1.6" fill="#fff" />
            <circle cx="78" cy="12" r="1.5" fill="#C4B5FD" />
            <path d="M18 56a6 6 0 1 0 4 10 5 5 0 1 1 -4 -10z" fill="#C4B5FD" opacity=".8" />
          </svg>
        </div>
      </div>
      <div className="ai-tags">
        <button className="ai-tag" data-od-id="ai-tag-1">
          整理今天的收集箱
        </button>
        <button className="ai-tag" data-od-id="ai-tag-2">
          总结这篇文档
        </button>
        <button className="ai-tag" data-od-id="ai-tag-3">
          制定明日计划
        </button>
        <button className="ai-tag" data-od-id="ai-tag-4">
          复盘本周工作
        </button>
      </div>
      <Link href="/ai" className="btn btn-primary btn-block" data-od-id="ai-chat">
        开始对话
      </Link>
    </article>
  );
}
