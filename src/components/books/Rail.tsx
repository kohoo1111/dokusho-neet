"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** 横スクロールの棚。スマホは指でスワイプ、PCは左右の矢印で1画面ぶん送る。 */
export function Rail({ children, label }: { children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => { el.removeEventListener("scroll", update); observer.disconnect(); };
  }, [update, children]);

  const move = (direction: 1 | -1) => ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.85, behavior: "smooth" });
  const arrow = "absolute top-0 z-20 hidden h-[calc(100%-1.5rem)] w-10 items-center justify-center text-white opacity-0 transition duration-200 group-hover/rail:opacity-100 focus-visible:opacity-100 md:flex";

  return (
    <div className="group/rail relative" role="region" aria-label={label}>
      <div ref={ref} className="book-rail -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-6 pt-3 md:-mx-10 md:scroll-px-10 md:gap-4 md:px-10">
        {children}
      </div>
      {edge.start ? null : (
        <button type="button" aria-label="前へ" onClick={() => move(-1)} className={`${arrow} -left-10 bg-gradient-to-r from-night via-night/80 to-transparent`}>
          <ChevronLeft size={30} />
        </button>
      )}
      {edge.end ? null : (
        <button type="button" aria-label="次へ" onClick={() => move(1)} className={`${arrow} -right-10 bg-gradient-to-l from-night via-night/80 to-transparent`}>
          <ChevronRight size={30} />
        </button>
      )}
    </div>
  );
}
