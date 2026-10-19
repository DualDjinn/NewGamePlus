import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Game, GameMetadata } from "../../types";
import { getCoverUrl } from "../../lib/tauri";

interface WheelVideoPlayerProps {
  videoSrc: string | null;
  activeGame: Game;
  metadata: GameMetadata | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isVideoMuted: boolean;
  videoVolume: number;
}

export function WheelVideoPlayer({
  videoSrc,
  activeGame,
  metadata,
  videoRef,
  isVideoMuted,
  videoVolume,
}: WheelVideoPlayerProps) {
  const { t } = useTranslation();
  const [logoSrc, setLogoSrc] = useState<string>("");
  const [logoRatio, setLogoRatio] = useState<number | null>(null);

  const rawLogoPath = activeGame.logo_path;

  useEffect(() => {
    if (rawLogoPath) {
      setLogoSrc(getCoverUrl(rawLogoPath));
      setLogoRatio(null);
    } else {
      setLogoSrc("");
      setLogoRatio(null);
    }
  }, [activeGame.id, rawLogoPath]);

  const handleLogoLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;

    // Detect if the image has large transparent borders and auto-trim
    try {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (img.src.startsWith("data:")) {
        setLogoRatio(w / h);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setLogoRatio(w / h);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      let minX = w, maxX = -1, minY = h, maxY = -1;
      const step = w > 1200 || h > 1200 ? 2 : 1;

      for (let y = 0; y < h; y += step) {
        const row = y * w;
        for (let x = 0; x < w; x += step) {
          const alpha = data[(row + x) * 4 + 3];
          if (alpha > 15) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX >= minX && maxY >= minY) {
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;

        // If there are significant transparent borders (>7% padding)
        if (cropW < w * 0.93 || cropH < h * 0.93) {
          const pad = 6;
          const x0 = Math.max(0, minX - pad);
          const y0 = Math.max(0, minY - pad);
          const x1 = Math.min(w - 1, maxX + pad);
          const y1 = Math.min(h - 1, maxY + pad);
          const finalW = x1 - x0 + 1;
          const finalH = y1 - y0 + 1;

          const cropCanvas = document.createElement("canvas");
          cropCanvas.width = finalW;
          cropCanvas.height = finalH;
          const cropCtx = cropCanvas.getContext("2d");
          if (cropCtx) {
            cropCtx.drawImage(canvas, x0, y0, finalW, finalH, 0, 0, finalW, finalH);
            const trimmedDataUrl = cropCanvas.toDataURL("image/png");
            setLogoSrc(trimmedDataUrl);
            setLogoRatio(finalW / finalH);
            return;
          }
        }
        setLogoRatio(cropW / cropH);
        return;
      }
    } catch {
      // Fallback on security/CORS error
    }

    setLogoRatio(img.naturalWidth / img.naturalHeight);
  };

  const getOpticalStyle = (ratio: number | null): React.CSSProperties => {
    if (!ratio) {
      return { maxWidth: "360px", maxHeight: "110px" };
    }
    // Ultra-wide banner logo (ratio >= 3.6, e.g. Street Fighter, Sonic, wide subtitles)
    if (ratio >= 3.6) {
      return { maxWidth: "420px", maxHeight: "102px" };
    }
    // Standard horizontal logo (2.2 <= ratio < 3.6)
    if (ratio >= 2.2) {
      return { maxWidth: "360px", maxHeight: "112px" };
    }
    // Compact rectangular logo (1.5 <= ratio < 2.2)
    if (ratio >= 1.5) {
      return { maxWidth: "320px", maxHeight: "125px" };
    }
    // Stacked or square badge logo (ratio < 1.5, e.g. Zelda, Pokemon, Mario Kart)
    return { maxWidth: "275px", maxHeight: "140px" };
  };

  return (
    <div className="osu-video-bottom-card">
      <div className="osu-video-wrapper">
        {videoSrc ? (
          <video
            ref={videoRef}
            key={videoSrc}
            src={getCoverUrl(videoSrc)}
            className="osu-snap-video"
            autoPlay
            loop
            playsInline
            muted={isVideoMuted}
            onLoadedMetadata={(e) => {
              e.currentTarget.volume = videoVolume;
            }}
          />
        ) : activeGame.cover_path ? (
          <div className="osu-video-cover-fallback">
            <div
              className="osu-cover-fallback-bg"
              style={{ backgroundImage: `url(${getCoverUrl(activeGame.cover_path)})` }}
              aria-hidden="true"
            />
            <img
              src={getCoverUrl(activeGame.cover_path)}
              alt={activeGame.display_name || metadata?.display_name || activeGame.name}
              className="osu-cover-fallback-img"
            />
          </div>
        ) : (
          <div className="osu-video-standby">
            <div className="osu-standby-grid" />
            <span className="osu-standby-text">
              {t("arcade.previewBadgeFallback", "PREVIEW")}
            </span>
          </div>
        )}

        {/* Floating Game Logo Overlay (Top-Left of Preview) */}
        {logoSrc && (
          <div className="osu-video-logo-overlay" style={getOpticalStyle(logoRatio)}>
            <img
              src={logoSrc}
              alt={activeGame.display_name || metadata?.display_name || activeGame.name}
              className="osu-video-logo-img"
              onLoad={handleLogoLoad}
            />
          </div>
        )}

        <div className="osu-crt-scanlines" aria-hidden="true" />

        <div className={`osu-media-badge-tag ${videoSrc ? "is-video" : "is-cover"}`}>
          <span className="osu-rec-dot" />{" "}
          {videoSrc ? t("arcade.previewBadgeVideo", "VIDEO SNAP") : t("arcade.previewBadgeCover", "PORTADA")}
        </div>
      </div>
    </div>
  );
}
