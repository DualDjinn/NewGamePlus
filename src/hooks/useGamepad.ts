import { useEffect, useRef, useState } from "react";

export type ControllerType = "xbox" | "playstation" | "nintendo" | "generic";
export type InputDevice = "gamepad" | "keyboard" | "mouse";

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

export function detectControllerType(id?: string): ControllerType {
  if (!id) return "xbox";
  const lower = id.toLowerCase();
  if (
    lower.includes("dualshock") ||
    lower.includes("dualsense") ||
    lower.includes("playstation") ||
    lower.includes("sony") ||
    lower.includes("054c")
  ) {
    return "playstation";
  }
  if (
    lower.includes("nintendo") ||
    lower.includes("pro controller") ||
    lower.includes("joy-con") ||
    lower.includes("057e")
  ) {
    return "nintendo";
  }
  if (
    lower.includes("xbox") ||
    lower.includes("xinput") ||
    lower.includes("045e")
  ) {
    return "xbox";
  }
  return "generic";
}

function getInitialDevice(): InputDevice {
  if (typeof navigator !== "undefined" && typeof navigator.getGamepads === "function") {
    try {
      const gps = navigator.getGamepads();
      for (let i = 0; i < gps.length; i++) {
        if (gps[i]) return "gamepad";
      }
    } catch {
      // ignore
    }
  }
  return "mouse";
}

let globalInputDevice: InputDevice = getInitialDevice();
let globalControllerType: ControllerType = "xbox";

export function useInputDevice(): {
  device: InputDevice;
  controllerType: ControllerType;
} {
  const [state, setState] = useState<{
    device: InputDevice;
    controllerType: ControllerType;
  }>({
    device: globalInputDevice,
    controllerType: globalControllerType,
  });

  useEffect(() => {
    function handleDeviceChange(e: CustomEvent<{ device: InputDevice; controllerType?: ControllerType }>) {
      const dev = e.detail.device;
      const cType = e.detail.controllerType ?? globalControllerType;
      globalInputDevice = dev;
      if (e.detail.controllerType) {
        globalControllerType = e.detail.controllerType;
      }
      setState({ device: dev, controllerType: cType });
    }

    window.addEventListener("input-device-changed", handleDeviceChange as EventListener);
    return () => {
      window.removeEventListener("input-device-changed", handleDeviceChange as EventListener);
    };
  }, []);

  return state;
}

export function useGamepad(handlers: GamepadHandlers, enabled: boolean = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    // Keyboard listener to update active input device to keyboard
    function handleKeyDown() {
      if (globalInputDevice !== "keyboard") {
        globalInputDevice = "keyboard";
        window.dispatchEvent(
          new CustomEvent("input-device-changed", {
            detail: { device: "keyboard", controllerType: globalControllerType },
          })
        );
      }
    }

    // Mouse listener to update active input device to mouse
    function handleMouseMove() {
      if (globalInputDevice !== "mouse") {
        globalInputDevice = "mouse";
        window.dispatchEvent(
          new CustomEvent("input-device-changed", {
            detail: { device: "mouse", controllerType: globalControllerType },
          })
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);

    if (!enabled) {
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("mousemove", handleMouseMove);
      };
    }

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
      const cType = detectControllerType(e.gamepad.id);
      globalControllerType = cType;

      if (isConnected) {
        globalInputDevice = "gamepad";
        window.dispatchEvent(
          new CustomEvent("input-device-changed", {
            detail: { device: "gamepad", controllerType: cType },
          })
        );
      }

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

        // Notify input device changed to gamepad if button or stick moved
        const hasGamepadActivity =
          currentButtons.some((b) => b) ||
          gp.axes.some((a) => Math.abs(a) > STICK_DEADZONE);

        if (hasGamepadActivity && globalInputDevice !== "gamepad") {
          globalInputDevice = "gamepad";
          const detected = detectControllerType(gp.id);
          globalControllerType = detected;
          window.dispatchEvent(
            new CustomEvent("input-device-changed", {
              detail: { device: "gamepad", controllerType: detected },
            })
          );
        }

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
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [enabled]);
}
