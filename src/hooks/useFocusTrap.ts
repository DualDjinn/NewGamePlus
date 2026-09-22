import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// ponytail: sin dependencias; encierra Tab y devuelve el foco al cerrar.
export function useFocusTrap<T extends HTMLElement>(active: boolean = true): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const prev = useRef<Element | null>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    prev.current = document.activeElement;
    const root = ref.current;
    // Foco inicial: primer elemento focosable o el propio contenedor.
    const first = root.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? root).focus({ preventScroll: true });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      (prev.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, [active]);

  return ref;
}
