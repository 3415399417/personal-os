import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));

  const info = await page.evaluate(() => {
    const life = document.querySelector('[data-od-id="card-life"]');
    const exec = document.querySelector('[data-od-id="card-exec"]');
    const get = (card) => {
      const r = card.getBoundingClientRect();
      const items = [...card.querySelectorAll(".life-item, .exec-cats li")].map((li) => {
        const ico = li.querySelector(".life-item-ico, .exec-cat-ico");
        return {
          pad: getComputedStyle(li).padding,
          gap: getComputedStyle(li).gap,
          fontSize: getComputedStyle(li).fontSize,
          borderBottom: getComputedStyle(li).borderBottomStyle + " " + getComputedStyle(li).borderBottomWidth + " " + getComputedStyle(li).borderBottomColor,
          icoSize: ico ? getComputedStyle(ico).width + "x" + getComputedStyle(ico).height : null,
        };
      });
      const divider = card.querySelector(".exec-divider");
      return {
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        divider: divider ? getComputedStyle(divider).borderTopStyle + " " + getComputedStyle(divider).borderTopWidth + " " + getComputedStyle(divider).borderTopColor : null,
        items,
      };
    };
    return { exec: get(exec), life: get(life) };
  });
  console.log(JSON.stringify(info, null, 2));

  // 分别裁剪两张卡片
  const lifeR = info.life.rect, execR = info.exec.rect;
  await page.screenshot({ path: "_verify/exec-card-crop.png", clip: { x: execR.x - 4, y: execR.y - 4, width: execR.w + 8, height: execR.h + 8 } });
  await page.screenshot({ path: "_verify/life-card-crop.png", clip: { x: lifeR.x - 4, y: lifeR.y - 4, width: lifeR.w + 8, height: lifeR.h + 8 } });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
