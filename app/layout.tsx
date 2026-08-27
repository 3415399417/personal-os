import type { Metadata } from "next";
import "./globals.css";
import "./prototype.css";
import "./styles/01-base.css";
import "./styles/02-home.css";
import "./styles/03-github.css";
import "./styles/04-search.css";
import "./styles/05-review.css";
import "./styles/06-misc.css";
import "./styles/07-stats.css";
import "./styles/08-dark-art.css";
import "./styles/09-review-detail.css";
import "./styles/10-projects.css";
import "./styles/11-resources.css";
import "./styles/12-dark-theme.css";

export const metadata: Metadata = {
  title: "BetterLife AI · 个人效率 Dashboard",
  description: "BetterLife AI Personal OS — 专注当下，持续创造真实成果",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BetterLife",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning：data-theme 由 head 内联脚本在 hydration 前管理，
    // 服务端 HTML 不会有该属性，React 校验时需忽略这个属性差异
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#7C3AED" />
        {/* 防暗色模式闪白（FOUC）：CSS 应用前同步读取本地主题 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"){document.documentElement.dataset.theme="dark";}}catch(e){}})();`,
          }}
        />
        {/* PWA Service Worker 注册（生产/开发均可，仅 HTTPS 或 localhost 生效） */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})});}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
