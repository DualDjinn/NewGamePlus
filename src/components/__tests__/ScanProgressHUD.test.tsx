import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScanProgressHUD from "../ScanProgressHUD";

describe("ScanProgressHUD Component", () => {
  it("renders nothing when scanning is false", () => {
    const { container } = render(
      <ScanProgressHUD scanning={false} progress={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders progress HUD with percentage and message when scanning is true", () => {
    render(
      <ScanProgressHUD
        scanning={true}
        progress={72}
        message="Indexando ROMs de PS1 (34/50)"
      />
    );

    expect(screen.getByText("Escaneando Biblioteca")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("Indexando ROMs de PS1 (34/50)")).toBeInTheDocument();
  });
});
