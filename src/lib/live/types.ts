export type LiveSession = {
  id: string;
  host_id: string;
  room_id: number;
  title: string;
  status: "LIVE" | "ENDED";
  created_at: string;
};

export type LiveGift = { id: string; name: string; emoji: string; points: number };

export type LiveChatMessage = {
  id: string;
  senderId: string;
  /** display name resolved lazily from `profiles`; empty until resolved */
  displayName: string;
  body: string;
  createdAt: Date;
  isOwn: boolean;
};

export type LiveViewer = { userId: string; displayName: string; role: "viewer" | "moderator" | "host" };

/**
 * Server-computed aggregates for a live. `peak_viewers` is deliberately absent:
 * the server stores no viewer history, so the peak is observed client-side by
 * the host while streaming rather than invented here.
 */
export type LiveMetrics = {
  current_viewers: number;
  unique_viewers: number;
  likes: number;
  messages: number;
  gifts: number;
  points: number;
};

export type LiveConnectionKind =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended"
  | "disconnected";

export type ModerationIntent =
  | { action: "mute_chat" | "remove_from_live" | "block_from_live"; targetId: string; targetName: string };

export type LiveReactionKind = "heart" | "fire" | "smile" | "clap" | "kiss";

export const LIVE_REACTIONS: { kind: LiveReactionKind; emoji: string; label: string }[] = [
  { kind: "heart", emoji: "❤️", label: "Coração" },
  { kind: "fire", emoji: "🔥", label: "Fogo" },
  { kind: "smile", emoji: "😍", label: "Amor" },
  { kind: "clap", emoji: "👏", label: "Palmas" },
  { kind: "kiss", emoji: "😘", label: "Beijo" },
];

export const REACTION_EMOJI: Record<LiveReactionKind, string> = {
  heart: "❤️",
  fire: "🔥",
  smile: "😍",
  clap: "👏",
  kiss: "😘",
};

/** Live favourites/reactions actually persisted through `live_interactions`. */
export type LiveFloatingReaction = {
  key: number;
  emoji: string;
  /** percentage offsets from the left edge of the stage */
  leftPct: number;
  scale: number;
  driftPx: number;
};
