"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/common/PageHead";

const PERSONAL_FIELDS = [
  { key: "name", label: "姓名", placeholder: "你的名字", defaultValue: "" },
  { key: "role", label: "身份", placeholder: "例如：外贸创业者", defaultValue: "外贸创业者" },
  { key: "focus", label: "当前焦点", placeholder: "最重要的一件事", defaultValue: "外贸AI系统搭建" },
] as const;

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({
    name: "",
    role: "外贸创业者",
    focus: "外贸AI系统搭建",
  });
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    daily: true,
    remind: true,
    compact: false,
  });
  const [saved, setSaved] = useState(false);
  const [dark, setDark] = useState(false);
  const [backupInfo, setBackupInfo] = useState<string>("");
  const [backupLoading, setBackupLoading] = useState(false);

  const toggle = (key: string) => setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  // 暗色模式：应用 + 持久化
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") setDark(true);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  const toggleDark = () => setDark((v) => !v);

  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const doBackup = () => {
    setBackupLoading(true);
    setBackupInfo("");
    fetch("/api/backup")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setBackupInfo(`备份成功：${d.file}（${(d.size / 1024).toFixed(1)} KB · ${d.time}）`);
        else setBackupInfo(`备份失败：${d.error || "未知错误"}`);
      })
      .catch((e) => setBackupInfo(`备份失败：${e.message}`))
      .finally(() => setBackupLoading(false));
  };

  return (
    <AppShell>
      <div className="page">
      <PageHead title="设置" sub="个人基础设置">
        <button className="btn btn-primary" onClick={save}>
          {saved ? "已保存 ✓" : "保存"}
        </button>
      </PageHead>

      <div className="page-scroll">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">个人信息</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PERSONAL_FIELDS.map((f) => (
              <div className="field" key={f.key}>
                <label className="field-label" htmlFor={`set-${f.key}`}>{f.label}</label>
                <input
                  id={`set-${f.key}`}
                  className="input"
                  value={values[f.key]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  maxLength={30}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">偏好</h2>
          </div>
          <div className="settings-list">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">暗色模式</span>
                <span className="setting-desc">深色主题，夜间更护眼</span>
              </div>
              <button
                type="button"
                className={`switch${dark ? " on" : ""}`}
                role="switch"
                aria-checked={dark}
                aria-label="暗色模式"
                onClick={toggleDark}
              />
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">每日问候</span>
                <span className="setting-desc">首页侧边栏显示日期与问候语</span>
              </div>
              <button
                type="button"
                className={`switch${toggles.daily ? " on" : ""}`}
                role="switch"
                aria-checked={toggles.daily}
                aria-label="每日问候"
                onClick={() => toggle("daily")}
              />
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">系统提醒</span>
                <span className="setting-desc">侧边栏展示会议与截止提醒</span>
              </div>
              <button
                type="button"
                className={`switch${toggles.remind ? " on" : ""}`}
                role="switch"
                aria-checked={toggles.remind}
                aria-label="系统提醒"
                onClick={() => toggle("remind")}
              />
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">紧凑模式</span>
                <span className="setting-desc">低高度窗口自动压缩卡片间距</span>
              </div>
              <button
                type="button"
                className={`switch${toggles.compact ? " on" : ""}`}
                role="switch"
                aria-checked={toggles.compact}
                aria-label="紧凑模式"
                onClick={() => toggle("compact")}
              />
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">数据管理</h2>
          </div>
          <div className="settings-list">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">导出全部数据</span>
                <span className="setting-desc">下载全部任务、项目、笔记等数据为 JSON 文件</span>
              </div>
              <a className="btn btn-soft" style={{ height: 30, fontSize: 12, padding: "0 14px" }} href="/api/export">
                导出 JSON
              </a>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">立即备份数据库</span>
                <span className="setting-desc">复制 dev.db 到 backup 目录（{backupInfo || "带时间戳，可随时还原"}）</span>
              </div>
              <button
                type="button"
                className="btn btn-soft"
                style={{ height: 30, fontSize: 12, padding: "0 14px" }}
                onClick={doBackup}
                disabled={backupLoading}
              >
                {backupLoading ? "备份中…" : "立即备份"}
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">关于</h2>
          </div>
          <div className="settings-list">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">BetterLife AI</span>
                <span className="setting-desc">Personal OS · Phase 1（本地 Mock 数据）</span>
              </div>
              <span className="badge">v0.1</span>
            </div>
          </div>
        </section>
      </div>
      </div>
    </AppShell>
  );
}
