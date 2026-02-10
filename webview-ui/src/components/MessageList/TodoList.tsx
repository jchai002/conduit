/**
 * Renders a TodoWrite checklist — shows each task's status with
 * a symbol (○ pending, ▸ in-progress, ✓ completed) and text.
 *
 * This component updates in place: the reducer reuses the same
 * TodoListItem when new TodoWrite calls arrive, so React just
 * re-renders the existing element with updated props.
 *
 * Status-specific CSS classes:
 * - .todo-pending: gray, dimmed
 * - .todo-in_progress: cyan, uses activeForm text if available
 * - .todo-completed: green, strikethrough, very dimmed
 */
import type { TodoListItem, TodoItem } from "../../context/types";

const STATUS_SYMBOLS: Record<TodoItem["status"], string> = {
  pending: "\u25CB",      // ○
  in_progress: "\u25B8",  // ▸
  completed: "\u2713",    // ✓
};

interface TodoListProps {
  item: TodoListItem;
}

export function TodoList({ item }: TodoListProps) {
  return (
    <div className="message todo-list" data-tool-call-id={item.toolCallId}>
      <div className="message-label">tasks</div>
      <ul className="todo-items">
        {item.todos.map((todo, i) => {
          const displayText =
            todo.status === "in_progress" && todo.activeForm
              ? todo.activeForm
              : todo.content;
          return (
            <li key={i} className={`todo-item todo-${todo.status}`}>
              <span className="todo-checkbox">{STATUS_SYMBOLS[todo.status]}</span>
              <span className="todo-text">{displayText}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
