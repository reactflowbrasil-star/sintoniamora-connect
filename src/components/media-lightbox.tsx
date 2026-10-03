import { useEffect } from "react";
import { X } from "lucide-react";

export type LightboxMedia = { url: string; type: "photo" | "video"; alt: string };

/**
 * Reusable popup viewer for gallery and feed media. Clicking the backdrop or the
 * close button, or pressing Escape, dismisses it. Body scroll is locked while open.
 */
export function MediaLightbox({ item, onClose }: { item: LightboxMedia | null; onClose: () => void }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="media-lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Visualização de mídia"
      onClick={onClose}
    >
      <div className="lightbox-content-box" onClick={(event) => event.stopPropagation()}>
        <button className="lightbox-close-btn" type="button" aria-label="Fechar" onClick={onClose}>
          <X size={22} />
        </button>
        {item.type === "photo" ? (
          <img src={item.url} alt={item.alt} />
        ) : (
          <video src={item.url} controls autoPlay playsInline aria-label={item.alt} />
        )}
      </div>
    </div>
  );
}
