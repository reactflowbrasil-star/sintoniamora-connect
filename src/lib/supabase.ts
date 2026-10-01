const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://jquujdxypjylvghyuqco.supabase.co";
const anon =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxdXVqZHh5cGp5bHZnaHl1cWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjQ2NzcsImV4cCI6MjEwNjQ0MDY3N30.sxe7seiHqaI36zqb90yhA_43Gk3i9A8rG6UgvdnBbOc";
const storageKey = "sintoniamora.auth.v1";
export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string; email: string };
};
export function isConfigured() {
  return Boolean(url && anon);
}
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function saveSession(value: Session | null) {
  if (typeof window === "undefined") return;
  if (value) {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } else {
    localStorage.removeItem(storageKey);
  }
}
export async function getValidSession(): Promise<Session | null> {
  let session = getSession();
  if (!session || !url || !anon) return session;
  if (session.expires_at && session.expires_at > Date.now() / 1000 + 30) return session;
  const response = await fetch(
    `${url.endsWith("/") ? url.slice(0, -1) : url}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    saveSession(null);
    return null;
  }
  session = {
    ...payload,
    user: payload.user,
    expires_at: Date.now() / 1000 + (payload.expires_in ?? 3600),
  } as Session;
  saveSession(session);
  return session;
}
async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  if (!url || !anon)
    throw new Error("Backend não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  const session = authenticated ? await getValidSession() : null;
  const response = await fetch(`${url.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      apikey: anon,
      Authorization: `Bearer ${session?.access_token ?? anon}`,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      payload?.msg ||
        payload?.message ||
        payload?.error_description ||
        payload?.error ||
        "Não foi possível concluir a solicitação.",
    );
  return payload as T;
}
export async function signUp(input: {
  email: string;
  password: string;
  birthDate: string;
  fullName: string;
  displayName: string;
}) {
  const value = await request<{
    user: Session["user"];
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }>(
    "/auth/v1/signup",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        data: {
          birth_date: input.birthDate,
          full_name: input.fullName,
          display_name: input.displayName,
          terms_accepted: true,
        },
      }),
    },
    false,
  );
  if (value.access_token && value.refresh_token)
    saveSession({
      ...value,
      access_token: value.access_token,
      refresh_token: value.refresh_token,
      user: value.user,
      expires_at: Date.now() / 1000 + (value.expires_in ?? 3600),
    });
  return value;
}
export async function signIn(email: string, password: string) {
  const value = await request<Session & { expires_in?: number }>(
    "/auth/v1/token?grant_type=password",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false,
  );
  saveSession({ ...value, expires_at: Date.now() / 1000 + (value.expires_in ?? 3600) });
  return value.user;
}
export function signOut() {
  saveSession(null);
}
export async function rest<T>(table: string, query: string, init: RequestInit = {}) {
  return request<T>(`/rest/v1/${table}?${query}`, init);
}
export async function upload(path: string, file: File) {
  const session = await getValidSession();
  if (!session) throw new Error("Entre na sua conta para enviar mídia.");
  if (!url || !anon) throw new Error("Backend não configurado.");
  const response = await fetch(
    `${url.replace(/\/$/, "")}/storage/v1/object/profile-media/${path}`,
    {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: file,
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(payload?.message || payload?.error || "Upload recusado pelo servidor.");
  return payload;
}
export async function removeUpload(path: string) {
  const session = await getValidSession();
  if (!session) throw new Error("Entre na sua conta para remover mídia.");
  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `${url.replace(/\/$/, "")}/storage/v1/object/profile-media/${objectPath}`,
    {
      method: "DELETE",
      headers: { apikey: anon, Authorization: `Bearer ${session.access_token}` },
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(payload?.message || payload?.error || "Não foi possível remover a mídia.");
}
export async function signedUrl(path: string) {
  const data = await request<{ signedURL: string }>(
    `/storage/v1/object/sign/profile-media/${path}`,
    { method: "POST", body: JSON.stringify({ expiresIn: 3600 }) },
  );
  return data.signedURL.startsWith("http")
    ? data.signedURL
    : `${url?.replace(/\/$/, "")}/storage/v1${data.signedURL}`;
}
