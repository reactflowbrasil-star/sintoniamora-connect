import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, type FormEvent } from "react";
import {
  ArrowLeft,
  Camera,
  Crown,
  Eye,
  Flame,
  Gift,
  Heart,
  Mic,
  MicOff,
  MoreHorizontal,
  Send,
  Smile,
  Sparkles,
  Star,
  X,
  Zap,
  CheckCircle2,
  Gem,
  MessageCircle,
  Menu,
  Coins,
  Share2,
  ShieldAlert,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  Check,
  Video,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/live")({ component: LivePreview });

type CommentItem = {
  id: string;
  user: string;
  avatar: string;
  text: string;
  time: string;
  isVip?: boolean;
  isGift?: boolean;
  giftName?: string;
  giftMultiplier?: string;
  isPremiumEvent?: boolean;
};

type FloatingHeart = {
  id: number;
  x: number;
  size: number;
  emoji: string;
};

type GiftItem = {
  id: string;
  name: string;
  coins: number;
  icon: string;
};

export function LivePreview() {
  // Real Camera Streaming State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Live Chat Messages
  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: "1",
      user: "CarlosBR",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      text: "Linda demais! 😍🔥",
      time: "20:14",
      isVip: true,
    },
    {
      id: "2",
      user: "Lucas_JP",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      text: "Vem cá gata! 💕",
      time: "20:15",
    },
    {
      id: "3",
      user: "André Santos",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      text: "enviou um Coração Rosa",
      time: "20:15",
      isGift: true,
      giftName: "Coração Rosa",
      giftMultiplier: "x1",
    },
    {
      id: "4",
      user: "Julia_22",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      text: "Que mulher incrível! 😍",
      time: "20:16",
    },
    {
      id: "5",
      user: "RafaMendes",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      text: "Gostei muito da sua live! 👏",
      time: "20:17",
    },
    {
      id: "6",
      user: "PedroVIP",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
      text: "acabou de se tornar Premium!",
      time: "20:17",
      isPremiumEvent: true,
    },
    {
      id: "7",
      user: "Duda_Love",
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
      text: "Você é perfeita! 💖",
      time: "20:18",
    },
  ]);

  // General State
  const [inputMsg, setInputMsg] = useState("");
  const [likesCount, setLikesCount] = useState(12480);
  const [goalCurrent, setGoalCurrent] = useState(2483);
  const [goalTarget] = useState(5000);
  const [viewers, setViewers] = useState(2483);
  const [userCoins, setUserCoins] = useState(350);
  const [following, setFollowing] = useState(false);
  const [muted, setMuted] = useState(false);

  // Floating Effects
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [giftBanner, setGiftBanner] = useState<{ text: string; icon: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals & Panels
  const [activeModal, setActiveTabModal] = useState<
    "presentes" | "ranking" | "desafios" | "top10" | "dicas" | "mais" | null
  >(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const emojisList = ["💖", "🔥", "😍", "💕", "👑", "👏", "🌹", "✨", "😈", "💋", "💦", "🤤"];

  const giftsList: GiftItem[] = [
    { id: "g1", name: "Coração Rosa", coins: 10, icon: "💖" },
    { id: "g2", name: "Rosa Vermelha", coins: 25, icon: "🌹" },
    { id: "g3", name: "Diamante Raro", coins: 100, icon: "💎" },
    { id: "g4", name: "Coroa de Ouro", coins: 500, icon: "👑" },
    { id: "g5", name: "Foguete VIP", coins: 1000, icon: "🚀" },
  ];

  const top10Supporters = [
    { rank: 1, name: "PedroVIP", points: "4.500 pts", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80" },
    { rank: 2, name: "CarlosBR", points: "3.200 pts", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
    { rank: 3, name: "André Santos", points: "2.800 pts", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
    { rank: 4, name: "Lucas_JP", points: "1.950 pts", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
    { rank: 5, name: "Julia_22", points: "1.400 pts", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
    { rank: 6, name: "RafaMendes", points: "980 pts", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" },
    { rank: 7, name: "Duda_Love", points: "850 pts", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80" },
    { rank: 8, name: "Marcos_V", points: "620 pts", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80" },
    { rank: 9, name: "Fernanda_S", points: "510 pts", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
    { rank: 10, name: "Thiago_JP", points: "430 pts", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80" },
  ];

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Start Real Device Camera Streaming
  const startCamera = async (facing: "user" | "environment" = facingMode) => {
    try {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      setCameraError(null);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
      }
      showToast("Câmera ativada! Transmissão ao vivo iniciada.");
    } catch (err) {
      console.warn("Câmera não permitida ou indisponível:", err);
      setCameraActive(false);
      setCameraError("Permissão de câmera necessária para transmitir.");
      showToast("Ative a permissão de câmera no navegador.");
    }
  };

  // Toggle Camera Front/Back or Start/Stop
  const toggleCamera = () => {
    if (cameraActive) {
      const nextFacing = facingMode === "user" ? "environment" : "user";
      setFacingMode(nextFacing);
      void startCamera(nextFacing);
    } else {
      void startCamera();
    }
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);

    if (mediaStream) {
      mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
    }
    showToast(newMuted ? "Microfone mutado" : "Microfone ativado");
  };

  // Request Camera Access on Mount
  useEffect(() => {
    void startCamera();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Ensure Video Element receives stream when cameraActive becomes true
  useEffect(() => {
    if (cameraActive && mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(() => undefined);
    }
  }, [cameraActive, mediaStream]);

  // Auto scroll chat
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Simulate viewer fluctuation and random live chat messages
  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate viewers
      setViewers((prev) => prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 4));

      // Random incoming messages
      const randomUsers = ["Gabriel_PB", "Mariana_Fan", "Felipe_22", "Amanda_R", "Marcelo_10"];
      const randomMsgs = [
        "Maravilhosa! 🔥",
        "Manda um beijo pra João Pessoa! 😘",
        "Amei o figurino! 💕",
        "Essa live tá incrível! 👏",
        "Sua energia é contagiante! ✨",
      ];

      if (Math.random() > 0.6) {
        const user = randomUsers[Math.floor(Math.random() * randomUsers.length)];
        const text = randomMsgs[Math.floor(Math.random() * randomMsgs.length)];
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

        setComments((prev) => [
          ...prev.slice(-25),
          {
            id: String(Date.now()),
            user,
            avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
            text,
            time: timeStr,
          },
        ]);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // Floating Heart Spawner
  const addFloatingHeart = () => {
    setLikesCount((prev) => prev + 1);
    setGoalCurrent((prev) => Math.min(prev + 1, goalTarget));

    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      x: Math.random() * 75 + 10,
      size: Math.random() * 16 + 22,
      emoji: emojisList[Math.floor(Math.random() * emojisList.length)],
    };

    setFloatingHearts((prev) => [...prev.slice(-15), newHeart]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2200);
  };

  // Send Chat Message
  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const newComment: CommentItem = {
      id: String(Date.now()),
      user: "Você",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      text: inputMsg.trim(),
      time: timeStr,
      isVip: true,
    };

    setComments((prev) => [...prev, newComment]);
    setInputMsg("");
    setShowEmojiPicker(false);
    addFloatingHeart();
  };

  // Send Gift Handler
  const handleSendGift = (gift: GiftItem) => {
    if (userCoins < gift.coins) {
      showToast("Moedas insuficientes! Recarregue suas moedas.");
      return;
    }

    setUserCoins((prev) => prev - gift.coins);
    setGoalCurrent((prev) => Math.min(prev + gift.coins, goalTarget));

    // Show Gift Banner Animation
    setGiftBanner({
      text: `Você enviou ${gift.name}!`,
      icon: gift.icon,
    });
    setTimeout(() => setGiftBanner(null), 3500);

    // Add Gift Comment in Chat
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const newGiftComment: CommentItem = {
      id: String(Date.now()),
      user: "Você",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      text: `enviou um ${gift.name}`,
      time: timeStr,
      isGift: true,
      giftName: gift.name,
      giftMultiplier: `+${gift.coins} pts`,
    };

    setComments((prev) => [...prev, newGiftComment]);
    showToast(`Presente ${gift.name} enviado! 🎉`);
    addFloatingHeart();
  };

  return (
    <main
      className="live-container"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("button") && !target.closest("input") && !target.closest(".live-modal-panel")) {
          addFloatingHeart();
        }
      }}
    >
      {/* Real Device Camera Feed or Image Fallback */}
      {cameraActive ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="live-bg-media camera-feed"
        />
      ) : (
        <div className="live-bg-fallback">
          <img
            className="live-bg-media"
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&auto=format&fit=crop&q=80"
            alt="Mariana Silva Live Stream"
          />
          <div className="camera-start-overlay">
            <Camera size={44} className="camera-prompt-icon" />
            <h3>Transmissão ao Vivo</h3>
            <p>Clique abaixo para permitir o uso da sua câmera e transmitir ao vivo.</p>
            <button className="start-camera-btn" onClick={() => void startCamera()}>
              <Video size={18} /> Iniciar Minha Câmera
            </button>
            {cameraError && <span className="camera-err-msg">{cameraError}</span>}
          </div>
        </div>
      )}

      <div className="live-gradient-overlay" />

      {/* Floating Animated Hearts */}
      <div className="floating-hearts-layer" aria-hidden="true">
        {floatingHearts.map((h) => (
          <span
            key={h.id}
            className="floating-heart"
            style={{
              left: `${h.x}%`,
              fontSize: `${h.size}px`,
            }}
          >
            {h.emoji}
          </span>
        ))}
      </div>

      {/* Gift Banner Notification */}
      {giftBanner && (
        <div className="live-gift-banner-overlay">
          <span className="banner-icon">{giftBanner.icon}</span>
          <span className="banner-text">{giftBanner.text}</span>
        </div>
      )}

      {/* Toast Alert */}
      {toastMsg && <div className="live-toast-popup">{toastMsg}</div>}

      {/* Top Header Navigation */}
      <header className="live-top-bar">
        <div className="live-brand-group">
          <button className="live-icon-btn" aria-label="Menu" onClick={() => setActiveTabModal("mais")}>
            <Menu size={20} />
          </button>
          <Link to="/" className="live-brand-logo">
            <img src="/sintoniamora-wordmark.webp" alt="Sintoniamora" />
          </Link>
        </div>

        <div className="live-status-pill">
          <span className="live-red-dot" />
          AO VIVO
        </div>

        <div className="live-top-right">
          <div className="live-viewers-pill">
            <Eye size={15} />
            <span>{viewers.toLocaleString("pt-BR")}</span>
          </div>
          <Link to="/" className="live-close-btn" aria-label="Fechar live">
            <X size={20} />
          </Link>
        </div>
      </header>

      {/* Streamer Profile Badge (Top Left) */}
      <div className="live-streamer-card">
        <div className="live-avatar-wrapper">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            alt="Mariana Silva"
          />
        </div>

        <div className="live-streamer-info">
          <div className="live-streamer-name">
            <span>Mariana Silva</span>
            <CheckCircle2 size={15} className="verified-icon" />
          </div>
          <span className="live-streamer-location">📍 João Pessoa/PB</span>
        </div>

        <div className="live-streamer-actions">
          <button
            className={`live-follow-btn ${following ? "is-following" : ""}`}
            onClick={() => {
              setFollowing(!following);
              showToast(following ? "Você deixou de seguir Mariana Silva" : "Você agora está seguindo Mariana Silva!");
            }}
          >
            {following ? "Seguindo" : "+ Seguir"}
          </button>
          <button className="live-top10-btn" onClick={() => setActiveTabModal("top10")}>
            <Star size={12} fill="#ffd700" color="#ffd700" />
            Top 10
          </button>
        </div>
      </div>

      {/* Live Goal Widget (Top Right) */}
      <div className="live-goal-card" onClick={() => setActiveTabModal("presentes")}>
        <div className="live-goal-header">
          <Crown size={15} fill="#ffd700" color="#ffd700" />
          <span>Meta da Live</span>
        </div>
        <div className="live-goal-progress-bg">
          <div
            className="live-goal-progress-fill"
            style={{ width: `${Math.min(100, (goalCurrent / goalTarget) * 100)}%` }}
          />
        </div>
        <span className="live-goal-text">
          {goalCurrent.toLocaleString("pt-BR")} / {goalTarget.toLocaleString("pt-BR")}
        </span>
      </div>

      {/* Right Side Stack Action Buttons */}
      <aside className="live-side-actions">
        <button
          className={`live-side-btn ${activeModal === "presentes" ? "active" : ""}`}
          onClick={() => setActiveTabModal("presentes")}
        >
          <Gift size={22} className="pink-icon" />
          <span>Presentes</span>
        </button>
        <button
          className={`live-side-btn ${activeModal === "ranking" ? "active" : ""}`}
          onClick={() => setActiveTabModal("ranking")}
        >
          <Gem size={22} className="pink-icon" />
          <span>Ranking</span>
        </button>
        <button
          className={`live-side-btn ${activeModal === "desafios" ? "active" : ""}`}
          onClick={() => setActiveTabModal("desafios")}
        >
          <Flame size={22} className="pink-icon" />
          <span>Desafios</span>
        </button>
      </aside>

      {/* Live Comments Overlay (Bottom Left) */}
      <div className="live-comments-area">
        {comments.map((c) => (
          <div
            key={c.id}
            className={`live-chat-row ${c.isGift ? "gift-row" : ""} ${c.isPremiumEvent ? "vip-row" : ""}`}
          >
            <img src={c.avatar} alt={c.user} className="comment-avatar" />
            <div className="comment-content">
              <div className="comment-header-line">
                <span className="comment-user">{c.user}</span>
                {c.isVip && <span className="comment-vip-badge">VIP</span>}
                <span className="comment-time">{c.time}</span>
              </div>
              <div className="comment-body">
                {c.isGift ? (
                  <span className="comment-gift-text">
                    {c.text}{" "}
                    <span className="comment-gift-badge">
                      {c.giftMultiplier}
                    </span>
                  </span>
                ) : c.isPremiumEvent ? (
                  <span className="comment-premium-text">
                    👑 acabou de se tornar Premium!
                  </span>
                ) : (
                  <span>{c.text}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={commentsEndRef} />
      </div>

      {/* Floating Heart Reaction Counter (Bottom Right) */}
      <div className="live-reaction-floating">
        <button className="heart-trigger-btn" onClick={addFloatingHeart} aria-label="Curtir live">
          <Heart size={26} fill="#eb315d" color="#eb315d" />
        </button>
        <span className="heart-count-label">
          {(likesCount / 1000).toFixed(1)}K
        </span>
      </div>

      {/* Emoji Picker Bar */}
      {showEmojiPicker && (
        <div className="live-emoji-bar">
          {emojisList.map((emoji) => (
            <button
              key={emoji}
              className="emoji-item-btn"
              onClick={() => {
                setInputMsg((prev) => prev + emoji);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Chat Composer Bar */}
      <form className="live-chat-composer" onSubmit={handleSendMessage}>
        <div className="live-input-pill">
          <MessageCircle size={18} className="chat-icon" />
          <input
            type="text"
            placeholder="Digite uma mensagem..."
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
          />
          <button
            type="button"
            className="emoji-btn"
            aria-label="Emojis"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile size={19} />
          </button>
        </div>
        <button type="submit" className="live-send-btn" aria-label="Enviar">
          <Send size={18} />
        </button>
      </form>

      {/* Bottom Control Bar */}
      <footer className="live-bottom-controls">
        <button
          className={`control-btn ${muted ? "is-muted" : ""}`}
          onClick={toggleMute}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
          <span>{muted ? "Mutado" : "Mudo"}</span>
        </button>

        <button className="control-btn" onClick={toggleCamera}>
          <Camera size={20} />
          <span>{cameraActive ? "Trocar Câmera" : "Ativar Câmera"}</span>
        </button>

        <button
          className="control-btn active-highlight"
          onClick={() => setActiveTabModal("presentes")}
        >
          <Gift size={20} />
          <span>Presentes</span>
        </button>

        <button className="control-btn" onClick={() => setActiveTabModal("dicas")}>
          <Sparkles size={20} />
          <span>Dicas</span>
        </button>

        <button className="control-btn" onClick={() => setActiveTabModal("desafios")}>
          <Zap size={20} />
          <span>Desafios</span>
        </button>

        <button className="control-btn" onClick={() => setActiveTabModal("mais")}>
          <MoreHorizontal size={20} />
          <span>Mais</span>
        </button>
      </footer>

      {/* Interactive Modals & Bottom Sheets */}
      {activeModal && (
        <div className="live-modal-overlay" onClick={() => setActiveTabModal(null)}>
          <div className="live-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-panel-header">
              <h3>
                {activeModal === "presentes" && "🎁 Loja de Presentes"}
                {activeModal === "ranking" && "💎 Ranking da Live"}
                {activeModal === "desafios" && "🔥 Desafios Interativos"}
                {activeModal === "top10" && "⭐ Top 10 Apoiadores"}
                {activeModal === "dicas" && "✨ Dicas & Elogios"}
                {activeModal === "mais" && "⚙️ Opções da Transmissão"}
              </h3>
              <button className="modal-close-btn" onClick={() => setActiveTabModal(null)}>
                <X size={18} />
              </button>
            </div>

            {/* PRESENTES PANEL */}
            {activeModal === "presentes" && (
              <div className="gifts-modal-body">
                <div className="coins-balance-row">
                  <div className="coins-count">
                    <Coins size={18} color="#ffd700" />
                    <span><b>{userCoins}</b> moedas disponíveis</span>
                  </div>
                  <button
                    className="buy-coins-btn"
                    onClick={() => {
                      setUserCoins((prev) => prev + 500);
                      showToast("Você adquiriu +500 moedas!");
                    }}
                  >
                    + Recarregar
                  </button>
                </div>

                <div className="gifts-grid">
                  {giftsList.map((gift) => (
                    <div
                      key={gift.id}
                      className="gift-card-item"
                      onClick={() => handleSendGift(gift)}
                    >
                      <span className="gift-emoji">{gift.icon}</span>
                      <b>{gift.name}</b>
                      <small>🪙 {gift.coins} moedas</small>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RANKING PANEL */}
            {activeModal === "ranking" && (
              <div className="ranking-modal-body">
                <p className="ranking-subtitle">Maiores doadores e VIPs ativos desta live:</p>
                <div className="ranking-list">
                  {top10Supporters.slice(0, 5).map((s) => (
                    <div key={s.rank} className="ranking-row-item">
                      <span className={`rank-badge rank-${s.rank}`}>#{s.rank}</span>
                      <img src={s.avatar} alt={s.name} />
                      <div className="rank-info">
                        <b>{s.name}</b>
                        <small>{s.points}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DESAFIOS PANEL */}
            {activeModal === "desafios" && (
              <div className="challenges-modal-body">
                <div className="challenge-item-card">
                  <div className="challenge-title">
                    <span>🔥 Dança Sensual ao Vivo</span>
                    <b>82%</b>
                  </div>
                  <div className="challenge-progress">
                    <div className="fill" style={{ width: "82%" }} />
                  </div>
                  <button
                    className="challenge-contribute-btn"
                    onClick={() => {
                      handleSendGift(giftsList[0]);
                    }}
                  >
                    Contribuir (Coração - 10 moedas)
                  </button>
                </div>

                <div className="challenge-item-card">
                  <div className="challenge-title">
                    <span>💬 Sessão Perguntas Sem Filtro</span>
                    <b>70%</b>
                  </div>
                  <div className="challenge-progress">
                    <div className="fill" style={{ width: "70%" }} />
                  </div>
                  <button
                    className="challenge-contribute-btn"
                    onClick={() => {
                      handleSendGift(giftsList[1]);
                    }}
                  >
                    Contribuir (Rosa - 25 moedas)
                  </button>
                </div>
              </div>
            )}

            {/* TOP 10 SUPPORTERS PANEL */}
            {activeModal === "top10" && (
              <div className="ranking-modal-body">
                <div className="ranking-list">
                  {top10Supporters.map((s) => (
                    <div key={s.rank} className="ranking-row-item">
                      <span className={`rank-badge rank-${s.rank}`}>#{s.rank}</span>
                      <img src={s.avatar} alt={s.name} />
                      <div className="rank-info">
                        <b>{s.name}</b>
                        <small>{s.points}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DICAS PANEL */}
            {activeModal === "dicas" && (
              <div className="tips-modal-body">
                <p>Envie um elogio em destaque no chat:</p>
                <div className="quick-tips-btns">
                  {[
                    "Você é maravilhosa! 💕",
                    "Amo seu conteúdo! 🔥",
                    "Arrasou na live! 👏",
                    "Quero ver mais! 😍",
                  ].map((tip) => (
                    <button
                      key={tip}
                      className="tip-chip-btn"
                      onClick={() => {
                        setInputMsg(tip);
                        setActiveTabModal(null);
                      }}
                    >
                      {tip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MAIS SETTINGS PANEL */}
            {activeModal === "mais" && (
              <div className="more-modal-body">
                <button
                  className="more-option-item"
                  onClick={() => {
                    toggleCamera();
                    setActiveTabModal(null);
                  }}
                >
                  <RefreshCw size={18} />
                  <span>Alternar Câmera (Frontal / Traseira)</span>
                </button>

                <button
                  className="more-option-item"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showToast("Link da live copiado!");
                    setActiveTabModal(null);
                  }}
                >
                  <Share2 size={18} />
                  <span>Compartilhar Live</span>
                </button>

                <button
                  className="more-option-item"
                  onClick={() => {
                    showToast("Qualidade fixada em 1080p60 (Full HD)");
                    setActiveTabModal(null);
                  }}
                >
                  <Sliders size={18} />
                  <span>Qualidade de Vídeo (1080p)</span>
                </button>

                <button
                  className="more-option-item"
                  onClick={() => {
                    showToast("Denúncia enviada com sucesso à equipe de moderação.");
                    setActiveTabModal(null);
                  }}
                >
                  <ShieldAlert size={18} />
                  <span>Denunciar Transmissão</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
