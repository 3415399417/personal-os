import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  const logs = [];
  page.on("console", (m) => logs.push(m.type() + ": " + m.text().slice(0, 300)));
  page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message.slice(0, 300)));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 15000));

  const state = await page.evaluate(() => ({
    day: localStorage.getItem("person…day"),
    week: localStorage.getItem("person…week"),
    toast: document.querySelector(".global-toast")?.textContent ?? null,
  }));
  console.log("STATE:", JSON.stringify(state));
  console.log("LOGS:", JSON.stringify(logs.slice(0, 10), null, 1));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
