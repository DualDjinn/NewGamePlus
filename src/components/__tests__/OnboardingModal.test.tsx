import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OnboardingModal from "../OnboardingModal";
import * as tauriLib from "../../lib/tauri";

// Mock Tauri API calls used by OnboardingModal
vi.mock("../../lib/tauri", async () => {
  const actual = await vi.importActual<typeof import("../../lib/tauri")>("../../lib/tauri");
  return {
    ...actual,
    saveSteamGridDBKey: vi.fn().mockResolvedValue(undefined),
    saveRACredentials: vi.fn().mockResolvedValue(undefined),
    setCheevosHardcore: vi.fn().mockResolvedValue(undefined),
  };
});

describe("OnboardingModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    folders: ["C:/Roms/SNES"],
    onAddFolder: vi.fn().mockResolvedValue(undefined),
    onStartScan: vi.fn(),
    initialHasSteamGridKey: false,
    initialRaUser: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <OnboardingModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders Step 0 (Bienvenida) with NewGame+ branding", () => {
    render(<OnboardingModal {...defaultProps} />);

    expect(screen.getByText("¡Te damos la bienvenida a NewGame+!")).toBeInTheDocument();
    expect(screen.getByText("Indexación Automática")).toBeInTheDocument();
    expect(screen.getByText("Pósters y Banners HD")).toBeInTheDocument();
    expect(screen.getByText("Logros Retro en Vivo")).toBeInTheDocument();
  });

  it("navigates through steps with Siguiente and Anterior buttons", () => {
    render(<OnboardingModal {...defaultProps} />);

    // Step 0 -> Step 1
    const nextBtn = screen.getByRole("button", { name: /Siguiente →/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText("Carpetas de ROMs y Juegos")).toBeInTheDocument();
    expect(screen.getByText("C:/Roms/SNES")).toBeInTheDocument();

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole("button", { name: /Siguiente →/i }));
    expect(screen.getByRole("heading", { name: /SteamGridDB/i })).toBeInTheDocument();

    // Step 2 -> Back to Step 1
    const backBtn = screen.getByRole("button", { name: /← Anterior/i });
    fireEvent.click(backBtn);
    expect(screen.getByText("Carpetas de ROMs y Juegos")).toBeInTheDocument();
  });

  it("calls onAddFolder in Step 1", () => {
    render(<OnboardingModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /Siguiente →/i }));
    const addBtn = screen.getByRole("button", { name: /\+ Explorar y Agregar Carpeta/i });
    fireEvent.click(addBtn);

    expect(defaultProps.onAddFolder).toHaveBeenCalledTimes(1);
  });

  it("allows entering and saving SteamGridDB key in Step 2", async () => {
    render(<OnboardingModal {...defaultProps} />);

    // Go to Step 2
    fireEvent.click(screen.getByRole("button", { name: /Siguiente →/i }));
    fireEvent.click(screen.getByRole("button", { name: /Siguiente →/i }));

    const input = screen.getByPlaceholderText(/Pega aquí tu clave.../i);
    fireEvent.change(input, { target: { value: "test-api-token-12345" } });

    const saveBtn = screen.getByRole("button", { name: /Guardar Clave/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(tauriLib.saveSteamGridDBKey).toHaveBeenCalledWith("test-api-token-12345");
      expect(screen.getByText(/✓ SteamGridDB Conectado/i)).toBeInTheDocument();
    });
  });

  it("allows skipping steps using the Omitir button", () => {
    render(<OnboardingModal {...defaultProps} />);

    // Go to Step 1
    fireEvent.click(screen.getByRole("button", { name: /Siguiente →/i }));
    // Skip Step 1 -> Step 2
    fireEvent.click(screen.getByRole("button", { name: /Omitir/i }));
    expect(screen.getByRole("heading", { name: /SteamGridDB/i })).toBeInTheDocument();
  });

  it("finalizes and triggers onStartScan in final step", () => {
    render(<OnboardingModal {...defaultProps} />);

    // Navigate to Step 4 (last step)
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole("button", { name: /Siguiente →/i }));
    }

    expect(screen.getByText("Controles y Navegación")).toBeInTheDocument();
    const finalizeBtn = screen.getByRole("button", { name: /🚀 Escanear e Iniciar NewGame\+/i });
    fireEvent.click(finalizeBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onStartScan).toHaveBeenCalledWith(defaultProps.folders);
  });

  it("closes modal on Escape key press", () => {
    render(<OnboardingModal {...defaultProps} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
