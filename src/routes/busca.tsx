import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, MapPin, Search as SearchIcon, Star, X, LocateFixed } from "lucide-react";
import { getRealtimeClient, getSession, rest, signedUrl } from "@/lib/supabase";
import { MemberNav } from "@/components/member-nav";
import { LIVECAM_CATEGORIES } from "@/lib/livecam";
import {
  DEFAULT_CRITERIA,
  SORT_OPTIONS,
  UF_LIST,
  activeFilters,
  distanceKm,
  filterMembers,
  sortMembers,
  type FilterableMember,
  type SearchCriteria,
  type SortKey,
} from "@/lib/search";

export const Route = createFileRoute("/busca")({ component: Busca });

/** Quantos perfis a busca carrega. Acima disso a grade trava o navegador. */
const RESULT_LIMIT = 200;

type ProfileRow = {
  id: string;
  display_name: string;
  bio: string;
  city: string;
  state: string;
  interests: string[] | null;
  gender?: string;
  ethnicity?: string;
  fetishes?: string[] | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  share_location?: boolean;
  avatar_path: string | null;
  created_at: string;
};

/**
 * Busca de membros com filtros por faceta.
 *
 * O esqueleto é o de uma página de busca qualquer: campo largo no topo com
 * sugestões, coluna de filtros à esquerda, coluna de resultados à direita com
 * contador e ordenação, e chips dos filtros que já estão aplicados. Os filtros
 * combinam entre si (AND) e o resultado é sempre o mesmo conjunto de pessoas —
 * muda só a janela, não o dado.
 */
