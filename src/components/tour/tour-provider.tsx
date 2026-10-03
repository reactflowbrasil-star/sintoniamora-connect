import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { getSession } from "@/lib/supabase";
import { GLOBAL_TOUR, getTour, tourForPath, type TourDefinition, type TourStep } from "@/lib/tours/config";
import { loadOnboarding, readLocal, saveOnboarding, type OnboardingState } from "@/lib/tours/storage";

type Phase = "intro" | "running" | "done";
type Active = { tour: TourDefinition; steps: TourStep[]; index: number; phase: Phase };

type Ctx = {
  state: OnboardingState;
  start: (id: string) => void;
  isSeen: (id: string) => boolean;
};

const TourContext = createContext<Ctx>({ state: {}, start: () => undefined, isSeen: () => true });
export const useTours = () => useContext(TourContext);

const MOBILE = 640;
const PAD = 8;

function isVisible(el: Element) {
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
}

function findTarget(step: TourStep): HTMLElement | null {
  for (const sel of step.target) {
    const match = Array.from(document.querySelectorAll<HTMLElement>(sel)).find(isVisible);
    if (match) return match;
  }
  return null;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function TourProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [uid, setUid] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingState>({});
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<Active | null>(null);

  useEffect(() => {
    const id = getSession()?.user.id ?? null;
    if (id === uid) return;
    setUid(id);
    setLoaded(false);
    if (!id) return;
    setState(readLocal(id));
    void loadOnboarding(id).then((s) => {
      setState(s);
      setLoaded(true);
    });
  }, [pathname, uid]);

  const mark = useCallback(
    (id: string) => {
      if (!uid) return;
      setState((prev) => {
        const next = { ...prev, [id]: true };
        void saveOnboarding(uid, next);
        return next;
      });
    },
    [uid],
  );

  const open = useCallback((tour: TourDefinition, phase: Phase) => {
    setActive({ tour, steps: tour.steps, index: 0, phase });
  }, []);

  // Auto-offer: global tour on the dashboard, contextual tour on first visit of an area.
  useEffect(() => {
    if (!uid || !loaded || active) return;
    const t = window.setTimeout(() => {
      if (pathname === GLOBAL_TOUR.route && !state['global']) return open(GLOBAL_TOUR, "intro");
      const ctx = tourForPath(pathname);
      if (ctx && !state[ctx.id] && (state['global'] || pathname !== GLOBAL_TOUR.route)) open(ctx, "intro");
    }, 900);
    return () => window.clearTimeout(t);
  }, [pathname, uid, loaded, state, active, open]);

  // Close a running tour when the user navigates elsewhere.
  useEffect(() => {
    setActive((a) => (a && a.tour.route !== pathname && a.tour.id !== "global" ? null : a));
  }, [pathname]);

  const start = useCallback(
    (id: string) => {
      const tour = getTour(id);
      if (!tour) return;
      if (pathname !== tour.route) {
        sessionStorage.setItem("sintoniamora:pending-tour", id);
        window.location.assign(tour.route);
        return;
      }
      setActive({ tour, steps: tour.steps, index: 0, phase: "running" });
    },
    [pathname],
  );

  // Resume a tour requested from another page (e.g. help center).
  useEffect(() => {
    const pending = sessionStorage.getItem("sintoniamora:pending-tour");
    const tour = pending ? getTour(pending) : undefined;
    if (!tour || tour.route !== pathname) return;
    sessionStorage.removeItem("sintoniamora:pending-tour");
    const t = window.setTimeout(() => setActive({ tour, steps: tour.steps, index: 0, phase: "running" }), 700);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const close = useCallback(() => {
    setActive((a) => {
      if (a) mark(a.tour.id);
      return null;
    });
  }, [mark]);

  const value = useMemo<Ctx>(() => ({ state, start, isSeen: (id) => !uid || Boolean(state[id]) }), [state, start, uid]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && <TourOverlay active={active} setActive={setActive} onClose={close} />}
    </TourContext.Provider>
  );
}

type Rect = { top: number; left: number; width: number; height: number };

function TourOverlay({
  active,
  setActive,
  onClose,
}: {
  active: Active;
  setActive: (fn: (a: Active | null) => Active | null) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const [vw, setVw] = useState(() => window.innerWidth);
  const { tour, steps, index, phase } = active;
  const step = phase === "running" ? steps[index] : undefined;
  const isMobile = vw < MOBILE;

  const go = useCallback(
    (dir: 1 | -1) => {
      setActive((a) => {
        if (!a) return a;
        let i = a.index + dir;
        // Skip steps whose target is not available on this screen.
        while (i >= 0 && i < a.steps.length && !findTarget(a.steps[i]!) && a.steps[i]!.mobileBehavior === "skip") i += dir;
        if (i < 0) return a;
        if (i >= a.steps.length) return { ...a, phase: "done" };
        return { ...a, index: i };
      });
    },
    [setActive],
  );

  // Locate, scroll, then spotlight.
  useEffect(() => {
    setReady(false);
    setRect(null);
    if (!step) {
      setReady(true);
      return;
    }
    const el = findTarget(step);
    if (!el) {
      setReady(true);
      return;
    }
    el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center", inline: "nearest" });
    let last = -1;
    let stable = 0;
    let raf = 0;
    const settle = () => {
      const top = el.getBoundingClientRect().top;
      stable = Math.abs(top - last) < 0.5 ? stable + 1 : 0;
      last = top;
      if (stable > 4) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        setReady(true);
      } else raf = requestAnimationFrame(settle);
    };
    raf = requestAnimationFrame(settle);
    const update = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const onResize = () => {
      setVw(window.innerWidth);
      update();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", update, true);
    };
  }, [step]);

  // Focus + keyboard.
  useEffect(() => {
    if (ready) dialogRef.current?.focus();
  }, [ready, phase, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (phase !== "running") return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, go, onClose]);

  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = dialogRef.current.querySelectorAll<HTMLElement>("button");
    if (!items.length) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const total = steps.length;
  const sheet = phase === "running" && (isMobile || !rect);

  const spot = rect && {
    top: rect.top - PAD,
    left: Math.max(4, rect.left - PAD),
    width: Math.min(rect.width + PAD * 2, vw - 8),
    height: rect.height + PAD * 2,
  };

  return (
    <div className="tour-root" role="presentation">
      {spot ? (
        <div className="tour-spotlight" style={spot} aria-hidden="true" />
      ) : (
        <div className="tour-backdrop" aria-hidden="true" onClick={onClose} />
      )}
      {spot && <div className="tour-click-shield" aria-hidden="true" />}
      {ready && (
        <TourCard
          ref={dialogRef}
          sheet={sheet}
          centered={phase !== "running"}
          spot={spot}
          onKeyDown={trapTab}
        >
          <button className="tour-close" onClick={onClose} aria-label="Fechar tutorial">
            <X size={18} />
          </button>
          {phase === "intro" && (
            <>
              <h2 id="tour-title">{tour.intro.title}</h2>
              <p>{tour.intro.text}</p>
              <div className="tour-actions">
                <button className="button button-outline" onClick={onClose}>
                  {tour.id === "global" ? "Pular por enquanto" : "Agora não"}
                </button>
                <button
                  className="button button-primary"
                  onClick={() => setActive((a) => (a ? { ...a, phase: "running", index: 0 } : a))}
                >
                  {tour.id === "global" ? "Começar tour" : "Mostrar como funciona"}
                </button>
              </div>
            </>
          )}
          {phase === "running" && step && (
            <>
              <span className="tour-kicker">{tour.icon} {tour.title}</span>
              <h2 id="tour-title">{step.title}</h2>
              <p>{step.description}</p>
              <div className="tour-progress" aria-label={`Etapa ${index + 1} de ${total}`}>
                <span>{index + 1} de {total}</span>
                <div className="tour-progress-bar"><i style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
              </div>
              <div className="tour-actions">
                <button className="tour-skip" onClick={onClose}>Pular tutorial</button>
                <span className="tour-actions-nav">
                  {index > 0 && (
                    <button className="button button-outline" onClick={() => go(-1)}>← Voltar</button>
                  )}
                  <button className="button button-primary" onClick={() => go(1)}>
                    {index === total - 1 ? "Concluir" : "Próximo →"}
                  </button>
                </span>
              </div>
            </>
          )}
          {phase === "done" && (
            <>
              <h2 id="tour-title">✓ Tudo certo!</h2>
              <p>
                {tour.id === "global"
                  ? "Agora você já conhece os principais recursos da plataforma. Reveja os tours quando quiser em Ajuda."
                  : "Agora você já conhece os principais recursos desta área."}
              </p>
              <div className="tour-actions">
                <button className="button button-primary" onClick={onClose}>Começar a usar</button>
              </div>
            </>
          )}
        </TourCard>
      )}
    </div>
  );
}

type CardProps = {
  sheet: boolean;
  centered: boolean;
  spot: Rect | null | undefined;
  children: ReactNode;
  onKeyDown: (e: React.KeyboardEvent) => void;
  ref: React.Ref<HTMLDivElement>;
};

function TourCard({ sheet, centered, spot, children, onKeyDown, ref }: CardProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (sheet || centered || !spot || !innerRef.current) return setPos(null);
    const card = innerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 14;
    const space = {
      bottom: vh - (spot.top + spot.height),
      top: spot.top,
      right: vw - (spot.left + spot.width),
      left: spot.left,
    };
    let top: number;
    let left: number;
    if (space.bottom >= card.height + gap) {
      top = spot.top + spot.height + gap;
      left = spot.left + spot.width / 2 - card.width / 2;
    } else if (space.top >= card.height + gap) {
      top = spot.top - card.height - gap;
      left = spot.left + spot.width / 2 - card.width / 2;
    } else if (space.right >= card.width + gap) {
      left = spot.left + spot.width + gap;
      top = spot.top + spot.height / 2 - card.height / 2;
    } else if (space.left >= card.width + gap) {
      left = spot.left - card.width - gap;
      top = spot.top + spot.height / 2 - card.height / 2;
    } else {
      top = vh - card.height - 16;
      left = vw / 2 - card.width / 2;
    }
    setPos({
      top: Math.min(Math.max(12, top), vh - card.height - 12),
      left: Math.min(Math.max(12, left), vw - card.width - 12),
    });
  }, [sheet, centered, spot?.top, spot?.left, spot?.width, spot?.height]);

  const setRefs = (node: HTMLDivElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  const cls = sheet ? "tour-card is-sheet" : centered ? "tour-card is-centered" : "tour-card is-popover";
  return (
    <div
      ref={setRefs}
      className={cls}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-live="polite"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={pos ? { top: pos.top, left: pos.left } : !sheet && !centered ? { visibility: "hidden" } : undefined}
    >
      {children}
    </div>
  );
}
