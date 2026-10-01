import { createFileRoute } from "@tanstack/react-router";

import profileMarina from "@/assets/profile-marina.jpg";
import profileRafael from "@/assets/profile-rafael.jpg";
import profileBianca from "@/assets/profile-bianca.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sintoniamora — Encontre quem está na sua frequência" },
      {
        name: "description",
        content:
          "Sintoniamora conecta pessoas que vibram no mesmo tom. Descubra perfis reais, converse com intenção e deixe a química fazer o resto.",
      },
      { property: "og:title", content: "Sintoniamora — Encontre quem está na sua frequência" },
      {
        property: "og:description",
        content:
          "O app de relacionamento para quem busca sintonia de verdade. Perfis com intenção, match por compatibilidade e conversas com propósito.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const profiles = [
  {
    photo: profileMarina,
    name: "Marina, 28",
    detail: "Fotógrafa · 2 km · adora trilhas",
    match: "92%",
  },
  {
    photo: profileRafael,
    name: "Rafael, 31",
    detail: "Músico · 5 km · café e vinil",
    match: "88%",
  },
  {
    photo: profileBianca,
    name: "Bianca, 26",
    detail: "Designer · 4 km · yoga e arte",
    match: "85%",
  },
];

const features = [
  {
    number: "1",
    gradient: "from-primary to-accent",
    title: "Perfil com intenção",
    text: "Conte sua história, seus rituais e o que busca. Menos superficial, mais verdadeiro.",
  },
  {
    number: "2",
    gradient: "from-accent to-rose-400",
    title: "Match por sintonia",
    text: "Nosso algoritmo alinha valores e interesses, não só aparência.",
  },
  {
    number: "3",
    gradient: "from-sky-400 to-primary",
    title: "Conversas com propósito",
    text: "Perguntas guiadas e icebreakers para a conversa nunca travar.",
  },
];

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#EDE7FF] via-[#FCE7F3] to-[#E0F2FE] text-foreground">
      {/* ambient light orbs */}
      <div className="absolute -top-24 -left-24 size-[420px] rounded-full bg-primary/40 blur-[120px] animate-[floaty_9s_ease-in-out_infinite]" />
      <div className="absolute top-40 -right-[120px] size-[460px] rounded-full bg-accent/40 blur-[130px] animate-[floaty2_11s_ease-in-out_infinite]" />
      <div className="absolute -bottom-[140px] left-1/3 size-[400px] rounded-full bg-sky-400/40 blur-[120px] animate-[floaty_9s_ease-in-out_infinite]" />

      {/* NAV */}
      <header className="relative z-20 mx-auto max-w-6xl px-6 pt-6">
        <div className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/40 px-6 py-4 shadow-[0_8px_30px_rgba(124,58,237,0.12)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-lg font-bold text-white">
              S
            </span>
            <span className="font-display text-xl font-bold tracking-tight">Sintoniamora</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-foreground/70 md:flex">
            <a href="#descobrir" className="transition-colors hover:text-primary">
              Descobrir
            </a>
            <a href="#como-funciona" className="transition-colors hover:text-primary">
              Como funciona
            </a>
            <a href="#historias" className="transition-colors hover:text-primary">
              Histórias
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="hidden text-sm font-medium text-foreground/70 transition-colors hover:text-primary sm:block"
            >
              Entrar
            </a>
            <a
              href="#"
              className="rounded-full bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30"
            >
              Criar perfil
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-primary backdrop-blur-md">
            <span className="size-2 rounded-full bg-accent" /> Conexões com alma
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Encontre quem está na sua <span className="italic text-primary">frequência</span>.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-foreground/70">
            Sintoniamora conecta pessoas que vibram no mesmo tom. Descubra perfis reais, converse
            com intenção e deixe a química fazer o resto.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#"
              className="rounded-full bg-gradient-to-r from-primary to-accent px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-primary/30"
            >
              Começar grátis
            </a>
            <a
              href="#como-funciona"
              className="rounded-full border border-white/70 bg-white/40 px-7 py-3.5 text-sm font-semibold text-foreground/80 backdrop-blur-md"
            >
              Ver como funciona
            </a>
          </div>
          <div className="mt-10 flex items-center gap-6">
            <div className="flex -space-x-3">
              <div className="size-10 rounded-full bg-gradient-to-br from-primary to-accent ring-2 ring-white/70" />
              <div className="size-10 rounded-full bg-gradient-to-br from-sky-400 to-primary ring-2 ring-white/70" />
              <div className="size-10 rounded-full bg-gradient-to-br from-accent to-rose-400 ring-2 ring-white/70" />
            </div>
            <p className="text-sm text-foreground/60">
              <span className="font-semibold text-foreground">+120 mil</span> encontros já alinhados
            </p>
          </div>
        </div>

        {/* discovery card */}
        <div id="descobrir" className="relative">
          <div className="rounded-3xl border border-white/60 bg-white/40 p-5 shadow-[0_20px_60px_rgba(124,58,237,0.18)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Descoberta de hoje</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                3 compatíveis
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.name}
                  className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 p-3"
                >
                  <img
                    src={profile.photo}
                    alt={profile.name}
                    loading="lazy"
                    width={816}
                    height={816}
                    className="size-14 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{profile.name}</p>
                    <p className="truncate text-xs text-foreground/60">{profile.detail}</p>
                  </div>
                  <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
                    {profile.match}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="como-funciona" className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.number}
              className="rounded-3xl border border-white/60 bg-white/40 p-7 backdrop-blur-xl"
            >
              <div
                className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${feature.gradient} font-display text-xl font-bold text-white`}
              >
                {feature.number}
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/65">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer id="historias" className="relative z-10 mx-auto max-w-6xl px-6 pb-10">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/40 px-6 py-5 text-sm text-foreground/60 backdrop-blur-xl sm:flex-row">
          <span className="font-display font-bold text-foreground">Sintoniamora</span>
          <span>Conexões com sentido. Feito no Brasil.</span>
        </div>
      </footer>
    </div>
  );
}
