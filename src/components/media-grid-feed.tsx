import { useCallback, useEffect, useState } from "react";
import { Images } from "lucide-react";
import { getSession, rest, signedUrl } from "@/lib/supabase";

type FeedItem = {
  path: string;
  media_type: "photo" | "video";
  ownerId: string;
  ownerName: string;
  avatarUrl: string;
  url: string;
};

type MediaRow = { object_path: string; media_type: "photo" | "video"; user_id: string };

/**
 * Grid of what the community is publishing — photos and videos from every
 * member, not only the viewer's own. Reuses the private bucket: each item is
 * exchanged for a short-lived signed URL, and the component never renders an
 * object the viewer is not entitled to see.
 */
export function MediaGridFeed({ limit = 24 }: { limit?: number }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const rows = await rest<MediaRow[]>(
      "profile_media",
      `select=object_path,media_type,user_id&order=created_at.desc&limit=${limit}`,
    );
    const people = [...new Set((rows ?? []).map((row) => row.user_id))];
    const names = new Map<string, string>();
    const avatars = new Map<string, string>();
    if (people.length) {
      const profiles = await rest<Array<{ id: string; display_name: string; avatar_path: string | null }>>(
        "profiles",
        `id=in.(${people.join(",")})&select=id,display_name,avatar_path`,
      );
      for (const person of profiles ?? []) {
        names.set(person.id, person.display_name || "Membro");
        if (person.avatar_path) {
          avatars.set(person.id, await signedUrl(person.avatar_path).catch(() => ""));
        }
      }
    }
    const resolved = await Promise.all(
      (rows ?? []).map(async (row) => ({
        path: row.object_path,
        media_type: row.media_type,
        ownerId: row.user_id,
        ownerName: names.get(row.user_id) ?? "Membro",
        avatarUrl: avatars.get(row.user_id) ?? "",
        url: await signedUrl(row.object_path).catch(() => ""),
      })),
    );
    setItems(resolved.filter((item) => item.url));
    setReady(true);
  }, [limit]);

  useEffect(() => {
    if (!getSession()) return;
    void load()
      .then(() => setFailed(false))
      .catch(() => {
        setFailed(true);
        setReady(true);
      });
  }, [load]);

  if (!ready) return <p className="media-feed-empty">Carregando as mídias da comunidade…</p>;

  if (failed) {
    return (
      <p className="media-feed-empty">
        Não foi possível carregar as mídias agora. Tente novamente em instantes.
      </p>
    );
  }

  if (!items.length) {
    return (
      <p className="media-feed-empty">
        <Images size={18} /> Ainda não há fotos ou vídeos publicados pela comunidade.
      </p>
    );
  }

  return (
    <ul className="media-grid-feed">
      {items.map((item) => (
        <li key={item.path} className={item.media_type === "video" ? "is-video" : ""}>
          {item.media_type === "video" ? (
            <video src={item.url} muted playsInline preload="metadata" />
          ) : (
            <img src={item.url} alt={`Foto de ${item.ownerName}`} loading="lazy" />
          )}
          <a className="media-feed-caption" href={`/perfil/${item.ownerId}`}>
            {item.avatarUrl && <img src={item.avatarUrl} alt="" />}
            <b>{item.ownerName}</b>
            {item.media_type === "video" && <em>vídeo</em>}
          </a>
        </li>
      ))}
    </ul>
  );
}