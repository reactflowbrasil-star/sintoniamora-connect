const http = require("node:http");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");
const { pathToFileURL } = require("node:url");

const root = __dirname;
const publicRoot = path.join(root, ".output", "public");
const prefix = "/sexflow";
const mediaRoot = path.join(os.homedir(), ".sexflow-private-media");
const mediaTempRoot = path.join(os.tmpdir(), "sexflow-media-processing");
const mediaSigningKeyPath = path.join(os.homedir(), ".sexflow-media-signing-key");
let mediaSigningKey;
const supabaseUrl = "https://jquujdxypjylvghyuqco.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxdXVqZHh5cGp5bHZnaHl1cWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjQ2NzcsImV4cCI6MjEwNjQ0MDY3N30.sxe7seiHqaI36zqb90yhA_43Gk3i9A8rG6UgvdnBbOc";
const mediaBuckets = new Set(["profile-media", "post-media", "message-media"]);
const mediaTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime", "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/aac"]);
const maxMediaBytes = 100 * 1024 * 1024;
const types = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(payload));
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = process.env.FFMPEG_PATH || path.join(root, ".output", "server", "bin", "ffmpeg");
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let errorOutput = "";
    proc.stderr.on("data", (chunk) => { errorOutput = (errorOutput + chunk.toString()).slice(-5000); });
    proc.once("error", reject);
    proc.once("close", (code) => code === 0 ? resolve() : reject(new Error(errorOutput || "Não foi possível aplicar a marca d'água ao vídeo.")));
  });
}

async function watermarkImage(body, mimeType) {
  const sharp = require(path.join(root, ".output", "server", "node_modules", "sharp"));
  const animated = mimeType === "image/gif";
  const source = sharp(body, animated ? { animated: true } : {});
  const metadata = await source.metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > 80_000_000) throw new Error("Dimensões de imagem não permitidas.");
  const logo = await fs.readFile(path.join(publicRoot, "sintoniamora-logo-horizontal.webp"));
  const resizedLogo = sharp(logo).resize({ width: Math.max(1, Math.round(metadata.width * 0.7)) }).ensureAlpha();
  const logoMetadata = await resizedLogo.metadata();
  const alpha = await resizedLogo.clone().extractChannel("alpha").linear(0.16, 0).raw().toBuffer();
  const logoBuffer = await resizedLogo.removeAlpha().joinChannel(alpha, { raw: { width: logoMetadata.width, height: logoMetadata.height, channels: 1 } }).webp().toBuffer();
  let pipeline = source.rotate().composite([{ input: logoBuffer, gravity: "centre" }]);
  if (animated) pipeline = pipeline.gif({ effort: 5 });
  else pipeline = pipeline.toFormat(mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpeg", { quality: 88 });
  const result = await pipeline.toBuffer();
  if (!result.length || result.length > maxMediaBytes) throw new Error("A imagem processada excedeu o limite permitido.");
  return result;
}

