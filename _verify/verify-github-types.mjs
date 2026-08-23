import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/github", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));

  const readCards = () =>
    page.evaluate(() => {
      const subs = [...document.querySelectorAll(".github-subtab")].map((b) => ({
        text: b.textContent,
        active: b.className.includes("active"),
      }));
      const cards = [...document.querySelectorAll(".github-card .github-name")].map((n) => n.textContent);
      return { subs, count: cards.length, first: cards[0], names: cards.slice(0, 5) };
    });

  console.log("插件:", JSON.stringify(await readCards()));
  await page.screenshot({ path: "_verify/github-plugin.png" });

  await page.evaluate(() => {
    [...document.querySelectorAll(".github-subtab")].find((b) => b.textContent === "模型")?.click();
  });
  await new Promise((r) => setTimeout(r, 4000));
  console.log("模型:", JSON.stringify(await readCards()));

  await page.evaluate(() => {
    [...document.querySelectorAll(".github-subtab")].find((b) => b.textContent === "Agent")?.click();
  });
  await new Promise((r) => setTimeout(r, 4000));
  console.log("Agent:", JSON.stringify(await readCards()));
  await page.screenshot({ path: "_verify/github-agent.png" });

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
