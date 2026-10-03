import { useEffect, useRef, useState } from "react";

/** Rotating lines shown under the fixed slogan on the intro screen. */
const PHRASES = [
  "Conexões reais começam aqui.",
  "Descubra pessoas no seu ritmo.",
  "Seja você. Sem julgamentos.",
  "Privacidade para viver suas escolhas.",
  "Novas pessoas. Novas possibilidades.",
  "Encontre quem procura o mesmo que você.",
  "Uma conversa pode mudar a sua noite.",
  "Seu desejo. Suas escolhas. Seu ritmo.",
  "Talvez alguém esteja procurando por você.",
  "Entre. Descubra. Conecte-se.",
];

/** Timing of the typing sequence: digitar → pausar → apagar → próxima frase. */
const TYPE_DELAY = 50;
const HOLD_DELAY = 1800;
const DELETE_DELAY = 30;
const PHRASE_GAP = 300;

export function IntroTypewriter({ className }: { className?: string }) {
  const [text, setText] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const phraseIndex = useRef(0);
  const charIndex = useRef(0);
  const deleting = useRef(false);

  useEffect(() => {
    const step = () => {
      const phrase = PHRASES[phraseIndex.current] ?? "";

      if (!deleting.current) {
        charIndex.current += 1;
        setText(phrase.slice(0, charIndex.current));
        if (charIndex.current >= phrase.length) {
          deleting.current = true;
          timer.current = window.setTimeout(step, HOLD_DELAY);
          return;
        }
        timer.current = window.setTimeout(step, TYPE_DELAY);
        return;
      }

      charIndex.current -= 1;
      setText(phrase.slice(0, Math.max(0, charIndex.current)));
      if (charIndex.current <= 0) {
        deleting.current = false;
        phraseIndex.current = (phraseIndex.current + 1) % PHRASES.length;
        timer.current = window.setTimeout(step, PHRASE_GAP);
        return;
      }
      timer.current = window.setTimeout(step, DELETE_DELAY);
    };

    timer.current = window.setTimeout(step, TYPE_DELAY);
    return () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <p className={className ? `intro-typewriter ${className}` : "intro-typewriter"} aria-hidden="true">
      <span className="intro-typewriter-text">{text}</span>
      <span className="intro-typewriter-cursor">|</span>
    </p>
  );
}
