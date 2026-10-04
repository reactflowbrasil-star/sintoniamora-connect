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

/**
 * Raised when the RPC does not exist on the deployed project. That is not a
 * transient hiccup: it means supabase/migrations/20261003000000_live_experience.sql
 * was never applied. Previously this was swallowed, so the live looked broken
 * (always zero viewers, no moderation) with no clue why.
 */
export class LiveBackendMissingError extends Error {
  readonly rpcName: string;
  constructor(rpcName: string) {
    super(
      "A camada de presença e métricas de live não está no banco. Aplique supabase/migrations/20261003000000_live_experience.sql no SQL Editor do Supabase.",
    );
    this.name = "LiveBackendMissingError";
    this.rpcName = rpcName;
  }
}

function rethrowIfMissing(rpcName: string, cause: unknown): never | null {
  // The stable signal is the PostgREST code, not the message: depending on the
  // version it reads either "Could not find the function ..." or "Searched for
  // the function ... but no match was found in the schema cache", and only the
  // first matches a text pattern. The text fallback covers older builds that do
  // not attach `code`.
  const code = cause instanceof Error ? (cause as Error & { code?: string }).code : undefined;
  const message = cause instanceof Error ? cause.message : String(cause ?? "");
  const missing =
    code === "PGRST202" || /PGRST202|does not exist|could not find the function|searched for the function/i.test(message);
  if (missing) throw new LiveBackendMissingError(rpcName);
  return null;
}

/** Server-computed metrics. The client never invents these numbers. */
export async function fetchLiveMetrics(sessionId: string): Promise<LiveMetrics> {
  try {
    // live_live_metrics returns a table, so PostgREST answers with a row array.
    const rows = await rpc<LiveMetrics[]>("live_live_metrics", { p_session_id: sessionId });
    return rows?.[0] ?? EMPTY_METRICS;
  } catch (cause) {
    // A missing RPC is a deployment problem and must be reported, not hidden.
    rethrowIfMissing("live_live_metrics", cause);
    return EMPTY_METRICS;
  }
}

/** Heartbeat marking this user present. Staleness is pruned server-side. */
export async function markViewerPresent(sessionId: string): Promise<boolean> {
  try {
    // returns boolean -> PostgREST answers with a bare scalar.
    return (await rpc<boolean>("mark_live_presence", { p_session_id: sessionId })) === true;
  } catch (cause) {
    rethrowIfMissing("mark_live_presence", cause);
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
