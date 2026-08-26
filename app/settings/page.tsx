"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useRef, useState } from "react";
import { PageHead } from "@/components/common/PageHead";
import { AvatarCropper } from "@/components/common/AvatarCropper";
import { Modal } from "@/components/common/Modal";
import { clearAllNotifications, getProfile, saveProfile } from "@/lib/api";
import { SHORTCUT_ACTIONS, loadShortcuts, saveShortcuts, formatPressedKeys } from "@/hooks/useShortcuts";
import type { ShortcutId } from "@/hooks/useShortcuts";

const PERSONAL_FIELDS = [
  { key: "name", label: "姓名", placeholder: "你的名字", defaultValue: "" },
  { key: "role", label: "身份", placeholder: "例如：外贸创业者", defaultValue: "外贸创业者" },
  { key: "focus", label: "当前焦点", placeholder: "最重要的一件事", defaultValue: "外贸AI系统搭建" },
] as const;

const SETTINGS_KEY = "personalos:settings";

interface Settings {
  daily: boolean; // 每日问候
  remind: boolean; // 系统提醒
}

const DEFAULT_SETTINGS: Settings = { daily: true, remind: true };

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

/** 应用全局设置到 <html>，供所有页面使用 */
export function applySettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("betterlife:settings-changed"));
}

