import { useState } from "react";
import { ArrowLeft, BadgeCheck, Heart, Image, Lock, MessageCircle, MoreHorizontal, Play, UserRound, Video, X } from "lucide-react";

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
export function DemoProfileScreen({ profile }: { profile: DemoProfileData }) {
  const [tab, setTab] = useState("Fotos");
  const [liked, setLiked] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  return <main className="screen-demo">
    <header className="screen-topbar">
      <a href="/" className="screen-back" aria-label="Voltar ao início"><ArrowLeft size={19}/></a>
      <a href="/" className="screen-brand"><img src="/sintoniamora-wordmark.webp" alt="Sintoniamora"/></a>
      <span className="preview-pill">PRÉVIA ILUSTRATIVA</span>
    </header>
    <div className="demo-warning"><BadgeCheck size={15}/> Perfil e imagens demonstrativos. Nenhum dado representa uma conta cadastrada.</div>
    <section className="profile-screen">
      <div className="profile-cover"><img src={profile.cover} alt="Imagem de capa ilustrativa"/><div className="cover-shade"/></div>
      <div className="profile-screen-body">
        <div className="profile-identity">
          <div className="profile-avatar-wrap"><img src={profile.avatar} alt={"Avatar ilustrativo de "+profile.name}/><span className="online-dot"/></div>
          <div className="profile-name-block"><div className="profile-name-line"><h1>{profile.name}</h1><BadgeCheck className="demo-badge" size={18}/></div><p>{profile.age} anos <span>·</span> <span className="location-line">{profile.city}</span></p><small>PERFIL DE DEMONSTRAÇÃO</small></div>
          <div className="profile-actions"><button className="screen-action primary-action" disabled><MessageCircle size={16}/> Conversar</button><button className={liked ? "screen-action icon-action is-liked" : "screen-action icon-action"} aria-label={liked ? "Remover dos favoritos" : "Adicionar aos favoritos"} onClick={() => setLiked(!liked)}><Heart size={19} fill={liked ? "currentColor" : "none"}/></button><button className="screen-action icon-action" aria-label="Mais opções" disabled><MoreHorizontal size={20}/></button></div>
        </div>
        <p className="profile-bio">{profile.bio}</p>
        <div className="profile-facts"><span><Heart/> <b>Interesses</b><small>em comum</small></span><span><UserRound/> <b>Perfil</b><small>demonstrativo</small></span><span><Lock/> <b>Privacidade</b><small>sob seu controle</small></span></div>
        <nav className="profile-tabs" aria-label="Conteúdo do perfil">{["Fotos","Vídeos","Sobre","Interesses"].map((item) => <button key={item} className={tab === item ? "profile-tab active" : "profile-tab"} onClick={() => setTab(item)}>{item === "Fotos" ? <Image/> : item === "Vídeos" ? <Play/> : item === "Sobre" ? <UserRound/> : <Heart/>}<span>{item}</span></button>)}</nav>
        {tab === "Fotos" && <><div className="gallery-toolbar"><span><Image size={15}/> Galeria demonstrativa</span><span>{profile.gallery.length} imagens</span></div><div className="demo-gallery">{profile.gallery.map((photo, i) => <button key={photo+i} className="demo-gallery-item" onClick={() => setSelectedImage(photo)} aria-label={"Ampliar imagem demonstrativa "+(i+1)}><img src={photo} alt={"Imagem demonstrativa "+(i+1)} loading="lazy"/><span><Image size={13}/> Foto ilustrativa</span></button>)}<div className="locked-media"><Lock/><b>Conteúdo Premium</b><small>Exemplo de mídia restrita</small><button disabled><Video size={14}/> Recurso demonstrativo</button></div></div></>}
        {tab === "Vídeos" && <div className="tab-empty"><Video/><h2>Vídeos de demonstração</h2><p>Esta prévia não contém vídeos de membros. A reprodução depende da implementação da plataforma.</p></div>}
        {tab === "Sobre" && <div className="tab-details"><h2>Sobre este perfil</h2><p>{profile.bio}</p><p><b>Localização:</b> {profile.city} (demonstração)</p><p><b>Privacidade:</b> informações pessoais reais não são exibidas nesta tela.</p></div>}
        {tab === "Interesses" && <div className="interest-list">{profile.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>}
        <p className="demo-action-note">Ações sociais nesta prévia não enviam mensagens nem salvam dados.</p>
      </div>
    </section>
    {selectedImage && <div className="demo-lightbox" role="dialog" aria-modal="true" aria-label="Imagem demonstrativa ampliada"><button onClick={() => setSelectedImage(null)} aria-label="Fechar imagem"><X/></button><img src={selectedImage} alt="Imagem demonstrativa ampliada"/></div>}
    <nav className="screen-bottom-nav" aria-label="Navegação demonstrativa"><a href="/"><Image/><span>Início</span></a><a href="/#descobrir"><UserRound/><span>Explorar</span></a><a href="/#planos"><Heart/><span>Planos</span></a><a href="/live"><Play/><span>Live</span></a><a href="/perfil-masculino"><UserRound/><span>Perfil</span></a></nav>
  </main>;
}
