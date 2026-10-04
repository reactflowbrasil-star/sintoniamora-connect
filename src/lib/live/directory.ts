import { rest, restKeepalive, rpc } from "@/lib/supabase";
import { isMissingBackendObject } from "./queries";
import type { LiveSession } from "./types";

const SESSION_COLUMNS = "id,host_id,room_id,title,status,created_at";

/**
 * How long a host heartbeat stays valid. A LIVE row whose host has not been seen
 * for longer than this is an orphan: the browser that created it is gone, but
 * the row never flipped to ENDED, so the dashboard used to list it forever.
 */
export const HOST_HEARTBEAT_WINDOW_MS = 90_000;

/**
 * Used only while the presence layer is missing from the database (the RPC
 * below lives in 20261003030000_live_directory_integrity.sql). Without a server
 * heartbeat we cannot prove an own session is dead, so we only reclaim the old
 * ones instead of guessing.
 */
const OWN_ORPHAN_FALLBACK_MS = 15 * 60 * 1000;

/** Flips a session to ENDED. Only the host is allowed to do this (RLS). */
export async function endLiveSession(sessionId: string, hostId: string) {
  return rest(
    "live_sessions",
    `id=eq.${sessionId}&host_id=eq.${hostId}&status=eq.LIVE`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "ENDED", ended_at: new Date().toISOString() }),
    },
  );
}

/** Same PATCH, for `pagehide`/unmount, where an async token refresh is too slow. */
export async function endLiveSessionOnUnload(sessionId: string, hostId: string) {
  return restKeepalive(
    "live_sessions",
    `id=eq.${sessionId}&host_id=eq.${hostId}&status=eq.LIVE`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "ENDED", ended_at: new Date().toISOString() }),
    },
  );
}

type DirectorySnapshot = { rows: LiveSession[]; heartbeatVerified: boolean };

/**
 * Reads the list of broadcasts that really have a host connected.
 *
 * `live_active_sessions()` is the authoritative version: it returns only
 * sessions whose host refreshed presence inside the heartbeat window, which is
 * what makes an abandoned session stop being advertised. Until that migration
 * is applied the plain `status=LIVE` query is used and orphans cannot be told
 * apart — so `heartbeatVerified` is false and callers must not treat the list
 * as proof that those rooms are really streaming.
 */
async function fetchDirectory(): Promise<DirectorySnapshot> {
  try {
    const rows = await rpc<LiveSession[]>("live_active_sessions");
    return { rows: rows ?? [], heartbeatVerified: true };
  } catch (cause) {
    if (!isMissingBackendObject(cause)) throw cause;
    const rows = await rest<LiveSession[]>(
      "live_sessions",
      `status=eq.LIVE&select=${SESSION_COLUMNS}&order=created_at.desc&limit=50`,
    );
    return { rows: rows ?? [], heartbeatVerified: false };
  }
}

export type LiveDirectoryOptions = {
  uid?: string | undefined;
  /** Session this tab is streaming right now; it is never reclaimed. */
  currentSessionId?: string | null | undefined;
};

/**
 * Loads the live directory and repairs what it can.
 *
 * A member can only end their *own* sessions (RLS), so orphans belonging to
 * other hosts are hidden by `live_active_sessions` while the caller's own
 * leftovers are actually closed here — that is what clears the pile of
 * "Transmitindo agora" cards left behind by earlier attempts.
 */
export async function loadLiveDirectory({ uid, currentSessionId }: LiveDirectoryOptions = {}): Promise<LiveSession[]> {
  const { rows, heartbeatVerified } = await fetchDirectory();
  if (!uid) return rows;

  const mine = await rest<LiveSession[]>(
    "live_sessions",
    `host_id=eq.${uid}&status=eq.LIVE&select=${SESSION_COLUMNS}`,
  ).catch(() => [] as LiveSession[]);

  const advertised = new Set(rows.map((row) => row.id));
  const orphans = (mine ?? []).filter((row) => {
    if (row.id === currentSessionId) return false;
    // With the heartbeat RPC available, "not advertised" means "host is gone".
    if (heartbeatVerified) return !advertised.has(row.id);
    return Date.now() - new Date(row.created_at).getTime() > OWN_ORPHAN_FALLBACK_MS;
  });

  if (!orphans.length) return rows;
  await Promise.all(orphans.map((row) => endLiveSession(row.id, uid).catch(() => undefined)));
  const closed = new Set(orphans.map((row) => row.id));
  return rows.filter((row) => !closed.has(row.id));
}