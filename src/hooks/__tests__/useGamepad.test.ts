import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGamepad, type GamepadHandlers } from "../useGamepad";

function makeHandlers(overrides: Partial<GamepadHandlers> = {}): GamepadHandlers {
  return {
    onNavigate: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onFavorite: vi.fn(),
    onQuickPlay: vi.fn(),
    onPrevTab: vi.fn(),
    onNextTab: vi.fn(),
    ...overrides,
  };
}

function makePad(pressed: boolean[], axes: number[] = [0, 0]) {
  return {
    id: "Xbox 360 Controller (XInput STANDARD GAMEPAD)",
    connected: true,
    buttons: pressed.map((p) => ({ pressed: p })),
    axes,
  };
}

describe("useGamepad re-arm", () => {
  let rafCallbacks = new Map<number, FrameRequestCallback>();
  let rafId = 0;
  let padState: { pressed: boolean[]; axes: number[] };

  const stepFrames = (n: number) => {
    for (let i = 0; i < n; i++) {
      const cbs = [...rafCallbacks.values()];
      rafCallbacks.clear();
      cbs.forEach((cb) => cb(performance.now() + i * 16));
    }
  };

  beforeEach(() => {
    rafCallbacks = new Map();
    rafId = 0;
    padState = { pressed: new Array(17).fill(false), axes: [0, 0] };
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      const id = ++rafId;
      rafCallbacks.set(id, cb);
      return id;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      rafCallbacks.delete(id);
    });
    (window.navigator as unknown as { getGamepads: () => unknown[] }).getGamepads = vi.fn(
      () => [makePad(padState.pressed, padState.axes)]
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores a button held since enable until release + fresh press", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useGamepad(handlers, true));

    // Button A held from the very first frame (e.g. still held from quitting)
    padState.pressed[0] = true;
    stepFrames(5);
    expect(handlers.onConfirm).not.toHaveBeenCalled();

    // Release: arms the hook, still no confirm
    padState.pressed[0] = false;
    stepFrames(2);
    expect(handlers.onConfirm).not.toHaveBeenCalled();

    // Fresh press: fires exactly once (rising edge)
    padState.pressed[0] = true;
    stepFrames(1);
    expect(handlers.onConfirm).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("ignores a deflected stick held since enable", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useGamepad(handlers, true));

    padState.axes = [0.8, 0];
    stepFrames(5);
    expect(handlers.onNavigate).not.toHaveBeenCalled();

    padState.axes = [0, 0];
    stepFrames(2);
    expect(handlers.onNavigate).not.toHaveBeenCalled();

    unmount();
  });

  it("fires normally when nothing is held at enable", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useGamepad(handlers, true));

    stepFrames(2);
    padState.pressed[1] = true;
    stepFrames(1);
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("ignores global navigation actions like R1 (onNextTab) when controller mapping modal is open", () => {
    const handlers = makeHandlers();
    const modalEl = document.createElement("div");
    modalEl.className = "ctrl-map-modal";
    document.body.appendChild(modalEl);

    const { unmount } = renderHook(() => useGamepad(handlers, true));

    // Release/arm
    stepFrames(2);

    // Press R1 (button index 5)
    padState.pressed[5] = true;
    stepFrames(1);
    expect(handlers.onNextTab).not.toHaveBeenCalled();

    // Remove modal: global navigation should resume on next fresh press
    document.body.removeChild(modalEl);
    padState.pressed[5] = false;
    stepFrames(1);

    padState.pressed[5] = true;
    stepFrames(1);
    expect(handlers.onNextTab).toHaveBeenCalledTimes(1);

    unmount();
  });
});

