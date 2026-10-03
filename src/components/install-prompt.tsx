import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "sintoniamora.install.dismissed";
const INSTALLED_KEY = "sintoniamora.install.done";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari keeps the old vendor prefix.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS never fires beforeinstallprompt, so it needs the manual steps instead. */
function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS reports as Mac with touch points.
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

/**
 * Android install prompt. Chrome fires `beforeinstallprompt`, which we hold on
 * the event and replay from our own banner so the native dialog appears right
 * after the visitor lands. iOS has no such event and gets the "Compartilhar >
 * Adicionar à tela inicial" instructions instead.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(INSTALLED_KEY) === "1") return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const showManual = () => {
      // Desktop browsers without the event have no useful install path, so we
      // stay quiet there instead of showing an instructions banner they can't follow.
      if (!isIOS()) return;
      setManual(true);
      setVisible(true);
    };

    // Fire before the visitor scrolls away; a short delay lets the intro settle.
    const timer = window.setTimeout(showManual, 2600);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      window.clearTimeout(timer);
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") localStorage.setItem(INSTALLED_KEY, "1");
    else sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <aside className="install-prompt" role="dialog" aria-label="Instalar o aplicativo Sintoniamora">
      <span className="install-prompt-icon" aria-hidden="true">
        {manual ? <Smartphone size={22} /> : <Download size={22} />}
      </span>
      <div className="install-prompt-copy">
        <b>Leve o Sintoniamora com você</b>
        <p>
          {manual
            ? "Toque em Compartilhar e depois em “Adicionar à tela inicial” para instalar o app."
            : "Instale o app e acesse a comunidade direto da tela inicial, sem abrir o navegador."}
        </p>
      </div>
      <div className="install-prompt-actions">
        {manual ? (
          <span className="install-prompt-hint">
            <Share size={14} /> Compartilhar
          </span>
        ) : (
          <button className="button button-primary" onClick={() => void install()}>
            Instalar app
          </button>
        )}
        <button className="install-prompt-close" onClick={dismiss} aria-label="Fechar aviso de instalação">
          <X size={16} />
        </button>
      </div>
    </aside>
  );
}