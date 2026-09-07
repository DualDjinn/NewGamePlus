import { useState, useEffect } from "react";
import InGameOverlayModal from "./components/InGameOverlayModal";
import { onInGamePauseOpen, onInGamePauseClose, inGameResume, getActiveLaunchedRomPath, getGames } from "./lib/tauri";
import type { Game } from "./types";

export default function InGameOverlayApp() {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    const fetchActiveGame = async () => {
      try {
        const activeRom = getActiveLaunchedRomPath();
        if (activeRom) {
          const allGames = await getGames();
          const found = allGames.find((g) => g.rom_path === activeRom);
          setGame(found || null);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchActiveGame();

    const unlistenOpen = onInGamePauseOpen(() => {
      fetchActiveGame();
      setIsOpen(true);
    });

    const unlistenClose = onInGamePauseClose(() => {
      setIsOpen(false);
    });

    return () => {
      unlistenOpen.then((fn) => fn());
      unlistenClose.then((fn) => fn());
    };
  }, []);

  return (
    <InGameOverlayModal
      isOpen={isOpen}
      game={game}
      onClose={() => {
        setIsOpen(false);
        inGameResume().catch(console.error);
      }}
    />
  );
}
