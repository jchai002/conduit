/**
 * Welcome screen shown when no conversation is active.
 * Pure presentational component — no state, no side effects.
 */
export function WelcomeScreen() {
  return (
    <div className="welcome">
      <h2>Tether</h2>
      <p>Bridge business context from Slack with AI coding tools.</p>
      <p>Try: <code>add the sign up form sarah asked for</code></p>
    </div>
  );
}
