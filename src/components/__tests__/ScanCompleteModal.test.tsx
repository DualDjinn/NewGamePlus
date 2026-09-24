import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScanCompleteModal from "../ScanCompleteModal";

describe("ScanCompleteModal Component", () => {
  const defaultResult = {
    totalGames: 42,
    coresInstalled: ["snes9x", "genesis_plus_gx"],
    coresNeeded: ["pcsx_rearmed"],
  };

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ScanCompleteModal
        isOpen={false}
        result={defaultResult}
        onGoToLibrary={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when result is null", () => {
    const { container } = render(
      <ScanCompleteModal
        isOpen={true}
        result={null}
        onGoToLibrary={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal details correctly when open with result", () => {
    render(
      <ScanCompleteModal
        isOpen={true}
        result={defaultResult}
        onGoToLibrary={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("¡Escaneo Completado!")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/2 núcleo\(s\) de emulación listos/i)).toBeInTheDocument();
    expect(
      screen.getByText(/1 plataformas requieren configuración adicional de núcleos/i)
    ).toBeInTheDocument();
  });

  it("calls onClose when clicking 'Permanecer aquí'", () => {
    const onClose = vi.fn();
    render(
      <ScanCompleteModal
        isOpen={true}
        result={defaultResult}
        onGoToLibrary={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Permanecer aquí" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onGoToLibrary when clicking 'Explorar Biblioteca'", () => {
    const onGoToLibrary = vi.fn();
    render(
      <ScanCompleteModal
        isOpen={true}
        result={defaultResult}
        onGoToLibrary={onGoToLibrary}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Explorar Biblioteca" }));
    expect(onGoToLibrary).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when pressing Escape key", () => {
    const onClose = vi.fn();
    render(
      <ScanCompleteModal
        isOpen={true}
        result={defaultResult}
        onGoToLibrary={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
