// 插画组件：从 personal-os-home.html 原样提取（扁平手绘治愈风），禁止替换为 AI 生成图

/** 侧边栏品牌 Logo（星星） */
export function BrandMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l1.6 4.6L18 9.2l-4.4 1.6L12 15.4l-1.6-4.6L6 9.2l4.4-1.6L12 3z" />
      <circle cx="18.5" cy="16.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="5.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 问候卡插画：云朵 + 兔子 */
export function GreetArt() {
  return (
    <svg viewBox="0 0 84 60" fill="none" aria-hidden>
      <path d="M60 6a15 15 0 1 0 10 25 12.5 12.5 0 1 1 -10 -25z" fill="#C4B5FD" />
      <g transform="translate(12 40)">
        <ellipse cx="16" cy="12" rx="13" ry="9" fill="#fff" />
        <circle cx="16" cy="5" r="8" fill="#fff" />
        <path d="M10 1c-2-6 1-9 4-8 1 3 0 6-2 8z" fill="#A78BFA" />
        <path d="M20 1c2-6-1-9-4-8-1 3 0 6 2 8z" fill="#A78BFA" />
        <circle cx="13.4" cy="4.6" r=".9" fill="#1F2937" />
        <circle cx="18.6" cy="4.6" r=".9" fill="#1F2937" />
        <path d="M14.5 8.4c1 .7 2 .7 3 0" stroke="#1F2937" strokeWidth=".8" strokeLinecap="round" />
        <path d="M24 15c-2.5-2-5.5-2-8 0l-2-4 12-2z" fill="#EDE9FE" />
      </g>
      <circle cx="76" cy="16" r="1.6" fill="#A78BFA" />
      <circle cx="82" cy="10" r="1.1" fill="#C4B5FD" />
      <circle cx="70" cy="24" r="1" fill="#C4B5FD" />
    </svg>
  );
}

/** Hero 大场景：紫山 + 月亮 + 工作兔 */
export function HeroScene() {
  return (
    <svg viewBox="0 0 860 340" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden>
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
  );
}

/** 今日执行卡插画：兔子 + 小熊 */
export function ExecArt() {
  return (
    <svg viewBox="0 0 96 70" fill="none" aria-hidden>
      <circle cx="30" cy="24" r="16" fill="#EDE9FE" />
      <circle cx="18" cy="12" r="6" fill="#EDE9FE" />
      <circle cx="42" cy="12" r="6" fill="#EDE9FE" />
      <ellipse cx="30" cy="54" rx="18" ry="12" fill="#C4B5FD" />
      <ellipse cx="30" cy="56" rx="9" ry="6.5" fill="#fff" />
      <circle cx="25.6" cy="23" r="1.1" fill="#1F2937" />
      <circle cx="34.4" cy="23" r="1.1" fill="#1F2937" />
      <path d="M27.5 27.5c1.6 1 3.4 1 5 0" stroke="#1F2937" strokeWidth="1" strokeLinecap="round" />
      <path d="M30 29.5l.5 4.5-3 4" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="10" cy="60" rx="8" ry="6" fill="#fff" />
      <circle cx="10" cy="55" r="4.6" fill="#fff" />
      <path d="M6.6 52c-.8-3.4.6-4.8 2.2-4.4.7 1.8.4 3-1 4.4z" fill="#A78BFA" />
      <path d="M13.4 52c.8-3.4-.6-4.8-2.2-4.4-.7 1.8-.4 3 1 4.4z" fill="#A78BFA" />
      <circle cx="66" cy="18" r="2" fill="#A78BFA" />
      <path d="M70 10a8 8 0 1 0 5 13 6.6 6.6 0 1 1 -5 -13z" fill="#C4B5FD" />
    </svg>
  );
}

/** 当前项目卡插画：山 + 月 + 小旗 */
export function ProjectsArt() {
  return (
    <svg viewBox="0 0 96 70" fill="none" aria-hidden>
      <circle cx="72" cy="16" r="9" fill="#EDE9FE" />
      <circle cx="74" cy="14" r="6.4" fill="#F5F3FF" />
      <path d="M8 62L34 32l12 14 10-10 20 26z" fill="#C4B5FD" />
      <path d="M48 58l16-16 12 16 12-8 8 8z" fill="#A78BFA" opacity=".5" />
      <path d="M34 32l-3-9 3.5 1.5L37 15l2 9.5L43 24z" fill="#A78BFA" />
      <path d="M34 32l4.5 2.5" stroke="#A78BFA" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M20 58h6l2-5 2 5h6" stroke="#8B5CF6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="#fff" opacity=".8" />
    </svg>
  );
}

/** 资源中心卡插画：书 + 文件夹 */
export function ResourcesArt() {
  return (
    <svg viewBox="0 0 96 66" fill="none" aria-hidden>
      <path d="M16 26l32-13 32 13-32 13z" fill="#C4B5FD" />
      <path d="M16 26v24a4 4 0 0 0 4 4h56a4 4 0 0 0 4-4V26" fill="#F5F3FF" stroke="#A78BFA" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M48 13v41" stroke="#A78BFA" strokeWidth="1.4" />
      <circle cx="30" cy="36" r="3" fill="#A78BFA" />
      <circle cx="62" cy="40" r="2.4" fill="#C4B5FD" />
      <circle cx="74" cy="30" r="1.8" fill="#A78BFA" />
      <path d="M28 51l3 3-3 3 3 3" stroke="#8B5CF6" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="#fff" opacity=".85" />
    </svg>
  );
}

