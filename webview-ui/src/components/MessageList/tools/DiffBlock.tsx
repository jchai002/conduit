/**
 * Shared diff renderer — red lines for removals, green lines for additions.
 *
 * Used by EditTool, WriteTool, and ToolInputPreview. Handles truncation
 * when the diff exceeds maxLines per section.
 *
 * For a pure "new file" diff (Write), pass only addedLines.
 * For an edit diff (Edit), pass both removedLines and addedLines.
 */

interface DiffBlockProps {
  removedLines?: string[];
  addedLines?: string[];
  maxLines?: number;
}

export function DiffBlock({ removedLines = [], addedLines = [], maxLines = 30 }: DiffBlockProps) {
  const oldTruncated = removedLines.length > maxLines;
  const newTruncated = addedLines.length > maxLines;

  return (
    <div className="diff-block">
      {removedLines.slice(0, maxLines).map((line, i) => (
        <div key={`old-${i}`} className="diff-line diff-removed">- {line}</div>
      ))}
      {oldTruncated && (
        <div className="diff-line diff-truncated">
          {"  "}... {removedLines.length - maxLines} more removed lines
        </div>
      )}
      {addedLines.slice(0, maxLines).map((line, i) => (
        <div key={`new-${i}`} className="diff-line diff-added">+ {line}</div>
      ))}
      {newTruncated && (
        <div className="diff-line diff-truncated">
          {"  "}... {addedLines.length - maxLines} more added lines
        </div>
      )}
    </div>
  );
}
