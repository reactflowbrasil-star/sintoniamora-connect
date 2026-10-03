// Central tour configuration. Add a tour or step here; no page code needs to change
// beyond exposing a stable `data-tour` attribute or class on the target element.

export type TourPlacement = "auto" | "top" | "bottom" | "left" | "right";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  /** CSS selectors tried in order; the first visible match is highlighted. */
  target: string[];
  position?: TourPlacement;
  /** "sheet" forces the bottom sheet on mobile; "skip" hides the step when the target is not visible. */
  mobileBehavior?: "auto" | "sheet" | "skip";
};

export type TourDefinition = {
  id: string;
  title: string;
  icon: string;
  route: string;
  order: number;
  intro: { title: string; text: string };
  steps: TourStep[];
};

const nav = (key: string) => [`[data-tour="nav-${key}"]`];

export const GLOBAL_TOUR: TourDefinition = {
  id: "global",
  title: "Tour inicial",
  icon: "👋",
  route: "/dashboard",
  order: 0,
  intro: {
    title: "👋 Bem-vindo!",
    text: "Vamos fazer um tour rápido para você conhecer os principais recursos da plataforma. Leva menos de 1 minuto.",
  },
  steps: [
    { id: "dashboard", title: "Seu painel", description: "Aqui você acompanha seu perfil, seguidores, mídias e pontos de lives em um só lugar.", target: [".dashboard-overview", ".dashboard-welcome"] },
    { id: "profile", title: "Meu perfil", description: "Edite suas informações, capa, fotos e vídeos para se apresentar melhor.", target: nav("perfil") },
    { id: "feed", title: "Comunidade", description: "Veja e compartilhe publicações com quem você segue.", target: nav("feed") },
    { id: "search", title: "Explorar", description: "Encontre pessoas por interesse e cidade e siga quem faz sentido para você.", target: nav("explorar") },
    { id: "messages", title: "Mensagens", description: "Converse em particular com outros membros pelo chat.", target: nav("mensagens") },
    { id: "notifications", title: "Notificações", description: "Novos seguidores, curtidas, comentários e mensagens aparecem aqui.", target: nav("notificacoes"), mobileBehavior: "skip" },
    { id: "live", title: "Lives", description: "Assista transmissões da comunidade ou inicie a sua.", target: [".dashboard-live-section"] },
    { id: "plans", title: "Planos", description: "Conheça os recursos do plano Premium.", target: nav("planos"), mobileBehavior: "skip" },
    { id: "help", title: "Ajuda e tutoriais", description: "Reveja qualquer tour quando quiser na central de ajuda.", target: nav("ajuda") },
  ],
};

export const CONTEXTUAL_TOURS: TourDefinition[] = [
  {
    id: "profile", title: "Perfil", icon: "👤", route: "/perfil", order: 1,
    intro: { title: "👤 Conheça seu perfil", text: "Quer conhecer rapidamente os recursos disponíveis aqui?" },
    steps: [
      { id: "cover", title: "Capa do perfil", description: "Envie uma capa e ajuste o enquadramento como preferir.", target: [".profile-cover-editor"] },
      { id: "form", title: "Suas informações", description: "Nome, bio e localização ajudam outras pessoas a se conectarem com você.", target: [".profile-form"] },
      { id: "media", title: "Fotos e vídeos", description: "Adicione e gerencie as mídias que aparecem no seu perfil.", target: [".media-manager"] },
    ],
  },
  {
    id: "feed", title: "Feed", icon: "📰", route: "/feed", order: 2,
    intro: { title: "📰 Conheça o feed", text: "Quer conhecer rapidamente os recursos disponíveis aqui?" },
    steps: [
      { id: "composer", title: "Publicar", description: "Escreva, anexe fotos ou vídeos e escolha quem pode ver.", target: [".post-composer"] },
      { id: "posts", title: "Publicações", description: "Curta e comente as publicações da comunidade.", target: [".post-list", ".social-empty"] },
    ],
  },
  {
    id: "search", title: "Busca", icon: "🔎", route: "/explorar", order: 3,
    intro: { title: "🔎 Conheça a busca", text: "Quer conhecer rapidamente os recursos disponíveis aqui?" },
    steps: [
      { id: "search", title: "Buscar pessoas", description: "Pesquise por nome, cidade ou interesse.", target: [".explore-search"] },
      { id: "people", title: "Perfis", description: "Siga, converse ou veja o perfil completo de cada pessoa.", target: [".people-grid", ".social-empty"] },
    ],
  },
  {
    id: "messages", title: "Mensagens", icon: "💬", route: "/mensagens", order: 4,
    intro: { title: "💬 Conheça suas mensagens", text: "Quer conhecer rapidamente os recursos disponíveis aqui?" },
    steps: [
      { id: "threads", title: "Conversas", description: "Suas conversas ficam listadas aqui, com as mais recentes no topo.", target: [".thread-list", ".social-empty"] },
      { id: "chat", title: "Chat", description: "Leia e responda mensagens em tempo real.", target: [".chat-panel", ".chat-layout"] },
    ],
  },
  {
    id: "notifications", title: "Notificações", icon: "🔔", route: "/notificacoes", order: 5,
    intro: { title: "🔔 Conheça suas notificações", text: "Quer conhecer rapidamente os recursos disponíveis aqui?" },
    steps: [
      { id: "tools", title: "Marcar como lidas", description: "Veja quantas estão pendentes e limpe todas de uma vez.", target: [".notification-tools"] },
      { id: "list", title: "Atividade", description: "Cada interação com você aparece nesta lista.", target: [".notification-list", ".social-empty"] },
    ],
  },
  {
    id: "live", title: "Lives", icon: "📡", route: "/live", order: 6,
    intro: { title: "📡 Conheça as lives", text: "Quer conhecer rapidamente os recursos disponíveis aqui?" },
    steps: [
      { id: "stage", title: "Transmissão", description: "Assista à live selecionada e envie curtidas.", target: [".live-stage"] },
      { id: "chat", title: "Chat ao vivo", description: "Converse com quem está assistindo.", target: [".live-chat"] },
      { id: "directory", title: "Outras lives", description: "Escolha outra transmissão ou inicie a sua.", target: [".live-directory", ".live-sidebar"] },
    ],
  },
  {
    id: "plans", title: "Planos", icon: "👑", route: "/planos", order: 7,
    intro: { title: "👑 Conheça os planos", text: "Quer conhecer rapidamente os recursos disponíveis aqui?" },
    steps: [
      { id: "cards", title: "Compare os planos", description: "Veja o que cada plano inclui e escolha o seu.", target: [".plan-cards"] },
    ],
  },
];

export const ALL_TOURS = [GLOBAL_TOUR, ...CONTEXTUAL_TOURS];
export const getTour = (id: string) => ALL_TOURS.find((t) => t.id === id);
export const tourForPath = (path: string) => CONTEXTUAL_TOURS.find((t) => t.route === path);
