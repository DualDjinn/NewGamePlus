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
    expect(document.querySelector(".ctrl-map-modal")).toHaveAttribute("data-capture-gamepad", "true");

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

  it("renders D-pad and left stick sections", async () => {
    render(<ControllerMappingModal isOpen={true} onClose={vi.fn()} />);
    await waitFor(() => expect(tauriLib.getControllerMapping).toHaveBeenCalled());

    expect(screen.getByText("Cruceta (D-pad)")).toBeInTheDocument();
    expect(screen.getByText("Stick Izquierdo (ejes)")).toBeInTheDocument();
    // Use the accessible button names from the mock mapping (Botón 12 = Cruceta Arriba, Eje +0 = Stick Izq. Eje X + (derecha))
    expect(screen.getByRole("button", { name: "Botón 12" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eje +0" })).toBeInTheDocument();
  });

  it("merges legacy mappings without new fields over defaults", async () => {
    render(<ControllerMappingModal isOpen={true} onClose={vi.fn()} />);
    await waitFor(() => expect(tauriLib.getControllerMapping).toHaveBeenCalled());

    const saveBtn = screen.getByRole("button", { name: /Guardar Mapeo/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(tauriLib.saveControllerMapping).toHaveBeenCalledTimes(1);
    });
    const saved = vi.mocked(tauriLib.saveControllerMapping).mock.calls[0][0];
    // Legacy mock lacks the new fields: defaults must fill them
    expect(saved).toMatchObject({
      btn_a: "0",
      dpad_up: "12",
      dpad_down: "13",
      dpad_left: "14",
      dpad_right: "15",
      l_stick_x_plus: "+0",
      l_stick_x_minus: "-0",
      l_stick_y_plus: "+1",
      l_stick_y_minus: "-1",
      analog_dpad_mode: "0",
    });
  });

  it("calls onSaved after a successful save", async () => {
    const onSaved = vi.fn();
    render(<ControllerMappingModal isOpen={true} onClose={vi.fn()} onSaved={onSaved} />);
    await waitFor(() => expect(tauriLib.getControllerMapping).toHaveBeenCalled());

    const saveBtn = screen.getByRole("button", { name: /Guardar Mapeo/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
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

  it("allows creating and switching custom controller profiles", async () => {
    render(<ControllerMappingModal isOpen={true} onClose={vi.fn()} />);
    await waitFor(() => expect(tauriLib.getControllerMapping).toHaveBeenCalled());

    // Click "+ Nuevo Perfil"
    const addProfileBtn = screen.getByRole("button", { name: /\+ Nuevo Perfil/i });
    fireEvent.click(addProfileBtn);

    // Type new profile name
    const input = screen.getByPlaceholderText(/Nombre del perfil/i);
    fireEvent.change(input, { target: { value: "Lucha Arcade" } });

    // Confirm creation
    const confirmBtn = screen.getByRole("button", { name: /Crear y Asignar/i });
    fireEvent.click(confirmBtn);

    // Toast appears
    expect(screen.getByText(/Perfil "Lucha Arcade" creado y asignado/i)).toBeInTheDocument();

    // The select dropdown now has the new profile selected
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("Lucha Arcade");
  });
});

