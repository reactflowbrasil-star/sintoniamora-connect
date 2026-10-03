import { useEffect, useState } from "react";

const INITIAL = 3299;
const MIN_WAIT = 3000;
const MAX_WAIT = 8000;

/**
 * Live-looking activity counter. Values are simulated for now; when the backend
 * exposes real presence, replace `nextValue` with the real active-session count.
 */
function nextValue(current: number) {
  // Predominantly grows by 1..5, occasionally dips by 1..3 so it never rises
  // in a perfectly linear way.
  const rises = Math.random() < 0.76;
  const delta = rises
    ? 1 + Math.floor(Math.random() * 5)
    : -(1 + Math.floor(Math.random() * 3));
  return Math.max(1, current + delta);
}

export function ActiveUsersCounter() {
  const [count, setCount] = useState(INITIAL);

  useEffect(() => {
    let timer: number;
    const tick = () => {
      setCount((current) => nextValue(current));
      timer = window.setTimeout(tick, MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT));
    };
    timer = window.setTimeout(tick, MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT));
    return () => window.clearTimeout(timer);
  }, []);

  const formatted = new Intl.NumberFormat("pt-BR").format(count);

  return (
    <li
      className="active-users"
      title="Contagem demonstrativa de atividade, até integrarmos presença em tempo real"
    >
      <span className="pulse-dot" aria-hidden="true" />
      <span>
        <b>{formatted}</b> usuários ativos
      </span>
      <small className="active-users-tag">demo</small>
    </li>
  );
}
