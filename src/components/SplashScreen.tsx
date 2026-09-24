import React, { useEffect, useState, useRef, useCallback } from "react";
import { playBootSound } from "../lib/bootSound";
import "./SplashScreen.css";

interface Props {
  soundEnabled?: boolean;
  volume?: number;
  onFinish: () => void;
}

export const SplashScreen: React.FC<Props> = ({
  soundEnabled = true,
  volume = 0.4,
  onFinish,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const finishedRef = useRef(false);
  const exitTimeoutRef = useRef<number | null>(null);
  const autoFinishTimeoutRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const handleFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsExiting(true);

    // Give 350ms for the smooth fade-out / zoom expansion transition
    exitTimeoutRef.current = window.setTimeout(() => {
      onFinish();
    }, 350);
  }, [onFinish]);

  // Trigger boot sound and set automatic timer
  useEffect(() => {
    playBootSound({ enabled: soundEnabled, volume });

    // Total duration: 2.2 seconds (starts exit transition at 1.85s)
    autoFinishTimeoutRef.current = window.setTimeout(() => {
      handleFinish();
    }, 1850);

    return () => {
      if (autoFinishTimeoutRef.current) clearTimeout(autoFinishTimeoutRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleFinish, soundEnabled, volume]);

  // Keyboard skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      handleFinish();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFinish]);

  // Gamepad skip polling
  useEffect(() => {
    let active = true;

    const pollGamepad = () => {
      if (!active || finishedRef.current) return;

      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of gamepads) {
        if (!gp) continue;
        const anyButtonPressed = gp.buttons.some((b) => b.pressed || b.value > 0.5);
        if (anyButtonPressed) {
          handleFinish();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(pollGamepad);
    };

    rafRef.current = requestAnimationFrame(pollGamepad);

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleFinish]);

  return (
    <aside
      className={`splash-container ${isExiting ? "splash-exiting" : ""}`}
      onClick={handleFinish}
      role="dialog"
      aria-label="Pantalla de inicio"
      aria-modal="true"
    >
      <div className="splash-ambient-glow" />
      <div className="splash-lens-flare" />

      <div className="splash-brand">
        <span className="splash-brand-text">NewGame</span>
        <span className="splash-brand-plus">+</span>
        <div className="splash-shimmer-mask" />
      </div>

      <div className="splash-skip-hint">
        <span className="splash-skip-badge">Cualquier botón</span>
        <span>para continuar</span>
      </div>
    </aside>
  );
};

export default SplashScreen;
