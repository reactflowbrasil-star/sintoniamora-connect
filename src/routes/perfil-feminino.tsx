import { createFileRoute } from "@tanstack/react-router";
import { DemoProfileScreen } from "@/components/demo-profile-screen";

export const Route = createFileRoute("/perfil-feminino")({ component: FemaleProfile });

function FemaleProfile() {
  return (
    <DemoProfileScreen
      profile={{
        name: "Mariana Silva",
        age: 29,
        city: "João Pessoa/PB",
        bio: "Carioca de coração, espontânea, discreta e cheia de desejos para viver novas experiências. ⚓ Aqui é tudo real e sem tabus. ✨",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
        cover: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
        ],
        interests: ["Fotografia", "Trilhas", "Música", "Viagens", "Praia", "Gastronomia"],
      }}
    />
  );
}

