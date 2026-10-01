import { createFileRoute } from "@tanstack/react-router";
import { DemoProfileScreen } from "@/components/demo-profile-screen";
import profileRafael from "@/assets/profile-rafael.jpg";
import profileBianca from "@/assets/profile-bianca.jpg";

export const Route = createFileRoute("/perfil-masculino")({ component: MaleProfile });
function MaleProfile() {
  return <DemoProfileScreen profile={{
    name: "Rafael",
    age: 31,
    city: "João Pessoa, PB",
    bio: "Música, café e boas conversas. Quero conhecer pessoas que valorizam respeito, leveza e sinceridade.",
    avatar: profileRafael,
    cover: profileRafael,
    gallery: [profileRafael, profileRafael, profileBianca, profileRafael, profileBianca, profileRafael],
    interests: ["Música", "Café", "Cinema", "Praia"]
  }} />;
}
