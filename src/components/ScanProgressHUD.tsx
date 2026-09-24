import "./ScanProgressHUD.css";

interface ScanProgressHUDProps {
  scanning: boolean;
  progress: number;
  message?: string;
}

export default function ScanProgressHUD({
  scanning,
  progress,
  message,
}: ScanProgressHUDProps) {
  if (!scanning) return null;

  return (
    <div className="scan-hud" role="status" aria-live="polite">
      <div className="scan-hud-spinner" />
      <div className="scan-hud-content">
        <div className="scan-hud-header">
          <span className="scan-hud-title">Escaneando Biblioteca</span>
          <span className="scan-hud-pct">{progress}%</span>
        </div>
        <div className="scan-hud-bar-wrap">
          <div className="scan-hud-bar" style={{ width: `${Math.max(2, Math.min(100, progress))}%` }} />
        </div>
        {message && <p className="scan-hud-msg" title={message}>{message}</p>}
      </div>
    </div>
  );
}
