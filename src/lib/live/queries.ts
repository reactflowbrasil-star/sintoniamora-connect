import { rpc, rest } from "@/lib/supabase";
import type { LiveMetrics } from "./types";

const EMPTY_METRICS: LiveMetrics = {
  current_viewers: 0,
  unique_viewers: 0,
  likes: 0,
  messages: 0,
  gifts: 0,
  points: 0,
};

/** Server-computed metrics. The client never invents these numbers. */
export async function fetchLiveMetrics(sessionId: string): Promise<LiveMetrics> {
  try {
    // live_live_metrics returns a table, so PostgREST answers with a row array.
    const rows = await rpc<LiveMetrics[]>("live_live_metrics", { p_session_id: sessionId });
    return rows?.[0] ?? EMPTY_METRICS;
  } catch {
    return EMPTY_METRICS;
  }
}

/** Heartbeat marking this user present. Staleness is pruned server-side. */
export async function markViewerPresent(sessionId: string): Promise<boolean> {
  try {
    // returns boolean -> PostgREST answers with a bare scalar.
    return (await rpc<boolean>("mark_live_presence", { p_session_id: sessionId })) === true;
  } catch {
    return false;
  }
}

export async function muteLiveViewer(sessionId: string, targetUserId: string, reason: string) {
  return rpc<string>("live_mute_user", {
    p_session_id: sessionId,
    p_target_user_id: targetUserId,
    p_reason: reason,
  });
}

export async function removeLiveViewer(sessionId: string, targetUserId: string, reason: string) {
  return rpc<string>("live_remove_user", {
    p_session_id: sessionId,
    p_target_user_id: targetUserId,
    p_reason: reason,
  });
}

/**
 * Blocking writes to public.blocks, which the existing RLS already reads via
 * private.are_blocked — so the blocked viewer loses live access immediately
 * without trusting anything in the browser.
 */
export async function blockLiveViewer(sessionId: string, targetUserId: string, reason: string) {
  return rpc<string>("live_block_user", {
    p_session_id: sessionId,
    p_target_user_id: targetUserId,
    p_reason: reason,
  });
}

export async function reportLiveViewer(targetUserId: string, reason: string) {
  return rest("reports", "", {
    method: "POST",
    body: JSON.stringify({ target_user_id: targetUserId, reason }),
  });
}
