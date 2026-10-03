import { useEffect } from "react";

/**
 * Webflow-style scroll reveals: elements marked with `data-reveal` fade and
 * rise the first time they enter the viewport. The hidden state only applies
 * once `reveal-enabled` is on <html>, so content stays visible when this
 * effect never runs (no JS, disabled observer or reduced motion).
 */
export function useScrollReveal() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const root = document.documentElement;
    root.classList.add("reveal-enabled");

    const show = (element: Element) => element.classList.add("is-in");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    const targets = document.querySelectorAll("[data-reveal]");
    targets.forEach((element) => observer.observe(element));
    // Sections can mount after the first pass (deferred data), so catch them.
    const late = new MutationObserver(() => {
      document
        .querySelectorAll("[data-reveal]:not(.is-in)")
        .forEach((element) => observer.observe(element));
    });
    late.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      late.disconnect();
      root.classList.remove("reveal-enabled");
    };
  }, []);
}