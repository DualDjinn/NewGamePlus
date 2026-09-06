import { useEffect, useRef, useState, useCallback } from "react";
import type { Game } from "../types";
import GameCard from "./GameCard";
import "./CategoryRow.css";

interface Props {
  title: string;
  games: Game[];
  onSelect?: (game: Game) => void;
  onFavoriteChanged?: (gameId: string, isFav: boolean) => void;
  focusedId?: string | null;
}

export default function CategoryRow({ title, games, onSelect, onFavoriteChanged, focusedId }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: true });

  const updateScrollState = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScroll({
      left: el.scrollLeft > 8,
      right: maxScroll > 8 && el.scrollLeft < maxScroll - 8,
    });
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });

    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);

    const t1 = setTimeout(updateScrollState, 100);
    const t2 = setTimeout(updateScrollState, 500);
    const t3 = setTimeout(updateScrollState, 1200);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [games, updateScrollState]);

  // Convert mouse wheel to horizontal scroll when hovering the row
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 0) return;

        // If not at hard edges, scroll row horizontally
        if ((e.deltaY > 0 && el.scrollLeft < maxScroll - 2) || (e.deltaY < 0 && el.scrollLeft > 2)) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
          updateScrollState();
        }
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [updateScrollState]);

  function handleScroll(dir: "left" | "right") {
    const el = rowRef.current;
    if (!el) return;
    const scrollAmount = Math.max(el.clientWidth * 0.75, 300);
    const targetLeft = dir === "left" ? el.scrollLeft - scrollAmount : el.scrollLeft + scrollAmount;

    el.scrollTo({
      left: targetLeft,
      behavior: "smooth",
    });

    setTimeout(updateScrollState, 150);
    setTimeout(updateScrollState, 350);
    setTimeout(updateScrollState, 600);
  }

  if (games.length === 0) return null;

  return (
    <div className="category-row" onMouseEnter={updateScrollState}>
      <div className="category-row-header">
        <h2 className="category-row-title">{title}</h2>
        <div className="category-row-controls">
          <button
            type="button"
            className={`category-row-nav-btn ${!canScroll.left ? "disabled" : ""}`}
            onClick={() => handleScroll("left")}
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className={`category-row-nav-btn ${!canScroll.right ? "disabled" : ""}`}
            onClick={() => handleScroll("right")}
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
      </div>
      <div className="category-row-scroll" ref={rowRef}>
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onSelect={onSelect}
            onFavoriteChanged={onFavoriteChanged}
            focused={focusedId === game.id}
          />
        ))}
      </div>
    </div>
  );
}
