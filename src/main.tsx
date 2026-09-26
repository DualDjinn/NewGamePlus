import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./i18n";
import App from "./App";
import IngameMenu from "./components/IngameMenu";
import "./index.css";

const isIngame = getCurrentWindow().label === "ingame";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isIngame ? <IngameMenu /> : <App />}
  </React.StrictMode>,
);
