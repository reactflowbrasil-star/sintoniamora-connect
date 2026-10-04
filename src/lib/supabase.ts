import { createClient } from "@supabase/supabase-js";

const url =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ??
  "https://jquujdxypjylvghyuqco.supabase.co";
const anon =
  (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxdXVqZHh5cGp5bHZnaHl1cWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjQ2NzcsImV4cCI6MjEwNjQ0MDY3N30.sxe7seiHqaI36zqb90yhA_43Gk3i9A8rG6UgvdnBbOc";
const storageKey = "sintoniamora.auth.v1";
let realtimeClient: ReturnType<typeof createClient> | null = null;
export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string; email: string };
};
export function isConfigured() {
  return Boolean(url && anon);
}
/** Supabase client used only for authenticated Realtime channels. Auth remains in our
 * existing session store, and the service role key is never sent to the browser. */
export function getRealtimeClient() {
  if (!url || !anon) throw new Error("Backend não configurado.");
  if (!realtimeClient) {
    realtimeClient = createClient(url, anon, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      accessToken: async () => (await getValidSession())?.access_token ?? anon,
    });
  }
  return realtimeClient;
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
  if (!response.ok) {
    const failure = new Error(
      payload?.msg ||
        payload?.message ||
        payload?.error_description ||
        payload?.error ||
        "Não foi possível concluir a solicitação.",
    );
    // PostgREST puts a stable machine code in `code` (PGRST202 for a missing
    // function, PGRST205 for a missing table) but its `message` wording varies
    // between versions, so callers that need to branch on "object missing"
    // must read this instead of matching on the text.
    if (typeof payload?.code === "string") {
      (failure as Error & { code?: string }).code = payload.code;
    }
    throw failure;
  }
  return payload as T;
}
export async function signUp(input: {
  email: string;
  password: string;
  birthDate: string;
  fullName: string;
  displayName: string;
}) {
  const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/`;
  const signupPath = redirectTo
    ? `/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`
    : "/auth/v1/signup";
  const value = await request<{
    user: Session["user"];
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }>(
    signupPath,
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
export async function resendSignupConfirmation(email: string) {
  const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/`;
  await request(
    "/auth/v1/resend",
    {
      method: "POST",
      body: JSON.stringify({
        type: "signup",
        email: email.trim(),
        ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
      }),
    },
    false,
  );
}
export async function verifySignupOtp(email: string, token: string) {
  const value = await request<Session & { expires_in?: number }>(
    "/auth/v1/verify",
    {
      method: "POST",
      body: JSON.stringify({
        email: email.trim(),
        token: token.replace(/\s/g, ""),
        type: "email",
      }),
    },
    false,
  );
  if (!value.access_token || !value.refresh_token || !value.user?.id || !value.user?.email) {
    throw new Error("O código não pôde ser validado. Solicite um novo e tente novamente.");
  }
  saveSession({ ...value, expires_at: Date.now() / 1000 + (value.expires_in ?? 3600) });
  return value.user;
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

/**
 * Google OAuth hand-off.
 *
 * The Supabase project answers with `response_type=code` (PKCE), not the
 * implicit flow the email confirmation links use, so the hand-off goes through
 * supabase-js: it derives the challenge and stashes the verifier between the
 * redirect and the callback. The endpoint contract for `/auth/v1/token?
 * grant_type=pkce` is not part of the documented surface, so we do not hand-roll it.
 *
 * This client is separate from the Realtime one and from our own session store:
 * it keeps its own key so the PKCE verifier survives the round trip, and the
 * resulting session is copied into `sintoniamora.auth.v1`, which stays the only
 * thing the app reads.
 */
const googleReturnToKey = "sexflow.google-return-to";
const pkceStorageKey = "sexflow.pkce-auth";

let oauthClient: ReturnType<typeof createClient> | null = null;

function getOauthClient() {
  if (!url || !anon) throw new Error("Backend não configurado.");
  if (!oauthClient) {
    oauthClient = createClient(url, anon, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: pkceStorageKey,
      },
    });
  }
  return oauthClient;
}

function rememberGoogleReturnTo(path: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(googleReturnToKey, path);
  } catch {
    /* Private mode: fall back to the default destination. */
  }
}

