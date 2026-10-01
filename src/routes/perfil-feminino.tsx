import { createFileRoute } from "@tanstack/react-router";
import { DemoProfileScreen } from "@/components/demo-profile-screen";
import profileMarina from "@/assets/profile-marina.jpg";
import profileBianca from "@/assets/profile-bianca.jpg";

export const Route = createFileRoute("/perfil-feminino")({ component: FemaleProfile });
function FemaleProfile() {
  return <DemoProfileScreen profile={{
    name: "Marina",
    age: 28,
    city: "João Pessoa, PB",
    bio: "Gosto de descobrir lugares novos, conversar sem pressa e conhecer pessoas com interesses em comum.",
    avatar: profileMarina,
    cover: profileMarina,
    gallery: [profileMarina, profileBianca, profileMarina, profileBianca, profileMarina, profileBianca],
    interests: ["Fotografia", "Trilhas", "Música", "Viagens"]
  }} />;
}
