// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const sexflowSubpath = {
  name: "sexflow-subpath-native-links",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    const normalizedId = id.replaceAll("\\", "/");
    if (!normalizedId.includes("/src/") || !/\.tsx?(?:\?.*)?$/.test(normalizedId)) return null;

    const rewritten = code
      .replace(
      /(\b(?:href|src)\s*=\s*["'])\/(?!\/|sexflow\/)/g,
      "$1/sexflow/",
      )
      .replace(
        /(\b(?:href|src)\s*=\s*\{(?!withBase\()[^}\n]*?["'`])\/(?!\/|sexflow\/)/g,
        "$1/sexflow/",
      );
    return rewritten === code ? null : { code: rewritten, map: null };
  },
};

export default defineConfig({
  vite: {
    // This app is hosted below the domain root on DirectAdmin.
    base: "/sexflow/",
    plugins: [sexflowSubpath],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
