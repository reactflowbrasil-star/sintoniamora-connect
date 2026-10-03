import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type AccordionItem = {
  id: string;
  title: string;
  hint?: string;
  content: ReactNode;
};

/**
 * Lightweight, accessible, animated accordion used across the member area.
 * Keeps every panel in the DOM so opening/closing animates smoothly, while the
 * closed panels are marked `inert` so their controls stay out of the tab order.
 */
export function PremiumAccordion({
  items,
  defaultOpen,
}: {
  items: AccordionItem[];
  defaultOpen?: string;
}) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);

  return (
    <div className="premium-accordion">
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div className={`accordion-item${isOpen ? " is-open" : ""}`} key={item.id}>
            <h3 className="accordion-heading">
              <button
                type="button"
                id={`accordion-trigger-${item.id}`}
                className="accordion-trigger"
                aria-expanded={isOpen}
                aria-controls={`accordion-panel-${item.id}`}
                onClick={() => setOpen(isOpen ? null : item.id)}
              >
                <span className="accordion-label">
                  {item.title}
                  {item.hint && <small>{item.hint}</small>}
                </span>
                <ChevronDown className="accordion-chevron" size={18} aria-hidden="true" />
              </button>
            </h3>
            <div
              id={`accordion-panel-${item.id}`}
              className="accordion-panel"
              role="region"
              aria-labelledby={`accordion-trigger-${item.id}`}
              inert={!isOpen}
            >
              <div className="accordion-panel-inner">{item.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