async function watermarkVideo(body, mimeType) {
  const inputExt = mimeType === "video/quicktime" ? ".mov" : mimeType === "video/mp4" ? ".mp4" : ".webm";
  const outputExt = ".mp4";
  await fs.mkdir(mediaTempRoot, { recursive: true, mode: 0o700 });
  const workDir = await fs.mkdtemp(path.join(mediaTempRoot, "upload-"));
  const inputPath = path.join(workDir, `input${inputExt}`);
  const outputPath = path.join(workDir, `watermarked${outputExt}`);
  const logoPath = path.join(publicRoot, "sintoniamora-logo-horizontal.webp");
  try {
    await fs.writeFile(inputPath, body, { mode: 0o600, flag: "wx" });
    const filter = "[1:v][0:v]scale2ref=w=main_w*0.7:h=-1[wm][base];[wm]format=rgba,colorchannelmixer=aa=0.16[watermark];[base][watermark]overlay=(W-w)/2:(H-h)/2:format=auto[outv]";
    const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", inputPath, "-loop", "1", "-i", logoPath, "-filter_complex", filter, "-map", "[outv]", "-map", "0:a?", "-map_metadata", "0", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-c:a", "aac", "-movflags", "+faststart", "-shortest", outputPath];
    await runFfmpeg(args);
    const result = await fs.readFile(outputPath);
    if (!result.length || result.length > maxMediaBytes) throw new Error("O vídeo com marca d'água excedeu o limite permitido.");
    return { body: result, mimeType: outputExt === ".mp4" ? "video/mp4" : "video/webm", ext: outputExt };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

function mediaObjectPath(bucket, objectPath) {
  if (!mediaBuckets.has(bucket) || typeof objectPath !== "string" || objectPath.length > 512) return null;
  const parts = objectPath.split("/");
  if (parts.length < 2 || parts.some((part) => !part || part === "." || part === ".." || !/^[a-zA-Z0-9._-]+$/.test(part))) return null;
  return path.join(mediaRoot, bucket, ...parts);
}

async function readRequestBody(request, limit) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > limit) throw Object.assign(new Error("Arquivo excede o limite permitido."), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total);
}

async function authenticatedUser(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? { id: user.id, token } : null;
}

