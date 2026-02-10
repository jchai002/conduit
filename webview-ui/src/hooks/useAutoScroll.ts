/**
 * Hook that auto-scrolls a container to the bottom when dependencies change.
 *
 * Used by MessageList to scroll to the latest message.
 * Returns a ref to attach to the scrollable container element.
 *
 * Usage:
 *   const scrollRef = useAutoScroll([messages.length]);
 *   return <div ref={scrollRef}>...</div>;
 */
import { useEffect, useRef } from "react";

export function useAutoScroll(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
