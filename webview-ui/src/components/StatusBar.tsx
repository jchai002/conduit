/**
 * Status bar — shows progress or status text from the extension.
 *
 * When the agent is running (busy=true), cycles through fun status words
 * with a fade in/out animation — similar to how Claude Code shows
 * "Thinking...", "Clading...", etc. When not busy, shows static statusText
 * from the extension (or hides if empty).
 */
import { useState, useEffect, useRef } from "react";
import { useExtensionState } from "../context/ExtensionStateContext";

/** Fun gerund words that cycle while the agent works.
 *  Mix of conduit-themed and whimsical — keeps the UI feeling alive. */
const STATUS_WORDS = [
  "Conduiting...",
  "Thinking...",
  "Pondering...",
  "Tinkering...",
  "Channeling...",
  "Brewing...",
  "Noodling...",
  "Scheming...",
  "Wiring...",
  "Connecting...",
  "Piping...",
  "Routing...",
  "Flowing...",
  "Syncing...",
  "Funneling...",
  "Plumbing...",
];

export function StatusBar() {
  const { state } = useExtensionState();
  const [word, setWord] = useState(STATUS_WORDS[0]);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!state.busy) {
      // Clean up any running animation when agent finishes
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setVisible(true);
      return;
    }

    // Pick a random starting word
    setWord(STATUS_WORDS[Math.floor(Math.random() * STATUS_WORDS.length)]);
    setVisible(true);

    // Every 3 seconds: fade out → swap word → fade in
    intervalRef.current = setInterval(() => {
      setVisible(false);
      timeoutRef.current = setTimeout(() => {
        setWord((prev) => {
          let next: string;
          do {
            next = STATUS_WORDS[Math.floor(Math.random() * STATUS_WORDS.length)];
          } while (next === prev && STATUS_WORDS.length > 1);
          return next;
        });
        setVisible(true);
      }, 400); // wait for fade-out transition to finish
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state.busy]);

  // Agent running → show animated cycling words
  if (state.busy) {
    return (
      <div
        id="status"
        className={`status-animated ${visible ? "status-visible" : "status-hidden"}`}
      >
        {word}
      </div>
    );
  }

  // Not busy, but extension sent status text → show it statically
  if (state.statusText) {
    return <div id="status">{state.statusText}</div>;
  }

  return null;
}
