import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Compass,
  Crown,
  Heart,
  ImagePlus,
  LockKeyhole,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import profileMarina from "@/assets/profile-marina.jpg";
import profileRafael from "@/assets/profile-rafael.jpg";
import profileBianca from "@/assets/profile-bianca.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sintoniamora — conexões adultas com sintonia" },
      {
        name: "description",
        content:
          "Uma comunidade brasileira exclusiva para adultos, com privacidade e conexões no seu ritmo.",
      },
      { property: "og:title", content: "Sintoniamora — conexões adultas com sintonia" },
      {
        property: "og:description",
        content: "Uma comunidade 18+ feita para conexões com respeito, privacidade e liberdade.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});
const profiles = [
  { photo: profileMarina, name: "Marina, 28", detail: "Fotografia · trilhas · João Pessoa" },
  { photo: profileRafael, name: "Rafael, 31", detail: "Música · café · João Pessoa" },
  { photo: profileBianca, name: "Bianca, 26", detail: "Arte · viagens · João Pessoa" },
  { photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80", name: "Larissa, 25", detail: "Praia · fitness · João Pessoa" },
  { photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80", name: "Mateus, 30", detail: "Gastronomia · vinhos · João Pessoa" },
  { photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80", name: "Camila, 27", detail: "Moda · design · João Pessoa" },
  { photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80", name: "Bruno, 33", detail: "Esportes · noites · João Pessoa" },
];
const steps = [
  ["01", "Crie seu perfil", "Apresente-se do seu jeito e escolha o que deseja compartilhar."],
  ["02", "Descubra sua sintonia", "Explore pessoas adultas e interesses que combinam com os seus."],
  [
    "03",
    "Converse com respeito",
    "Inicie conversas quando houver interesse e mantenha o controle da sua privacidade.",
  ],
];
function Brand() {
  return (
    <a className="brand" href="#inicio" aria-label="Sintoniamora — início">
      <img src="/sintoniamora-wordmark.webp" alt="Sintoniamora" />
    </a>
  );
}

function Index() {
  const [open, setOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [genderChoice, setGenderChoice] = useState("");

  const handleQuickRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const query = genderChoice ? `?gender=${genderChoice}` : "";
    window.location.href = `/cadastro${query}`;
  };

  useEffect(() => {
    const storageKey = "sintoniamora-intro-seen";
    let alreadySeen = false;
    try {
      alreadySeen = window.sessionStorage.getItem(storageKey) === "true";
      if (!alreadySeen) window.sessionStorage.setItem(storageKey, "true");
    } catch {
      // A introdução ainda é temporizada caso o navegador bloqueie o armazenamento da sessão.
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || alreadySeen) {
      setShowIntro(false);
      return;
    }
    const timer = window.setTimeout(() => setShowIntro(false), 7000);
    const skipIntro = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowIntro(false);
    };
    window.addEventListener("keydown", skipIntro);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", skipIntro);
    };
  }, []);
  const close = () => setOpen(false);
  return (
    <main id="inicio" className="site-shell">
      {showIntro && (
        <div
          className="site-intro"
          role="dialog"
          aria-label="Introdução Sintoniamora"
          aria-modal="true"
        >
          <div className="intro-backdrop intro-bg-one" aria-hidden="true" />
          <div className="intro-backdrop intro-bg-two" aria-hidden="true" />
          <div className="intro-backdrop intro-bg-three" aria-hidden="true" />
          <div className="intro-shade" aria-hidden="true" />
          <div className="intro-brand">
            <img src="https://fredimproducoes.com.br/img/logo.png" alt="Sintoniamora" />
            <span>ENCONTROS REAIS, SEM TABUS</span>
          </div>
          <button className="intro-skip" onClick={() => setShowIntro(false)}>
            Entrar no site <ArrowRight size={16} />
          </button>
        </div>
      )}
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className={open ? "desktop-nav nav-open" : "desktop-nav"} aria-label="Navegação">
            <a onClick={close} href="#como-funciona">
              Como funciona
            </a>
            <a onClick={close} href="#descobrir">
              Descobrir
            </a>
            <a onClick={close} href="#planos">
              Planos
            </a>
            <a onClick={close} href="#privacidade">
              Privacidade
            </a>
          </nav>
          <a className="button button-primary header-cta" href="#planos">
            Conhecer planos <ArrowRight size={16} />
          </a>
          <button
            className="mobile-menu-button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? "×" : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Hero Section matching the requested design */}
      <section className="hero-section">
        <div className="hero-bg hero-bg-one" aria-hidden="true" />
        <div className="hero-bg hero-bg-two" aria-hidden="true" />
        <div className="hero-bg hero-bg-three" aria-hidden="true" />

        <div className="hero-copy">
          <span className="eyebrow">
            <i /> COMUNIDADE BRASILEIRA 18+
          </span>
          <h1 className="hero-lp-heading">
            Conexões adultas.<br />
            <em>Na sua sintonia.</em>
          </h1>
          <p className="hero-copy-desc">
            Um espaço para conhecer pessoas, compartilhar interesses e conversar com liberdade — sempre com respeito, consentimento e privacidade.
          </p>
          <div className="hero-actions">
            <a className="button button-primary button-large" href="/cadastro">
              Criar conta grátis <ArrowRight size={18} />
            </a>
            <a className="button button-outline button-large" href="#como-funciona">
              Como funciona
            </a>
          </div>
          <div className="trust-row">
            <span>
              <ShieldCheck /> Privacidade em primeiro lugar
            </span>
            <span>
              <BadgeCheck /> Exclusivo para maiores de 18
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-glow" />
          <div className="hero-woman-overlay">
            <img
              src="/hero-woman.png"
              alt="Mulher Sintoniamora"
              className="hero-woman-img-side"
            />
          </div>
          <span className="floating-note floating-second">
            <LockKeyhole size={14} /> Você no controle
          </span>
        </div>
      </section>

      <div className="values-strip">
        <span>
          <Heart /> Conexões com intenção
        </span>
        <span>
          <LockKeyhole /> Controle da sua privacidade
        </span>
        <span>
          <Users /> Comunidade para adultos
        </span>
      </div>

      <section id="descobrir" className="section">
        <div className="section-heading">
          <div>
            <small>UM ESPAÇO PARA SER VOCÊ</small>
            <h2>
              Encontros começam
              <br /> por uma boa conversa.
            </h2>
          </div>
          <p>Arraste para o lado ou aguarde a rolagem automática dos perfis.</p>
        </div>
        <div className="profile-preview-carousel" ref={scrollRef}>
          {profiles.map((p, i) => (
            <article className="profile-card" key={p.name + i}>
              <div className="profile-photo">
                <img src={p.photo} alt={"Prévia ilustrativa: " + p.name} loading="lazy" />
                <span>PRÉVIA ILUSTRATIVA</span>
              </div>
              <div className="profile-info">
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.detail}</p>
                </div>
                <b>
                  <Sparkles /> Sintonia
                </b>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="section how-section">
        <div className="section-heading centered">
          <small>SIMPLES E NO SEU TEMPO</small>
          <h2>Do primeiro passo à sua próxima conexão.</h2>
          <p>Uma experiência pensada para você escolher como quer participar.</p>
        </div>
        <div className="steps-grid">
          {steps.map((s, i) => (
            <article className="step-card" key={s[0]}>
              <span className="step-number">{s[0]}</span>
              <div className="step-icon">
                {i === 0 ? <Users /> : i === 1 ? <Compass /> : <MessageCircle />}
              </div>
              <h3>{s[1]}</h3>
              <p>{s[2]}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="privacidade" className="privacy-section">
        <div className="privacy-icon">
          <ShieldCheck />
        </div>
        <div>
          <small>RESPEITO É PARTE DA CONEXÃO</small>
          <h2>Seu perfil, suas escolhas.</h2>
          <p>
            Dados pessoais e de contato não devem aparecer publicamente por padrão. A comunidade
            prevê ferramentas de privacidade, denúncia e bloqueio.
          </p>
        </div>
        <ul>
          <li>
            <Check /> Dados pessoais protegidos
          </li>
          <li>
            <Check /> Denunciar e bloquear
          </li>
          <li>
            <Check /> Comunidade exclusiva 18+
          </li>
        </ul>
      </section>

      <section id="planos" className="section plans-section">
        <div className="section-heading centered">
          <small>VOCÊ ESCOLHE COMO PARTICIPAR</small>
          <h2>
            Comece grátis.
            <br /> Amplie sua experiência.
          </h2>
          <p>Benefícios e limites podem ser ajustados pela administração.</p>
        </div>
        <div className="plans-grid">
          <article className="plan-card">
            <div className="plan-heading">
              <div>
                <small>PARA COMEÇAR</small>
                <h3>Sintoniamora Free</h3>
              </div>
              <Heart />
            </div>
            <div className="price">
              R$ 0 <span>/ sempre</span>
            </div>
            <p>Conheça a comunidade e monte seu perfil no seu ritmo.</p>
            <ul>
              <li>
                <Check /> Perfil e bio
              </li>
              <li>
                <Check /> Explorar e feed
              </li>
              <li>
                <Check /> Interações básicas
              </li>
              <li>
                <ImagePlus /> Até 5 fotos
              </li>
              <li>
                <Video /> Até 2 vídeos
              </li>
            </ul>
            <a className="button button-outline plan-button" href="/cadastro">
              Criar conta grátis <ArrowRight />
            </a>
          </article>
          <article className="plan-card premium">
            <div className="plan-heading">
              <div>
                <small>MAIS POSSIBILIDADES</small>
                <h3>Sintoniamora Premium</h3>
              </div>
              <Crown />
            </div>
            <div className="price">
              R$ 49,90 <span>/ mês</span>
            </div>
            <p>Mais recursos para descobrir e interagir com a comunidade.</p>
            <ul>
              <li>
                <Check /> Tudo do plano Free
              </li>
              <li>
                <Check /> Filtros avançados
              </li>
              <li>
                <Check /> Mais recursos de descoberta
              </li>
              <li>
                <ImagePlus /> Limites ampliados
              </li>
              <li>
                <Sparkles /> Benefícios configuráveis
              </li>
            </ul>
            <a className="button button-primary plan-button" href="#implementacao">
              Conhecer Premium <ArrowRight />
            </a>
            <small className="billing-note">Preço recorrente previsto: R$ 49,90/mês.</small>
          </article>
        </div>
        <p id="implementacao" className="implementation-note">
          <LockKeyhole /> Cadastro, autenticação e perfil utilizam Supabase após configurar as
          credenciais e aplicar a migração do banco.
        </p>
      </section>

      <section id="telas" className="section screens-section">
        <div className="section-heading">
          <div>
            <small>PRÉVIAS DA PLATAFORMA</small>
            <h2>
              Veja o Sintoniamora
              <br /> por dentro.
            </h2>
          </div>
          <p>
            Explore exemplos visuais de perfil e transmissão. Os dados e imagens são demonstrativos.
          </p>
        </div>
        <div className="screen-cards">
          <a className="screen-card" href="/perfil-feminino">
            <Users />
            <b>Perfil feminino</b>
            <span>Galeria e informações</span>
          </a>
          <a className="screen-card" href="/perfil-masculino">
            <Users />
            <b>Perfil masculino</b>
            <span>Conteúdo e interesses</span>
          </a>
          <a className="screen-card" href="/live">
            <Heart />
            <b>Transmissão ao vivo</b>
            <span>Prévia de interface</span>
          </a>
        </div>
      </section>
      <section className="closing-banner">
        <img src="/sintoniamora-wordmark.webp" alt="Sintoniamora" />
        <h2>
          Uma nova sintonia
          <br />
          <em>começa com respeito.</em>
        </h2>
        <p>Uma comunidade adulta, brasileira e feita para conexões com mais intenção.</p>
        <a className="button button-light button-large" href="/cadastro">
          Criar conta grátis <ArrowRight />
        </a>
        <small>Conteúdo e acesso exclusivos para maiores de 18 anos.</small>
      </section>
      <footer className="site-footer">
        <div className="footer-main">
          <Brand />
          <p>Conexões adultas com respeito, privacidade e sintonia.</p>
          <nav>
            <a href="#como-funciona">Como funciona</a>
            <a href="#planos">Planos</a>
            <a href="#privacidade">Privacidade</a>
            <a href="#inicio">Voltar ao topo ↑</a>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Sintoniamora. Todos os direitos reservados.</span>
          <span>Plataforma exclusiva para maiores de 18 anos.</span>
        </div>
      </footer>
      <nav className="mobile-bottom-nav" aria-label="Navegação rápida">
        <a href="#inicio">
          <Heart />
          <span>Início</span>
        </a>
        <a href="#descobrir">
          <Compass />
          <span>Descobrir</span>
        </a>
        <a href="#planos">
          <Crown />
          <span>Planos</span>
        </a>
        <a href="#privacidade">
          <ShieldCheck />
          <span>Privacidade</span>
        </a>
        <a href="/cadastro">
          <Users />
          <span>Participar</span>
        </a>
      </nav>
    </main>
  );
}
