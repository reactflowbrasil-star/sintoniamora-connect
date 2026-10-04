/**
 * Busca de membros: os filtros por faceta e a ordenação da grade de
 * `/busca`.
 *
 * Fica separado da rota de propósito — é lógica pura, sem React nem rede, e
 * é o que dá para testar de verdade sem abrir o navegador.
 *
 * Os metadados de identidade são opcionais e a localização é aproximada e
 * compartilhada somente por consentimento explícito.
 */

import { normalizeLabel } from "@/lib/livecam";

export type MemberRow = {
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

export type SearchCriteria = {
  query: string;
  city: string;
  state: string;
  /** Rótulo de categoria vindo de `LIVECAM_CATEGORIES`, ou "" para todas. */
  category: string;
  gender: string;
  ethnicity: string;
  fetish: string;
  radiusKm: number | null;
  originLatitude: number | null;
  originLongitude: number | null;
  onlyWithPhoto: boolean;
  onlyPremium: boolean;
  sort: SortKey;
};

export type SortKey = "recentes" | "nome" | "foto";

export const UF_LIST = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS",
  "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC",
  "SE", "SP", "TO",
];

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recentes", label: "Mais recentes" },
  { key: "nome", label: "Nome (A–Z)" },
  { key: "foto", label: "Com foto primeiro" },
];

export const DEFAULT_CRITERIA: SearchCriteria = {
  query: "",
  city: "",
  state: "",
  category: "",
  gender: "",
  ethnicity: "",
  fetish: "",
  radiusKm: null,
  originLatitude: null,
  originLongitude: null,
  onlyWithPhoto: false,
  onlyPremium: false,
  sort: "recentes",
};

/** Rótulos de `interests` que valem como categoria, na ordem do filtro. */
function categoryTokens(category: string): string[] {
  if (!category) return [];
  return [normalizeLabel(category)];
}

export function matchesQuery(member: MemberRow, query: string): boolean {
  const needle = normalizeLabel(query);
  if (!needle) return true;
  const haystack = [
    member.display_name,
    member.bio,
    member.city,
    member.state,
    ...(member.interests ?? []),
    member.gender ?? "",
    member.ethnicity ?? "",
    ...(member.fetishes ?? []),
  ]
    .map(normalizeLabel)
    .join(" ");
  // Todos os termos precisam aparecer: "casal sao paulo" não pode devolver
  // quem só tem "sao paulo" no nome da cidade.
  return needle.split(/\s+/).every((term) => haystack.includes(term));
}

export function distanceKm(latitude1: number, longitude1: number, latitude2: number, longitude2: number) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = toRadians(latitude2 - latitude1);
  const dLon = toRadians(longitude2 - longitude1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(latitude1)) * Math.cos(toRadians(latitude2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Verdadeiro quando o perfil traz um dos rótulos da categoria escolhida. */
export function matchesCategory(member: MemberRow, category: string): boolean {
  const tokens = categoryTokens(category);
  if (!tokens.length) return true;
  const values = new Set((member.interests ?? []).map(normalizeLabel));
  return tokens.some((token) => values.has(token));
}

export type FilterableMember = MemberRow & { premium?: boolean };

/** Aplica os filtros. A categoria só liga quando `category` está preenchida. */
export function filterMembers(
  members: FilterableMember[],
  criteria: SearchCriteria,
): FilterableMember[] {
  const city = normalizeLabel(criteria.city);
  const state = criteria.state;
  return members.filter((member) => {
    if (!matchesQuery(member, criteria.query)) return false;
    if (state && normalizeLabel(member.state) !== normalizeLabel(state)) return false;
    if (city && !normalizeLabel(member.city).includes(city)) return false;
    if (!matchesCategory(member, criteria.category)) return false;
    if (criteria.gender && normalizeLabel(member.gender ?? "") !== normalizeLabel(criteria.gender)) return false;
    if (criteria.ethnicity && normalizeLabel(member.ethnicity ?? "") !== normalizeLabel(criteria.ethnicity)) return false;
    if (criteria.fetish && !(member.fetishes ?? []).some((item) => normalizeLabel(item).includes(normalizeLabel(criteria.fetish)))) return false;
    if (criteria.radiusKm != null) {
      if (criteria.originLatitude == null || criteria.originLongitude == null || member.share_location !== true || member.location_latitude == null || member.location_longitude == null) return false;
      if (distanceKm(criteria.originLatitude, criteria.originLongitude, member.location_latitude, member.location_longitude) > criteria.radiusKm) return false;
    }
    if (criteria.onlyWithPhoto && !member.avatar_path) return false;
    if (criteria.onlyPremium && !member.premium) return false;
    return true;
  });
}

/** Ordena uma cópia; não mexe no array recebido. */
export function sortMembers(
  members: FilterableMember[],
  sort: SortKey,
): FilterableMember[] {
  const copy = [...members];
  if (sort === "nome") {
    return copy.sort((a, b) =>
      normalizeLabel(a.display_name).localeCompare(normalizeLabel(b.display_name), "pt-BR"),
    );
  }
  if (sort === "foto") {
    return copy.sort(
      (a, b) =>
        Number(Boolean(b.avatar_path)) - Number(Boolean(a.avatar_path)) ||
        normalizeLabel(a.display_name).localeCompare(normalizeLabel(b.display_name), "pt-BR"),
    );
  }
  return copy.sort(
    (a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? ""),
  );
}

/** Chips com os filtros ativos, para mostrar e permitir remover um por vez. */
export function activeFilters(
  criteria: SearchCriteria,
): { key: keyof SearchCriteria; label: string }[] {
  const chips: { key: keyof SearchCriteria; label: string }[] = [];
  if (criteria.query) chips.push({ key: "query", label: `“${criteria.query}”` });
  if (criteria.category) chips.push({ key: "category", label: criteria.category });
  if (criteria.gender) chips.push({ key: "gender", label: `Gênero: ${criteria.gender}` });
  if (criteria.ethnicity) chips.push({ key: "ethnicity", label: `Etnia: ${criteria.ethnicity}` });
  if (criteria.fetish) chips.push({ key: "fetish", label: `Fetiche: ${criteria.fetish}` });
  if (criteria.radiusKm != null) chips.push({ key: "radiusKm", label: `Até ${criteria.radiusKm} km` });
  if (criteria.state) chips.push({ key: "state", label: criteria.state });
  if (criteria.city) chips.push({ key: "city", label: criteria.city });
  if (criteria.onlyWithPhoto) chips.push({ key: "onlyWithPhoto", label: "Com foto" });
  if (criteria.onlyPremium) chips.push({ key: "onlyPremium", label: "Premium" });
  return chips;
}
