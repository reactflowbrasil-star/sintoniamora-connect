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
} from "lucide-react";
import profileMarina from "@/assets/profile-marina.jpg";

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

export function LivePreview() {
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

  const [inputMsg, setInputMsg] = useState("");
  const [likesCount, setLikesCount] = useState(12400); // 12.4K
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [following, setFollowing] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("presentes");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const emojis = ["💖", "💕", "❤️", "💗", "🔥", "✨", "😍"];

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const addFloatingHeart = () => {
    setLikesCount((prev) => prev + 1);
    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      x: Math.random() * 80 + 10, // 10% to 90%
      size: Math.random() * 16 + 20, // 20px to 36px
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    };
    setFloatingHearts((prev) => [...prev.slice(-15), newHeart]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2000);
  };

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
    addFloatingHeart();
  };

  return (
    <main className="live-container" onClick={(e) => {
      // Tap background to send heart
      if ((e.target as HTMLElement).tagName !== "BUTTON" && (e.target as HTMLElement).tagName !== "INPUT") {
        addFloatingHeart();
      }
    }}>
      {/* Background Stream Video / Image */}
      <img
        className="live-bg-media"
        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&auto=format&fit=crop&q=80"
        alt="Mariana Silva Live Stream"
      />
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

      {/* Top Header Navigation */}
      <header className="live-top-bar">
        <div className="live-brand-group">
          <button className="live-icon-btn" aria-label="Menu">
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
            <span>2.483</span>
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
            onClick={() => setFollowing(!following)}
          >
            {following ? "Seguindo" : "+ Seguir"}
          </button>
          <button className="live-top10-btn">
            <Star size={12} fill="#ffd700" color="#ffd700" />
            Top 10
          </button>
        </div>
      </div>

      {/* Live Goal Widget (Top Right) */}
      <div className="live-goal-card">
        <div className="live-goal-header">
          <Crown size={15} fill="#ffd700" color="#ffd700" />
          <span>Meta da Live</span>
        </div>
        <div className="live-goal-progress-bg">
          <div className="live-goal-progress-fill" style={{ width: "49.66%" }} />
        </div>
        <span className="live-goal-text">2.483 / 5.000</span>
      </div>

      {/* Right Side Stack Action Buttons */}
      <aside className="live-side-actions">
        <button
          className={`live-side-btn ${activeTab === "presentes" ? "active" : ""}`}
          onClick={() => setActiveTab("presentes")}
        >
          <Gift size={22} className="pink-icon" />
          <span>Presentes</span>
        </button>
        <button
          className={`live-side-btn ${activeTab === "ranking" ? "active" : ""}`}
          onClick={() => setActiveTab("ranking")}
        >
          <Gem size={22} className="pink-icon" />
          <span>Ranking</span>
        </button>
        <button
          className={`live-side-btn ${activeTab === "desafios" ? "active" : ""}`}
          onClick={() => setActiveTab("desafios")}
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
                      💖 {c.giftMultiplier}
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
          <button type="button" className="emoji-btn" aria-label="Emojis">
            <Smile size={19} />
          </button>
        </div>
        <button type="submit" className="live-send-btn" aria-label="Enviar">
          <Send size={18} />
        </button>
      </form>

      {/* Bottom Navigation Bar */}
      <footer className="live-bottom-controls">
        <button
          className={`control-btn ${muted ? "is-muted" : ""}`}
          onClick={() => setMuted(!muted)}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
          <span>Mudo</span>
        </button>

        <button className="control-btn">
          <Camera size={20} />
          <span>Câmera</span>
        </button>

        <button className="control-btn active-highlight">
          <Gift size={20} />
          <span>Presentes</span>
        </button>

        <button className="control-btn">
          <Sparkles size={20} />
          <span>Dicas</span>
        </button>

        <button className="control-btn">
          <Zap size={20} />
          <span>Desafios</span>
        </button>

        <button className="control-btn">
          <MoreHorizontal size={20} />
          <span>Mais</span>
        </button>
      </footer>
    </main>
  );
}