function validMediaSignature(bucket, objectPath, expires, signature) {
  const expected = crypto.createHmac("sha256", mediaSigningKey).update(`${bucket}\n${objectPath}\n${expires}`).digest("hex");
  const actualBuffer = Buffer.from(signature || "", "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer) && Number(expires) > Date.now();
}

async function canReadMedia(bucket, objectPath, user) {
  const table = bucket === "profile-media" ? "profile_media" : bucket === "post-media" ? "post_media" : "message_media";
  const query = new URLSearchParams({ select: "object_path", object_path: `eq.${objectPath}`, limit: "1" });
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${user.token}` },
  });
  if (!response.ok) return false;
  const rows = await response.json();
  return Array.isArray(rows) && rows.some((row) => row.object_path === objectPath);
}

async function handleMedia(request, response, url) {
  const user = await authenticatedUser(request);
  if (!user) return sendJson(response, 401, { error: "Autenticação necessária." });
  const action = url.pathname.slice(`${prefix}/api/media/`.length);
  const bucket = url.searchParams.get("bucket") || request.headers["x-media-bucket"];
  const objectPath = url.searchParams.get("path") || request.headers["x-media-path"];
  const target = mediaObjectPath(bucket, objectPath);
  if (!target) return sendJson(response, 400, { error: "Caminho de mídia inválido." });

  if (action === "upload" && request.method === "POST") {
    if (objectPath.split("/")[0] !== user.id) return sendJson(response, 403, { error: "Envio permitido apenas para sua própria mídia." });
    const mimeType = String(request.headers["content-type"] || "").split(";")[0].toLowerCase();
    const declaredSize = Number(request.headers["content-length"] || 0);
    const profileType = mimeType.startsWith("image/") ? ["image/jpeg", "image/png", "image/webp"].includes(mimeType) : ["video/mp4", "video/webm"].includes(mimeType);
    const postType = mimeType.startsWith("image/") ? ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType) : ["video/mp4", "video/webm", "video/quicktime"].includes(mimeType);
    const messageType = mimeType.startsWith("image/") ? ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType) : ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/aac"].includes(mimeType);
    const allowedType = bucket === "profile-media" ? profileType : bucket === "post-media" ? postType : messageType;
    const uploadLimit = bucket === "profile-media" ? (mimeType.startsWith("image/") ? 15 : 100) * 1024 * 1024 : bucket === "message-media" ? (mimeType.startsWith("image/") ? 10 : 20) * 1024 * 1024 : (mimeType.startsWith("image/") ? 10 : 50) * 1024 * 1024;
    if (!mediaTypes.has(mimeType) || !allowedType || declaredSize < 1 || declaredSize > uploadLimit) return sendJson(response, 415, { error: "Tipo ou tamanho de arquivo não permitido." });
    try {
      const body = await readRequestBody(request, maxMediaBytes);
      if (body.length !== declaredSize) return sendJson(response, 400, { error: "Envio incompleto." });
      let processedBody = body;
      let processedMime = mimeType;
      let storedObjectPath = objectPath;
      if (mimeType.startsWith("image/")) {
        processedBody = await watermarkImage(body, mimeType);
      } else if (mimeType.startsWith("video/")) {
        const video = await watermarkVideo(body, mimeType);
        processedBody = video.body;
        processedMime = video.mimeType;
        storedObjectPath = objectPath.replace(/\.[a-zA-Z0-9]+$/, video.ext);
      }
      if (processedBody.length > uploadLimit) throw Object.assign(new Error("O arquivo processado excedeu o limite permitido para este tipo de mídia."), { status: 413 });
      const storedTarget = mediaObjectPath(bucket, storedObjectPath);
      if (!storedTarget) return sendJson(response, 400, { error: "Caminho de mídia processado inválido." });
      await fs.mkdir(path.dirname(storedTarget), { recursive: true, mode: 0o700 });
      await fs.writeFile(storedTarget, processedBody, { mode: 0o600, flag: "wx" });
      return sendJson(response, 201, { ok: true, size: processedBody.length, objectPath: storedObjectPath, mimeType: processedMime });
    } catch (error) {
      if (error.code === "EEXIST") return sendJson(response, 409, { error: "Este arquivo já existe." });
      return sendJson(response, error.status || 500, { error: error.message || "Falha ao gravar arquivo." });
    }
  }

  if (action === "sign" && request.method === "POST") {
    if (!(await canReadMedia(bucket, objectPath, user))) return sendJson(response, 404, { error: "Mídia não disponível." });
    try {
      await fs.access(target);
    } catch {
      // Migrate legacy objects on first permitted read, retaining RLS checks above.
      const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
      const legacy = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`, {
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${user.token}` },
      });
      if (!legacy.ok) return sendJson(response, 404, { error: "Arquivo legado indisponível." });
      const body = Buffer.from(await legacy.arrayBuffer());
      if (!body.length || body.length > maxMediaBytes) return sendJson(response, 413, { error: "Arquivo excede o limite permitido." });
      await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await fs.writeFile(target, body, { mode: 0o600, flag: "wx" }).catch((error) => { if (error.code !== "EEXIST") throw error; });
    }
    const expires = Date.now() + 60 * 60 * 1000;
    const signature = crypto.createHmac("sha256", mediaSigningKey).update(`${bucket}\n${objectPath}\n${expires}`).digest("hex");
    return sendJson(response, 200, { signedURL: `${prefix}/api/media/file?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(objectPath)}&expires=${expires}&signature=${signature}` });
  }

  if (action === "delete" && request.method === "DELETE") {
    if (objectPath.split("/")[0] !== user.id) return sendJson(response, 403, { error: "Remoção permitida apenas para sua própria mídia." });
    await fs.unlink(target).catch((error) => { if (error.code !== "ENOENT") throw error; });
    return sendJson(response, 200, { ok: true });
  }

  if (action === "file" && (request.method === "GET" || request.method === "HEAD")) {
    const expires = url.searchParams.get("expires");
    const signature = url.searchParams.get("signature");
    if (!validMediaSignature(bucket, objectPath, expires, signature)) return sendJson(response, 403, { error: "Link expirado ou inválido." });
    const stat = await fs.stat(target).catch(() => null);
    if (!stat?.isFile()) return sendJson(response, 404, { error: "Arquivo não encontrado." });
    const ext = path.extname(objectPath).toLowerCase();
    const contentType = Object.entries({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".aac": "audio/aac" }).find(([suffix]) => suffix === ext)?.[1] || "application/octet-stream";
    const range = request.headers.range;
    const headers = { "content-type": contentType, "accept-ranges": "bytes", "cache-control": "private, max-age=300", "content-disposition": "inline" };
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) return sendJson(response, 416, { error: "Intervalo inválido." });
      const start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
      const end = match[2] && match[1] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
      if (start > end || start >= stat.size) return sendJson(response, 416, { error: "Intervalo fora do arquivo." });
      headers["content-range"] = `bytes ${start}-${end}/${stat.size}`;
      headers["content-length"] = end - start + 1;
      response.writeHead(206, headers);
      if (request.method === "HEAD") return response.end();
      return fs.createReadStream(target, { start, end }).pipe(response);
    }
    headers["content-length"] = stat.size;
    response.writeHead(200, headers);
    if (request.method === "HEAD") return response.end();
    return fs.createReadStream(target).pipe(response);
  }
  return sendJson(response, 405, { error: "Método ou operação não permitido." });
}

async function start() {
  const publicResolved = path.resolve(publicRoot);
  const mediaResolved = path.resolve(mediaRoot);
  if (mediaResolved === publicResolved || mediaResolved.startsWith(`${publicResolved}${path.sep}`)) throw new Error("Private media directory cannot be under the public document root.");
  try {
    mediaSigningKey = await fs.readFile(mediaSigningKeyPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    mediaSigningKey = crypto.randomBytes(32);
    await fs.writeFile(mediaSigningKeyPath, mediaSigningKey, { mode: 0o600, flag: "wx" }).catch(async (writeError) => {
      if (writeError.code !== "EEXIST") throw writeError;
      mediaSigningKey = await fs.readFile(mediaSigningKeyPath);
    });
  }
  const moduleUrl = pathToFileURL(path.join(root, ".output", "server", "index.mjs")).href;
  const nitroModule = await import(moduleUrl);
  const app = nitroModule.default;
  if (!app || typeof app.fetch !== "function") {
    throw new Error("The built server does not expose a fetch handler.");
  }

  const server = http.createServer(async (incoming, outgoing) => {
    try {
      const originalUrl = new URL(incoming.url || "/", "http://localhost");
      if (originalUrl.pathname === prefix) {
        outgoing.writeHead(308, { location: `${prefix}/${originalUrl.search}` });
        outgoing.end();
        return;
      }
      if (originalUrl.pathname !== prefix && !originalUrl.pathname.startsWith(`${prefix}/`)) {
        outgoing.writeHead(404);
        outgoing.end("Not Found");
        return;
      }

      if (originalUrl.pathname.startsWith(`${prefix}/api/media/`)) {
        await handleMedia(incoming, outgoing, originalUrl);
        return;
      }

      const appPath = originalUrl.pathname;
      if (incoming.method === "GET" || incoming.method === "HEAD") {
        const relative = decodeURIComponent(appPath.slice(prefix.length)).replace(/^\/+/, "");
        const candidate = path.resolve(publicRoot, relative);
        if (candidate.startsWith(`${publicRoot}${path.sep}`)) {
          try {
            const stat = await fs.stat(candidate);
            if (stat.isFile()) {
              outgoing.writeHead(200, {
                "content-length": stat.size,
                "content-type": types[path.extname(candidate).toLowerCase()] || "application/octet-stream",
                "cache-control": "public, max-age=31536000, immutable",
              });
              if (incoming.method === "HEAD") outgoing.end();
              else outgoing.end(await fs.readFile(candidate));
              return;
            }
          } catch (error) {
            if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
          }
        }
      }

      const rewrittenUrl = new URL(originalUrl);
      rewrittenUrl.pathname = appPath;
      const method = incoming.method || "GET";
      const request = new Request(rewrittenUrl, {
        method,
        headers: incoming.headers,
        ...(method === "GET" || method === "HEAD" ? {} : { body: incoming, duplex: "half" }),
      });
      const context = {
        waitUntil(promise) {
          Promise.resolve(promise).catch((error) => console.error(error));
        },
      };
      const response = await app.fetch(request, process.env, context);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error(error);
      if (!outgoing.headersSent) outgoing.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      outgoing.end("Internal Server Error");
    }
  });

  server.listen(Number(process.env.PORT) || 3000, "0.0.0.0");
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
