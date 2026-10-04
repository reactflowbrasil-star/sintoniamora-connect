import { useEffect, useState } from "react";
import { getSession, rpc } from "@/lib/supabase";

type OnlineRow = { total: number };

/**
 * How many members were seen in the last 90 seconds.
 *
 * This used to invent a number with Math.random() and present it as fact, which
 * is the one thing a "how many people are here" indicator must not do. It now
 * reads the same `public.user_presence` table the dashboard uses, and shows no
 * figure at all for visitors who are not signed in — there is no honest way to
 * count them.
 */
export function ActiveUsersCounter() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!getSession()) return;
    let cancelled = false;

    const load = () => {
      void rpc<OnlineRow[]>("online_count")
        .then((rows) => {
          if (!cancelled) setTotal(Number(rows?.[0]?.total ?? 0));
        })
        .catch(() => {
          // Presence table missing (migration not applied): leave it unset
          // rather than fall back to a fabricated figure.
        });
    };

    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <li
      className="active-users"
      title={
        total === null
          ? "Entre na sua conta para ver quantas pessoas estão online"
          : "Membros vistos nos últimos 90 segundos"
      }
    >
      <span className="pulse-dot" aria-hidden="true" />
      <span className="active-users-text">
        {total === null ? (
          "comunidade ativa"
        ) : (
          <>
            <b className="counter-value">{new Intl.NumberFormat("pt-BR").format(total)}</b>{" "}
            {total === 1 ? "pessoa online" : "pessoas online"}
          </>
        )}
      </span>
    </li>
  );
}