/** 学习与成长卡插画：书 + 苗 */
export function StudyArt() {
  return (
    <svg viewBox="0 0 96 68" fill="none" aria-hidden>
      <path d="M30 20c-7-6-16-6-22-1l-5 24c7-3 15-2 20 2l7-4z" fill="#EDE9FE" />
      <path d="M66 20c7-6 16-6 22-1l5 24c-7-3-15-2-20 2l-7-4z" fill="#C4B5FD" />
      <path d="M48 24v30" stroke="#A78BFA" strokeWidth="1.6" />
      <path d="M43 44c-4-2-8-2-12 0l3-7 10 2z" fill="#F5F3FF" />
      <path d="M53 44c4-2 8-2 12 0l-3-7-10 2z" fill="#F5F3FF" />
      <path d="M60 14l-3 3 3 3-3 3 3 3" stroke="#8B5CF6" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="#fff" opacity=".85" />
    </svg>
  );
}

/** 最近沉淀卡插画：文档 + 兔子 */
export function NotesArt() {
  return (
    <svg viewBox="0 0 96 66" fill="none" aria-hidden>
      <rect x="22" y="18" width="40" height="34" rx="4" fill="#fff" stroke="#C4B5FD" strokeWidth="1.5" />
      <path d="M22 24h40M22 30h40M22 36h26" stroke="#C4B5FD" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30 52l4-4 4 4-4 3z" fill="#A78BFA" />
      <g transform="translate(58 46)">
        <ellipse cx="0" cy="8" rx="8" ry="5" fill="#EDE9FE" />
        <circle cx="0" cy="3" r="5" fill="#EDE9FE" />
        <path d="M-3.4 0c-.8-3 .6-4.3 2-4 1 1.6 .4 2.8-1 4z" fill="#A78BFA" />
        <path d="M3.4 0c.8-3-.6-4.3-2-4-1 1.6-.4 2.8 1 4z" fill="#A78BFA" />
        <circle cx="-1.4" cy="2.6" r=".7" fill="#1F2937" />
        <circle cx="1.4" cy="2.6" r=".7" fill="#1F2937" />
      </g>
    </svg>
  );
}

/** 生活与自我卡插画：植物 + 月亮 */
export function LifeArt() {
  return (
    <svg viewBox="0 0 96 66" fill="none" aria-hidden>
      <path d="M32 48h32l-4 12H36z" fill="#C4B5FD" />
      <path d="M48 46l-10-16 7-2 3 12 3-12 7 2-10 16z" fill="#A78BFA" />
      <path d="M48 30V18" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M48 22c-6-1-10-6-10-12 6 0 10 4 10 12z" fill="#C4B5FD" opacity=".85" />
      <circle cx="74" cy="14" r="2" fill="#A78BFA" />
      <circle cx="80" cy="22" r="1.4" fill="#C4B5FD" />
    </svg>
  );
}

/** 工作台快速入口卡插画：云朵 + 兔子 */
export function QuickArt() {
  return (
    <svg viewBox="0 0 96 66" fill="none" aria-hidden>
      <path d="M62 12a15 15 0 1 0 10 25 12.5 12.5 0 1 1 -10 -25z" fill="#C4B5FD" />
      <circle cx="76" cy="10" r="1.6" fill="#A78BFA" />
      <circle cx="82" cy="18" r="1.1" fill="#C4B5FD" />
      <circle cx="70" cy="24" r="1.3" fill="#A78BFA" />
      <g transform="translate(12 40)">
        <ellipse cx="14" cy="12" rx="12" ry="8" fill="#EDE9FE" />
        <circle cx="14" cy="6" r="7" fill="#EDE9FE" />
        <path d="M9 2c-1.5-5 .6-7.4 3.4-6.4.8 2.7.1 4.8-1.6 6.4z" fill="#C4B5FD" />
        <path d="M19 2c1.5-5-.6-7.4-3.4-6.4-.8 2.7-.1 4.8 1.6 6.4z" fill="#C4B5FD" />
      </g>
    </svg>
  );
}

/** AI 小助手卡插画：机器人 */
export function AiArt() {
  return (
    <svg viewBox="0 0 100 74" fill="none" aria-hidden>
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
  );
}

/** 长期资产库卡插画：书叠 + 星星 */
export function AssetsArt() {
  return (
    <svg viewBox="0 0 96 66" fill="none" aria-hidden>
      <path d="M16 26h48l4 4v26H20z" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.3" />
      <path d="M22 30h48l4 4v22H26z" fill="#C4B5FD" opacity=".7" />
      <path d="M28 34h44l4 4v18H32z" fill="#A78BFA" opacity=".6" />
      <path d="M16 26l4-6h14l-3 6" fill="#C4B5FD" />
      <path d="M22 30l4-6h14l-3 6" fill="#A78BFA" />
      <path d="M60 14l-2.6 2.6L60 19l-2.6 2.6L60 24" stroke="#8B5CF6" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="#fff" opacity=".85" />
    </svg>
  );
}
