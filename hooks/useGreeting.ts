"use client";

import { useEffect, useState } from "react";

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

export interface Greeting {
  date: string;
  week: string;
  title: string;
}

export function useGreeting(): Greeting {
  const [greeting, setGreeting] = useState<Greeting>(() => computeGreeting());

  useEffect(() => {
    const timer = window.setInterval(() => setGreeting(computeGreeting()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return greeting;
}

function computeGreeting(): Greeting {
  const now = new Date();
  const h = now.getHours();
  const title = h < 5 ? "夜深了" : h < 11 ? "早上好" : h < 13 ? "中午好" : h < 18 ? "下午好" : "晚上好";
  return {
    date: `${now.getMonth() + 1}月${now.getDate()}日`,
    week: WEEKDAYS[now.getDay()],
    title,
  };
}
