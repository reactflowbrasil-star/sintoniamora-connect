import { createClient } from "@supabase/supabase-js";
import TLSSigAPIv2 from "tls-sig-api-v2";

const corsHeaders = (origin: string | null) => {
  const allowed = (
    Deno.env.get("SINTONIAMORA_ALLOWED_ORIGINS") ??
    "https://sintoniamora.netlify.app,https://sintoniamora.lovable.app"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const permitted = origin && allowed.includes(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": permitted,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
};

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });

  try {
    const authorization = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const sdkAppId = Number(Deno.env.get("TENCENT_SDK_APP_ID") ?? "20048927");
    const secretKey = Deno.env.get("TENCENT_SDK_SECRET_KEY");
    if (!authorization || !supabaseUrl || !anonKey)
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    if (!Number.isSafeInteger(sdkAppId) || sdkAppId <= 0 || !secretKey) {
      return Response.json(
        { error: "Tencent RTC ainda não está configurado no servidor." },
        { status: 503, headers: cors },
      );
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return Response.json({ error: "Sessão inválida." }, { status: 401, headers: cors });

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!/^[0-9a-f-]{36}$/i.test(sessionId))
      return Response.json({ error: "Live inválida." }, { status: 400, headers: cors });
    const { data: live, error } = await supabase
      .from("live_sessions")
      .select("id, room_id, host_id, status")
      .eq("id", sessionId)
      .eq("status", "LIVE")
      .maybeSingle();
    if (error || !live)
      return Response.json(
        { error: "Live indisponível ou sem permissão." },
        { status: 404, headers: cors },
      );

    const userId = user.id.replaceAll("-", "");
    const userSig = new TLSSigAPIv2.Api(sdkAppId, secretKey).genSig(userId, 86400);
    return Response.json(
      {
        sdkAppId,
        userId,
        userSig,
        roomId: Number(live.room_id),
        role: live.host_id === user.id ? "anchor" : "audience",
        expiresIn: 86400,
      },
      { headers: { ...cors, "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Tencent RTC token error", error);
    return Response.json(
      { error: "Não foi possível autorizar a conexão com Tencent RTC." },
      { status: 500, headers: cors },
    );
  }
});
