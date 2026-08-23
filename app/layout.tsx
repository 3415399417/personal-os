import type { Metadata } from "next";
import "./globals.css";
import "./prototype.css";
import "./pages.css";

export const metadata: Metadata = {
  title: "BetterLife AI · 个人效率 Dashboard",
  description: "BetterLife AI Personal OS — 专注当下，持续创造真实成果",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning：data-theme 由 head 内联脚本在 hydration 前管理，
    // 服务端 HTML 不会有该属性，React 校验时需忽略这个属性差异
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 防暗色模式闪白（FOUC）：CSS 应用前同步读取本地主题 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"){document.documentElement.dataset.theme="dark";}}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
