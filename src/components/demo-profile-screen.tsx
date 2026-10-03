import { useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  Compass,
  Crown,
  Heart,
  Home,
  Image as ImageIcon,
  Lock,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Play,
  Plus,
  Ruler,
  Search,
  Sparkles,
  Star,
  UserRound,
  Weight,
  X,
  Zap,
} from "lucide-react";

export type DemoProfileData = {
  name: string;
  age: number;
  city: string;
  bio: string;
  avatar: string;
  cover: string;
  gallery: string[];
  interests: string[];
};

type MediaGridItem = {
  id: string;
  type: "photo" | "video";
  url: string;
  duration?: string;
  isLocked?: boolean;
};

export function DemoProfileScreen({ profile }: { profile: DemoProfileData }) {
  const [activeTab, setActiveTab] = useState("Fotos");
  const [subFilter, setSubFilter] = useState("Todas");
  const [liked, setLiked] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaGridItem | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // High quality images matching Mariana's profile grid in Screenshot 2
  const galleryItems: MediaGridItem[] = [
    {
      id: "1",
      type: "photo",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "2",
      type: "photo",
      url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "3",
      type: "video",
      url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
      duration: "00:24",
    },
    {
      id: "4",
      type: "photo",
      url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "5",
      type: "video",
      url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80",
      duration: "01:12",
      isLocked: true,
    },
    {
      id: "6",
      type: "photo",
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "7",
      type: "video",
      url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80",
      duration: "00:48",
      isLocked: true,
    },
    {
      id: "8",
      type: "photo",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "9",
      type: "video",
      url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
      duration: "00:35",
    },
  ];

  const filteredItems = galleryItems.filter((item) => {
    if (subFilter === "Fotos") return item.type === "photo";
    if (subFilter === "Vídeos") return item.type === "video";
    if (subFilter === "Premium") return item.isLocked;
    return true; // "Todas"
  });

  return (
    <main className="profile-screen-container">
      {/* Top Bar Header matching Screenshot 2 */}
      <header className="profile-top-bar">
        <div className="top-bar-left">
          <button className="top-bar-icon-btn" aria-label="Menu">
            <Menu size={22} />
          </button>
          <a href="/" className="top-bar-logo">
            <img src="/sintoniamora-logo-horizontal.webp" alt="sexflow" />
          </a>
        </div>

        <div className="top-bar-right">
          <button className="top-bar-icon-btn" aria-label="Buscar">
            <Search size={20} />
          </button>
          <div className="bell-btn-wrapper">
            <button className="top-bar-icon-btn" aria-label="Notificações">
              <Bell size={20} />
            </button>
            <span className="bell-badge">3</span>
          </div>
          <div className="user-avatar-dropdown">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Seu Perfil"
            />
            <ChevronDown size={14} />
          </div>
        </div>
      </header>

      {/* Main Profile Cover & Hero Card */}
      <section className="profile-hero-card">
        <div className="profile-cover-box">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop&q=80"
            alt="Capa do perfil"
            className="cover-img"
          />
          <div className="cover-gradient" />
        </div>

        <div className="profile-details-wrapper">
          {/* Avatar and Identity Line */}
          <div className="profile-identity-row">
            <div className="avatar-ring-container">
              <img
                src={profile.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"}
                alt={profile.name}
                className="profile-avatar-img"
              />
              <span className="online-green-badge" title="Online agora" />
            </div>

            <div className="profile-title-block">
              <div className="name-verified-row">
                <h1>{profile.name || "Mariana Silva"}</h1>
                <CheckCircle2 size={20} className="verified-pink-check" />
              </div>
              <div className="meta-subline">
                <span>🎯 {profile.age || 29} anos</span>
                <span className="dot-sep">•</span>
                <span>📍 {profile.city || "João Pessoa/PB"}</span>
              </div>
              <div className="online-status-line">
                <span className="green-dot" />
                <span>Online agora</span>
              </div>
            </div>

            <div className="profile-action-btns">
              <button className="chat-primary-btn">
                <MessageCircle size={17} />
                <span>Conversar</span>
              </button>
              <button
                className={`icon-round-btn ${liked ? "is-liked" : ""}`}
                onClick={() => setLiked(!liked)}
                aria-label="Favoritar"
              >
                <Heart size={18} fill={liked ? "currentColor" : "none"} />
              </button>
              <button className="icon-round-btn" aria-label="Mais opções">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>

          {/* Bio text */}
          <div className="profile-bio-text">
            <p>
              Carioca de coração, espontânea, discreta e cheia de desejos para viver novas experiências. ⚓
            </p>
            <p>Aqui é tudo real e sem tabus. ✨</p>
          </div>

          {/* Quick Info Badges Row */}
          <div className="attributes-grid">
            <div className="attr-card">
              <Heart size={18} className="attr-icon-pink" />
              <div className="attr-text">
                <b>Solteira</b>
                <small>Estado civil</small>
              </div>
            </div>

            <div className="attr-card">
              <Sparkles size={18} className="attr-icon-pink" />
              <div className="attr-text">
                <b>Heterossexual</b>
                <small>Orientação</small>
              </div>
            </div>

            <div className="attr-card">
              <Ruler size={18} className="attr-icon-pink" />
              <div className="attr-text">
                <b>1,68 m</b>
                <small>Altura</small>
              </div>
            </div>

            <div className="attr-card">
              <Weight size={18} className="attr-icon-pink" />
              <div className="attr-text">
                <b>58 kg</b>
                <small>Peso</small>
              </div>
            </div>

            <div className="attr-card">
              <Zap size={18} className="attr-icon-pink" />
              <div className="attr-text">
                <b>Corpo Atlético</b>
                <small>Corpo</small>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="profile-nav-tabs">
            {[
              { id: "Fotos", label: "Fotos", icon: ImageIcon },
              { id: "Vídeos", label: "Vídeos", icon: Play },
              { id: "Sobre", label: "Sobre", icon: UserRound },
              { id: "Interesses", label: "Interesses", icon: Heart },
              { id: "Conquistas", label: "Conquistas", icon: Star },
            ].map((t) => {
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  className={`profile-tab-btn ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  <IconComp size={16} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sub-filter Pills */}
          <div className="sub-filters-row">
            <button
              className={`filter-pill ${subFilter === "Todas" ? "active" : ""}`}
              onClick={() => setSubFilter("Todas")}
            >
              Todas (18)
            </button>
            <button
              className={`filter-pill ${subFilter === "Fotos" ? "active" : ""}`}
              onClick={() => setSubFilter("Fotos")}
            >
              Fotos (12)
            </button>
            <button
              className={`filter-pill ${subFilter === "Vídeos" ? "active" : ""}`}
              onClick={() => setSubFilter("Vídeos")}
            >
              <Play size={12} />
              Vídeos (6)
            </button>
            <button
              className={`filter-pill premium-pill ${subFilter === "Premium" ? "active" : ""}`}
              onClick={() => setSubFilter("Premium")}
            >
              <Crown size={13} className="crown-gold" />
              Conteúdo Premium
            </button>
          </div>

          {/* Media Grid */}
          {activeTab === "Fotos" || activeTab === "Vídeos" ? (
            <div className="media-3col-grid">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`media-grid-card ${item.isLocked ? "is-locked" : ""}`}
                  onClick={() => {
                    if (item.isLocked) {
                      setShowSubscriptionModal(true);
                    } else {
                      setSelectedMedia(item);
                    }
                  }}
                >
                  <img src={item.url} alt="Mídia de Mariana" />

                  {item.isLocked ? (
                    <div className="locked-overlay-content">
                      <Lock size={22} className="lock-icon" />
                      <span className="locked-title">Conteúdo Premium</span>
                      <button
                        className="subscribe-now-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSubscriptionModal(true);
                        }}
                      >
                        Assine para ver
                      </button>
                    </div>
                  ) : item.type === "video" ? (
                    <div className="video-play-overlay">
                      <div className="play-circle-icon">
                        <Play size={20} fill="white" color="white" />
                      </div>
                    </div>
                  ) : null}

                  <div className="media-badge-tag">
                    {item.type === "video" ? (
                      <>
                        <Play size={10} fill="white" />
                        <span>Vídeo</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={10} />
                        <span>Foto</span>
                      </>
                    )}
                  </div>

                  {item.duration && (
                    <div className="media-duration-tag">{item.duration}</div>
                  )}
                </div>
              ))}
            </div>
          ) : activeTab === "Sobre" ? (
            <div className="profile-about-panel">
              <h2>Sobre Mariana Silva</h2>
              <p>{profile.bio}</p>
              <ul>
                <li><b>Cidade:</b> João Pessoa/PB</li>
                <li><b>Idade:</b> 29 anos</li>
                <li><b>Status:</b> Solteira</li>
                <li><b>Orientação:</b> Heterossexual</li>
              </ul>
            </div>
          ) : activeTab === "Interesses" ? (
            <div className="interests-pills-panel">
              {(profile.interests || ["Fotografia", "Trilhas", "Música", "Viagens", "Praia", "Gastronomia"]).map(
                (int) => (
                  <span key={int} className="interest-chip">
                    {int}
                  </span>
                )
              )}
            </div>
          ) : (
            <div className="achievements-panel">
              <Star size={32} className="attr-icon-pink" />
              <h3>Conquistas e Selos</h3>
              <p>Membro Verificado • Perfil Popular • Criador em Destaque</p>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox / Media Viewer Modal */}
      {selectedMedia && (
        <div
          className="media-lightbox-overlay"
          onClick={() => setSelectedMedia(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="lightbox-content-box" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setSelectedMedia(null)}>
              <X size={22} />
            </button>
            <img src={selectedMedia.url} alt="Visualização ampliada" />
          </div>
        </div>
      )}

      {/* Premium Subscription Modal */}
      {showSubscriptionModal && (
        <div
          className="media-lightbox-overlay"
          onClick={() => setShowSubscriptionModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="subscription-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setShowSubscriptionModal(false)}>
              <X size={20} />
            </button>
            <Crown size={38} className="crown-gold-modal" />
            <h2>Desbloqueie Conteúdo Premium</h2>
            <p>
              Assine o plano sexflow Premium para ter acesso ilimitado a todas as fotos, vídeos exclusivos e transmissões ao vivo.
            </p>
            <div className="modal-plan-price">R$ 49,90 <span>/mês</span></div>
            <a href="/planos" className="modal-cta-btn">
              Assinar Agora
            </a>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar matching Screenshot 2 */}
      <nav className="fixed-bottom-nav">
        <a href="/feed" className="nav-item">
          <Home size={20} />
          <span>Início</span>
        </a>

        <a href="/explorar" className="nav-item">
          <Compass size={20} />
          <span>Explorar</span>
        </a>

        <a href="/feed#composer" className="nav-item publish-center-btn">
          <div className="plus-pink-circle">
            <Plus size={22} color="white" />
          </div>
          <span>Publicar</span>
        </a>

        <a href="/mensagens" className="nav-item has-badge">
          <div className="nav-icon-wrapper">
            <MessageCircle size={20} />
            <span className="msg-badge">3</span>
          </div>
          <span>Mensagens</span>
        </a>

        <a href="/perfil-feminino" className="nav-item active">
          <UserRound size={20} className="active-pink-icon" />
          <span className="active-pink-text">Meu Perfil</span>
        </a>
      </nav>
    </main>
  );
}

