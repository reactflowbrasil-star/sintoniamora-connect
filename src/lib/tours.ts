import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export type TourStepId = string;
export type TourId = string;
export type TourPosition = "top" | "bottom" | "left" | "right" | "auto";
export type TourAnchorLayout = "tooltip" | "modal" | "bottomSheet";

export interface TourStep {
  id: string;
  label: string;
  description: string;
  target: string;
  /** Open a menu/dropdown/accordion/tabs before spotlight, if present */
  attach?: {
    toggle: string;
  };
  position?: TourPosition;
  mobileLayout?: TourAnchorLayout;
}

export interface TourDef {
  id: TourId;
  title: string;
  description: string;
  steps: TourStep[];
  /** Destination route context for anchor hints. */
  route?: string;
  anchor?: TourPosition;
  bottomSheetOnMobile?: boolean;
  once?: boolean;
  stepAutoFocus?: boolean;
}

export const DEFAULT_ONBOARDING: Record<TourId, false> = {
  global: false,
  dashboard: false,
  feed: false,
  profile: false,
  explore: false,
  mensagens: false,
  notificacoes: false,
  planos: false,
  lives: false,
  seguranca: false,
};

export const TOUR_CATALOG: Record<TourId, TourDef> = {
  global: {
    id: "global",
    title: "Bem-vindo ao Sintoniamora",
    description:
      "Vamos fazer um tour rápido para você conhecer os principais recursos da plataforma. Leva menos de 1 minuto.",
    steps: [
      {
        id: "dashboard",
        label: "Dashboard",
        description:
          "Aqui você vê um resumo da conta: perfil, conexões, atividade recente e lives da comunidade.",
        target: '[data-tour="dashboard"]',
        anchor: "bottom",
      },
      {
        id: "profile",
        label: "Perfil",
        description:
          "Seu perfil, suas escolhas. Edite informações, fotos, capa e configure privacidade.",
        target: '[data-tour="profile"]',
        anchor: "bottom",
      },
      {
        id: "feed",
        label: "Comunidade",
        description:
          "O feed mostra publicações da comunidade. Interaja, comente e siga quem faz sentido para você.",
        target: '[data-tour="feed"]',
        anchor: "bottom",
      },
      {
        id: "explorar",
        label: "Explorar",
        description:
          "Descubra mais perfis por cidade e interesse — e comece a conectar com as pessoas certas.",
        target: '[data-tour="explorar"]',
        anchor: "bottom",
      },
      {
        id: "mensagens",
        label: "Mensagens",
        description:
          "Converse com outras pessoas de forma privada. Vamos te mostrar como funciona.",
        target: '[data-tour="mensagens"]',
        anchor: "bottom",
      },
      {
        id: "notificacoes",
        label: "Notificações",
        description:
          "Vamos mostrar como receber e organizar notificações das interações da comunidade.",
        target: '[data-tour="notificacoes"]',
        anchor: "bottom",
      },
      {
        id: "planos",
        label: "Planos",
        description:
          "Comece grátis e avalie quando tornar a experiência ainda melhor.",
        target: '[data-tour="planos"]',
        anchor: "bottom",
      },
    ],
    anchor: "bottom",
  },
  dashboard: {
    id: "dashboard",
    title: "Visão geral da conta",
    description:
      "Um resumo rápido do que você tem pronto na conta agora.",
    steps: [
      {
        id: "resume",
        label: "Seu resumo",
        description:
          "O dashboard mostra perfil, conexões, mídia e atividade recente.",
        target: '[data-tour="dashboard"]',
        anchor: "bottom",
      },
    ],
    once: true,
  },
  feed: {
    id: "feed",
    title: "Comunidade",
    description:
      "Quer conhecer rapidamente os recursos disponíveis aqui?",
    steps: [
      {
        id: "post",
        label: "Publicações",
        description:
          "Veja o que a comunidade está compartilhando. Comente, reaja e siga.",
        target: '[data-tour="feed"]',
        anchor: "bottom",
        attach: { toggle: "[data-tour=post-composer]" },
      },
    ],
  },
  profile: {
    id: "profile",
    title: "Seu perfil",
    description:
      "Conheça rapidamente os recursos do perfil antes de começar a publicar.",
    steps: [
      {
        id: "identity",
        label: "Identidade",
        description:
          "Nome, bio, foto e capa são o que a comunidade vê sobre você.",
        target: '[data-tour="profile-identity"]',
        anchor: "bottom",
      },
      {
        id: "media",
        label: "Fotos e vídeos",
        description:
          "Ande pelas mídias do perfil. Fotos e vídeos aparecem para quem visita você.",
        target: '[data-tour="profile-media"]',
        anchor: "bottom",
      },
    ],
  },
  explore: {
    id: "explore",
    title: "Explorar pessoas",
    description:
      "Quer conhecer rapidamente como funciona a busca?",
    steps: [
      {
        id: "search",
        label: "Busca",
        description:
          "Filtre por cidade, interesse ou perfil e explore quem combina com você.",
        target: '[data-tour="search"]',
        anchor: "bottom",
      },
    ],
  },
  mensagens: {
    id: "mensagens",
    title: "Mensagens",
    description:
      "Quer conhecer rapidamente os recursos do chat?",
    steps: [
      {
        id: "conversations",
        label: "Conversas",
        description:
          "Aqui ficam suas conversas. Abra qualquer uma e comece a trocar mensagens.",
        target: '[data-tour="mensagens"]',
        anchor: "bottom",
      },
    ],
  },
  notificacoes: {
    id: "notificacoes",
    title: "Notificações",
    description:
      "Quer conhecer rapidamente os recursos das notificações?",
    steps: [
      {
        id: "list",
        label: "Lista de notificações",
        description:
          "Veja novidades sobre interações, mention e atividades relevantes.",
        target: '[data-tour="notificacoes"]',
        anchor: "bottom",
      },
    ],
  },
  planos: {
    id: "planos",
    title: "Planos",
    description:
      "Comece grátis e veja como expandir a experiência quando quiser.",
    steps: [
      {
        id: "free",
        label: "Plano grátis",
        description:
          "O plano grátis já abre a comunidade. Vamos mostrar o essencial.",
        target: '[data-tour="planos"]',
        anchor: "bottom",
      },
    ],
  },
  lives: {
    id: "lives",
    title: "Vídeos e lives",
    description:
      "Quer conhecer rapidamente como funcionam as lives?",
    steps: [
      {
        id: "gallery",
        label: "Galeria de vídeos",
        description:
          "Vídeos e lives ajudam a sentir mais a conexão antes, durante e depois do encontro.",
        target: '[data-tour="lives"]',
        anchor: "bottom",
      },
    ],
  },
  seguranca: {
    id: "seguranca",
    title: "Privacidade e segurança",
    description:
      "Conheça rapidamente as ferramentas de privacidade.",
    steps: [
      {
        id: "security",
        label: "Privacidade e segurança",
        description:
          "Aqui você ajusta quem vê seu perfil, bloqueia e denuncia comportamentos.",
        target: '[data-tour="seguranca"]',
        anchor: "bottom",
      },
    ],
  },
};

export type OnboardingStatus = {
  global?: boolean;
  dashboard?: boolean;
  feed?: boolean;
  profile?: boolean;
  explore?: boolean;
  mensagens?: boolean;
  notificacoes?: boolean;
  planos?: boolean;
  lives?: boolean;
  seguranca?: boolean;
};

export function isTourDone(status: OnboardingStatus, id: TourId): boolean {
  return !!status[id];
}

export function setTourDone(
  status: OnboardingStatus,
  id: TourId,
  done: boolean,
): OnboardingStatus {
  return { ...status, [id]: done };
}

export function onboardingSummary(status: OnboardingStatus): {
  total: number;
  done: number;
  pending: number;
  order: TourId[];
} {
  const order: TourId[] = ["global", "dashboard", "profile", "feed", "explore", "mensagens", "notificacoes", "planos", "lives", "seguranca"];
  let done = 0;
  let pending = 0;
  for (const id of order) {
    if (isTourDone(status, id)) done++;
    else pending++;
  }
  return { total: order.length, done, pending, order };
}
