/**
 * CollapsibleView — reusable wrapper that constrains content to a default
 * max-height and provides expand/collapse controls.
 *
 * Behavior:
 * - Collapsed (default): content is clipped at `collapsedHeight` (default 200px)
 *   with a subtle fade gradient at the bottom.
 * - When content overflows, an "Expand" button appears on hover at the
 *   bottom-right corner.
 * - Expanded: content grows to fill available space (60vh). An "X" close
 *   button in the top-right corner collapses it back.
 * - If the content fits within `collapsedHeight`, no controls are shown and
 *   the wrapper is transparent.
 *
 * Used by tool components (Edit, Write, Bash, Read, etc.), user messages,
 * and plan review text to provide a consistent expand/collapse pattern.
 */
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";

interface CollapsibleViewProps {
  children: ReactNode;
  /** Max height in pixels when collapsed. Default 200. */
  collapsedHeight?: number;
  /** Optional extra CSS class on the outer wrapper. */
  className?: string;
}

export function CollapsibleView({
  children,
  collapsedHeight = 200,
  className = "",
}: CollapsibleViewProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check whether the *natural* content height exceeds the collapsed limit.
  // We temporarily remove max-height to measure, then restore it. This avoids
  // the infinite loop that occurs when the DOM structure changes based on
  // overflow state (different structure → different scrollHeight → toggle → repeat).
  const checkOverflow = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    // scrollHeight reflects the full content height even when overflow is hidden,
    // as long as we compare against the collapsed constraint (not the element's
    // current rendered height). This works because we always apply max-height
    // via inline style, and scrollHeight ignores it.
    setOverflows(el.scrollHeight > collapsedHeight + 4); // 4px tolerance
  }, [collapsedHeight]);

  // Observe size changes (e.g., tool result arriving after initial render)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkOverflow]);

  // Whether to show the expand/collapse chrome
  const showControls = overflows || expanded;

  return (
    <div
      className={`collapsible ${expanded ? "collapsible-expanded" : showControls ? "collapsible-collapsed" : ""} ${className}`.trim()}
    >
      <div
        ref={contentRef}
        className="collapsible-content"
        style={expanded ? { maxHeight: "60vh", overflowY: "auto" } : { maxHeight: collapsedHeight, overflow: "hidden" }}
      >
        {children}
      </div>

      {/* Fade gradient + expand button — only when collapsed and content overflows */}
      {showControls && !expanded && (
        <div className="collapsible-fade">
          <button
            className="collapsible-btn collapsible-expand-btn"
            onClick={() => setExpanded(true)}
            title="Expand"
          >
            Expand ↓
          </button>
        </div>
      )}

      {/* Close button — only in expanded state */}
      {expanded && (
        <button
          className="collapsible-btn collapsible-close-btn"
          onClick={() => setExpanded(false)}
          title="Collapse"
        >
          ✕
        </button>
      )}
    </div>
  );
}
