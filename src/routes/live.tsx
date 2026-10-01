import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, Gift, Heart, MessageCircle, Send, Sparkles, X } from "lucide-react";
import profileMarina from "@/assets/profile-marina.jpg";

export const Route = createFileRoute("/live")({ component: LivePreview });
function LivePreview() {
  const [likes, setLikes] = useState(0);
  return <main className="live-demo">
    <img className="live-background" src={profileMarina} alt="Imagem ilustrativa de uma transmissão"/>
    <div className="live-scrim"/>
    <header className="live-header"><a href="/" className="live-back" aria-label="Voltar"><ArrowLeft/></a><img src="/sintoniamora-wordmark.webp" alt="Sintoniamora"/><span className="live-label">PRÉVIA DE LIVE</span><span className="live-viewers"><Eye size={15}/> demonstração</span><a href="/" className="live-close" aria-label="Fechar"><X/></a></header>
    <div className="live-profile"><img src={profileMarina} alt="Perfil demonstrativo"/><div><b>Marina <span>PERFIL DE DEMONSTRAÇÃO</span></b><small>João Pessoa, PB</small></div><button disabled>Seguir</button></div>
    <aside className="live-tools"><div><Gift/><span>Presentes</span></div><div><Sparkles/><span>Interações</span></div><div><Heart/><span>Reações</span></div></aside>
    <div className="live-demo-badge"><span className="live-pulse"/> MODO DEMONSTRATIVO <p>Esta tela é apenas uma prévia visual. Não há transmissão ou usuários ao vivo.</p></div>
    <div className="live-comments"><div className="live-comment"><b>Comentários</b><small>Comentários reais aparecem quando a transmissão estiver conectada.</small></div></div>
    <div className="live-composer"><div className="live-input"><MessageCircle size={17}/><span>Chat indisponível nesta prévia</span></div><button disabled aria-label="Enviar mensagem"><Send size={18}/></button></div>
    <footer className="live-controls"><button disabled><span>◉</span> Microfone</button><button disabled><span>▣</span> Câmera</button><button onClick={() => setLikes(likes+1)}><Heart fill={likes ? "currentColor" : "none"}/> Curtir {likes || ""}</button><button disabled><Gift/> Presentes</button><button disabled><Sparkles/> Mais</button></footer>
  </main>;
}