function Busca() {
  const uid = getSession()?.user.id;
  const nav = useNavigate();
  const [members, setMembers] = useState<FilterableMember[]>([]);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const avatarUrlCache = useRef(new Map<string, { url: string; expiresAt: number }>());
  const [criteria, setCriteria] = useState<SearchCriteria>(DEFAULT_CRITERIA);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [people, plans] = await Promise.all([
        rest<ProfileRow[]>(
          "profiles",
          `id=neq.${uid}&select=id,display_name,bio,city,state,interests,gender,ethnicity,fetishes,avatar_path,created_at,location_latitude,location_longitude,share_location&limit=${RESULT_LIMIT}`,
        ),
        rest<Array<{ user_id: string }>>(
          "subscriptions",
          "status=eq.ACTIVE&plan_id=eq.premium&select=user_id",
        ).catch(() => [] as Array<{ user_id: string }>),
      ]);
      const premium = new Set((plans ?? []).map((plan) => plan.user_id));
      setMembers((people ?? []).map((person) => ({ ...person, premium: premium.has(person.id) })));
      const signed = await Promise.allSettled(
        (people ?? [])
          .filter((person) => person.avatar_path)
          .map(async (person) => {
            const avatarPath = person.avatar_path as string;
            const cached = avatarUrlCache.current.get(avatarPath);
            const url = cached && cached.expiresAt > Date.now()
              ? cached.url
              : await signedUrl(avatarPath).catch(() => "");
            if (url) avatarUrlCache.current.set(avatarPath, { url, expiresAt: Date.now() + 50 * 60 * 1000 });
            return [person.id, url] as const;
          }),
      );
      setAvatars(
        Object.fromEntries(
          // flatMap mantém o estreitamento do tipo: só as-urls bem-sucedidas
          // entram no dicionário, e o valor precisa ser uma string não vazia.
          signed.flatMap((item) =>
            item.status === "fulfilled" && item.value[1] ? [item.value] : [],
          ),
        ),
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível carregar os perfis.",
      );
    } finally {
      setReady(true);
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      void nav({ to: "/entrar" });
      return;
    }
    void load();
    const channel = getRealtimeClient().channel("profile-search-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void load())
      .subscribe();
    return () => { void getRealtimeClient().removeChannel(channel); };
  }, [uid, nav, load]);

  const results = useMemo(
    () => sortMembers(filterMembers(members, criteria), criteria.sort),
    [members, criteria],
  );

  const chips = activeFilters(criteria);

  // Sugestões reais: as cidades mais presentes entre quem já está no app, e
  // não uma lista fixa que envelhece.
  const suggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of members) {
      if (!member.city) continue;
      const key = `${member.city.trim()}${member.state ? ` · ${member.state}` : ""}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([city]) => city);
  }, [members]);

  const update = <K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K]) =>
    setCriteria((current) => ({ ...current, [key]: value }));
  const locateMe = () => {
    if (!navigator.geolocation) return setError("Este navegador não permite localização.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      update("originLatitude", Math.round(coords.latitude * 100) / 100);
      update("originLongitude", Math.round(coords.longitude * 100) / 100);
      setLocating(false);
    }, (cause) => { setLocating(false); setError(cause.code === cause.PERMISSION_DENIED ? "Permita localização para buscar perfis próximos." : "Não foi possível obter sua localização."); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  };

  return (
    <main className="member-page search-page">
      <MemberNav current="busca" />
      <div className="member-content">
        <section className="social-title">
          <span className="auth-kicker">BUSCA</span>
          <h1>Encontre pessoas</h1>
          <p>
            Combine os filtros até achar quem interessa. Tudo o que você marcar aqui vira um chip
            logo abaixo, e dá para tirar um por um.
          </p>
        </section>

        <form
          className="search-bar"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("q");
            update("query", String(value ?? ""));
          }}
        >
          <SearchIcon size={18} aria-hidden="true" />
          <input
            name="q"
            type="search"
            value={criteria.query}
            placeholder="Nome, cidade, interesse…"
            aria-label="Buscar por nome, cidade ou interesse"
            onChange={(event) => update("query", event.target.value)}
          />
          <button className="button button-primary" type="submit">
            Buscar
          </button>
        </form>

        {suggestions.length > 0 && (
          <div className="search-suggestions">
            <span>Populares:</span>
            {suggestions.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => update("city", city.split(" · ")[0] ?? city)}
              >
                {city}
              </button>
            ))}
          </div>
        )}

        <div className="search-layout">
          <aside className="search-filters" aria-label="Filtros da busca">
            <fieldset>
              <legend>Categoria</legend>
              <label className="search-radio">
                <input
                  type="radio"
                  name="category"
                  value=""
                  checked={!criteria.category}
                  onChange={() => update("category", "")}
                />
                Todas
              </label>
              {LIVECAM_CATEGORIES.map((category) => (
                <label className="search-radio" key={category.id}>
                  <input
                    type="radio"
                    name="category"
                    value={category.label}
                    checked={criteria.category === category.label}
                    onChange={() => update("category", category.label)}
                  />
                  {category.label}
                </label>
              ))}
            </fieldset>

            <fieldset>
              <legend>Onde</legend>
              <label>
                Proximidade
                <select value={criteria.radiusKm ?? ""} onChange={(event) => update("radiusKm", event.target.value ? Number(event.target.value) : null)}>
                  <option value="">Sem filtro por distância</option>
                  {[5, 10, 25, 50, 100, 250, 500].map((km) => <option key={km} value={km}>Até {km} km</option>)}
                </select>
              </label>
              {criteria.radiusKm != null && <button type="button" className="button button-outline" onClick={locateMe} disabled={locating}><LocateFixed size={15} />{locating ? "Obtendo localização…" : criteria.originLatitude == null ? "Usar minha localização" : "Atualizar minha localização"}</button>}
              <label>
                Estado
                <select
                  value={criteria.state}
                  onChange={(event) => update("state", event.target.value)}
                >
                  <option value="">Todos</option>
                  {UF_LIST.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cidade
                <input
                  type="text"
                  value={criteria.city}
                  placeholder="Qualquer cidade"
                  onChange={(event) => update("city", event.target.value)}
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>Identidade e interesses</legend>
              <label>Gênero<select value={criteria.gender} onChange={(event) => update("gender", event.target.value)}><option value="">Todos</option>{[...new Set(members.map((member) => member.gender).filter((value): value is string => Boolean(value)))].sort().map((gender) => <option key={gender}>{gender}</option>)}</select></label>
              <label>Etnia<select value={criteria.ethnicity} onChange={(event) => update("ethnicity", event.target.value)}><option value="">Todas</option>{[...new Set(members.map((member) => member.ethnicity).filter((value): value is string => Boolean(value)))].sort().map((ethnicity) => <option key={ethnicity}>{ethnicity}</option>)}</select></label>
              <label>Fetiche/interesse<input value={criteria.fetish} onChange={(event) => update("fetish", event.target.value)} placeholder="Ex.: BDSM, roleplay" /></label>
            </fieldset>

            <fieldset>
              <legend>Mais</legend>
              <label className="search-radio">
                <input
                  type="checkbox"
                  checked={criteria.onlyWithPhoto}
                  onChange={(event) => update("onlyWithPhoto", event.target.checked)}
                />
                Só quem tem foto
              </label>
              <label className="search-radio">
                <input
                  type="checkbox"
                  checked={criteria.onlyPremium}
                  onChange={(event) => update("onlyPremium", event.target.checked)}
                />
                Só conta Premium
              </label>
            </fieldset>

            <button
              type="button"
              className="button button-outline search-clear"
              onClick={() => setCriteria(DEFAULT_CRITERIA)}
              disabled={chips.length === 0}
            >
              Limpar filtros
            </button>
          </aside>

          <section className="search-results" aria-label="Resultados">
            <div className="search-results-head">
              <strong>
                {results.length === 0
                  ? "Nenhum perfil encontrado"
                  : `${results.length} ${results.length === 1 ? "perfil encontrado" : "perfis encontrados"}`}
              </strong>
              <label>
                Ordenar
                <select
                  value={criteria.sort}
                  onChange={(event) => update("sort", event.target.value as SortKey)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {chips.length > 0 && (
              <div className="search-chips">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() =>
                      update(
                        chip.key,
                        (typeof DEFAULT_CRITERIA[chip.key] === "boolean"
                          ? false
                          : typeof DEFAULT_CRITERIA[chip.key] === "number" || DEFAULT_CRITERIA[chip.key] === null
                            ? null
                            : "") as SearchCriteria[typeof chip.key],
                      )
                    }
                  >
                    {chip.label}
                    <X size={13} aria-hidden="true" />
                    <span className="sr-only">Remover filtro</span>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="social-message" role="alert">
                {error}
              </p>
            )}

            {!ready && (
              <p className="search-empty">
                <LoaderCircle className="spin" size={18} /> Carregando os perfis…
              </p>
            )}

            {ready && !results.length && (
              <div className="search-empty">
                <SearchIcon size={22} />
                <p>
                  Nada bateu com esses filtros. Tente afrouxar um deles — começar pela categoria ou
                  pelo estado costuma resolver.
                </p>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setCriteria(DEFAULT_CRITERIA)}
                >
                  Limpar filtros
                </button>
              </div>
            )}

            {results.length > 0 && (
              <ul className="search-grid">
                {results.map((member) => {
                  const distance = criteria.originLatitude != null && criteria.originLongitude != null && member.share_location && member.location_latitude != null && member.location_longitude != null
                    ? distanceKm(criteria.originLatitude, criteria.originLongitude, member.location_latitude, member.location_longitude)
                    : null;
                  return (
                  <li key={member.id}>
                    <a href={`/perfil-publico?usuario=${encodeURIComponent(member.id)}`}>
                      <span className="search-grid-avatar">
                        {avatars[member.id] ? (
                          <img src={avatars[member.id]} alt="" loading="lazy" decoding="async" />
                        ) : (
                          (member.display_name || "S").slice(0, 1).toUpperCase()
                        )}
                      </span>
                      <b>
                        {member.display_name || "Membro"}
                        {member.premium && (
                          <Star size={13} className="livecam-star" fill="currentColor" />
                        )}
                      </b>
                      <small>
                        <MapPin size={12} />{" "}
                        {[member.city, member.state].filter(Boolean).join(", ") || "Localização não informada"}
                      </small>
                      {distance != null && <small className="search-distance">Aproximadamente {Math.round(distance)} km de você</small>}
                      <p>{member.bio || "Este perfil ainda não adicionou uma bio."}</p>
                      {member.interests?.length ? (
                        <span className="search-grid-tags">
                          {member.interests.slice(0, 4).map((tag) => (
                            <em key={tag}>{tag}</em>
                          ))}
                        </span>
                      ) : null}
                    </a>
                  </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
