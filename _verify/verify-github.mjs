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

  const info1 = await page.evaluate(() => {
    const cards = document.querySelectorAll(".github-card");
    return {
      count: cards.length,
      first: cards[0]?.querySelector(".github-name")?.textContent,
      tabs: [...document.querySelectorAll(".github-tab")].map((t) => ({ text: t.textContent, active: t.className.includes("active") })),
      navHasGithub: [...document.querySelectorAll("nav a, aside a")].some((a) => a.textContent.includes("GitHub")),
    };
  });
  console.log("REPOS:", JSON.stringify(info1));

  await page.screenshot({ path: "_verify/github-repos.png" });

  // 切到新闻 tab
  await page.evaluate(() => {
    [...document.querySelectorAll(".github-tab")].find((t) => t.textContent.includes("新闻"))?.click();
  });
  await new Promise((r) => setTimeout(r, 3500));
  const info2 = await page.evaluate(() => {
    const items = document.querySelectorAll(".news-item");
    return { count: items.length, first: items[0]?.querySelector(".news-title")?.textContent };
  });
  console.log("NEWS:", JSON.stringify(info2));
  await page.screenshot({ path: "_verify/github-news.png" });

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
