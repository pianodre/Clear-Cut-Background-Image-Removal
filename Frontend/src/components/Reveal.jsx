import { useEffect, useRef, useState } from "react";

/**
 * Reveal-on-scroll wrapper. Fades + lifts its children into view the first time
 * they enter the viewport, then stays put. Zero dependencies — just an
 * IntersectionObserver toggling the `.reveal` / `.is-visible` CSS classes.
 *
 * Props:
 *   as     — element/tag to render (default "div"); use for semantic elements.
 *   delay  — ms to stagger this item's entrance (e.g. cards in a row).
 *   ...rest passes through (className, etc.).
 */
export default function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced-motion users skip the observer and just see content immediately.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // animate once, then stop watching
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}
