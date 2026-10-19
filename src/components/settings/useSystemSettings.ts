import { useState } from "react";
import { getErrorLogs } from "../../lib/tauri";

export function useSystemSettings() {
  const [errorLogs, setErrorLogs] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);

  async function handleToggleLogs() {
    if (errorLogs !== null) {
      setErrorLogs(null);
      return;
    }
    try {
      const logs = await getErrorLogs();
      setErrorLogs(logs || "Sin errores registrados");
    } catch {
      setErrorLogs("Error al leer logs");
    }
  }

  function handleCopyLogs() {
    if (!errorLogs) return;
    navigator.clipboard.writeText(errorLogs);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  }

  return {
    errorLogs,
    copiedLog,
    handleToggleLogs,
    handleCopyLogs,
  };
}
