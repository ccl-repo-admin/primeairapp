"use client";
import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

let barEl: HTMLDivElement | null = null;
let rafId: number | null = null;
let completeTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function getBar() {
  if (!barEl) {
    barEl = document.createElement("div");
    barEl.style.cssText =
      "position:fixed;top:0;left:0;z-index:9999;height:2px;width:0%;background:#3b82f6;transition:width 0.3s ease,opacity 0.3s ease;pointer-events:none;";
    document.body.appendChild(barEl);
  }
  return barEl;
}

function startBar() {
  if (rafId) cancelAnimationFrame(rafId);
  if (completeTimer) clearTimeout(completeTimer);
  if (hideTimer) clearTimeout(hideTimer);

  const bar = getBar();
  bar.style.opacity = "1";
  bar.style.transition = "width 0.4s ease, opacity 0.3s ease";
  bar.style.width = "0%";

  // Animate to 80%
  let w = 0;
  const tick = () => {
    w = w < 30 ? w + 6 : w < 60 ? w + 2 : w < 78 ? w + 0.5 : w;
    if (w < 80) {
      bar.style.width = `${w}%`;
      rafId = requestAnimationFrame(tick);
    }
  };
  // Small delay so the first frame is visible
  setTimeout(() => { rafId = requestAnimationFrame(tick); }, 10);
}

function completeBar() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (completeTimer) clearTimeout(completeTimer);
  const bar = getBar();
  bar.style.transition = "width 0.2s ease, opacity 0.4s ease";
  bar.style.width = "100%";
  hideTimer = setTimeout(() => {
    bar.style.opacity = "0";
    setTimeout(() => { bar.style.width = "0%"; }, 400);
  }, 200);
}

export function NavigationProgress() {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const pendingRef = useRef(false);

  const handleLinkClick = useCallback((e: MouseEvent) => {
    const anchor = (e.target as Element).closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;
    if (href === pathname) return;
    startBar();
    pendingRef.current = true;
  }, [pathname]);

  useEffect(() => {
    document.addEventListener("click", handleLinkClick, true);
    return () => document.removeEventListener("click", handleLinkClick, true);
  }, [handleLinkClick]);

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      if (pendingRef.current) {
        pendingRef.current = false;
        completeBar();
      }
    }
  }, [pathname]);

  return null;
}
