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
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
