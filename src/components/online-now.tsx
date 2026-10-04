import { useCallback, useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { getSession, rpc, rest, signedUrl } from "@/lib/supabase";

type OnlineMember = {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  live_session_id: string | null;
  last_seen_at: string;
};

type Member = OnlineMember & { avatar_url: string };

const HEARTBEAT_MS = 30_000;
const POLL_MS = 20_000;
/** The server only lists people seen in the last 90s; match that here. */
const STALE_MS = 90_000;

/**
 * Who is online right now, read from `public.user_presence`.
 *
 * This replaces a counter that used to invent a number with Math.random(): the
 * list is only shown when the table is really there, and otherwise we say so
 * instead of showing a plausible-looking fiction.
 */
export function OnlineNow() {
  const [members, setMembers] = useState<Member[]>([]);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await rpc<OnlineMember[]>("online_members", { p_limit: 18 });
    const withAvatars = await Promise.all(
      (rows ?? []).map(async (row) => ({
        ...row,
        avatar_url: row.avatar_path ? await signedUrl(row.avatar_path).catch(() => "") : "",
      })),
    );
    setMembers(withAvatars);
    setLive(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!getSession()) return;
    let cancelled = false;

    // Announce this member, then keep the row fresh.
    const beat = () => {
      void rpc("touch_presence", { p_live_session_id: null }).catch(() => undefined);
    };
    beat();
    const heartbeat = window.setInterval(beat, HEARTBEAT_MS);

    const poll = () => {
      void load().catch(() => {
        // Missing table means the migration was never applied; say so once.
        if (!cancelled) {
          setLive(false);
          setLoading(false);
        }
      });
    };
    poll();
    const poller = window.setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      window.clearInterval(poller);
      // Leaving should not leave a stale "online" row behind.
      void rest("user_presence", `user_id=eq.${getSession()?.user.id ?? ""}`, {
        method: "DELETE",
      }).catch(() => undefined);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="online-now">
        <p className="online-now-empty">Verificando quem está online…</p>
      </div>
    );
  }

  if (!live) {
    return (
      <div className="online-now">
        <p className="online-now-empty">
          A lista de presença ainda não está no banco. Aplique{" "}
          <code>supabase/migrations/20261003020000_media_and_presence.sql</code>.
        </p>
      </div>
    );
  }

  const now = Date.now();
  const fresh = members.filter(
    (member) => now - Date.parse(member.last_seen_at) < STALE_MS,
  );

  return (
    <div className="online-now">
      <div className="online-now-head">
        <span className="online-now-count">{fresh.length}</span>
        <span>{fresh.length === 1 ? "pessoa online agora" : "pessoas online agora"}</span>
      </div>
      {fresh.length ? (
        <ul className="online-now-list">
          {fresh.map((member) => (
            <li key={member.user_id} className={member.live_session_id ? "is-live" : ""}>
              <a href={`/perfil/${member.user_id}`} title={member.display_name}>
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" />
                ) : (
                  <span className="online-now-fallback">
                    {member.display_name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                {member.live_session_id && (
                  <em className="online-now-live">
                    <Radio size={9} /> AO VIVO
                  </em>
                )}
              </a>
              <b>{member.display_name}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="online-now-empty">Ninguém por perto agora. Seja o primeiro a aparecer.</p>
      )}
    </div>
  );
}