export function takeGoogleReturnTo(): string {
  if (typeof window === "undefined") return "";
  try {
    const value = window.sessionStorage.getItem(googleReturnToKey) ?? "";
    window.sessionStorage.removeItem(googleReturnToKey);
    return value;
  } catch {
    return "";
  }
}

export async function signInWithGoogle(returnTo: string): Promise<void> {
  if (!url || !anon) {
    throw new Error("Backend não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }
  if (typeof window === "undefined") throw new Error("Login social indisponível neste ambiente.");
  rememberGoogleReturnTo(returnTo);
  const callback = new URL("/entrar", window.location.origin);
  callback.hash = "";
  const { error } = await getOauthClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
  if (error) throw new Error(error.message || "Não foi possível iniciar o login com o Google.");
}

/**
 * Google accounts carry no birth date, so the signup trigger leaves the member
 * without a private profile until they confirm age and terms here.
 */
export async function completeMemberRegistration(input: {
  birthDate: string;
  fullName: string;
  displayName: string;
}) {
  await rpc("complete_member_registration", {
    birth_date: input.birthDate,
    full_name: input.fullName.trim(),
    display_name: input.displayName.trim(),
  });
  await getValidSession();
}

/** True when the member already has the private record required by the 18+ policy. */
export async function hasPrivateProfile(): Promise<boolean> {
  const rows = await rest<Array<{ user_id: string }>>(
    "private_profiles",
    "select=user_id&limit=1",
  );
  return (rows?.length ?? 0) > 0;
}

export type AuthCallbackResult = {
  confirmed: true;
  signedIn: boolean;
};

const callbackParameters = [
  "access_token",
  "refresh_token",
  "expires_at",
  "expires_in",
  "token_type",
  "type",
  "token_hash",
  "code",
  "error",
  "error_code",
  "error_description",
];

function clearAuthCallbackUrl(currentUrl: URL) {
  for (const key of callbackParameters) currentUrl.searchParams.delete(key);
  window.history.replaceState(
    window.history.state,
    "",
    `${currentUrl.pathname}${currentUrl.search}`,
  );
}

function authCallbackError(code: string, description: string) {
  if (code === "otp_expired" || code === "email_not_confirmed") {
    return "Este link expirou ou já foi utilizado. Entre na conta ou solicite um novo código de confirmação.";
  }
  if (code === "access_denied") {
    return "A confirmação do e-mail não foi concluída. Solicite um novo código de confirmação.";
  }
  return (
    description || "Não foi possível confirmar seu e-mail. Solicite um novo código de confirmação."
  );
}

async function loadAuthUser(accessToken: string): Promise<Session["user"]> {
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${accessToken}` },
  });
  const user = await response.json().catch(() => null);
  if (!response.ok || !user?.id || !user?.email) {
    throw new Error("O link não pôde ser validado. Solicite um novo e-mail de confirmação.");
  }
  return { id: user.id, email: user.email };
}

/**
 * Finishes a social login that came back as `?code=` and copies the session into
 * our own store, so the rest of the app keeps reading a single source of truth.
 */
async function completePkceCallback(code: string): Promise<AuthCallbackResult> {
  const { data, error } = await getOauthClient().auth.exchangeCodeForSession(
    `${window.location.origin}/entrar?code=${encodeURIComponent(code)}`,
  );
  if (error || !data.session?.user?.id) {
    // A brand-new social account hits create_sintoniamora_member, which asks for
    // a birth date the Google provider never sends. Until
    // 20261003010000_google_auth.sql is applied the trigger rejects the signup,
    // and Supabase reports it as an opaque "Database error".
    const raw = `${error?.message ?? ""} ${error?.code ?? ""}`;
    if (/saving new user|data de nascimento|maiores de 18 anos|aceitar os termos|terms accepted/i.test(raw)) {
      throw new Error(
        "O banco ainda não aceita contas criadas pelo Google. Aplique supabase/migrations/20261003010000_google_auth.sql no SQL Editor do Supabase.",
      );
    }
    throw new Error(
      error?.message ||
        "Não foi possível concluir o login social. Tente novamente ou entre com e-mail e senha.",
    );
  }
  saveSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: (data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600),
    user: { id: data.session.user.id, email: data.session.user.email ?? "" },
  });
  return { confirmed: true, signedIn: true };
}

/** Consumes Supabase implicit-flow tokens or a token_hash confirmation callback. */
export async function completeAuthCallback(): Promise<AuthCallbackResult | null> {
  if (typeof window === "undefined" || !url || !anon) return null;

  const currentUrl = new URL(window.location.href);
  const query = currentUrl.searchParams;
  const fragment = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
  const errorCode =
    query.get("error_code") ||
    fragment.get("error_code") ||
    query.get("error") ||
    fragment.get("error");
  const errorDescription =
    query.get("error_description") || fragment.get("error_description") || "";
  const tokenHash = query.get("token_hash") || fragment.get("token_hash");
  let accessToken = query.get("access_token") || fragment.get("access_token");
  let refreshToken = query.get("refresh_token") || fragment.get("refresh_token");
  let expiresIn = Number(query.get("expires_in") || fragment.get("expires_in")) || 3600;
  let confirmed = false;

  const hasAuthCallback = Boolean(
    errorCode || tokenHash || accessToken || refreshToken || query.has("code"),
  );
  if (!hasAuthCallback) return null;

  clearAuthCallbackUrl(currentUrl);
  if (errorCode) throw new Error(authCallbackError(errorCode, errorDescription));

  // Login social chega aqui como ?code= (PKCE), sem access_token no fragment.
  // A troca é feita pelo supabase-js, que recuperou o verifier que ele mesmo
  // guardou antes do redirecionamento.
  if (query.has("code") && !accessToken && !tokenHash) {
    return completePkceCallback(query.get("code") ?? "");
  }

  if (tokenHash) {
    const type = query.get("type") || fragment.get("type") || "email";
    if (type !== "email" && type !== "signup") {
      throw new Error("Este link não é uma confirmação de cadastro válida.");
    }
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/verify`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token_hash: tokenHash, type }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        authCallbackError(
          payload?.code || payload?.error_code || "",
          payload?.msg || payload?.message || payload?.error_description || "",
        ),
      );
    }
    accessToken = payload?.access_token;
    refreshToken = payload?.refresh_token;
    expiresIn = Number(payload?.expires_in) || expiresIn;
    confirmed = true;
    if (!accessToken) return { confirmed, signedIn: false };
  }

  if (!accessToken) {
    throw new Error("O link de confirmação está incompleto. Solicite um novo e-mail.");
  }

  const user = await loadAuthUser(accessToken);
  saveSession({
    access_token: accessToken,
    refresh_token: refreshToken || "",
    expires_at: Date.now() / 1000 + expiresIn,
    user,
  });
  return { confirmed: true, signedIn: true };
}

