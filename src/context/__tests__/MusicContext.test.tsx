import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";
import { MusicProvider, useMusic } from "../MusicContext";

// Mock Tauri modules
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
  convertFileSrc: vi.fn((path) => path),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("../../lib/tauri", () => ({
  getCoverUrl: vi.fn(() => ""),
  getMusicTracks: vi.fn().mockResolvedValue([]),
  saveMusicVolume: vi.fn().mockResolvedValue(undefined),
  getMusicVolume: vi.fn().mockResolvedValue(0.5),
  onRetroarchExited: vi.fn().mockResolvedValue(() => {}),
}));

describe("MusicContext game launch and exit behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const TestConsumer: React.FC = () => {
    const { isPlaying, togglePlay } = useMusic();
    return (
      <div>
        <span data-testid="playing-status">{isPlaying ? "playing" : "paused"}</span>
        <button onClick={togglePlay} data-testid="toggle-btn">
          Toggle
        </button>
      </div>
    );
  };

  it("pauses music when game-launched is fired, and resumes on game-closed", async () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    const pauseMock = vi.fn();

    // Mock HTMLMediaElement play & pause
    window.HTMLMediaElement.prototype.play = playMock;
    window.HTMLMediaElement.prototype.pause = pauseMock;

    const { getByTestId } = render(
      <MusicProvider games={[]}>
        <TestConsumer />
      </MusicProvider>
    );

    // Toggle play
    await act(async () => {
      getByTestId("toggle-btn").click();
    });

    expect(playMock).toHaveBeenCalled();

    // Dispatch game-launched
    await act(async () => {
      window.dispatchEvent(new CustomEvent("game-launched"));
    });

    expect(pauseMock).toHaveBeenCalled();

    // Dispatch game-closed
    playMock.mockClear();
    await act(async () => {
      window.dispatchEvent(new CustomEvent("game-closed"));
    });

    expect(playMock).toHaveBeenCalled();
  });

  it("does not start music on game-closed if it was not playing before launch", async () => {
    const playMock = vi.fn().mockRejectedValue(new Error("Autoplay prevented"));
    const pauseMock = vi.fn();

    window.HTMLMediaElement.prototype.play = playMock;
    window.HTMLMediaElement.prototype.pause = pauseMock;

    render(
      <MusicProvider games={[]}>
        <TestConsumer />
      </MusicProvider>
    );

    // Wait for mount autoplay rejection to settle
    await act(async () => {
      await Promise.resolve();
    });

    playMock.mockClear();

    // Dispatch game-launched without playing
    await act(async () => {
      window.dispatchEvent(new CustomEvent("game-launched"));
    });

    // Dispatch game-closed
    await act(async () => {
      window.dispatchEvent(new CustomEvent("game-closed"));
    });

    // Should NOT have resumed/started music
    expect(playMock).not.toHaveBeenCalled();
  });
});
