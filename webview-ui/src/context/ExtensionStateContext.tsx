/**
 * React Context for the entire webview state.
 *
 * This replaces the old vanilla TS approach where state was scattered across
 * ChatState (event emitter), InputArea.inConversation, SessionList.visible, etc.
 *
 * Architecture:
 * - AppState holds all UI state in one place
 * - useReducer processes actions (both from extension messages and UI events)
 * - The provider wraps the whole app so any component can read state or dispatch
 * - postToExtension is also provided via context so components can send messages
 *
 * The reducer is the React equivalent of the old switch(msg.type) in main.ts.
 * Each ExtensionToWebviewMessage type maps to an ext/* action.
 */
import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react";
import type {
  AppState,
  Action,
  MessageItem,
  ChatMessage,
  ToolCall,
  PermissionRequestItem,
  TodoItem,
  TodoListItem,
  UserQuestionItem,
} from "./types";
import { initialState } from "./types";
import type { WebviewToExtensionMessage } from "../types";

// ─── Helpers ────────────────────────────────────────────────

let nextId = 0;
function uid(): string {
  return `msg_${Date.now()}_${nextId++}`;
}

/** Create a ChatMessage item for the message list */
function chatMsg(role: ChatMessage["role"], text: string): ChatMessage {
  return { id: uid(), kind: "chat-message", role, text };
}

// ─── Reducer ────────────────────────────────────────────────

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    // ── Pipeline path messages ──

    case "ext/progress":
      return { ...state, statusText: action.text };

    case "ext/status":
      return {
        ...state,
        statusText: action.text,
        busy: action.text ? state.busy : false,
      };

    case "ext/assistant":
    case "ext/error":
    case "ext/info":
    case "ext/log": {
      const roleMap = {
        "ext/assistant": "assistant",
        "ext/error": "error",
        "ext/info": "info",
        "ext/log": "log",
      } as const;
      return {
        ...state,
        showWelcome: false,
        messages: [...state.messages, chatMsg(roleMap[action.type], action.text)],
      };
    }

    case "ext/agent":
      return {
        ...state,
        showWelcome: false,
        messages: [...state.messages, chatMsg("agent", action.text)],
      };

    case "ext/agent-error":
      return {
        ...state,
        showWelcome: false,
        messages: [...state.messages, chatMsg("error", "[stderr] " + action.text)],
      };

    case "ext/done":
      return {
        ...state,
        showWelcome: false,
        busy: false,
        messages: [...state.messages, chatMsg("info", action.text)],
      };

    // ── SDK path messages ──

    case "ext/sdk-text":
      return {
        ...state,
        showWelcome: false,
        inConversation: true,
        messages: [...state.messages, chatMsg("assistant", action.text)],
      };

    case "ext/sdk-tool-call": {
      // Special handling for TodoWrite: update existing todo list in place
      if (action.toolName === "TodoWrite") {
        return handleTodoWrite(state, action);
      }
      const toolCall: ToolCall = {
        id: uid(),
        kind: "tool-call",
        toolCallId: action.toolCallId,
        toolName: action.toolName,
        input: action.input,
      };
      return {
        ...state,
        showWelcome: false,
        messages: [...state.messages, toolCall],
      };
    }

    case "ext/sdk-tool-result": {
      // Find the matching tool call and set its result
      const updated = state.messages.map((item) => {
        if (item.kind === "tool-call" && item.toolCallId === action.toolCallId) {
          return { ...item, result: action.result };
        }
        return item;
      });
      return { ...state, messages: updated };
    }

    case "ext/sdk-done":
      return { ...state, busy: false };

    case "ext/sdk-error":
      return {
        ...state,
        showWelcome: false,
        busy: false,
        messages: [...state.messages, chatMsg("error", action.text)],
      };

    // ── Permission messages ──

    case "ext/permission-request": {
      const perm: PermissionRequestItem = {
        id: uid(),
        kind: "permission-request",
        requestId: action.requestId,
        toolName: action.toolName,
        input: action.input,
        reason: action.reason,
      };
      return {
        ...state,
        showWelcome: false,
        messages: [...state.messages, perm],
      };
    }

    case "ext/user-question": {
      const question: UserQuestionItem = {
        id: uid(),
        kind: "user-question",
        requestId: action.requestId,
        questions: action.questions,
      };
      return {
        ...state,
        showWelcome: false,
        messages: [...state.messages, question],
      };
    }

    case "ext/permission-mode":
      return { ...state, permissionMode: action.mode };

    // ── Setup status ──

    case "ext/setup-status":
      return {
        ...state,
        setupStatus: {
          cliInstalled: action.cliInstalled,
          cliAuthenticated: action.cliAuthenticated,
        },
      };

    case "ext/slack-status":
      return {
        ...state,
        slackStatus: {
          connected: action.connected,
          workspaceName: action.workspaceName,
        },
      };

    // ── Session messages ──

    case "ext/session-list":
      return { ...state, sessions: action.sessions, showSessionList: true };

    case "ext/session-opened": {
      // Convert stored messages to MessageItems for rendering
      const items: MessageItem[] = [];
      for (const m of action.messages) {
        switch (m.role) {
          case "user":
          case "assistant":
          case "info":
          case "error":
            items.push(chatMsg(m.role, m.text));
            break;
          case "tool-call":
            // Reconstruct specialized items for tools that have custom renderers
            if (m.toolName === "TodoWrite") {
              try {
                const data = JSON.parse(m.text);
                if (data.todos && Array.isArray(data.todos)) {
                  items.push({
                    id: uid(),
                    kind: "todo-list",
                    toolCallId: m.toolCallId,
                    todos: data.todos,
                  });
                  break;
                }
              } catch { /* fall through to generic */ }
            }
            if (m.toolName === "AskUserQuestion") {
              try {
                const data = JSON.parse(m.text);
                if (data && Array.isArray(data)) {
                  // Stored as JSON.stringify(questions) in bufferAndForward
                  items.push({
                    id: uid(),
                    kind: "user-question",
                    requestId: m.toolCallId,
                    questions: data,
                    answers: { _restored: "true" }, // mark as answered so it renders resolved
                  });
                  break;
                }
              } catch { /* fall through to generic */ }
            }
            items.push({
              id: uid(),
              kind: "tool-call",
              toolCallId: m.toolCallId,
              toolName: m.toolName,
              input: m.text,
            });
            break;
          case "tool-result": {
            // Find the matching tool call and add the result
            const tc = items.find(
              (i) => i.kind === "tool-call" && i.toolCallId === m.toolCallId
            );
            if (tc && tc.kind === "tool-call") {
              tc.result = m.text;
            }
            break;
          }
        }
      }
      return {
        ...state,
        showWelcome: false,
        showSessionList: false,
        inConversation: true,
        messages: items,
      };
    }

    case "ext/session-cleared":
      return {
        ...state,
        showWelcome: true,
        showSessionList: false,
        inConversation: false,
        messages: [],
      };

    // ── UI actions ──

    case "ui/add-user-message":
      return {
        ...state,
        showWelcome: false,
        showSessionList: false,
        busy: true,
        messages: [...state.messages, chatMsg("user", action.text)],
      };

    case "ui/set-busy":
      return { ...state, busy: action.busy };

    case "ui/toggle-session-list":
      return { ...state, showSessionList: !state.showSessionList };

    case "ui/hide-session-list":
      return { ...state, showSessionList: false };

    case "ui/resolve-permission": {
      const resolved = state.messages.map((item) => {
        if (
          item.kind === "permission-request" &&
          item.requestId === action.requestId
        ) {
          return { ...item, resolved: action.behavior };
        }
        return item;
      });
      return { ...state, messages: resolved };
    }

    case "ui/answer-question": {
      const answered = state.messages.map((item) => {
        if (item.kind === "user-question" && item.requestId === action.requestId) {
          return { ...item, answers: action.answers };
        }
        return item;
      });
      return { ...state, messages: answered };
    }

    default:
      return state;
  }
}

