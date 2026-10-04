import { rest, rpc, signedUrl } from "@/lib/supabase";
import { loadLiveDirectory } from "@/lib/live/directory";

/**
 * Livecam: o diretório de salas em grade, no formato dos sites de câmera ao
 * vivo — filtro por categoria no topo, cartões com imagem, espectadores, nome,
 * categoria e cidade.
 *
 * Tudo sai de dados que já existem: `live_sessions` alimenta o diretório (com a
 * mesma verificação de heartbeat usada em `/dashboard` e `/live`), `profiles`
 * dá nome, avatar, cidade e as categorias da pessoa.
 *
 * **Categoria não é coluna no banco.** `profiles` só tem `interests` (text[]),
 * e `interests` é o único lugar onde a pessoa declara como se apresenta. Por
 * isso a categoria é derivada de lá: o seletor de `/perfil` grava exatamente
 * estes rótulos e a leitura só reconhece estes rótulos. Nada é inventado — sem
 * correspondência, a sala aparece na categoria "Outros".
 */

export type LivecamCategoryId =
  | "mulher"
  | "homem"
  | "casal"
  | "transexual"
  | "cd"
  | "travesti"
  | "outros";

export type LivecamCategory = {
  id: LivecamCategoryId;
  /** Texto exibido no filtro e no cartão. */
  label: string;
  /** Rótulos gravados em `profiles.interests`, comparados sem acento e caixa. */
  tokens: string[];
};

/** Ordem do filtro, seguindo a do modelo: as seis categorias e "Outros" no fim. */
export const LIVECAM_CATEGORIES: LivecamCategory[] = [
  { id: "mulher", label: "Mulher", tokens: ["mulher"] },
  { id: "homem", label: "Homem", tokens: ["homem", "homens"] },
  { id: "casal", label: "Casal", tokens: ["casal", "casais", "casal hetero"] },
  { id: "transexual", label: "Transexual", tokens: ["transexual", "trans"] },
  { id: "cd", label: "Crossdresser (CD)", tokens: ["crossdresser", "cd"] },
  { id: "travesti", label: "Travesti", tokens: ["travesti"] },
];

export const OTHER_CATEGORY: LivecamCategory = {
  id: "outros",
  label: "Outros",
  tokens: [],
};

export const ALL_CATEGORIES: LivecamCategory[] = [...LIVECAM_CATEGORIES, OTHER_CATEGORY];

/** Compara rótulos sem acento e sem caixa: "Travesti" e "travesti" são o mesmo. */
export function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const MATCHERS = new Map<LivecamCategoryId, string[]>(
  LIVECAM_CATEGORIES.map((category) => [category.id, category.tokens.map(normalizeLabel)]),
);

/** Categorias declaradas nos interesses, na ordem do filtro. */
export function categoriesFromInterests(interests: string[] | null | undefined): LivecamCategoryId[] {
  const values = new Set((interests ?? []).map(normalizeLabel));
  if (!values.size) return [];
  return LIVECAM_CATEGORIES.filter((category) =>
    (MATCHERS.get(category.id) ?? []).some((token) => values.has(token)),
  ).map((category) => category.id);
}

/** Rótulos correspondentes, para preencher o seletor de `/perfil`. */
export function interestLabelsFor(categories: LivecamCategoryId[]): string[] {
  return categories.flatMap((id) => {
    const category = LIVECAM_CATEGORIES.find((item) => item.id === id);
    return category ? [category.label] : [];
  });
}

/** Categoria exibida no cartão: a primeira declarada, senão "Outros". */
export function primaryCategory(interests: string[] | null | undefined): LivecamCategoryId {
  return categoriesFromInterests(interests)[0] ?? "outros";
}

export function categoryLabel(id: LivecamCategoryId): string {
  return ALL_CATEGORIES.find((category) => category.id === id)?.label ?? OTHER_CATEGORY.label;
}

export type LivecamRoom = {
  sessionId: string;
  hostId: string;
  title: string;
  displayName: string;
  avatarUrl: string;
  category: LivecamCategoryId;
  city: string;
  state: string;
  /** `null` quando o banco ainda não tem a RPC de métricas. */
  viewers: number | null;
  premium: boolean;
  hot: boolean;
  createdAt: string;
};

type HostProfile = {
  id: string;
  display_name: string;
  avatar_path: string | null;
  city: string;
  state: string;
  interests: string[] | null;
};

/** Quantas salas a grade mostra. */
export const LIVECAM_ROOM_LIMIT = 24;

/**
 * Salas em direto com os dados do cartão.
 *
 * Cada enriquecimento é tolerante a falha por conta própria: sem a RPC de
 * métricas o cartão mostra o selo AO VIVO sem o número de espectadores, e sem
 * avatar assinado ele cai no inicial do nome. Um diretório vazio nunca deve
 * virar erro de tela — o filtro continua utilizável.
 *
 * O diretório é cortado em {@link LIVECAM_ROOM_LIMIT} porque o número de
 * espectadores é uma RPC por sala: a grade é a tela mais consultada e não faz
 * sentido disparar dezenas de chamadas a cada atualização.
 */
export async function loadLivecamRooms(): Promise<LivecamRoom[]> {
  const sessions = (await loadLiveDirectory()).slice(0, LIVECAM_ROOM_LIMIT);
  if (!sessions.length) return [];

  const hostIds = [...new Set(sessions.map((session) => session.host_id))];
  const [profiles, viewers, plans] = await Promise.all([
    rest<HostProfile[]>(
      "profiles",
      `id=in.(${hostIds.join(",")})&select=id,display_name,avatar_path,city,state,interests`,
    ).catch(() => [] as HostProfile[]),
    Promise.all(
      sessions.map((session) =>
        rpc<Array<{ current_viewers: number }>>("live_live_metrics", {
          p_session_id: session.id,
        })
          .then((rows) => Number(rows?.[0]?.current_viewers ?? 0))
          .catch(() => null),
      ),
    ),
    rest<Array<{ user_id: string; plan_id: string }>>(
      "subscriptions",
      `user_id=in.(${hostIds.join(",")})&status=eq.ACTIVE&select=user_id,plan_id`,
    ).catch(() => [] as Array<{ user_id: string; plan_id: string }>),
  ]);

  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const premiumIds = new Set(
    (plans ?? []).filter((plan) => plan.plan_id === "premium").map((plan) => plan.user_id),
  );

  const rooms = await Promise.all(
    sessions.map(async (session, index): Promise<LivecamRoom> => {
      const profile = byId.get(session.host_id);
      return {
        sessionId: session.id,
        hostId: session.host_id,
        title: session.title || "Live agora",
        displayName: profile?.display_name?.trim() || "Membro",
        avatarUrl: profile?.avatar_path
          ? await signedUrl(profile.avatar_path).catch(() => "")
          : "",
        category: primaryCategory(profile?.interests),
        city: profile?.city ?? "",
        state: profile?.state ?? "",
        viewers: viewers[index] ?? null,
        premium: premiumIds.has(session.host_id),
        hot: false,
        createdAt: session.created_at,
      };
    }),
  );

  // "Destaque" acompanha o ranking real de audiência entre as salas com
  // métrica disponível; sem número de espectadores, ninguém é destacado.
  const ranked = rooms
    .filter((room) => room.viewers !== null)
    .sort((a, b) => (b.viewers ?? 0) - (a.viewers ?? 0));
  const topViewers = ranked[0]?.viewers ?? 0;
  return rooms.map((room) => ({
    ...room,
    hot: room.viewers !== null && room.viewers > 0 && room.viewers === topViewers,
  }));
}