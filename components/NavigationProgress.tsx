"use client";

/* ─────────────────────────────────────────────────────────────────
   NavigationProgress — thin green progress bar at the top
   Activates on route changes via usePathname / startTransition
   Pure CSS animation, no external library needed
   ───────────────────────────────────────────────────────────────── */

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname   = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible,  setVisible]  = useState(false);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPath   = useRef(pathname);

  useEffect(() => {
    // Only run when path actually changes
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Show bar and animate to 90%
    setVisible(true);
    setProgress(0);

    // Quick jump to 30%
    requestAnimationFrame(() => setProgress(30));

    // Simulate progress increments
    const steps = [
      { p: 60, delay: 150 },
      { p: 80, delay: 400 },
      { p: 90, delay: 700 },
    ];
    steps.forEach(({ p, delay }) => {
      timerRef.current = setTimeout(() => setProgress(p), delay);
    });

    // Complete and hide
    timerRef.current = setTimeout(() => {
      setProgress(100);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 900);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position:   "fixed",
        top:        0,
        left:       0,
        zIndex:     9999,
        height:     "3px",
        width:      `${progress}%`,
        background: "linear-gradient(90deg, #14A800, #00d4aa, #14A800)",
        backgroundSize: "200% 100%",
        animation:  "gradientShift 1.5s linear infinite",
        transition: "width .25s cubic-bezier(.22,.61,.36,1), opacity .3s ease",
        opacity:    visible ? 1 : 0,
        borderRadius: "0 2px 2px 0",
        boxShadow:  "0 0 8px rgba(20,168,0,.6)",
      }}
    />
  );
}
