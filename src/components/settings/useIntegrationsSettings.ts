import { useState, useEffect } from "react";
import {
  saveRACredentials,
  getRACredentials,
  clearRACredentials,
  setCheevosHardcore,
  saveSteamGridDBKey,
  getSteamGridDBKey,
  clearSteamGridDBKey,
  saveScreenscraperConfig,
  getScreenscraperConfig,
  clearScreenscraperConfig,
} from "../../lib/tauri";

export function useIntegrationsSettings() {
  const [raUsername, setRaUsername] = useState("");
  const [raPassword, setRaPassword] = useState("");
  const [raApiKey, setRaApiKey] = useState("");
  const [raLinkedUser, setRaLinkedUser] = useState<string | null>(null);
  const [raHardcore, setRaHardcore] = useState(false);
  const [raFeedback, setRaFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  const [sgdbApiKey, setSgdbApiKey] = useState("");
  const [sgdbLinked, setSgdbLinked] = useState(false);
  const [sgdbFeedback, setSgdbFeedback] = useState<{ msg: string; isError: boolean } | null>(null);
  const [sgdbLoading, setSgdbLoading] = useState(false);

  const [ssDevId, setSsDevId] = useState("");
  const [ssDevPass, setSsDevPass] = useState("");
  const [ssUser, setSsUser] = useState("");
  const [ssPass, setSsPass] = useState("");
  const [ssLinked, setSsLinked] = useState(false);
  const [ssDevIdSaved, setSsDevIdSaved] = useState<string | null>(null);
  const [ssUserSaved, setSsUserSaved] = useState<string | null>(null);
  const [ssFeedback, setSsFeedback] = useState<{ msg: string; isError: boolean } | null>(null);
  const [ssLoading, setSsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getRACredentials()
      .then((creds) => {
        if (!cancelled && creds) {
          const [u] = creds.split(":");
          setRaLinkedUser(u || null);
          setRaUsername(u || "");
        }
      })
      .catch(console.error);

    getSteamGridDBKey()
      .then((key) => {
        if (!cancelled) setSgdbLinked(key);
      })
      .catch(console.error);

    getScreenscraperConfig()
      .then((cfg) => {
        if (!cancelled) {
          setSsLinked(cfg.has_dev_credentials);
          setSsDevIdSaved(cfg.dev_id || null);
          setSsUserSaved(cfg.username || null);
          if (cfg.dev_id) setSsDevId(cfg.dev_id);
          if (cfg.username) setSsUser(cfg.username);
        }
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLinkRA() {
    setRaFeedback(null);
    if (!raUsername || !raPassword || !raApiKey) {
      setRaFeedback({ msg: "Por favor completa usuario, contraseña y API Key", isError: true });
      return;
    }
    try {
      await saveRACredentials(raUsername, raPassword, raApiKey);
      setRaLinkedUser(raUsername);
      setRaPassword("");
      setRaFeedback({ msg: "¡Cuenta vinculada y sesión iniciada con éxito!", isError: false });
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al vincular";
      setRaFeedback({ msg, isError: true });
    }
  }

  async function handleUnlinkRA() {
    try {
      await clearRACredentials();
      setRaLinkedUser(null);
      setRaUsername("");
      setRaPassword("");
      setRaApiKey("");
      setRaFeedback({ msg: "Cuenta desvinculada", isError: false });
    } catch (e) {
      setRaFeedback({ msg: "Error al desvincular", isError: true });
    }
  }

  async function handleToggleRAHardcore() {
    const next = !raHardcore;
    setRaHardcore(next);
    try {
      await setCheevosHardcore(next);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLinkSGDB() {
    setSgdbFeedback(null);
    if (!sgdbApiKey.trim()) {
      setSgdbFeedback({ msg: "Por favor ingresa tu API Key de SteamGridDB", isError: true });
      return;
    }
    setSgdbLoading(true);
    try {
      await saveSteamGridDBKey(sgdbApiKey.trim());
      setSgdbLinked(true);
      setSgdbFeedback({ msg: "¡API Key de SteamGridDB vinculada correctamente!", isError: false });
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al vincular API Key";
      setSgdbFeedback({ msg, isError: true });
    } finally {
      setSgdbLoading(false);
    }
  }

  async function handleUnlinkSGDB() {
    try {
      await clearSteamGridDBKey();
      setSgdbLinked(false);
      setSgdbApiKey("");
      setSgdbFeedback({ msg: "API Key de SteamGridDB desvinculada", isError: false });
    } catch (e) {
      setSgdbFeedback({ msg: "Error al desvincular", isError: true });
    }
  }

  async function handleLinkScreenScraper() {
    setSsFeedback(null);
    if (!ssDevId.trim() || !ssDevPass.trim()) {
      setSsFeedback({ msg: "Por favor ingresa usuario Dev y contraseña Dev", isError: true });
      return;
    }
    setSsLoading(true);
    try {
      await saveScreenscraperConfig(ssDevId.trim(), ssDevPass.trim(), ssUser.trim(), ssPass.trim());
      setSsLinked(true);
      setSsDevIdSaved(ssDevId.trim());
      setSsUserSaved(ssUser.trim() || null);
      setSsDevPass("");
      setSsPass("");
      setSsFeedback({ msg: "¡ScreenScraper vinculado y verificado correctamente!", isError: false });
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al vincular ScreenScraper";
      setSsFeedback({ msg, isError: true });
    } finally {
      setSsLoading(false);
    }
  }

  async function handleUnlinkScreenScraper() {
    try {
      await clearScreenscraperConfig();
      setSsLinked(false);
      setSsDevIdSaved(null);
      setSsUserSaved(null);
      setSsDevId("");
      setSsDevPass("");
      setSsUser("");
      setSsPass("");
      setSsFeedback({ msg: "ScreenScraper desvinculado", isError: false });
    } catch (e) {
      setSsFeedback({ msg: "Error al desvincular ScreenScraper", isError: true });
    }
  }

  return {
    raUsername,
    setRaUsername,
    raPassword,
    setRaPassword,
    raApiKey,
    setRaApiKey,
    raLinkedUser,
    raHardcore,
    raFeedback,
    handleLinkRA,
    handleUnlinkRA,
    handleToggleRAHardcore,
    sgdbApiKey,
    setSgdbApiKey,
    sgdbLinked,
    sgdbFeedback,
    sgdbLoading,
    handleLinkSGDB,
    handleUnlinkSGDB,
    ssDevId,
    setSsDevId,
    ssDevPass,
    setSsDevPass,
    ssUser,
    setSsUser,
    ssPass,
    setSsPass,
    ssLinked,
    ssDevIdSaved,
    ssUserSaved,
    ssFeedback,
    ssLoading,
    handleLinkScreenScraper,
    handleUnlinkScreenScraper,
  };
}
