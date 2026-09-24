import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ControllerMappingModal from "../ControllerMappingModal";
import * as tauriLib from "../../lib/tauri";

vi.mock("../../lib/tauri", async () => {
  const actual = await vi.importActual<typeof import("../../lib/tauri")>("../../lib/tauri");
  return {
    ...actual,
    getControllerMapping: vi.fn().mockResolvedValue({
      btn_a: "0",
      btn_b: "1",
      btn_x: "2",
      btn_y: "3",
      btn_start: "7",
      btn_select: "6",
      btn_l: "4",
      btn_r: "5",
      btn_l2: "+4",
      btn_r2: "+5",
      btn_l3: "8",
      btn_r3: "9",
      swap_ab_xy: false,
    }),
    saveControllerMapping: vi.fn().mockResolvedValue(undefined),
  };
});

describe("ControllerMappingModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ControllerMappingModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders correctly when open and loads mapping", async () => {
    render(<ControllerMappingModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Mapeo de Mando & RetroPad")).toBeInTheDocument();
    expect(screen.getByText("Disposición Nintendo (Invertir A/B y X/Y)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guardar Mapeo/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(tauriLib.getControllerMapping).toHaveBeenCalledTimes(1);
    });
  });

  it("allows toggling Nintendo layout switch", async () => {
    render(<ControllerMappingModal isOpen={true} onClose={vi.fn()} />);
    await waitFor(() => expect(tauriLib.getControllerMapping).toHaveBeenCalled());

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("saves mapping when Guardar Mapeo is clicked", async () => {
    render(<ControllerMappingModal isOpen={true} onClose={vi.fn()} />);
    await waitFor(() => expect(tauriLib.getControllerMapping).toHaveBeenCalled());

    const saveBtn = screen.getByRole("button", { name: /Guardar Mapeo/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(tauriLib.saveControllerMapping).toHaveBeenCalledTimes(1);
    });
  });

  it("restores defaults when Restablecer por Defecto is clicked", async () => {
    render(<ControllerMappingModal isOpen={true} onClose={vi.fn()} />);
    await waitFor(() => expect(tauriLib.getControllerMapping).toHaveBeenCalled());

    const resetBtn = screen.getByRole("button", { name: /Restablecer por Defecto/i });
    fireEvent.click(resetBtn);

    expect(
      screen.getByText("Mapeo restablecido a los valores por defecto (Xbox)")
    ).toBeInTheDocument();
  });
});
