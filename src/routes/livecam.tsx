import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, LoaderCircle, MapPin, Radio, Sparkles, Star } from "lucide-react";
import { getRealtimeClient, getSession } from "@/lib/supabase";
import {
  ALL_CATEGORIES,
  LIVECAM_CATEGORIES,
  categoryLabel,
  loadLivecamRooms,
  type LivecamCategoryId,
  type LivecamRoom,
} from "@/lib/livecam";
import { MemberNav } from "@/components/member-nav";

export const Route = createFileRoute("/livecam")({ component: Livecam });

/** Quanto tempo uma sala pode ficar em direto sem nenhum card novo aparecer. */
const REFRESH_MS = 20_000;

/**
 * Livecam: grade de salas em direto com filtro por categoria.
 *
 * O card é o da imagem de referência — imagem da pessoa, espectadores no canto,
 * selo de destaque, nome com estrela de conta premium, categoria e cidade. A
 * diferença é que nada aqui é figurado: o diretório vem de `live_sessions`
 * (com a mesma checagem de heartbeat de `/live`, então sala abandonada não
 * aparece) e o número de espectadores só é exibido quando o banco tem a RPC de
 * métricas. Sem ela, o selo AO VIVO continua e o contador fica de fora.
 */
function Livecam() {
  const uid = getSession()?.user.id;
  const nav = useNavigate();
  const [rooms, setRooms] = useState<LivecamRoom[]>([]);
  const [category, setCategory] = useState<LivecamCategoryId | "todas">("todas");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const next = await loadLivecamRooms();
      setRooms(next);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível carregar as salas ao vivo.",
      );
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!uid) {
      void nav({ to: "/entrar" });
      return;
    }
    void load();
  }, [uid, nav, load]);

  useEffect(() => {
    if (!uid) return;
    // Uma sala que começa ou termina precisa aparecer (ou sumir) sem recarregar.
    const channel = getRealtimeClient()
      .channel(`livecam:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions" }, () => void load())
      .subscribe();
    const refresh = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      window.clearInterval(refresh);
      void getRealtimeClient().removeChannel(channel);
    };
  }, [uid, load]);

  const visible = useMemo(
    () => (category === "todas" ? rooms : rooms.filter((room) => room.category === category)),
    [rooms, category],
  );

  const counts = useMemo(() => {
    const map = new Map<LivecamCategoryId, number>();
    for (const room of rooms) map.set(room.category, (map.get(room.category) ?? 0) + 1);
    return map;
  }, [rooms]);

  return (
    <main className="member-page livecam-page">
      <MemberNav current="livecam" />
      <div className="member-content">
        <section className="livecam-hero">
          <div>
            <span className="auth-kicker">LIVECAM</span>
            <h1>Câmeras ao vivo</h1>
            <p>
              {rooms.length
                ? `${rooms.length} ${rooms.length === 1 ? "sala transmitindo" : "salas transmitindo"} agora. Toque em um card para entrar e conversar.`
                : "Nenhuma sala no ar neste momento. Quem quiser transmitir pode abrir a câmera e aparecer aqui."}
            </p>
          </div>
          <a className="button button-primary" href="/live#live-start">
            <Radio size={17} /> Abrir minha câmera
          </a>
        </section>

        <div className="livecam-filters" role="group" aria-label="Categorias de livecam">
          <button
            type="button"
            className={category === "todas" ? "is-active" : ""}
            onClick={() => setCategory("todas")}
          >
            Todas
            {rooms.length > 0 && <em>{rooms.length}</em>}
          </button>
          {ALL_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={category === item.id ? "is-active" : ""}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
              {counts.get(item.id) ? <em>{counts.get(item.id)}</em> : null}
            </button>
          ))}
        </div>

        {error && (
          <p className="social-message" role="alert">
            {error}{" "}
            <button type="button" className="dashboard-inline-link" onClick={() => void load()}>
              Tentar de novo
            </button>
          </p>
        )}

        {!ready && (
          <p className="livecam-empty">
            <LoaderCircle className="spin" size={18} /> Carregando as salas…
          </p>
        )}

        {ready && !visible.length && (
          <div className="livecam-empty">
            <Radio size={22} />
            <p>
              {rooms.length
                ? "Nenhuma sala nesta categoria agora. Escolha outra ou volte em instantes."
                : "Ainda não há transmissão ao vivo. Seja a primeira pessoa a aparecer aqui."}
            </p>
            <a className="button button-outline" href="/live#live-start">
              Iniciar uma transmissão
            </a>
          </div>
        )}

        {visible.length > 0 && (
          <ul className="livecam-grid">
            {visible.map((room) => (
              <li key={room.sessionId}>
                <a href={`/live?session=${encodeURIComponent(room.sessionId)}`}>
                  <span className="livecam-preview">
                    {room.avatarUrl ? (
                      <img src={room.avatarUrl} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className="livecam-preview-fallback">
                        {room.displayName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    {room.hot && (
                      <span className="livecam-hot">
                        <Sparkles size={12} /> destaque
                      </span>
                    )}
                    <span className="livecam-live">
                      <i /> AO VIVO
                    </span>
                    {room.viewers !== null && (
                      <span className="livecam-viewers">
                        <Eye size={13} /> {room.viewers}
                      </span>
                    )}
                  </span>
                  <span className="livecam-meta">
                    <b>
                      {room.premium && (
                        <Star
                          size={13}
                          className="livecam-star"
                          aria-label="Conta premium"
                          fill="currentColor"
                        />
                      )}
                      {room.displayName}
                    </b>
                    <small>{categoryLabel(room.category)}</small>
                    {(room.city || room.state) && (
                      <small className="livecam-place">
                        <MapPin size={12} /> {[room.city, room.state].filter(Boolean).join(", ")}
                      </small>
                    )}
                    <span className="livecam-title">{room.title}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        <section className="livecam-note">
          <h2>Como aparecer na livecam</h2>
          <ul>
            <li>Escolha sua categoria em <a href="/perfil">Meu perfil</a>: é ela que define em qual filtro a sua sala aparece.</li>
            <li>A grade só lista sessões com transmissão realmente ativa — sala abandonada some sozinha.</li>
            <li>
              Todo o ambiente é exclusivo para maiores de 18 anos: vale a regra do banco, não só a da tela.
            </li>
          </ul>
          <p className="livecam-note-categories">
            Categorias reconhecidas: {LIVECAM_CATEGORIES.map((item) => item.label).join(" · ")}.
          </p>
        </section>
      </div>
    </main>
  );
}