const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = __dirname;
const publicRoot = path.join(root, ".output", "public");
const prefix = "/sexflow";
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

async function start() {
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