export default function SettingsPage() {
  // 个人信息：初始值固定（SSR 安全），自动保存到 localStorage
  const [values, setValues] = useState<Record<string, string>>({
    name: "",
    role: "外贸创业者",
    focus: "外贸AI系统搭建",
  });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [dark, setDark] = useState(false);
  const [avatar, setAvatar] = useState<string>("");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [backupInfo, setBackupInfo] = useState<string>("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState<ShortcutId | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // 加载已保存资料 + 设置（资料存数据库，换浏览器不丢；设置存 localStorage）
  useEffect(() => {
    getProfile()
      .then((p) => {
        setValues({ name: p.name ?? "", role: p.role ?? "外贸创业者", focus: p.focus ?? "外贸AI系统搭建" });
        if (p.avatar) setAvatar(p.avatar);
      })
      .catch(() => {});
    setSettings(loadSettings());
    setDark(localStorage.getItem("theme") === "dark");
    setShortcuts(loadShortcuts());
  }, []);

  // 暗色模式：应用 + 持久化
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // 偏好开关：即时应用 + 持久化
  const toggleSetting = (key: keyof Settings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    applySettings(next);
  };

  // 个人信息自动保存（防抖 800ms，传最新值避免闭包旧值问题）
  const scheduleSave = (next?: { values?: Record<string, string>; avatar?: string }) => {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const data = {
      name: (next?.values?.name ?? values.name).trim(),
      role: (next?.values?.role ?? values.role).trim(),
      focus: (next?.values?.focus ?? values.focus).trim(),
      avatar: next?.avatar !== undefined ? next.avatar : avatar,
    };
    saveTimer.current = setTimeout(() => {
      saveProfile(data)
        .then(() => {
          setSaveState("saved");
          window.dispatchEvent(new Event("betterlife:data-changed"));
        })
        .catch(() => setSaveState("idle"));
      setTimeout(() => setSaveState("idle"), 1600);
    }, 800);
  };

  const pickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(String(reader.result));
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeAvatar = () => {
    setAvatar("");
    scheduleSave({ avatar: "" });
  };

  const doBackup = () => {
    setBackupLoading(true);
    setBackupInfo("");
    fetch("/api/backup")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          if (d.skipped) setBackupInfo(`今天已备份过：${d.file}（无需重复备份）`);
          else setBackupInfo(`备份成功：${d.file}（${(d.size / 1024).toFixed(1)} KB · ${d.time}）`);
        } else setBackupInfo(`备份失败：${d.error || "未知错误"}`);
      })
      .catch((e) => setBackupInfo(`备份失败：${e.message}`))
      .finally(() => setBackupLoading(false));
  };

  // 危险操作：清空全部通知（二次确认）
  const doClearNotifications = () => {
    clearAllNotifications()
      .then(() => {
        setConfirmOpen(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
      })
      .catch(() => {});
  };

  const saveHint = saveState === "saving" ? "保存中…" : saveState === "saved" ? "已自动保存 ✓" : "";

  // 快捷键：开始录制 / 键盘事件完成录制
  const startRecording = (id: ShortcutId) => setRecording(id);
  const onRecordKey = (e: React.KeyboardEvent) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();
    const keys = formatPressedKeys(e);
    if (!keys) return;
    const next = { ...shortcuts, [recording]: keys };
    setShortcuts(next);
    saveShortcuts(next);
    setRecording(null);
  };
  const resetShortcut = (id: ShortcutId) => {
    const action = SHORTCUT_ACTIONS.find((a) => a.id === id);
    if (!action) return;
    const next = { ...shortcuts, [id]: action.defaultKeys };
    setShortcuts(next);
    saveShortcuts(next);
  };

  return (
    <AppShell>
      <div className="page">
        <PageHead title="设置" sub="所有改动自动保存，无需手动保存">
          {saveHint && <span style={{ fontSize: 12, color: "var(--muted)" }}>{saveHint}</span>}
        </PageHead>

        <div className="page-scroll">
          {/* 头像裁剪弹窗 */}
          <AvatarCropper
            open={cropOpen}
            image={cropSrc}
            onCancel={() => setCropOpen(false)}
            onConfirm={(dataUrl) => {
              setAvatar(dataUrl);
              setCropOpen(false);
              scheduleSave({ avatar: dataUrl });
            }}
          />

          {/* 危险操作确认弹窗 */}
          <Modal
            title="确认清空全部通知？"
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            foot={
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-soft" onClick={() => setConfirmOpen(false)}>
                  取消
                </button>
                <button type="button" className="btn btn-primary" style={{ background: "#DC2626", borderColor: "#DC2626" }} onClick={doClearNotifications}>
                  {confirmText}
                </button>
              </div>
            }
          >
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
              此操作将<strong>永久删除</strong>通知中心里的全部通知记录（备份、GitHub 情报、提醒等），且不可恢复。
            </p>
          </Modal>

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">个人信息</h2>
              <span className="panel-note">编辑后自动保存</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="field">
                <label className="field-label">头像</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="头像"
                      style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", background: "var(--surface-deep)", border: "1px solid var(--border)" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "var(--accent-deep)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        fontWeight: 700,
                      }}
                    >
                      {(values.name || "我").trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label className="btn btn-soft" style={{ height: 28, fontSize: 12, padding: "0 12px", cursor: "pointer", display: "inline-flex", alignItems: "center", width: "fit-content" }}>
                      上传头像
                      <input type="file" accept="image/*" onChange={pickAvatar} style={{ display: "none" }} />
                    </label>
                    {avatar && (
                      <button type="button" className="btn btn-soft" style={{ height: 28, fontSize: 12, padding: "0 12px" }} onClick={removeAvatar}>
                        移除头像
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {PERSONAL_FIELDS.map((f) => (
                <div className="field" key={f.key}>
                  <label className="field-label" htmlFor={`set-${f.key}`}>{f.label}</label>
                  <input
                    id={`set-${f.key}`}
                    className="input"
                    value={values[f.key]}
                    onChange={(e) => {
                      const next = { ...values, [f.key]: e.target.value };
                      setValues(next);
                      scheduleSave({ values: next });
                    }}
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
              <span className="panel-note">开关即时生效</span>
            </div>
            <div className="settings-list">
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-name">暗色模式</span>
                  <span className="setting-desc">深色主题，夜间更护眼。为什么：长时间使用减少白光刺激，降低眼部疲劳。</span>
                </div>
                <button
                  type="button"
                  className={`switch${dark ? " on" : ""}`}
                  role="switch"
                  aria-checked={dark}
                  aria-label="暗色模式"
                  onClick={() => setDark((v) => !v)}
                />
              </div>
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-name">每日问候</span>
                  <span className="setting-desc">侧边栏顶部显示日期与问候语（早上好/下午好…）。为什么：打开系统时一眼看到今天星期几，快速进入状态。</span>
                </div>
                <button
                  type="button"
                  className={`switch${settings.daily ? " on" : ""}`}
                  role="switch"
                  aria-checked={settings.daily}
                  aria-label="每日问候"
                  onClick={() => toggleSetting("daily")}
                />
              </div>
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-name">系统提醒</span>
                  <span className="setting-desc">侧边栏展示到期提醒（会议、截止时间）。为什么：重要日期不会错过，但如果你不想被提醒打扰可以关掉。</span>
                </div>
                <button
                  type="button"
                  className={`switch${settings.remind ? " on" : ""}`}
                  role="switch"
                  aria-checked={settings.remind}
                  aria-label="系统提醒"
                  onClick={() => toggleSetting("remind")}
                />
              </div>
            </div>
          </section>

          {/* 快捷键：折叠面板，点击展开 */}
          <section className="panel">
            <button
              type="button"
              onClick={() => setShortcutsOpen((v) => !v)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "none",
                border: "none",
                padding: "12px 14px",
                cursor: "pointer",
              }}
              aria-expanded={shortcutsOpen}
            >
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>⌨️ 快捷键</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                {shortcutsOpen ? "收起 ▴" : `${SHORTCUT_ACTIONS.length} 项 · 展开 ▾`}
              </span>
            </button>
            {shortcutsOpen && (
              <div className="settings-list">
                {SHORTCUT_ACTIONS.map((a) => (
                  <div className="setting-row" key={a.id}>
                    <div className="setting-info">
                      <span className="setting-name">{a.name}</span>
                      <span className="setting-desc">{a.desc}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        className={`btn ${recording === a.id ? "btn-primary" : "btn-soft"}`}
                        style={{ height: 28, fontSize: 12, padding: "0 12px", minWidth: 74, fontFamily: "monospace" }}
                        onClick={() => startRecording(a.id)}
                        onKeyDown={onRecordKey}
                        disabled={recording !== null && recording !== a.id}
                      >
                        {recording === a.id ? "按下新键…" : shortcuts[a.id] || a.defaultKeys}
                      </button>
                      <button
                        type="button"
                        className="btn btn-soft"
                        style={{ height: 28, fontSize: 12, padding: "0 10px" }}
                        onClick={() => resetShortcut(a.id)}
                        title="恢复默认"
                      >
                        重置
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">数据管理</h2>
            </div>
            <div className="settings-list">
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-name">导出全部数据</span>
                  <span className="setting-desc">下载全部任务、项目、笔记等数据为 JSON 文件，用于备份或迁移。</span>
                </div>
                <a className="btn btn-soft" style={{ height: 30, fontSize: 12, padding: "0 14px" }} href="/api/export">
                  导出 JSON
                </a>
              </div>
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-name">立即备份数据库</span>
                  <span className="setting-desc">复制 dev.db 到 backup 目录（{backupInfo || "每天自动备份一次，这里可手动触发"}）</span>
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
              <div className="setting-row" style={{ borderTop: "1px dashed var(--border)", marginTop: 4, paddingTop: 12 }}>
                <div className="setting-info">
                  <span className="setting-name" style={{ color: "#DC2626" }}>清空全部通知</span>
                  <span className="setting-desc">危险操作：永久删除通知中心所有记录（备份、GitHub 情报、提醒等），不可恢复。</span>
                </div>
                <button
                  type="button"
                  className="btn btn-soft"
                  style={{ height: 30, fontSize: 12, padding: "0 14px", color: "#DC2626", borderColor: "#FCA5A5" }}
                  onClick={() => {
                    setConfirmText("确认清空");
                    setConfirmOpen(true);
                  }}
                >
                  清空
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
                  <span className="setting-desc">Personal OS · 把生活与工作，过成作品</span>
                </div>
                <span className="badge">v0.2</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
