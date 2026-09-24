import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LibraryTab from "../LibraryTab";

describe("LibraryTab Component", () => {
  const defaultProps = {
    folders: ["C:/Roms/SNES", "D:/Roms/PS1"],
    scanning: false,
    scanProgress: 0,
    scanMessage: "",
    scanCores: null,
    onScan: vi.fn(),
    onAddFolder: vi.fn(),
    onRequestRemoveFolder: vi.fn(),
    biosFolders: ["C:/RetroArch/system"],
    onAddBiosFolder: vi.fn(),
    onRequestRemoveBiosFolder: vi.fn(),
    sortBy: "name" as const,
    onSortByChange: vi.fn(),
    regionPref: "usa",
    onRegionPrefChange: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(),
  };

  it("should render ROM and BIOS folders list", () => {
    render(<LibraryTab {...defaultProps} />);

    expect(screen.getByText("C:/Roms/SNES")).toBeInTheDocument();
    expect(screen.getByText("D:/Roms/PS1")).toBeInTheDocument();
    expect(screen.getByText("C:/RetroArch/system")).toBeInTheDocument();
  });

  it("should trigger onScan when clicking scan button", () => {
    const onScan = vi.fn();
    render(<LibraryTab {...defaultProps} onScan={onScan} />);

    const scanBtn = screen.getByRole("button", { name: /▶ Escanear Ahora/i });
    fireEvent.click(scanBtn);

    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith(defaultProps.folders);
  });

  it("should display progress bar when scanning is true", () => {
    render(
      <LibraryTab
        {...defaultProps}
        scanning={true}
        scanProgress={65}
        scanMessage="Descargando core snes9x..."
      />
    );

    expect(screen.getByText("Descargando core snes9x...")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /Escaneando.../i });
    expect(btn).toBeDisabled();
  });

  it("should trigger onAddFolder and onAddBiosFolder callbacks", () => {
    const onAddFolder = vi.fn();
    const onAddBiosFolder = vi.fn();

    render(
      <LibraryTab
        {...defaultProps}
        onAddFolder={onAddFolder}
        onAddBiosFolder={onAddBiosFolder}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /\+ Agregar Carpeta$/i }));
    expect(onAddFolder).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /\+ Agregar Carpeta de BIOS/i }));
    expect(onAddBiosFolder).toHaveBeenCalledTimes(1);
  });

  it("should trigger onSortByChange when clicking sorting buttons", () => {
    const onSortByChange = vi.fn();
    render(<LibraryTab {...defaultProps} onSortByChange={onSortByChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Plataforma" }));
    expect(onSortByChange).toHaveBeenCalledWith("platform");
  });
});
