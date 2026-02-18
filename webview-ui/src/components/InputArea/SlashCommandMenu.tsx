/**
 * Slash command menu — popup that appears above the input area when the
 * user types "/" followed by a partial command name.
 *
 * Two views:
 * 1. "commands" — filtered list of matching slash commands (model, compact, review)
 * 2. "model-picker" — list of available models (shown when user clicks "Switch model...")
 *
 * Command types:
 * - "action" commands (compact, review): clicking sends the slash text as a message
 * - "picker" commands (model): clicking transitions to a sub-menu (model list)
 *
 * Adding a new slash command is a one-line change to SLASH_COMMANDS below.
 */
import { useState, useRef, useEffect } from "react";
import type { ModelOption } from "../../types";

/** Definition of a slash command shown in the popup menu. */
interface SlashCommandDef {
  /** Command name — matched against user input after "/" (e.g. "model"). */
  name: string;
  /** Display label shown in the menu row. */
  label: string;
  /** Brief description shown below the label. */
  description: string;
  /** "action" = auto-sends the slash command text; "picker" = opens a sub-menu. */
  type: "picker" | "action";
}

/** Static command registry — add new slash commands here.
 *  The menu filters this list based on what the user has typed. */
const SLASH_COMMANDS: SlashCommandDef[] = [
  { name: "model",   label: "Switch model...",     description: "Change the AI model",             type: "picker" },
  { name: "compact", label: "Compact context",     description: "Compress conversation context",   type: "action" },
  { name: "review",  label: "Review conversation", description: "Review the current conversation", type: "action" },
];

interface SlashCommandMenuProps {
  /** The text after "/" that the user has typed (e.g. "mo" from "/mo"). */
  filter: string;
  /** Available models from the active coding agent. */
  models: ModelOption[];
  /** Currently selected model ID (null = agent default). */
  currentModel: string | null;
  /** Called when the user picks a model from the model picker. */
  onSelectModel: (modelId: string) => void;
  /** Called when the user clicks an action command — sends the slash text. */
  onSendCommand: (commandText: string) => void;
  /** Called when the menu should close (click outside, Escape, etc.). */
  onClose: () => void;
}

export function SlashCommandMenu({
  filter,
  models,
  currentModel,
  onSelectModel,
  onSendCommand,
  onClose,
}: SlashCommandMenuProps) {
  // Two views: command list or model picker sub-menu
  const [view, setView] = useState<"commands" | "model-picker">("commands");
  const menuRef = useRef<HTMLDivElement>(null);

  // Reset to command list when filter changes (user is typing a different command)
  useEffect(() => {
    setView("commands");
  }, [filter]);

  // Close on click outside — same pattern as Header.tsx session dropdown
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);

  // Filter commands by prefix match (e.g. "mo" matches "model")
  const filtered = filter
    ? SLASH_COMMANDS.filter((cmd) => cmd.name.startsWith(filter))
    : SLASH_COMMANDS;

  // Nothing matches — don't show the popup
  if (view === "commands" && filtered.length === 0) return null;

  /** Handles clicking a command row. Action commands send immediately;
   *  picker commands transition to their sub-menu. */
  function handleCommandClick(cmd: SlashCommandDef) {
    if (cmd.type === "action") {
      onSendCommand(`/${cmd.name}`);
    } else if (cmd.name === "model") {
      setView("model-picker");
    }
  }

  // Find the label for the currently active model (for display in command row)
  const currentModelLabel = models.find((m) => m.id === currentModel)?.label ?? "Default";

  return (
    <div className="slash-command-menu" ref={menuRef}>
      {view === "commands" && (
        <div className="slash-command-list">
          {filtered.map((cmd) => (
            <button
              key={cmd.name}
              className="slash-command-item"
              onClick={() => handleCommandClick(cmd)}
            >
              <div className="slash-command-item-left">
                <span className="slash-command-name">/{cmd.name}</span>
                <span className="slash-command-label">{cmd.label}</span>
              </div>
              {/* Show current model name on the model command row */}
              {cmd.name === "model" && (
                <span className="slash-command-hint">{currentModelLabel}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {view === "model-picker" && (
        <div className="slash-model-picker">
          <button
            className="slash-command-back"
            onClick={() => setView("commands")}
          >
            &larr; Back
          </button>
          {models.map((model) => (
            <button
              key={model.id}
              className={`slash-model-item ${model.id === currentModel ? "active" : ""}`}
              onClick={() => onSelectModel(model.id)}
            >
              <div className="slash-model-item-left">
                <span className="slash-model-label">{model.label}</span>
                <span className="slash-model-description">{model.description}</span>
              </div>
              {model.id === currentModel && (
                <span className="slash-model-check">&#10003;</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