export async function rest<T>(table: string, query: string, init: RequestInit = {}) {
  return request<T>(`/rest/v1/${table}?${query}`, init);
}
export async function rpc<T>(name: string, args: Record<string, unknown> = {}) {
  return request<T>(`/rest/v1/rpc/${encodeURIComponent(name)}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}
export async function invokeFunction<T>(name: string, body: unknown): Promise<T> {
  const session = await getValidSession();
  if (!session) throw new Error("Entre na sua conta para continuar.");
  return request<T>(`/functions/v1/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export async function upload(path: string, file: File, bucket = "profile-media") {
  const session = await getValidSession();
  if (!session) throw new Error("Entre na sua conta para enviar mídia.");
  if (!url || !anon) throw new Error("Backend não configurado.");
  const response = await fetch(
    `${url.replace(/\/$/, "")}/storage/v1/object/${bucket}/${path}`,
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
export async function removeUpload(path: string, bucket = "profile-media") {
  const session = await getValidSession();
  if (!session) throw new Error("Entre na sua conta para remover mídia.");
  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `${url.replace(/\/$/, "")}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: "DELETE",
      headers: { apikey: anon, Authorization: `Bearer ${session.access_token}` },
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(payload?.message || payload?.error || "Não foi possível remover a mídia.");
}
export async function signedUrl(path: string, bucket = "profile-media") {
  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  const data = await request<{ signedURL: string }>(
    `/storage/v1/object/sign/${bucket}/${objectPath}`,
    { method: "POST", body: JSON.stringify({ expiresIn: 3600 }) },
  );
  return data.signedURL.startsWith("http")
    ? data.signedURL
    : `${url?.replace(/\/$/, "")}/storage/v1${data.signedURL}`;
}
