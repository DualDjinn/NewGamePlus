import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import InGameOverlayApp from "./InGameOverlayApp";
import "./index.css";

function Root() {
  const [isOverlay, setIsOverlay] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        const win = getCurrentWindow();
        if (win.label === "in_game_overlay") {
          setIsOverlay(true);
          document.documentElement.style.background = "transparent";
          document.body.style.background = "transparent";
          const rootEl = document.getElementById("root");
          if (rootEl) rootEl.style.background = "transparent";
        }
        setReady(true);
      })
      .catch(() => {
        setReady(true);
      });
  }, []);

  if (!ready) return null;
  return isOverlay ? <InGameOverlayApp /> : <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
