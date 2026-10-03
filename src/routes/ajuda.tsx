import { createFileRoute } from "@tanstack/react-router";
import { MemberNav } from "@/components/member-nav";
import { useTours } from "@/components/tour/tour-provider";
import { ALL_TOURS } from "@/lib/tours/config";

export const Route = createFileRoute("/ajuda")({
  head: () => ({
    meta: [
      { title: "Ajuda e tutoriais — sexflow" },
      { name: "description", content: "Reveja os tours guiados e aprenda a usar cada área da sexflow." },
      { property: "og:title", content: "Ajuda e tutoriais — sexflow" },
      { property: "og:description", content: "Reveja os tours guiados e aprenda a usar cada área da sexflow." },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const { isSeen, start } = useTours();
  return (
    <main className="member-page">
      <MemberNav current="ajuda" />
      <div className="social-content">
        <div className="social-title">
          <span className="auth-kicker">AJUDA</span>
          <h1>Tours e tutoriais</h1>
          <p>Reveja quando quiser como cada área da plataforma funciona.</p>
        </div>
        <section className="help-tours" aria-label="Lista de tutoriais">
          {ALL_TOURS.map((tour) => {
            const done = isSeen(tour.id);
            return (
              <article className="help-tour-row" key={tour.id}>
                <span className={`help-tour-status${done ? " is-done" : ""}`} aria-hidden="true">
                  {done ? "✓" : "○"}
                </span>
                <div>
                  <b>{tour.icon} {tour.title}</b>
                  <small>{done ? "Concluído" : "Não visualizado"}</small>
                </div>
                <button
                  className={`button ${tour.id === "global" ? "button-primary" : "button-outline"}`}
                  onClick={() => start(tour.id)}
                >
                  {tour.id === "global" ? "Refazer tour inicial" : "Ver tutorial"}
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
