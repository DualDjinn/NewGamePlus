import { useEffect, useRef } from "react";

export interface GamepadHandlers {
  onNavigate: (direction: "up" | "down" | "left" | "right") => void;
  onConfirm: () => void;        // Button A / Cross (0)
  onCancel: () => void;         // Button B / Circle (1)
  onFavorite: () => void;       // Button X / Square (2)
  onQuickPlay: () => void;      // Button Y / Triangle (3)
  onPrevTab: () => void;        // LB / L1 (4)
  onNextTab: () => void;        // RB / R1 (5)
  onToggleSidebar?: () => void; // Select / View (8)
  onToggleMenu?: () => void;    // Start / Menu (9)
}

export function useGamepad(handlers: GamepadHandlers, enabled: boolean = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    let animFrameId: number;
    const prevButtons = new Map<number, boolean>();
    let activeDir: string | null = null;
    let nextRepeatTime = 0;

    const INITIAL_DELAY_MS = 260;
    const REPEAT_RATE_MS = 120;
    const STICK_DEADZONE = 0.5;

    function handleGamepadEvents(e: GamepadEvent) {
      const isConnected = e.type === "gamepadconnected";
      const name = e.gamepad.id ? e.gamepad.id.split("(")[0].trim() : "Mando";
      window.dispatchEvent(
        new CustomEvent("app-error", {
          detail: isConnected
            ? `🎮 Control conectado: ${name}`
            : `🎮 Control desconectado: ${name}`,
        })
      );
    }

    window.addEventListener("gamepadconnected", handleGamepadEvents);
    window.addEventListener("gamepaddisconnected", handleGamepadEvents);

    function checkGamepad() {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp: Gamepad | null = null;
      for (const g of gamepads) {
        if (g && g.connected) {
          gp = g;
          break;
        }
      }

      if (gp) {
        const now = performance.now();
        const currentButtons = gp.buttons.map((b) => b.pressed);

        // Action buttons: trigger on rising edge (just pressed)
        const isJustPressed = (btnIdx: number) =>
          currentButtons[btnIdx] && !prevButtons.get(btnIdx);

        if (isJustPressed(0)) handlersRef.current.onConfirm();
        if (isJustPressed(1)) handlersRef.current.onCancel();
        if (isJustPressed(2)) handlersRef.current.onFavorite();
        if (isJustPressed(3)) handlersRef.current.onQuickPlay();
        if (isJustPressed(4)) handlersRef.current.onPrevTab();
        if (isJustPressed(5)) handlersRef.current.onNextTab();
        if (isJustPressed(8)) handlersRef.current.onToggleSidebar?.();
        if (isJustPressed(9)) handlersRef.current.onToggleMenu?.();

        // Directional handling (D-Pad & Left Stick)
        const dpadUp = currentButtons[12] || (gp.axes[1] !== undefined && gp.axes[1] < -STICK_DEADZONE);
        const dpadDown = currentButtons[13] || (gp.axes[1] !== undefined && gp.axes[1] > STICK_DEADZONE);
        const dpadLeft = currentButtons[14] || (gp.axes[0] !== undefined && gp.axes[0] < -STICK_DEADZONE);
        const dpadRight = currentButtons[15] || (gp.axes[0] !== undefined && gp.axes[0] > STICK_DEADZONE);

        let currentDir: "up" | "down" | "left" | "right" | null = null;
        if (dpadUp) currentDir = "up";
        else if (dpadDown) currentDir = "down";
        else if (dpadLeft) currentDir = "left";
        else if (dpadRight) currentDir = "right";

        if (currentDir) {
          if (activeDir !== currentDir) {
            // First press
            activeDir = currentDir;
            handlersRef.current.onNavigate(currentDir);
            nextRepeatTime = now + INITIAL_DELAY_MS;
          } else if (now >= nextRepeatTime) {
            // Held direction repeat
            handlersRef.current.onNavigate(currentDir);
            nextRepeatTime = now + REPEAT_RATE_MS;
          }
        } else {
          activeDir = null;
        }

        // Store button states for edge detection
        currentButtons.forEach((pressed, idx) => {
          prevButtons.set(idx, pressed);
        });
      }

      animFrameId = requestAnimationFrame(checkGamepad);
    }

    animFrameId = requestAnimationFrame(checkGamepad);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("gamepadconnected", handleGamepadEvents);
      window.removeEventListener("gamepaddisconnected", handleGamepadEvents);
    };
  }, [enabled]);
}