/** TodoWrite calls remove the old checklist and add a fresh one at the bottom.
 *  This keeps the todo list visible near the latest messages instead of
 *  being stranded at the top where the user can't see updates. Each call
 *  renders the full list (like Claude VS Code does), so the user always
 *  sees the latest state of all tasks near where they're reading. */
function handleTodoWrite(
  state: AppState,
  action: { toolName: string; input: string; toolCallId: string }
): AppState {
  let todos: TodoItem[] = [];
  try {
    const data = JSON.parse(action.input);
    if (data.todos && Array.isArray(data.todos)) {
      todos = data.todos;
    }
  } catch {
    // If JSON parsing fails, show as regular tool call
    return {
      ...state,
      showWelcome: false,
      messages: [
        ...state.messages,
        {
          id: uid(),
          kind: "tool-call",
          toolCallId: action.toolCallId,
          toolName: action.toolName,
          input: action.input,
        },
      ],
    };
  }

  // Always add a fresh checklist at the bottom. Old ones stay in place
  // as a progress history — if the user scrolls up they can see earlier
  // states with fewer items crossed out.
  const todoItem: TodoListItem = {
    id: uid(),
    kind: "todo-list",
    toolCallId: action.toolCallId,
    todos,
  };
  return {
    ...state,
    showWelcome: false,
    messages: [...state.messages, todoItem],
  };
}

// ─── Context ────────────────────────────────────────────────

interface ExtensionStateContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  postToExtension: (msg: WebviewToExtensionMessage) => void;
}

const ExtensionStateContext = createContext<ExtensionStateContextValue | null>(null);

interface ProviderProps {
  vscodeApi: { postMessage(msg: unknown): void };
  children: ReactNode;
}

/** Wraps the app with state management and the VS Code API handle */
export function ExtensionStateProvider({ vscodeApi, children }: ProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // useCallback keeps the reference stable across re-renders so hooks that
  // depend on postToExtension (like useExtensionMessage) don't re-fire.
  const postToExtension = useCallback(
    (msg: WebviewToExtensionMessage) => { vscodeApi.postMessage(msg); },
    [vscodeApi]
  );

  return (
    <ExtensionStateContext.Provider value={{ state, dispatch, postToExtension }}>
      {children}
    </ExtensionStateContext.Provider>
  );
}

/** Hook to access state, dispatch, and postToExtension from any component */
export function useExtensionState() {
  const ctx = useContext(ExtensionStateContext);
  if (!ctx) {
    throw new Error("useExtensionState must be used within ExtensionStateProvider");
  }
  return ctx;
}
