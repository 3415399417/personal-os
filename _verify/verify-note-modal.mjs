import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/notes", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  // 点击第一张个人笔记卡片
  const clicked = await page.evaluate(() => {
    const card = document.querySelector(".mini-card:not(.proj-folder-card)");
    if (!card) return { ok: false, reason: "no note card" };
    card.click();
    return { ok: true, title: card.querySelector(".mini-card-title")?.textContent };
  });
  console.log("CLICK:", JSON.stringify(clicked));
  await new Promise((r) => setTimeout(r, 1200));

  const info = await page.evaluate(() => {
    const modal = document.querySelector(".modal-mask.note-modal-top .modal");
    if (!modal) return { found: false };
    const r = modal.getBoundingClientRect();
    const body = modal.querySelector(".modal-body");
    const br = body.getBoundingClientRect();
    return {
      found: true,
      modalW: Math.round(r.width),
      bodyH: Math.round(br.height),
      viewportH: window.innerHeight,
      bodyIsThird: (br.height / window.innerHeight).toFixed(2),
      hasToolbar: !!modal.querySelector(".note-toolbar"),
      toolbarText: modal.querySelector(".note-toolbar")?.textContent.replace(/\s+/g, " ").trim(),
      hasEditBtn: [...modal.querySelectorAll(".modal-foot .btn")].map((b) => b.textContent.trim()),
      hasPrefsBody: !!modal.querySelector(".note-prefs-body, [style*='font-family']"),
    };
  });
  console.log(JSON.stringify(info, null, 2));

  // 截图
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\note-modal.png" });

  // 点编辑按钮测试
  if (info.found) {
    const editRes = await page.evaluate(() => {
      const btns = [...document.querySelectorAll(".modal-mask.note-modal-top .modal-foot .btn")];
      const edit = btns.find((b) => b.textContent.includes("编辑"));
      if (!edit) return { ok: false, reason: "no edit btn" };
      edit.click();
      return { ok: true };
    });
    await new Promise((r) => setTimeout(r, 800));
    const editInfo = await page.evaluate(() => {
      const modal = document.querySelector(".modal-mask.note-modal-top .modal");
      return {
        title: modal.querySelector(".modal-title")?.textContent,
        hasInputs: !!modal.querySelector('input[id="ne-title"]'),
        hasTextarea: !!modal.querySelector('textarea[id="ne-content"]'),
        footBtns: [...modal.querySelectorAll(".modal-foot .btn")].map((b) => b.textContent.trim()),
      };
    });
    console.log("EDIT:", JSON.stringify(editInfo));
    console.log("EDITRES:", JSON.stringify(editRes));
    await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\note-edit.png" });
  }

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
