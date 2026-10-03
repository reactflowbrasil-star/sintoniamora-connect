import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import appCss from "../styles.css?url";
import responsiveCss from "../responsive.css?url";
import premiumCss from "../premium.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { completeAuthCallback } from "../lib/supabase";
import { SocialProofToasts } from "../components/social-proof-toasts";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
function ErrorComponent({ error }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Não foi possível carregar a página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um problema. Tente novamente em instantes.
        </p>
        <button
          onClick={() => router.invalidate()}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Sintoniamora — conexões adultas com sintonia" },
      {
        name: "description",
        content:
          "Uma comunidade brasileira exclusiva para adultos, com privacidade e conexões no seu ritmo.",
      },
      { name: "theme-color", content: "#12080c" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", href: "/sintoniamora-icon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/sintoniamora-icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: responsiveCss },
      { rel: "stylesheet", href: premiumCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [authNotice, setAuthNotice] = useState<{ message: string; error: boolean } | null>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => console.warn("Falha ao ativar suporte offline.", error));
  }, []);
  useEffect(() => {
    const removeBadge = () => {
      document.querySelector<HTMLElement>("#lovable-badge")?.style.setProperty("display", "none", "important");
      document.querySelector<HTMLElement>("#lovable-badge-cta")?.style.setProperty("display", "none", "important");
    };
    removeBadge();
    const observer = new MutationObserver(removeBadge);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    void completeAuthCallback()
      .then((result) => {
        if (!result) return;
        setAuthNotice({ message: "E-mail confirmado! Sua conta está pronta.", error: false });
        void router.navigate({ to: result.signedIn ? "/perfil" : "/entrar" });
      })
      .catch((error: unknown) => {
        setAuthNotice({
          message:
            error instanceof Error ? error.message : "Não foi possível confirmar seu e-mail.",
          error: true,
        });
      });
  }, [router]);
  return (
    <QueryClientProvider client={queryClient}>
      {authNotice && (
        <div
          className={`auth-callback-notice${authNotice.error ? " is-error" : ""}`}
          role={authNotice.error ? "alert" : "status"}
        >
          {authNotice.message}
        </div>
      )}
      <div className="aurora-layer" aria-hidden="true" />
      <Outlet />
      <SocialProofToasts />
    </QueryClientProvider>
  );
}
