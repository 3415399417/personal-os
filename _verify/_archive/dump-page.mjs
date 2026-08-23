import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const info = await page.evaluate(() => {
    const out = { title: document.title, height: document.body.scrollHeight, rows: [] };
    document.querySelectorAll(".grid-row").forEach((row, i) => {
      const cards = [...row.querySelectorAll(".card")].map((c) => ({
        od: c.getAttribute("data-od-id"),
        title: c.querySelector(".card-title")?.textContent,
        h: Math.round(c.getBoundingClientRect().height),
      }));
      out.rows.push({ i, h: Math.round(row.getBoundingClientRect().height), cards });
    });
    // 看 exec 卡片内部
    const exec = document.querySelector('[data-od-id="card-exec"]');
    if (exec) {
      out.execHTML = exec.innerHTML.slice(0, 1500);
      out.execFoot = !!exec.querySelector(".card-foot");
      out.execTotal0 = exec.textContent.includes("还没有执行记录");
    }
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
